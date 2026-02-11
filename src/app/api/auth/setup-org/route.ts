import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { companyName, userId } = await request.json()

    if (!companyName) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      )
    }

    // Try to get user from Authorization header first, then from session
    const adminSupabase = await createAdminClient()
    let authenticatedUserId = userId

    // Verify with Authorization header if provided
    const authHeader = request.headers.get("Authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser } } = await adminSupabase.auth.getUser(token)
      if (tokenUser) {
        authenticatedUserId = tokenUser.id
      }
    }

    // Fallback to session-based auth
    if (!authenticatedUserId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        authenticatedUserId = user.id
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = { id: authenticatedUserId }

    // Check if user already has an organization
    const existingMembership = await adminSupabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (existingMembership.data) {
      // User already has an organization
      return NextResponse.json({ success: true, existing: true })
    }

    // Create organization
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org, error: orgError } = await (adminSupabase.from("organizations") as any)
      .insert({
        name: companyName,
        slug: `${slug}-${Date.now().toString(36)}`,
        owner_id: user.id,
      })
      .select()
      .single()

    if (orgError) {
      console.error("Error creating organization:", orgError)
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      )
    }

    // Add user as organization owner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase.from("organization_members") as any).insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
    })

    // Update profile with default organization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase.from("profiles") as any)
      .update({ default_organization_id: org.id })
      .eq("id", user.id)

    return NextResponse.json({ success: true, organizationId: org.id })
  } catch (error) {
    console.error("Setup org error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
