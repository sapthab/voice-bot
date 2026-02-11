import { getOpenAIClient } from "./openai"
import { retrieveContext, buildContextPrompt } from "./rag"
import { buildChatSystemPrompt } from "./prompt-builder"
import { createAdminClient } from "@/lib/supabase/server"
import { Agent, Message } from "@/types/database"

const CHAT_MODEL = "gpt-4o-mini"

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface StreamResult {
  stream: ReadableStream
  conversationId: string
  visitorId: string
}

export async function generateStreamingChatResponse(
  agent: Agent,
  conversationHistory: Message[],
  userMessage: string,
  conversationId: string,
  visitorId: string
): Promise<ReadableStream> {
  const openai = getOpenAIClient()
  const startTime = Date.now()

  // Retrieve relevant context
  const context = await retrieveContext(userMessage, agent.id)
  const contextPrompt = buildContextPrompt(context)

  // Build system prompt
  const systemPrompt = buildChatSystemPrompt(agent, { ragContext: contextPrompt })

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

  // Create streaming completion
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    max_tokens: 500,
    temperature: 0.7,
    stream: true,
  })

  let fullContent = ""
  let totalTokens = 0
  let firstTokenTime: number | null = null

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
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
