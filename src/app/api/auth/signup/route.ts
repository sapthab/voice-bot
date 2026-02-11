import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, companyName } = await request.json()

    if (!email || !password || !fullName || !companyName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Sign up the user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      )
    }

    // Create organization
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org, error: orgError } = await (supabase.from("organizations") as any)
      .insert({
        name: companyName,
        slug: `${slug}-${Date.now().toString(36)}`,
        owner_id: authData.user.id,
      })
      .select()
      .single()

    if (orgError) {
      // Cleanup: delete the created user if org creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      )
    }

    // Add user as organization owner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("organization_members") as any).insert({
      organization_id: org.id,
      user_id: authData.user.id,
      role: "owner",
    })

    // Update profile with default organization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("profiles") as any)
      .update({ default_organization_id: org.id })
      .eq("id", authData.user.id)

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
