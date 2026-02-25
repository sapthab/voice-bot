import { getOpenAIClient } from "@/lib/ai/openai"
import { executeVoiceTool, getVoiceTools, VoiceToolDefinition } from "./tool-definitions"
export type { VoiceToolDefinition } from "./tool-definitions"
export { getVoiceTools, executeVoiceTool } from "./tool-definitions"

const VOICE_MODEL = "gpt-4o-mini"
const MAX_TOOL_ROUNDS = 3

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool_calls?: any[]
  tool_call_id?: string
}

/**
 * Run the tool-calling loop for a set of chat messages.
 * Executes up to MAX_TOOL_ROUNDS of tool calls, appending results to messages.
 * Returns the final assistant text response.
 */
export async function runToolCallingLoop(
  messages: ChatMessage[],
  tools: VoiceToolDefinition[],
  agentId: string,
  conversationId: string,
  opts?: { baseUrl?: string }
): Promise<string> {
  const openai = getOpenAIClient()

  // Tool-calling loop
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await openai.chat.completions.create({
      model: VOICE_MODEL,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
      max_tokens: 200,
      temperature: 0.7,
      ...(tools.length > 0 ? { tools } : {}),
    })

    const choice = completion.choices[0]
    if (!choice?.message.tool_calls?.length) {
      // No tool calls — return the text response
      return choice?.message?.content || ""
    }

    // Append assistant message with tool calls
    const toolCalls = choice.message.tool_calls as Array<{
      id: string
      type: string
      function: { name: string; arguments: string }
    }>
    messages.push({
      role: "assistant",
      content: choice.message.content || "",
      tool_calls: toolCalls,
    })

    // Execute each tool
    for (const toolCall of toolCalls) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let args: Record<string, any> = {}
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch {
        // Invalid JSON from LLM
      }

      const result = await executeVoiceTool(
        toolCall.function.name,
        args,
        agentId,
        conversationId,
        opts?.baseUrl
      )

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }
  }

  // After max rounds, get a final text response
  const finalCompletion = await openai.chat.completions.create({
    model: VOICE_MODEL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
    max_tokens: 200,
    temperature: 0.7,
  })

  return finalCompletion.choices[0]?.message?.content || ""
}
