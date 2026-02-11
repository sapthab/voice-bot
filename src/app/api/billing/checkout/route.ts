import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe, PLANS } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { priceId, plan } = await request.json()

    if (!priceId || !plan) {
      return NextResponse.json(
        { error: "Missing priceId or plan" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get organization
    const membershipResult = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    const membership = membershipResult.data as { organization_id: string } | null

    if (!membership) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Get organization details
    const orgResult = await supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.organization_id)
      .single()

    interface Organization {
      id: string
      stripe_customer_id: string | null
    }

    const org = orgResult.data as Organization | null

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    const stripe = getStripe()

    // Create or retrieve Stripe customer
    let customerId = org.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          organization_id: org.id,
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Update organization with customer ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("organizations") as any)
        .update({ stripe_customer_id: customerId })
        .eq("id", org.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      metadata: {
        organization_id: org.id,
        plan,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
