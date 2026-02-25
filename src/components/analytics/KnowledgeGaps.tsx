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
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Sparkles, Check } from "lucide-react"
import { toast } from "sonner"

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

interface InlineForm {
  question: string
  answer: string
  suggesting: boolean
  saving: boolean
  saved: boolean
}

export function KnowledgeGaps({ agentId, from, to }: KnowledgeGapsProps) {
  const [data, setData] = useState<GapData[]>([])
  const [loading, setLoading] = useState(true)
  // Map of gap question → inline form state
  const [forms, setForms] = useState<Record<string, InlineForm>>({})

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

  function openForm(question: string) {
    setForms((prev) => ({
      ...prev,
      [question]: { question, answer: "", suggesting: false, saving: false, saved: false },
    }))
  }

  function closeForm(question: string) {
    setForms((prev) => {
      const next = { ...prev }
      delete next[question]
      return next
    })
  }

  function updateForm(question: string, patch: Partial<InlineForm>) {
    setForms((prev) => ({
      ...prev,
      [question]: { ...prev[question], ...patch },
    }))
  }

  async function handleSuggest(question: string) {
    updateForm(question, { suggesting: true })
    try {
      const res = await fetch(`/api/agents/${agentId}/faqs/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      })
      if (!res.ok) throw new Error("Failed to generate suggestion")
      const { answer } = await res.json()
      updateForm(question, { answer, suggesting: false })
    } catch {
      toast.error("Failed to generate answer suggestion")
      updateForm(question, { suggesting: false })
    }
  }

  async function handleSave(question: string) {
    const form = forms[question]
    if (!form.answer.trim()) return

    updateForm(question, { saving: true })
    try {
      const res = await fetch(`/api/agents/${agentId}/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: form.question.trim(), answer: form.answer.trim() }),
      })
      if (!res.ok) throw new Error("Failed to save FAQ")
      updateForm(question, { saved: true, saving: false })
      toast.success("FAQ added successfully")
    } catch {
      toast.error("Failed to save FAQ")
      updateForm(question, { saving: false })
    }
  }

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
                {agentId && <TableHead className="w-[120px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((gap, i) => {
                const form = forms[gap.question]
                return (
                  <>
                    <TableRow key={i}>
                      <TableCell className="font-medium">{gap.question}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{gap.count}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(gap.lastSeen).toLocaleDateString()}
                      </TableCell>
                      {agentId && (
                        <TableCell>
                          {form?.saved ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <Check className="h-3.5 w-3.5" />
                              Added
                            </span>
                          ) : form ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => closeForm(gap.question)}
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => openForm(gap.question)}
                            >
                              <Plus className="h-3 w-3" />
                              Add FAQ
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>

                    {/* Inline FAQ form */}
                    {form && !form.saved && (
                      <TableRow key={`${i}-form`} className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={agentId ? 4 : 3} className="py-3">
                          <div className="space-y-2 max-w-2xl">
                            <Input
                              value={form.question}
                              onChange={(e) =>
                                updateForm(gap.question, { question: e.target.value })
                              }
                              placeholder="Question"
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Textarea
                                value={form.answer}
                                onChange={(e) =>
                                  updateForm(gap.question, { answer: e.target.value })
                                }
                                placeholder="Answer — or click Suggest to generate one"
                                rows={3}
                                className="text-sm flex-1"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                disabled={form.suggesting}
                                onClick={() => handleSuggest(gap.question)}
                              >
                                {form.suggesting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5" />
                                )}
                                Suggest answer
                              </Button>
                              <Button
                                size="sm"
                                disabled={form.saving || !form.answer.trim()}
                                onClick={() => handleSave(gap.question)}
                                className="gap-1.5"
                              >
                                {form.saving && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                )}
                                Save FAQ
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => closeForm(gap.question)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
