import { createAdminClient } from "@/lib/supabase/server"
import { generateChatResponse } from "@/lib/ai/chat-handler"
import { checkEscalation, buildEscalationSystemNote } from "@/lib/ai/escalation"
import { sendSMS } from "@/lib/followups/sms"
import { Agent, Message, Vertical } from "@/types/database"

function triggerEscalationSideEffects(
  conversationId: string,
  reason: string,
  agentId: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const secret = process.env.INTERNAL_API_SECRET
  fetch(`${baseUrl}/api/internal/handle-escalation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-internal-secret": secret } : {}),
    },
    body: JSON.stringify({ conversationId, reason, agentId, channel: "sms" }),
  }).catch((err) => console.error("[SMS] Escalation side-effects failed:", err))
}

/**
 * Find an agent that has sms_enabled and owns the given phone number.
 */
export async function getAgentBySMSNumber(phoneNumber: string): Promise<Agent | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("phone_number", phoneNumber)
    .eq("sms_enabled", true)
    .eq("is_active", true)
    .single()

  if (error || !data) return null
  return data as Agent
}

/**
 * Find an existing open SMS conversation for this visitor, or create a new one.
 * SMS conversations are keyed by agent + visitor phone number so history is preserved
 * across multiple messages in the same session.
 */
async function getOrCreateSMSConversation(
  agent: Agent,
  fromNumber: string
): Promise<string> {
  const supabase = await createAdminClient()

  // Look for an existing active conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("agent_id", agent.id)
    .eq("visitor_id", fromNumber)
    .eq("channel", "sms")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (existing) return (existing as { id: string }).id

  // Create new SMS conversation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conversation, error } = await (supabase.from("conversations") as any)
    .insert({
      agent_id: agent.id,
      visitor_id: fromNumber,
      channel: "sms",
      call_from: fromNumber,
      call_to: agent.phone_number,
      status: "active",
    })
    .select()
    .single()

  if (error || !conversation) {
    throw new Error("Failed to create SMS conversation")
  }

  // Track conversation start
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("analytics_events") as any).insert({
    agent_id: agent.id,
    event_type: "sms_started",
    visitor_id: fromNumber,
    conversation_id: conversation.id,
  })

  return conversation.id
}

/**
 * Handle an inbound SMS message end-to-end:
 * 1. Find/create the SMS conversation
 * 2. Save the user message
 * 3. Generate an AI reply via RAG + GPT
 * 4. Send the reply back via Twilio
 * 5. Save the assistant message
 *
 * Returns the conversationId for the caller to use (e.g. trigger processing).
 */
export async function handleSMSInbound(
  agent: Agent,
  fromNumber: string,
  messageBody: string,
  messageSid: string
): Promise<string> {
  const supabase = await createAdminClient()

  const conversationId = await getOrCreateSMSConversation(agent, fromNumber)

  // Save user message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("messages") as any).insert({
    conversation_id: conversationId,
    role: "user",
    content: messageBody,
    metadata: { message_sid: messageSid },
  })

  // Load recent conversation history for context
  const { data: history } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20)

  // Check for escalation (de-dup via handle-escalation endpoint)
  const escalation = checkEscalation(messageBody, agent.vertical as Vertical)
  let escalationNote: string | undefined
  if (escalation.shouldEscalate) {
    escalationNote = buildEscalationSystemNote(agent, escalation.reason!)
    triggerEscalationSideEffects(conversationId, escalation.reason!, agent.id)
  }

  // Generate AI response (reuses chat handler: RAG + tool calling)
  const reply = await generateChatResponse(
    agent,
    (history || []) as Message[],
    messageBody,
    conversationId,
    fromNumber,
    { escalationNote }
  )

  // Send reply via Twilio, using the agent's own phone number as sender
  const smsResult = await sendSMS({
    to: fromNumber,
    body: reply,
    from: agent.phone_number ?? undefined,
  })

  // Save assistant message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("messages") as any).insert({
    conversation_id: conversationId,
    role: "assistant",
    content: reply,
    metadata: {
      channel: "sms",
      external_id: smsResult.messageId || null,
      send_error: smsResult.error || null,
    },
  })

  if (!smsResult.success) {
    console.error(`[SMS] Failed to send reply to ${fromNumber}: ${smsResult.error}`)
  }

  return conversationId
}
