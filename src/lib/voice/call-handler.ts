import { createAdminClient } from "@/lib/supabase/server"
import { retrieveContext, buildContextPrompt } from "@/lib/ai/rag"
import { buildVoiceSystemPrompt } from "@/lib/ai/prompt-builder"
import { getOpenAIClient } from "@/lib/ai/openai"
import { checkEscalation, buildEscalationSystemNote } from "@/lib/ai/escalation"
import { Agent, Vertical } from "@/types/database"
import { VoiceProviderType } from "./types"

function triggerEscalationSideEffects(
  conversationId: string,
  reason: string,
  agentId: string,
  channel: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const secret = process.env.INTERNAL_API_SECRET
  fetch(`${baseUrl}/api/internal/handle-escalation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-internal-secret": secret } : {}),
    },
    body: JSON.stringify({ conversationId, reason, agentId, channel }),
  }).catch((err) => console.error("[Voice] Escalation side-effects failed:", err))
}

const VOICE_MODEL = "gpt-4o-mini"

export async function getAgentByPhoneNumber(phoneNumber: string): Promise<Agent | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("phone_number", phoneNumber)
    .eq("is_active", true)
    .single()

  if (error || !data) return null
  return data as Agent
}

export async function getAgentByRetellId(retellAgentId: string): Promise<Agent | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("retell_agent_id", retellAgentId)
    .eq("is_active", true)
    .single()

  if (error || !data) return null
  return data as Agent
}

export async function getAgentByBolnaId(bolnaAgentId: string): Promise<Agent | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("bolna_agent_id", bolnaAgentId)
    .eq("is_active", true)
    .single()

  if (error || !data) return null
  return data as Agent
}

export async function getAgentByProviderId(
  providerType: VoiceProviderType,
  providerAgentId: string
): Promise<Agent | null> {
  switch (providerType) {
    case "retell":
      return getAgentByRetellId(providerAgentId)
    case "bolna":
      return getAgentByBolnaId(providerAgentId)
    default:
      return null
  }
}

export async function handleCallStart(
  agent: Agent,
  callId: string,
  fromNumber: string,
  toNumber: string
): Promise<string> {
  const supabase = await createAdminClient()

  // Create conversation for this call
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conversation, error } = await (supabase.from("conversations") as any)
    .insert({
      agent_id: agent.id,
      visitor_id: fromNumber,
      channel: "voice",
      call_id: callId,
      call_status: "in_progress",
      call_from: fromNumber,
      call_to: toNumber,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating voice conversation:", error)
    throw new Error("Failed to create conversation")
  }

  // Track analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("analytics_events") as any).insert({
    agent_id: agent.id,
    event_type: "call_started",
    visitor_id: fromNumber,
    conversation_id: conversation.id,
  })

  return conversation.id
}

export async function handleCallResponse(
  agent: Agent,
  conversationId: string,
  userTranscript: string
): Promise<string> {
  const supabase = await createAdminClient()

  // Save user message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("messages") as any).insert({
    conversation_id: conversationId,
    role: "user",
    content: userTranscript,
  })

  // Get conversation history
  const { data: history } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  // Check for escalation (de-dup via handle-escalation endpoint)
  const escalation = checkEscalation(userTranscript, agent.vertical as Vertical)
  let escalationNote: string | undefined

  if (escalation.shouldEscalate) {
    escalationNote = buildEscalationSystemNote(agent, escalation.reason!, "voice")
    triggerEscalationSideEffects(conversationId, escalation.reason!, agent.id, "voice")
  }

  // Retrieve RAG context
  const context = await retrieveContext(userTranscript, agent.id, {
    docThreshold: agent.doc_similarity_threshold,
    faqThreshold: agent.faq_similarity_threshold,
  })
  const contextPrompt = buildContextPrompt(context)

  // Build voice system prompt
  const systemPrompt = buildVoiceSystemPrompt(agent, { ragContext: contextPrompt, escalationNote })

  // Build messages for GPT
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ]

  const recentHistory = (history || []).slice(-10) as { role: string; content: string }[]
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })
  }
  messages.push({ role: "user", content: userTranscript })

  // Generate response with shorter max_tokens for voice
  const openai = getOpenAIClient()
  const completion = await openai.chat.completions.create({
    model: VOICE_MODEL,
    messages,
    max_tokens: 200,
    temperature: 0.7,
  })

  const responseContent =
    completion.choices[0]?.message?.content ||
    agent.fallback_message ||
    "I'm sorry, could you repeat that?"

  // Save assistant message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("messages") as any).insert({
    conversation_id: conversationId,
    role: "assistant",
    content: responseContent,
    tokens_used: completion.usage?.total_tokens || null,
  })

  return responseContent
}

export async function handleCallEnd(
  callId: string,
  duration?: number,
  recordingUrl?: string,
  transcript?: string
) {
  const supabase = await createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("conversations") as any)
    .update({
      call_status: "completed",
      call_duration: duration || null,
      call_recording_url: recordingUrl || null,
      call_transcript: transcript || null,
      ended_at: new Date().toISOString(),
      status: "closed",
    })
    .eq("call_id", callId)
}

export async function saveVoiceMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
) {
  const supabase = await createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("messages") as any).insert({
    conversation_id: conversationId,
    role,
    content,
  })
}
