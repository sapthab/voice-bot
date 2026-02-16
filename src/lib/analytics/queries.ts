import { createAdminClient } from "@/lib/supabase/server"

export interface DateRange {
  from: string
  to: string
}

export async function getOverviewStats(agentId: string | null, orgId: string, range: DateRange) {
  const supabase = await createAdminClient()

  let convQuery = supabase
    .from("conversations")
    .select("id, call_duration, channel", { count: "exact" })
    .gte("created_at", range.from)
    .lte("created_at", range.to)

  let leadsQuery = supabase
    .from("leads")
    .select("id", { count: "exact" })
    .gte("created_at", range.from)
    .lte("created_at", range.to)

  if (agentId) {
    convQuery = convQuery.eq("agent_id", agentId)
    leadsQuery = leadsQuery.eq("agent_id", agentId)
  } else {
    // Filter by org's agents
    const { data: agents } = await supabase
      .from("agents")
      .select("id")
      .eq("organization_id", orgId)
    const agentIds = (agents || []).map((a) => (a as { id: string }).id)
    if (agentIds.length > 0) {
      convQuery = convQuery.in("agent_id", agentIds)
      leadsQuery = leadsQuery.in("agent_id", agentIds)
    }
  }

  const [convResult, leadsResult] = await Promise.all([convQuery, leadsQuery])

  const conversations = (convResult.data || []) as Array<{
    id: string
    call_duration: number | null
    channel: string
  }>

  const totalConversations = convResult.count || 0
  const totalLeads = leadsResult.count || 0
  const durations = conversations
    .map((c) => c.call_duration)
    .filter((d): d is number => d !== null)
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  // Get resolution rate from analyses
  const convIds = conversations.map((c) => c.id)
  let resolutionRate = 0
  if (convIds.length > 0) {
    const { data: analyses } = await supabase
      .from("conversation_analysis")
      .select("resolution_status")
      .in("conversation_id", convIds)

    const analysisData = (analyses || []) as Array<{ resolution_status: string }>
    const resolved = analysisData.filter((a) => a.resolution_status === "resolved").length
    resolutionRate = analysisData.length > 0 ? Math.round((resolved / analysisData.length) * 100) : 0
  }

  return {
    totalConversations,
    totalLeads,
    avgDuration,
    resolutionRate,
  }
}

export async function getVolumeData(agentId: string | null, orgId: string, range: DateRange) {
  const supabase = await createAdminClient()

  const agentIds = await resolveAgentIds(supabase, agentId, orgId)

  const { data } = await supabase
    .from("conversations")
    .select("created_at, channel")
    .in("agent_id", agentIds)
    .gte("created_at", range.from)
    .lte("created_at", range.to)
    .order("created_at", { ascending: true })

  // Group by date
  const grouped: Record<string, { date: string; chat: number; voice: number; total: number }> = {}
  for (const row of (data || []) as Array<{ created_at: string; channel: string }>) {
    const date = row.created_at.split("T")[0]
    if (!grouped[date]) {
      grouped[date] = { date, chat: 0, voice: 0, total: 0 }
    }
    grouped[date].total++
    if (row.channel === "chat") grouped[date].chat++
    else if (row.channel === "voice") grouped[date].voice++
  }

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getTopTopics(agentId: string | null, orgId: string, range: DateRange) {
  const supabase = await createAdminClient()

  const agentIds = await resolveAgentIds(supabase, agentId, orgId)

  const { data } = await supabase
    .from("conversation_analysis")
    .select("topics")
    .in("agent_id", agentIds)
    .gte("created_at", range.from)
    .lte("created_at", range.to)

  const topicCounts: Record<string, number> = {}
  for (const row of (data || []) as Array<{ topics: string[] }>) {
    for (const topic of row.topics || []) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1
    }
  }

  return Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([topic, count]) => ({ topic, count }))
}

export async function getSentimentData(agentId: string | null, orgId: string, range: DateRange) {
  const supabase = await createAdminClient()

  const agentIds = await resolveAgentIds(supabase, agentId, orgId)

  const { data } = await supabase
    .from("conversation_analysis")
    .select("sentiment, sentiment_score, created_at")
    .in("agent_id", agentIds)
    .gte("created_at", range.from)
    .lte("created_at", range.to)
    .order("created_at", { ascending: true })

  const entries = (data || []) as Array<{
    sentiment: string
    sentiment_score: number
    created_at: string
  }>

  // Distribution
  const distribution: Record<string, number> = { positive: 0, neutral: 0, negative: 0, mixed: 0 }
  for (const entry of entries) {
    distribution[entry.sentiment] = (distribution[entry.sentiment] || 0) + 1
  }

  // Trend by date
  const trendMap: Record<string, { date: string; scores: number[] }> = {}
  for (const entry of entries) {
    const date = entry.created_at.split("T")[0]
    if (!trendMap[date]) trendMap[date] = { date, scores: [] }
    trendMap[date].scores.push(entry.sentiment_score)
  }
  const trend = Object.values(trendMap)
    .map((d) => ({
      date: d.date,
      avg_score: d.scores.reduce((a, b) => a + b, 0) / d.scores.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { distribution, trend }
}

export async function getKnowledgeGaps(agentId: string | null, orgId: string, range: DateRange) {
  const supabase = await createAdminClient()

  const agentIds = await resolveAgentIds(supabase, agentId, orgId)

  const { data } = await supabase
    .from("conversation_analysis")
    .select("knowledge_gaps, created_at, conversation_id")
    .in("agent_id", agentIds)
    .gte("created_at", range.from)
    .lte("created_at", range.to)

  const gapCounts: Record<string, { question: string; count: number; lastSeen: string }> = {}
  for (const row of (data || []) as Array<{
    knowledge_gaps: string[]
    created_at: string
    conversation_id: string
  }>) {
    for (const gap of row.knowledge_gaps || []) {
      const key = gap.toLowerCase().trim()
      if (!gapCounts[key]) {
        gapCounts[key] = { question: gap, count: 0, lastSeen: row.created_at }
      }
      gapCounts[key].count++
      if (row.created_at > gapCounts[key].lastSeen) {
        gapCounts[key].lastSeen = row.created_at
      }
    }
  }

  return Object.values(gapCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}

export async function getPerformanceData(agentId: string | null, orgId: string, range: DateRange) {
  const supabase = await createAdminClient()

  const agentIds = await resolveAgentIds(supabase, agentId, orgId)

  const { data } = await supabase
    .from("conversation_analysis")
    .select("resolution_status")
    .in("agent_id", agentIds)
    .gte("created_at", range.from)
    .lte("created_at", range.to)

  const counts: Record<string, number> = { resolved: 0, escalated: 0, unresolved: 0, unknown: 0 }
  for (const row of (data || []) as Array<{ resolution_status: string }>) {
    counts[row.resolution_status] = (counts[row.resolution_status] || 0) + 1
  }

  return counts
}

// Helper to resolve agent IDs for org-wide queries
async function resolveAgentIds(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  agentId: string | null,
  orgId: string
): Promise<string[]> {
  if (agentId) return [agentId]

  const { data: agents } = await supabase
    .from("agents")
    .select("id")
    .eq("organization_id", orgId)

  return (agents || []).map((a) => (a as { id: string }).id)
}
