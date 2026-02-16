import { createAdminClient } from "@/lib/supabase/server"

/**
 * Main orchestrator that runs after a conversation ends.
 * Executes: analytics → follow-ups → integrations
 */
export async function processConversation(conversationId: string) {
  const supabase = await createAdminClient()

  // Mark as processing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("conversations") as any)
    .update({ post_processing_status: "processing" })
    .eq("id", conversationId)

  try {
    // Fetch the conversation with agent and messages
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    const convData = conversation as Record<string, unknown>

    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", convData.agent_id as string)
      .single()

    if (!agent || !messages || messages.length === 0) {
      console.log(`[Processor] Skipping ${conversationId}: no agent or messages`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("conversations") as any)
        .update({ post_processing_status: "completed" })
        .eq("id", conversationId)
      return
    }

    // Step 1: Run analytics (conversation analysis)
    try {
      const { analyzeConversation } = await import("@/lib/analytics/analyzer")
      await analyzeConversation(
        conversationId,
        convData.agent_id as string,
        messages as { role: string; content: string }[]
      )
      console.log(`[Processor] Analytics completed for ${conversationId}`)
    } catch (err) {
      console.error(`[Processor] Analytics failed for ${conversationId}:`, err)
    }

    // Step 2: Send follow-ups
    try {
      const { processFollowups } = await import("@/lib/followups/sender")
      await processFollowups(conversationId, convData, agent as Record<string, unknown>)
      console.log(`[Processor] Follow-ups processed for ${conversationId}`)
    } catch (err) {
      console.error(`[Processor] Follow-ups failed for ${conversationId}:`, err)
    }

    // Step 3: Dispatch integration events
    try {
      const { dispatchEvent } = await import("@/lib/integrations")
      const eventType = convData.channel === "voice" ? "call_completed" : "chat_completed"
      await dispatchEvent(eventType, {
        agentId: convData.agent_id as string,
        conversationId,
        conversation: convData,
        agent: agent as Record<string, unknown>,
      })
      console.log(`[Processor] Integrations dispatched for ${conversationId}`)
    } catch (err) {
      console.error(`[Processor] Integrations failed for ${conversationId}:`, err)
    }

    // Mark as completed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("conversations") as any)
      .update({ post_processing_status: "completed" })
      .eq("id", conversationId)

    console.log(`[Processor] All processing completed for ${conversationId}`)
  } catch (error) {
    console.error(`[Processor] Fatal error for ${conversationId}:`, error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("conversations") as any)
      .update({ post_processing_status: "failed" })
      .eq("id", conversationId)
  }
}

/**
 * Trigger processing in the background (non-blocking).
 * Calls the internal API endpoint so it runs in its own request context.
 */
export async function triggerConversationProcessing(conversationId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const secret = process.env.INTERNAL_API_SECRET

  try {
    // Fire-and-forget
    fetch(`${baseUrl}/api/internal/process-conversation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-internal-secret": secret } : {}),
      },
      body: JSON.stringify({ conversationId }),
    }).catch((err) => {
      console.error("[Processor] Failed to trigger processing:", err)
    })
  } catch (err) {
    console.error("[Processor] Failed to trigger processing:", err)
  }
}
