import { NextRequest, NextResponse } from "next/server"
import {
  getAgentByBolnaId,
  handleCallStart,
} from "@/lib/voice/call-handler"
import { createAdminClient } from "@/lib/supabase/server"
import { retrieveContext, buildContextPrompt } from "@/lib/ai/rag"
import { buildVoiceSystemPrompt } from "@/lib/ai/prompt-builder"
import {
  getVoiceTools,
  runToolCallingLoop,
} from "@/lib/voice/tool-handler"
import { Agent, Vertical } from "@/types/database"
import { checkEscalation, buildEscalationSystemNote } from "@/lib/ai/escalation"

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
    body: JSON.stringify({ conversationId, reason, agentId, channel: "voice" }),
  }).catch((err) => console.error("[Bolna] Escalation side-effects failed:", err))
}

// OpenAI-compatible chat completions endpoint for Bolna custom LLM
// Bolna sends user utterances here and expects assistant responses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, metadata } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      )
    }

    // Extract agent and call info from metadata
    const agentId = metadata?.agent_id
    const callId = metadata?.call_id || `bolna-${Date.now()}`
    const fromNumber = metadata?.from_number || "unknown"

    if (!agentId) {
      return NextResponse.json(
        { error: "Missing agent_id in metadata" },
        { status: 400 }
      )
    }

    // Look up agent by Bolna agent ID
    const agent = await getAgentByBolnaId(agentId)
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    // Get the latest user message
    const lastMessage = messages[messages.length - 1]
    const userTranscript = lastMessage?.content || ""

    // Check if this is the first message (conversation start)
    const userMessages = messages.filter(
      (m: { role: string }) => m.role === "user"
    )

    const supabase = await createAdminClient()
    let conversationId: string

    if (userMessages.length <= 1) {
      // First user message — create a new conversation
      conversationId = await handleCallStart(
        agent,
        callId,
        fromNumber,
        agent.phone_number || ""
      )
    } else {
      // Subsequent messages — find existing conversation by call_id
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("call_id", callId)
        .single()

      if (!data) {
        conversationId = await handleCallStart(
          agent,
          callId,
          fromNumber,
          agent.phone_number || ""
        )
      } else {
        conversationId = (data as { id: string }).id
      }
    }

    // Save user message to DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("messages") as any).insert({
      conversation_id: conversationId,
      role: "user",
      content: userTranscript,
    })

    // Check for escalation (de-dup via handle-escalation endpoint)
    const escalation = checkEscalation(userTranscript, (agent as Agent).vertical as Vertical)
    let escalationNote: string | undefined
    if (escalation.shouldEscalate) {
      escalationNote = buildEscalationSystemNote(agent as Agent, escalation.reason!, "voice")
      triggerEscalationSideEffects(conversationId, escalation.reason!, (agent as Agent).id)
    }

    // RAG retrieval
    const context = await retrieveContext(userTranscript, agent.id)
    const contextPrompt = buildContextPrompt(context)
    const systemPrompt = buildVoiceSystemPrompt(agent, {
      ragContext: contextPrompt,
      escalationNote,
    })

    // Build messages from Bolna's provided history (skip DB re-read to avoid duplicates)
    type ChatMsg = {
      role: "system" | "user" | "assistant" | "tool"
      content: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tool_calls?: any[]
      tool_call_id?: string
    }
    const chatMessages: ChatMsg[] = [
      { role: "system", content: systemPrompt },
    ]

    // Use Bolna's provided message history directly (already includes the current user message)
    for (const msg of messages) {
      if (msg.role === "system") continue // we use our own system prompt
      chatMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content || "",
      })
    }

    // Get tools for this agent and run tool-calling loop
    const agentData = agent as unknown as Record<string, unknown>
    const tools = getVoiceTools(agentData)

    const responseContent = await runToolCallingLoop(
      chatMessages,
      tools,
      agent.id,
      conversationId
    )

    const finalContent =
      responseContent ||
      (agent as Agent).fallback_message ||
      "I'm sorry, could you repeat that?"

    // Save assistant response to DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("messages") as any).insert({
      conversation_id: conversationId,
      role: "assistant",
      content: finalContent,
    })

    // Return in OpenAI chat completions format
    return NextResponse.json({
      id: `chatcmpl-bolna-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: finalContent,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    })
  } catch (error) {
    console.error("Bolna LLM endpoint error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
