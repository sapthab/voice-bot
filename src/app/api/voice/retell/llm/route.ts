import { NextRequest, NextResponse } from "next/server"
import {
  getAgentByRetellId,
  getAgentByPhoneNumber,
  handleCallStart,
  handleCallResponse,
} from "@/lib/voice/call-handler"

// Retell POST-based Custom LLM handler
// Retell sends transcribed speech via POST, we return the LLM response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { interaction_type, call, transcript, agent_id: retellAgentId } = body

    // Handle ping
    if (interaction_type === "ping") {
      return NextResponse.json({ response_type: "pong" })
    }

    // Handle call_details — initial call setup
    if (interaction_type === "call_details") {
      const agent = retellAgentId
        ? await getAgentByRetellId(retellAgentId)
        : call?.to_number
          ? await getAgentByPhoneNumber(call.to_number)
          : null

      if (!agent) {
        return NextResponse.json({
          response_type: "agent_response",
          content: "I'm sorry, this number is not configured. Please try again later.",
          content_complete: true,
        })
      }

      // Create conversation and get greeting
      const fromNumber = call?.from_number || "unknown"
      const toNumber = call?.to_number || agent.phone_number || "unknown"
      const callId = call?.call_id || body.call_id || crypto.randomUUID()

      const conversationId = await handleCallStart(agent, callId, fromNumber, toNumber)

      const greeting = agent.voice_welcome_message ||
        "Hello! Thank you for calling. How can I help you today?"

      return NextResponse.json({
        response_type: "agent_response",
        content: greeting,
        content_complete: true,
        metadata: {
          conversation_id: conversationId,
          agent_id: agent.id,
        },
      })
    }

    // Handle response_required — user said something, generate response
    if (interaction_type === "response_required") {
      // Get the latest user transcript
      const userMessage =
        transcript?.[transcript.length - 1]?.content ||
        body.human_transcript ||
        ""

      if (!userMessage) {
        return NextResponse.json({
          response_type: "agent_response",
          content: "I didn't catch that. Could you please repeat?",
          content_complete: true,
        })
      }

      // Look up agent
      const agent = retellAgentId
        ? await getAgentByRetellId(retellAgentId)
        : null

      if (!agent) {
        return NextResponse.json({
          response_type: "agent_response",
          content: "I'm sorry, I'm having trouble connecting. Please try again.",
          content_complete: true,
        })
      }

      // Get conversation ID from metadata or find by call_id
      const conversationId =
        body.metadata?.conversation_id || body.call?.metadata?.conversation_id

      if (!conversationId) {
        return NextResponse.json({
          response_type: "agent_response",
          content: "I'm sorry, there was a technical issue. Please call back.",
          content_complete: true,
        })
      }

      // Generate RAG-powered response
      const responseContent = await handleCallResponse(agent, conversationId, userMessage)

      return NextResponse.json({
        response_type: "agent_response",
        content: responseContent,
        content_complete: true,
      })
    }

    // Unknown interaction type
    return NextResponse.json({
      response_type: "agent_response",
      content: "",
      content_complete: true,
    })
  } catch (error) {
    console.error("Retell LLM handler error:", error)
    return NextResponse.json({
      response_type: "agent_response",
      content: "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
      content_complete: true,
    })
  }
}
