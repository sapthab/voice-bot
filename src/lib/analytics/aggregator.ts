import { createAdminClient } from "@/lib/supabase/server"

/**
 * Compute daily aggregates for an agent for a specific date.
 */
export async function aggregateDaily(agentId: string, date: string) {
  const supabase = await createAdminClient()

  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd = `${date}T23:59:59.999Z`

  // Fetch conversations for the day
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, channel, call_duration, escalated, status, ended_at")
    .eq("agent_id", agentId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)

  if (!conversations || conversations.length === 0) return

  const convs = conversations as Array<{
    id: string
    channel: string
    call_duration: number | null
    escalated: boolean
    status: string
    ended_at: string | null
  }>

  // Fetch analyses for these conversations
  const convIds = convs.map((c) => c.id)
  const { data: analyses } = await supabase
    .from("conversation_analysis")
    .select("sentiment_score, resolution_status, topics")
    .in("conversation_id", convIds)

  const analysisData = (analyses || []) as Array<{
    sentiment_score: number
    resolution_status: string
    topics: string[]
  }>

  // Compute aggregates
  const totalConversations = convs.length
  const durations = convs.map((c) => c.call_duration).filter((d): d is number => d !== null)
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null

  const resolved = analysisData.filter((a) => a.resolution_status === "resolved").length
  const escalated = analysisData.filter((a) => a.resolution_status === "escalated").length
  const resolutionRate = analysisData.length > 0 ? resolved / analysisData.length : 0
  const escalationRate = analysisData.length > 0 ? escalated / analysisData.length : 0

  const sentimentScores = analysisData.map((a) => a.sentiment_score)
  const avgSentiment = sentimentScores.length > 0
    ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
    : 0

  // Top topics
  const topicCounts: Record<string, number> = {}
  for (const a of analysisData) {
    for (const topic of a.topics || []) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1
    }
  }
  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }))

  // Channel breakdown
  const channelBreakdown: Record<string, number> = {}
  for (const c of convs) {
    channelBreakdown[c.channel] = (channelBreakdown[c.channel] || 0) + 1
  }

  // Count leads for the day
  const { count: leadsCount } = await supabase
    .from("leads")
    .select("id", { count: "exact" })
    .eq("agent_id", agentId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)

  // Upsert aggregate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("analytics_aggregates") as any).upsert(
    {
      agent_id: agentId,
      period: "daily",
      period_start: dayStart,
      total_conversations: totalConversations,
      avg_duration: avgDuration,
      resolution_rate: resolutionRate,
      escalation_rate: escalationRate,
      avg_sentiment_score: avgSentiment,
      top_topics: topTopics,
      total_leads: leadsCount || 0,
      channel_breakdown: channelBreakdown,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agent_id,period,period_start" }
  )
}

/**
 * Run nightly aggregation for all active agents.
 */
export async function runNightlyAggregation() {
  const supabase = await createAdminClient()

  const { data: agents } = await supabase
    .from("agents")
    .select("id")
    .eq("is_active", true)

  if (!agents) return

  // Aggregate yesterday's data
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split("T")[0]

  for (const agent of agents) {
    try {
      await aggregateDaily((agent as { id: string }).id, dateStr)
    } catch (err) {
      console.error(`[Aggregator] Failed for agent ${(agent as { id: string }).id}:`, err)
    }
  }
}
