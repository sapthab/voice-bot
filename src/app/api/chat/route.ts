import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { generateChatResponse } from "@/lib/ai/chat-handler"
import { generateStreamingChatResponse } from "@/lib/ai/stream-handler"
import { checkEscalation, buildEscalationSystemNote } from "@/lib/ai/escalation"
import { Agent, Vertical } from "@/types/database"

/** Fire-and-forget: notify contacts + dispatch integration event for escalation. */
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
  }).catch((err) => console.error("[Chat] Escalation side-effects failed:", err))
}

const MAX_MESSAGE_LENGTH = 5000

export async function POST(request: NextRequest) {
  try {
    const { agentId, conversationId, visitorId, message } = await request.json()
    const stream = request.nextUrl.searchParams.get("stream") === "true"

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be a string of at most ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("is_active", true)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Get or create conversation
    let currentConversationId = conversationId
    let currentVisitorId = visitorId || crypto.randomUUID()

    if (!currentConversationId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newConversation, error: convError } = await (supabase.from("conversations") as any)
        .insert({
          agent_id: agentId,
          visitor_id: currentVisitorId,
          channel: "chat",
        })
        .select()
        .single()

      if (convError) {
        console.error("Error creating conversation:", convError)
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        )
      }

      currentConversationId = newConversation.id

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("analytics_events") as any).insert({
        agent_id: agentId,
        event_type: "conversation_started",
        visitor_id: currentVisitorId,
        conversation_id: currentConversationId,
      })
    }

    // Save user message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("messages") as any).insert({
      conversation_id: currentConversationId,
      role: "user",
      content: message,
    })

    // Get conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", currentConversationId)
      .order("created_at", { ascending: true })

    // Check if the conversation is already escalated (de-duplication)
    let alreadyEscalated = false
    if (conversationId) {
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("escalated")
        .eq("id", conversationId)
        .single()
      alreadyEscalated = (existingConv as { escalated: boolean } | null)?.escalated ?? false
    }

    // Check for escalation triggers on user message
    const escalation = checkEscalation(message, (agent as Agent).vertical as Vertical)
    let escalationNote: string | undefined

    if (escalation.shouldEscalate) {
      escalationNote = buildEscalationSystemNote(agent as Agent, escalation.reason!)

      if (!alreadyEscalated) {
        // Fire-and-forget: update DB + notify + dispatch integration event
        triggerEscalationSideEffects(currentConversationId, escalation.reason!, agentId, "chat")
      }
    }

    // Streaming mode
    if (stream) {
      const responseStream = await generateStreamingChatResponse(
        agent,
        history || [],
        message,
        currentConversationId,
        currentVisitorId,
        { escalationNote }
      )

      return new Response(responseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Conversation-Id": currentConversationId,
          "X-Visitor-Id": currentVisitorId,
        },
      })
    }

    // Non-streaming mode
    const response = await generateChatResponse(
      agent,
      history || [],
      message,
      currentConversationId,
      currentVisitorId,
      { escalationNote }
    )

    // Save assistant message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("messages") as any).insert({
      conversation_id: currentConversationId,
      role: "assistant",
      content: response,
    })

    // Track message event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("analytics_events") as any).insert({
      agent_id: agentId,
      event_type: "message_sent",
      visitor_id: currentVisitorId,
      conversation_id: currentConversationId,
    })

    // Increment chat credits
    const orgResult = await supabase
      .from("agents")
      .select("organization_id")
      .eq("id", agentId)
      .single()

    const orgData = orgResult.data as { organization_id: string } | null

    if (orgData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc("increment_chat_credits", {
        org_id: orgData.organization_id,
      })
    }

    return NextResponse.json({
      message: response,
      conversationId: currentConversationId,
      visitorId: currentVisitorId,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch conversation history
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const conversationId = searchParams.get("conversationId")
  const visitorId = searchParams.get("visitorId")

  if (!conversationId) {
    return NextResponse.json(
      { error: "Missing conversationId" },
      { status: 400 }
    )
  }

  const supabase = await createAdminClient()

  // Verify the conversation exists and the requester is authorized
  const { data: conversation } = await supabase
    .from("conversations")
    .select("visitor_id")
    .eq("id", conversationId)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const convData = conversation as { visitor_id: string }

  // For widget use: require matching visitorId
  // For dashboard use: require authenticated user (checked via import)
  if (visitorId) {
    if (convData.visitor_id !== visitorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  } else {
    // No visitorId provided — require authenticated dashboard user
    const { getAuthenticatedUser } = await import("@/lib/auth/api-auth")
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }

  return NextResponse.json({ messages })
}
