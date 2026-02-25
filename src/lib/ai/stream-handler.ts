import { getOpenAIClient } from "./openai"
import { retrieveContext, buildContextPrompt } from "./rag"
import { buildChatSystemPrompt } from "./prompt-builder"
import { createAdminClient } from "@/lib/supabase/server"
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

export async function generateStreamingChatResponse(
  agent: Agent,
  conversationHistory: Message[],
  userMessage: string,
  conversationId: string,
  visitorId: string,
  options?: { escalationNote?: string }
): Promise<ReadableStream> {
  const openai = getOpenAIClient()
  const startTime = Date.now()

  // Retrieve relevant context
  const context = await retrieveContext(userMessage, agent.id, {
    docThreshold: agent.doc_similarity_threshold,
    faqThreshold: agent.faq_similarity_threshold,
  })
  const contextPrompt = buildContextPrompt(context)

  // Build system prompt
  const systemPrompt = buildChatSystemPrompt(agent, { ragContext: contextPrompt, escalationNote: options?.escalationNote })

  // Build messages array
  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }]

  const recentHistory = conversationHistory.slice(-10)
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })
  }
  messages.push({ role: "user", content: userMessage })

  // Get tools if any are available for this agent
  const tools = hasTools(agent) ? getAgentTools(agent) : undefined
  const toolContext: ToolContext = { agent, conversationId, visitorId }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullContent = ""
        let totalTokens = 0
        let firstTokenTime: number | null = null

        // Tool-calling loop: execute tools silently, then stream final response
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          // Non-streaming call to check for tool use
          const checkCompletion = await openai.chat.completions.create({
            model: CHAT_MODEL,
            messages: messages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
            max_tokens: 500,
            temperature: 0.7,
            ...(tools && tools.length > 0 ? { tools } : {}),
          })

          const checkChoice = checkCompletion.choices[0]
          if (!checkChoice?.message.tool_calls?.length) {
            // No tool calls — break out and stream the final response
            break
          }

          // Append assistant message with tool calls
          const toolCalls = checkChoice.message.tool_calls as Array<{
            id: string; type: string; function: { name: string; arguments: string }
          }>
          messages.push({
            role: "assistant",
            content: checkChoice.message.content || "",
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: { name: tc.function.name, arguments: tc.function.arguments },
            })),
          })

          // Execute tools
          for (const toolCall of toolCalls) {
            let args: Record<string, unknown> = {}
            try {
              args = JSON.parse(toolCall.function.arguments)
            } catch {
              // Invalid JSON
            }

            const result = await executeTool(toolCall.function.name, args, toolContext)
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            })
          }
        }

        // Now stream the final response
        const completion = await openai.chat.completions.create({
          model: CHAT_MODEL,
          messages: messages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
          max_tokens: 500,
          temperature: 0.7,
          stream: true,
        })

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || ""
          if (content) {
            if (!firstTokenTime) {
              firstTokenTime = Date.now()
            }
            fullContent += content
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content, done: false })}\n\n`)
            )
          }

          if (chunk.usage) {
            totalTokens = chunk.usage.total_tokens
          }
        }

        // Send done signal
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: "", done: true })}\n\n`)
        )
        controller.close()

        // Save assistant message with metadata
        const supabase = await createAdminClient()
        const latencyMs = firstTokenTime ? firstTokenTime - startTime : Date.now() - startTime
        const sourcesUsed = [
          ...context.faqs.map((f) => ({ type: "faq", id: f.id, similarity: f.similarity })),
          ...context.documents.map((d) => ({ type: "document", id: d.id, similarity: d.similarity })),
        ]

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("messages") as any).insert({
          conversation_id: conversationId,
          role: "assistant",
          content: fullContent || agent.fallback_message,
          sources_used: sourcesUsed.length > 0 ? sourcesUsed : null,
          latency_ms: latencyMs,
          tokens_used: totalTokens || null,
        })
      } catch (error) {
        console.error("Stream error:", error)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ content: agent.fallback_message || "Sorry, an error occurred.", done: true })}\n\n`
          )
        )
        controller.close()
      }
    },
  })

  return stream
}
