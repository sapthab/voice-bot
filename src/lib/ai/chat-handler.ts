import { getOpenAIClient } from "./openai"
import { retrieveContext, buildContextPrompt } from "./rag"
import { buildChatSystemPrompt } from "./prompt-builder"
import { getAgentTools, executeTool, hasTools } from "./tools"
import { Agent, Message } from "@/types/database"
import { ToolContext } from "./tools/types"

const CHAT_MODEL = "gpt-4o-mini"
const MAX_TOOL_ROUNDS = 3

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_calls?: Array<{
    id: string
    type: "function"
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

export async function generateChatResponse(
  agent: Agent,
  conversationHistory: Message[],
  userMessage: string,
  conversationId?: string,
  visitorId?: string,
  options?: { escalationNote?: string }
): Promise<string> {
  const openai = getOpenAIClient()

  // Retrieve relevant context
  const context = await retrieveContext(userMessage, agent.id, {
    docThreshold: agent.doc_similarity_threshold,
    faqThreshold: agent.faq_similarity_threshold,
  })
  const contextPrompt = buildContextPrompt(context)

  // Build system prompt using the prompt builder
  const systemPrompt = buildChatSystemPrompt(agent, { ragContext: contextPrompt, escalationNote: options?.escalationNote })

  // Build messages array
  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }]

  // Add conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10)
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })
  }

  // Add current user message
  messages.push({ role: "user", content: userMessage })

  // Get tools if any are available for this agent
  const tools = hasTools(agent) ? getAgentTools(agent) : undefined
  const toolContext: ToolContext | undefined =
    tools && conversationId
      ? { agent, conversationId, visitorId }
      : undefined

  // Tool-calling loop
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: messages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
      max_tokens: 500,
      temperature: 0.7,
      ...(tools && tools.length > 0 ? { tools } : {}),
    })

    const choice = completion.choices[0]
    if (!choice) break

    const assistantMessage = choice.message

    // If there are no tool calls, we're done
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return (
        assistantMessage.content ||
        agent.fallback_message ||
        "I apologize, but I'm having trouble responding right now. Please try again."
      )
    }

    // If we've exhausted tool rounds, return whatever content we have
    if (round === MAX_TOOL_ROUNDS) {
      return (
        assistantMessage.content ||
        agent.fallback_message ||
        "I apologize, but I'm having trouble responding right now. Please try again."
      )
    }

    // Append the assistant message with tool calls
    const toolCalls = assistantMessage.tool_calls as Array<{
      id: string; type: string; function: { name: string; arguments: string }
    }>
    messages.push({
      role: "assistant",
      content: assistantMessage.content || "",
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    })

    // Execute each tool call and append results
    for (const toolCall of toolCalls) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch {
        // Invalid JSON args
      }

      const result = toolContext
        ? await executeTool(toolCall.function.name, args, toolContext)
        : { success: false, error: "Tool context not available" }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }
  }

  return (
    agent.fallback_message ||
    "I apologize, but I'm having trouble responding right now. Please try again."
  )
}
