import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { notifyEscalation } from "@/lib/escalation/notifier"
import { dispatchEvent } from "@/lib/integrations"

/**
 * Internal endpoint: called when an escalation is first detected.
 * Handles the side effects: notify contacts + dispatch integration event.
 * Safe to call multiple times — checks escalated flag for de-duplication.
 *
 * Called by server.ts (Retell WebSocket) which cannot import @/ modules.
 * Also callable from chat/voice routes directly if preferred.
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
    const { conversationId, reason, agentId, channel } = await request.json()

    if (!conversationId || !reason || !agentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // De-duplicate: only act if not already escalated
    const { data: conv } = await supabase
      .from("conversations")
      .select("escalated, agent_id")
      .eq("id", conversationId)
      .single()

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    if ((conv as { escalated: boolean }).escalated) {
      return NextResponse.json({ skipped: true, reason: "already_escalated" })
    }

    // Update DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("conversations") as any)
      .update({ escalated: true, escalation_reason: reason })
      .eq("id", conversationId)

    // Fetch agent for notification contacts
    const { data: agent } = await supabase
      .from("agents")
      .select("id, name, escalation_email, escalation_phone")
      .eq("id", agentId)
      .single()

    if (agent) {
      const agentData = agent as {
        id: string
        name: string
        escalation_email: string | null
        escalation_phone: string | null
      }

      // Send email/SMS notification (non-blocking, errors are swallowed inside notifyEscalation)
      notifyEscalation({
        agent: agentData,
        conversationId,
        reason,
        channel: channel || "unknown",
      }).catch((err) => console.error("[HandleEscalation] Notify failed:", err))

      // Dispatch integration event (non-blocking)
      dispatchEvent("escalation_detected", {
        agentId,
        conversationId,
        agent: agentData as Record<string, unknown>,
        conversation: { id: conversationId, escalation_reason: reason, channel },
      }).catch((err) => console.error("[HandleEscalation] Event dispatch failed:", err))
    }

    return NextResponse.json({ handled: true })
  } catch (error) {
    console.error("[HandleEscalation] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
