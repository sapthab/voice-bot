import { NextRequest, NextResponse } from "next/server"
import { handleCallEnd } from "@/lib/voice/call-handler"
import { createAdminClient } from "@/lib/supabase/server"
import { triggerConversationProcessing } from "@/lib/processing/conversation-processor"
import { BolnaProvider } from "@/lib/voice/providers/bolna-provider"

const bolnaProvider = new BolnaProvider()

// Bolna webhook handler for call lifecycle events
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)

    // Verify webhook signature
    const webhookSecret = process.env.BOLNA_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get("x-bolna-signature")
      if (!signature) {
        console.error("Missing Bolna webhook signature header")
        return NextResponse.json({ error: "Missing signature" }, { status: 401 })
      }

      if (!bolnaProvider.verifyWebhookSignature(rawBody, signature)) {
        console.error("Invalid Bolna webhook signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("BOLNA_WEBHOOK_SECRET is not configured in production")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
    }

    const event = bolnaProvider.parseWebhookEvent(body)

    if (!event) {
      return NextResponse.json({ received: true })
    }

    const supabase = await createAdminClient()

    switch (event.type) {
      case "call.started": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("conversations") as any)
          .update({ call_status: "in_progress" })
          .eq("call_id", event.callId)
        break
      }

      case "call.ended": {
        await handleCallEnd(event.callId, event.duration)
        break
      }

      case "call.analyzed": {
        await handleCallEnd(
          event.callId,
          event.duration,
          event.recordingUrl,
          event.transcript
        )

        // Track analytics
        const { data: conversation } = await supabase
          .from("conversations")
          .select("agent_id, call_from")
          .eq("call_id", event.callId)
          .single()

        if (conversation) {
          const convData = conversation as { agent_id: string; call_from: string | null }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("analytics_events") as any).insert({
            agent_id: convData.agent_id,
            event_type: "call_completed",
            visitor_id: convData.call_from,
            metadata: {
              call_id: event.callId,
              duration: event.duration,
              has_recording: !!event.recordingUrl,
              provider: "bolna",
            },
          })

          // Trigger post-call processing
          const { data: convForProcessing } = await supabase
            .from("conversations")
            .select("id")
            .eq("call_id", event.callId)
            .single()

          if (convForProcessing) {
            triggerConversationProcessing((convForProcessing as { id: string }).id)
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Bolna webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
