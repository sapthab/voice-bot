import { Agent } from "@/types/database"

interface PromptContext {
  ragContext: string
  conversationType?: "chat" | "voice"
}

export function buildChatSystemPrompt(agent: Agent, context: PromptContext): string {
  let systemPrompt = agent.system_prompt || ""

  if (context.ragContext) {
    systemPrompt += `\n\n## Context\nUse the following information to help answer questions:\n\n${context.ragContext}`
  }

  // Add booking instructions if enabled
  const agentAny = agent as Record<string, unknown>
  if (agentAny.booking_enabled) {
    systemPrompt += `\n\n## Appointment Booking
You can check calendar availability and book appointments for customers.
- When a customer wants to book, use the check_availability tool first to find open slots.
- Present 2-3 available time options to the customer.
- Always confirm the date, time, and customer details before booking.
- After booking, confirm the appointment details with the customer.`
  }

  systemPrompt += `\n\n## Guidelines
- Be helpful, friendly, and concise
- If you don't have specific information, offer to help connect them with someone who can assist
- Always stay in character as an AI assistant for ${agent.name}
- Do not make up information that isn't provided in the context above
- Use markdown formatting when it improves readability`

  return systemPrompt
}

export function buildVoiceSystemPrompt(agent: Agent, context: PromptContext): string {
  let systemPrompt = agent.system_prompt || ""

  if (context.ragContext) {
    systemPrompt += `\n\nUse the following information to answer questions:\n${context.ragContext}`
  }

  // Add booking instructions if enabled
  const agentAny = agent as Record<string, unknown>
  if (agentAny.booking_enabled) {
    systemPrompt += `\n\nYou can check calendar availability and book appointments for customers. For voice conversations, suggest 2-3 specific times conversationally. Always confirm the details before booking.`
  }

  systemPrompt += `\n\nVoice guidelines:
- Keep responses short and conversational, under 2-3 sentences when possible
- Never use markdown, bullet points, or special formatting
- Use simple, natural sentences that sound good when spoken aloud
- If you don't know something, offer to connect them with a person
- Stay in character as the AI assistant for ${agent.name}
- Do not make up information not provided in the context
- Spell out numbers and abbreviations naturally
- Avoid saying "as an AI" or referencing that you are artificial`

  return systemPrompt
}
