import { getOpenAIClient } from "./openai"
import { retrieveContext, buildContextPrompt } from "./rag"
import { buildChatSystemPrompt } from "./prompt-builder"
import { Agent, Message } from "@/types/database"

const CHAT_MODEL = "gpt-4o-mini"

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export async function generateChatResponse(
  agent: Agent,
  conversationHistory: Message[],
  userMessage: string
): Promise<string> {
  const openai = getOpenAIClient()

  // Retrieve relevant context
  const context = await retrieveContext(userMessage, agent.id)
  const contextPrompt = buildContextPrompt(context)

  // Build system prompt using the prompt builder
  const systemPrompt = buildChatSystemPrompt(agent, { ragContext: contextPrompt })

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

  // Generate response
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    max_tokens: 500,
    temperature: 0.7,
  })

  return (
    completion.choices[0]?.message?.content ||
    agent.fallback_message ||
    "I apologize, but I'm having trouble responding right now. Please try again."
  )
}
