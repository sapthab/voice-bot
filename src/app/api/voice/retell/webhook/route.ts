import { NextRequest, NextResponse } from "next/server"
import { handleCallEnd } from "@/lib/voice/call-handler"
import { createAdminClient } from "@/lib/supabase/server"
import { triggerConversationProcessing } from "@/lib/processing/conversation-processor"

// Retell webhook handler for call lifecycle events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, call } = body

    // Enforce webhook signature verification
    const webhookSecret = process.env.RETELL_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get("x-retell-signature")
      if (!signature) {
        console.error("Missing Retell webhook signature header")
        return NextResponse.json({ error: "Missing signature" }, { status: 401 })
      }

      const crypto = await import("crypto")
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(body))
        .digest("hex")

      if (signature !== expectedSignature) {
        console.error("Invalid Retell webhook signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    } else if (process.env.NODE_ENV === "production") {
      // In production, require the webhook secret to be configured
      console.error("RETELL_WEBHOOK_SECRET is not configured in production")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
    }

    const callId = call?.call_id

    if (!callId) {
      return NextResponse.json({ received: true })
    }

    const supabase = await createAdminClient()

    switch (event) {
      case "call.started":
      case "call_started": {
        // Update call status to in_progress
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("conversations") as any)
          .update({ call_status: "in_progress" })
          .eq("call_id", callId)
        break
      }

      case "call.ended":
      case "call_ended": {
        const duration = call?.duration_ms
          ? Math.round(call.duration_ms / 1000)
          : call?.call_duration || null

        await handleCallEnd(callId, duration)
        break
      }

      case "call.analyzed":
      case "call_analyzed": {
        const recordingUrl = call?.recording_url || null
        const transcript = call?.transcript || null
        const duration = call?.duration_ms
          ? Math.round(call.duration_ms / 1000)
          : call?.call_duration || null

        await handleCallEnd(callId, duration, recordingUrl, transcript)

        // Track analytics
        const { data: conversation } = await supabase
          .from("conversations")
          .select("agent_id, call_from")
          .eq("call_id", callId)
          .single()

        if (conversation) {
          const convData = conversation as { agent_id: string; call_from: string | null; id?: string }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("analytics_events") as any).insert({
            agent_id: convData.agent_id,
            event_type: "call_completed",
            visitor_id: convData.call_from,
            metadata: {
              call_id: callId,
              duration,
              has_recording: !!recordingUrl,
            },
          })

          // Trigger post-call processing (analytics, follow-ups, integrations)
          // Find conversation ID by call_id
          const { data: convForProcessing } = await supabase
            .from("conversations")
            .select("id")
            .eq("call_id", callId)
            .single()

          if (convForProcessing) {
            triggerConversationProcessing((convForProcessing as { id: string }).id)
          }
        }
        break
      }

      default:
        console.log("Unhandled Retell webhook event:", event)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Retell webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
