"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Delivery {
  id: string
  status: string
  recipient: string
  sent_at: string | null
  error_message: string | null
  created_at: string
  followup_configs?: { channel: string }
}

interface FollowupDeliveriesProps {
  agentId: string
}

export function FollowupDeliveries({ agentId }: FollowupDeliveriesProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/agents/${agentId}/followups/deliveries`)
      .then((r) => r.json())
      .then((data) => setDeliveries(data.deliveries || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId])

  const statusVariant = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return "success" as const
      case "failed":
        return "destructive" as const
      default:
        return "secondary" as const
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery History</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-40 bg-muted animate-pulse rounded" />
        ) : deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No follow-ups sent yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="capitalize">
                    {d.followup_configs?.channel || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{d.recipient}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.sent_at ? new Date(d.sent_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                    {d.error_message || "—"}
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
