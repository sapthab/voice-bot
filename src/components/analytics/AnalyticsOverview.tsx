"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Users, Clock, CheckCircle } from "lucide-react"

interface OverviewStats {
  totalConversations: number
  totalLeads: number
  avgDuration: number
  resolutionRate: number
}

interface AnalyticsOverviewProps {
  agentId?: string
  from: string
  to: string
}

export function AnalyticsOverview({ agentId, from, to }: AnalyticsOverviewProps) {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (agentId) params.set("agentId", agentId)
    params.set("from", from)
    params.set("to", to)

    fetch(`/api/analytics/overview?${params}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId, from, to])

  const cards = [
    {
      title: "Total Conversations",
      value: stats?.totalConversations ?? 0,
      icon: MessageSquare,
    },
    {
      title: "Leads Captured",
      value: stats?.totalLeads ?? 0,
      icon: Users,
    },
    {
      title: "Avg Duration",
      value: stats?.avgDuration ? `${Math.round(stats.avgDuration / 60)}m ${stats.avgDuration % 60}s` : "N/A",
      icon: Clock,
    },
    {
      title: "Resolution Rate",
      value: `${stats?.resolutionRate ?? 0}%`,
      icon: CheckCircle,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold heading">{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
