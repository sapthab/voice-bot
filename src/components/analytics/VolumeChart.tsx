"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

interface VolumeData {
  date: string
  chat: number
  voice: number
  total: number
}

interface VolumeChartProps {
  agentId?: string
  from: string
  to: string
}

export function VolumeChart({ agentId, from, to }: VolumeChartProps) {
  const [data, setData] = useState<VolumeData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (agentId) params.set("agentId", agentId)
    params.set("from", from)
    params.set("to", to)

    fetch(`/api/analytics/volume?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId, from, to])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversation Volume</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                labelFormatter={(v) => new Date(v).toLocaleDateString()}
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
              />
              <Legend />
              <Bar dataKey="chat" fill="hsl(var(--primary))" name="Chat" radius={[2, 2, 0, 0]} />
              <Bar dataKey="voice" fill="hsl(var(--primary) / 0.5)" name="Voice" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
