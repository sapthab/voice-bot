import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { exchangeCodeForTokens, encryptTokens, listCalendars } from "@/lib/calendar/google"

interface RouteParams {
  params: Promise<{ agentId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { agentId } = await params
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const error = request.nextUrl.searchParams.get("error")

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const redirectTo = `${baseUrl}/agents/${agentId}?tab=booking`

  if (error) {
    return NextResponse.redirect(`${redirectTo}&error=${encodeURIComponent(error)}`)
  }

  if (!code || state !== agentId) {
    return NextResponse.redirect(`${redirectTo}&error=invalid_callback`)
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get calendar list to find primary calendar
    const calendars = await listCalendars(tokens.access_token)
    const primaryCalendar = calendars.find((c) => c.primary) || calendars[0]

    if (!primaryCalendar) {
      return NextResponse.redirect(`${redirectTo}&error=no_calendars`)
    }

    // Encrypt and store tokens
    const encryptedTokens = encryptTokens(tokens)
    const supabase = await createAdminClient()

    // Upsert calendar connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("calendar_connections") as any).upsert(
      {
        agent_id: agentId,
        provider: "google",
        encrypted_tokens: encryptedTokens,
        calendar_id: primaryCalendar.id,
        calendar_name: primaryCalendar.summary,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id" }
    )

    // Enable booking on the agent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("agents") as any)
      .update({ booking_enabled: true })
      .eq("id", agentId)

    return NextResponse.redirect(`${redirectTo}&success=calendar_connected`)
  } catch (err) {
    console.error("Calendar OAuth callback error:", err)
    return NextResponse.redirect(
      `${redirectTo}&error=${encodeURIComponent(err instanceof Error ? err.message : "callback_failed")}`
    )
  }
}
