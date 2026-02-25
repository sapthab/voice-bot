import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { sendSMS } from "@/lib/followups/sms"
import { sendEmail } from "@/lib/followups/email"

/**
 * Cron endpoint to send scheduled (delayed) follow-up deliveries.
 * Should be called every minute (see vercel.json crons).
 * Picks up followup_deliveries rows where status='pending' and scheduled_for <= NOW().
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET
  if (secret) {
    const providedSecret = request.headers.get("x-internal-secret")
    if (providedSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  try {
    const supabase = await createAdminClient()

    // Find pending deliveries that are due
    const { data: due } = await supabase
      .from("followup_deliveries")
      .select("*, followup_configs(channel, from_name, from_email)")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .limit(50)

    if (!due || due.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    let processed = 0
    for (const delivery of due as Array<Record<string, unknown>>) {
      const config = delivery.followup_configs as Record<string, unknown>
      const channel = config?.channel as string
      const recipient = delivery.recipient as string
      const renderedBody = delivery.rendered_body as string
      const renderedSubject = delivery.rendered_subject as string | undefined

      if (!renderedBody || !recipient || !channel) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("followup_deliveries") as any)
          .update({ status: "failed", error_message: "Missing delivery data" })
          .eq("id", delivery.id as string)
        continue
      }

      let result: { success: boolean; messageId?: string; error?: string }
      if (channel === "sms") {
        result = await sendSMS({ to: recipient, body: renderedBody })
      } else if (channel === "email") {
        result = await sendEmail({
          to: recipient,
          subject: renderedSubject || "Follow-up",
          body: renderedBody,
          fromName: (config.from_name as string) || undefined,
          fromEmail: (config.from_email as string) || undefined,
        })
      } else {
        result = { success: false, error: `Unknown channel: ${channel}` }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("followup_deliveries") as any)
        .update({
          status: result.success ? "sent" : "failed",
          external_id: result.messageId || null,
          error_message: result.error || null,
          sent_at: result.success ? new Date().toISOString() : null,
        })
        .eq("id", delivery.id as string)

      console.log(
        `[ProcessFollowups] ${channel} to ${recipient}: ${result.success ? "sent" : "failed"}`
      )
      processed++
    }

    return NextResponse.json({ processed, total: due.length })
  } catch (error) {
    console.error("[ProcessFollowups] Error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
