import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { generateChatResponse } from "@/lib/ai/chat-handler"
import { generateStreamingChatResponse } from "@/lib/ai/stream-handler"
import { checkEscalation } from "@/lib/ai/escalation"

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

    // Check for escalation triggers on user message
    const agentData = agent as { vertical: string }
    const escalation = checkEscalation(message, agentData.vertical as import("@/types/database").Vertical)
    if (escalation.shouldEscalate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("conversations") as any)
        .update({
          escalated: true,
          escalation_reason: escalation.reason,
        })
        .eq("id", currentConversationId)
    }

    // Streaming mode
    if (stream) {
      const responseStream = await generateStreamingChatResponse(
        agent,
        history || [],
        message,
        currentConversationId,
        currentVisitorId
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
    const response = await generateChatResponse(agent, history || [], message)

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

  if (!conversationId) {
    return NextResponse.json(
      { error: "Missing conversationId" },
      { status: 400 }
    )
  }

  const supabase = await createAdminClient()

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
