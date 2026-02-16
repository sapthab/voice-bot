import { getOpenAIClient } from "@/lib/ai/openai"
import { createAdminClient } from "@/lib/supabase/server"

const ANALYSIS_MODEL = "gpt-4o-mini"

interface AnalysisResult {
  sentiment: "positive" | "neutral" | "negative" | "mixed"
  sentiment_score: number
  topics: string[]
  summary: string
  resolution_status: "resolved" | "escalated" | "unresolved" | "unknown"
  knowledge_gaps: string[]
  key_phrases: string[]
  customer_intent: string | null
  confidence_avg: number
}

export async function analyzeConversation(
  conversationId: string,
  agentId: string,
  messages: { role: string; content: string }[]
): Promise<AnalysisResult | null> {
  if (messages.length < 2) return null

  const openai = getOpenAIClient()

  // Format conversation for analysis
  const transcript = messages
    .map((m) => `${m.role === "user" ? "Customer" : "Agent"}: ${m.content}`)
    .join("\n")

  const response = await openai.chat.completions.create({
    model: ANALYSIS_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a conversation analyst. Analyze the following customer service conversation and return a JSON object with these fields:
- sentiment: "positive", "neutral", "negative", or "mixed"
- sentiment_score: number from -1.0 (very negative) to 1.0 (very positive)
- topics: array of 1-5 topic strings (e.g., "pricing", "appointment booking", "product inquiry")
- summary: 1-2 sentence summary of the conversation
- resolution_status: "resolved" (customer's issue was addressed), "escalated" (transferred to human), "unresolved" (issue not addressed), or "unknown"
- knowledge_gaps: array of questions the AI struggled to answer or said it didn't know (empty array if none)
- key_phrases: array of 1-3 important phrases from the conversation
- customer_intent: brief description of what the customer wanted (null if unclear)
- confidence_avg: estimated average confidence of AI responses (0.0 to 1.0)

Return ONLY valid JSON, no markdown or explanation.`,
      },
      {
        role: "user",
        content: transcript,
      },
    ],
    max_tokens: 500,
    temperature: 0.1,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) return null

  let analysis: AnalysisResult
  try {
    analysis = JSON.parse(content) as AnalysisResult
  } catch {
    console.error("[Analyzer] Failed to parse analysis JSON:", content)
    return null
  }

  // Save to database
  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("conversation_analysis") as any).insert({
    conversation_id: conversationId,
    agent_id: agentId,
    sentiment: analysis.sentiment,
    sentiment_score: analysis.sentiment_score,
    topics: analysis.topics,
    summary: analysis.summary,
    resolution_status: analysis.resolution_status,
    knowledge_gaps: analysis.knowledge_gaps || [],
    confidence_avg: analysis.confidence_avg || 0.5,
    key_phrases: analysis.key_phrases || [],
    customer_intent: analysis.customer_intent || null,
  })

  if (error) {
    console.error("[Analyzer] Failed to save analysis:", error)
  }

  return analysis
}
