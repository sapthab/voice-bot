"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star } from "lucide-react"

interface SatisfactionRatingsProps {
  agentId?: string
  from: string
  to: string
}

interface SatisfactionData {
  avgRating: number | null
  totalRatings: number
  distribution: Record<number, number>
}

export function SatisfactionRatings({ agentId, from, to }: SatisfactionRatingsProps) {
  const [data, setData] = useState<SatisfactionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (agentId) params.set("agentId", agentId)
    params.set("from", from)
    params.set("to", to)

    fetch(`/api/analytics/ratings?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId, from, to])

  const maxCount = data
    ? Math.max(...Object.values(data.distribution), 1)
    : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Satisfaction Ratings</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[200px] bg-muted animate-pulse rounded" />
        ) : !data || data.totalRatings === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No ratings yet
          </div>
        ) : (
          <div className="space-y-4">
            {/* Average score */}
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold heading">{data.avgRating?.toFixed(1)}</span>
              <div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        (data.avgRating ?? 0) >= star
                          ? "fill-yellow-400 text-yellow-400"
                          : (data.avgRating ?? 0) >= star - 0.5
                          ? "fill-yellow-200 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {data.totalRatings} rating{data.totalRatings !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Distribution bars */}
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = data.distribution[star] || 0
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-right text-muted-foreground">{star}</span>
                    <Star className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground tabular-nums">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
