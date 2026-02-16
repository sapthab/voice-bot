"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

interface TopicData {
  topic: string
  count: number
}

interface TopicsBreakdownProps {
  agentId?: string
  from: string
  to: string
}

export function TopicsBreakdown({ agentId, from, to }: TopicsBreakdownProps) {
  const [data, setData] = useState<TopicData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (agentId) params.set("agentId", agentId)
    params.set("from", from)
    params.set("to", to)

    fetch(`/api/analytics/topics?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId, from, to])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Topics</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No topics detected yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" className="text-xs" />
              <YAxis
                dataKey="topic"
                type="category"
                className="text-xs"
                width={80}
                tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + "..." : v}
              />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
