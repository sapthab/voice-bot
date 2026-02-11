import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user needs organization setup (first time after email confirmation)
      const adminSupabase = await createAdminClient()
      const existingMembership = await adminSupabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", data.user.id)
        .single()

      if (!existingMembership.data) {
        // User doesn't have an organization - create one from user metadata
        const companyName = data.user.user_metadata?.company_name ||
                           `${data.user.email?.split("@")[0]}'s Organization`

        const slug = companyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: org } = await (adminSupabase.from("organizations") as any)
          .insert({
            name: companyName,
            slug: `${slug}-${Date.now().toString(36)}`,
            owner_id: data.user.id,
          })
          .select()
          .single()

        if (org) {
          // Add user as organization owner
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminSupabase.from("organization_members") as any).insert({
            organization_id: org.id,
            user_id: data.user.id,
            role: "owner",
          })

          // Update profile with default organization
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminSupabase.from("profiles") as any)
            .update({ default_organization_id: org.id })
            .eq("id", data.user.id)
        }

        // Redirect to agent creation for new users
        const forwardedHost = request.headers.get("x-forwarded-host")
        const isLocalEnv = process.env.NODE_ENV === "development"
        const redirectUrl = "/agents/new"

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${redirectUrl}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${redirectUrl}`)
        } else {
          return NextResponse.redirect(`${origin}${redirectUrl}`)
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
