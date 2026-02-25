import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters"
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview"
import { VolumeChart } from "@/components/analytics/VolumeChart"
import { TopicsBreakdown } from "@/components/analytics/TopicsBreakdown"
import { SentimentTrend } from "@/components/analytics/SentimentTrend"
import { KnowledgeGaps } from "@/components/analytics/KnowledgeGaps"
import { PerformanceMetrics } from "@/components/analytics/PerformanceMetrics"
import { SatisfactionRatings } from "@/components/analytics/SatisfactionRatings"

interface AnalyticsPageProps {
  searchParams: Promise<{
    agentId?: string
    from?: string
    to?: string
  }>
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch agents for filter dropdown
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single()

  const orgId = (membership as { organization_id: string } | null)?.organization_id
  if (!orgId) redirect("/login")

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name")

  const agentList = (agents || []) as { id: string; name: string }[]

  const agentId = params.agentId || undefined
  const from = params.from || defaultFrom()
  const to = params.to || defaultTo()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold heading">Analytics</h1>
        <p className="text-muted-foreground">
          Conversation intelligence and performance metrics
        </p>
      </div>

      <Suspense fallback={null}>
        <AnalyticsFilters agents={agentList} />
      </Suspense>

      <AnalyticsOverview agentId={agentId} from={from} to={to} />

      <div className="grid gap-6 lg:grid-cols-2">
        <VolumeChart agentId={agentId} from={from} to={to} />
        <TopicsBreakdown agentId={agentId} from={from} to={to} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SentimentTrend agentId={agentId} from={from} to={to} />
        <PerformanceMetrics agentId={agentId} from={from} to={to} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SatisfactionRatings agentId={agentId} from={from} to={to} />
      </div>

      <KnowledgeGaps agentId={agentId} from={from} to={to} />
    </div>
  )
}

function defaultFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split("T")[0]
}

function defaultTo() {
  return new Date().toISOString().split("T")[0]
}
