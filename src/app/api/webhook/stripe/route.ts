import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { getStripe, PLANS } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = await createAdminClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const organizationId = session.metadata?.organization_id
        const plan = session.metadata?.plan as keyof typeof PLANS

        if (organizationId && plan) {
          const planConfig = PLANS[plan]

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("organizations") as any)
            .update({
              stripe_subscription_id: session.subscription as string,
              subscription_status: "active",
              plan,
              chat_credits_limit: planConfig.chatCredits,
              chat_credits_used: 0,
            })
            .eq("id", organizationId)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        const orgResult1 = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .single()

        const org1 = orgResult1.data as { id: string } | null

        if (org1) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("organizations") as any)
            .update({
              subscription_status: subscription.status as
                | "active"
                | "canceled"
                | "past_due",
            })
            .eq("id", org1.id)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        const orgResult2 = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .single()

        const org2 = orgResult2.data as { id: string } | null

        if (org2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("organizations") as any)
            .update({
              subscription_status: "canceled",
              plan: "free",
              chat_credits_limit: 100,
            })
            .eq("id", org2.id)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const orgResult3 = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        const org3 = orgResult3.data as { id: string } | null

        if (org3) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("organizations") as any)
            .update({ subscription_status: "past_due" })
            .eq("id", org3.id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
