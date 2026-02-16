import { createAdminClient } from "@/lib/supabase/server"

/**
 * Get or generate a conversation summary.
 * First checks if an analysis already exists (from the analytics pipeline),
 * otherwise returns a basic summary from the messages.
 */
export async function getConversationSummary(conversationId: string): Promise<string> {
  const supabase = await createAdminClient()

  // Check if we already have an analysis with a summary
  const { data: analysis } = await supabase
    .from("conversation_analysis")
    .select("summary")
    .eq("conversation_id", conversationId)
    .single()

  if (analysis) {
    return (analysis as { summary: string }).summary
  }

  // Fallback: build a basic summary from messages
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20)

  if (!messages || messages.length === 0) {
    return "A conversation took place."
  }

  const msgData = messages as { role: string; content: string }[]
  const userMessages = msgData.filter((m) => m.role === "user")

  if (userMessages.length === 0) {
    return "A conversation took place."
  }

  // Take the first user message as a basic summary
  const firstQuestion = userMessages[0].content
  return firstQuestion.length > 200
    ? firstQuestion.slice(0, 200) + "..."
    : firstQuestion
}
