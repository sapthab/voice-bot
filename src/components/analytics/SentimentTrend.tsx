"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

interface SentimentData {
  distribution: Record<string, number>
  trend: { date: string; avg_score: number }[]
}

interface SentimentTrendProps {
  agentId?: string
  from: string
  to: string
}

export function SentimentTrend({ agentId, from, to }: SentimentTrendProps) {
  const [data, setData] = useState<SentimentData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (agentId) params.set("agentId", agentId)
    params.set("from", from)
    params.set("to", to)

    fetch(`/api/analytics/sentiment?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId, from, to])

  const distributionItems = data?.distribution
    ? [
        { label: "Positive", value: data.distribution.positive || 0, color: "text-green-600" },
        { label: "Neutral", value: data.distribution.neutral || 0, color: "text-gray-500" },
        { label: "Negative", value: data.distribution.negative || 0, color: "text-red-600" },
        { label: "Mixed", value: data.distribution.mixed || 0, color: "text-yellow-600" },
      ]
    : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        ) : !data || data.trend.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No sentiment data yet
          </div>
        ) : (
          <div className="space-y-4">
            {/* Distribution badges */}
            <div className="flex gap-4 flex-wrap">
              {distributionItems.map((item) => (
                <div key={item.label} className="text-center">
                  <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Trend line */}
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  className="text-xs"
                />
                <YAxis domain={[-1, 1]} className="text-xs" />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  formatter={(value) => [typeof value === "number" ? value.toFixed(2) : String(value), "Sentiment Score"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
