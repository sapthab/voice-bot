"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Agent {
  id: string
  name: string
}

interface AnalyticsFiltersProps {
  agents: Agent[]
}

export function AnalyticsFilters({ agents }: AnalyticsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentAgent = searchParams.get("agentId") || "all"
  const currentFrom = searchParams.get("from") || defaultFrom()
  const currentTo = searchParams.get("to") || defaultTo()

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "all" || !value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.push(`/analytics?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Agent</Label>
        <Select value={currentAgent} onValueChange={(v) => updateParams("agentId", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input
          type="date"
          value={currentFrom}
          onChange={(e) => updateParams("from", e.target.value)}
          className="w-[160px]"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input
          type="date"
          value={currentTo}
          onChange={(e) => updateParams("to", e.target.value)}
          className="w-[160px]"
        />
      </div>
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
