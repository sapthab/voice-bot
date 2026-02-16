"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface GapData {
  question: string
  count: number
  lastSeen: string
}

interface KnowledgeGapsProps {
  agentId?: string
  from: string
  to: string
}

export function KnowledgeGaps({ agentId, from, to }: KnowledgeGapsProps) {
  const [data, setData] = useState<GapData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (agentId) params.set("agentId", agentId)
    params.set("from", from)
    params.set("to", to)

    fetch(`/api/analytics/knowledge-gaps?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId, from, to])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Gaps</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[200px] bg-muted animate-pulse rounded" />
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No knowledge gaps detected — your AI is handling questions well!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question / Topic</TableHead>
                <TableHead className="w-[80px] text-center">Count</TableHead>
                <TableHead className="w-[120px]">Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((gap, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{gap.question}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{gap.count}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(gap.lastSeen).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
