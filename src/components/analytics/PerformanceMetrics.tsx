"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts"

interface PerformanceMetricsProps {
  agentId?: string
  from: string
  to: string
}

const COLORS = {
  resolved: "#22c55e",
  escalated: "#f59e0b",
  unresolved: "#ef4444",
  unknown: "#94a3b8",
}

const LABELS: Record<string, string> = {
  resolved: "Resolved",
  escalated: "Escalated",
  unresolved: "Unresolved",
  unknown: "Unknown",
}

export function PerformanceMetrics({ agentId, from, to }: PerformanceMetricsProps) {
  const [data, setData] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (agentId) params.set("agentId", agentId)
    params.set("from", from)
    params.set("to", to)

    fetch(`/api/analytics/performance?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId, from, to])

  const pieData = data
    ? Object.entries(data)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: LABELS[status] || status,
          value: count,
          fill: COLORS[status as keyof typeof COLORS] || "#94a3b8",
        }))
    : []

  const total = pieData.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resolution Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        ) : total === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No performance data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                paddingAngle={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
