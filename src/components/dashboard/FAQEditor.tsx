"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FAQ } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Plus, Trash2, Loader2, HelpCircle } from "lucide-react"

interface FAQEditorProps {
  agentId: string
  faqs: FAQ[]
}

export function FAQEditor({ agentId, faqs: initialFaqs }: FAQEditorProps) {
  const router = useRouter()
  const [faqs, setFaqs] = useState(initialFaqs)
  const [newQuestion, setNewQuestion] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleAddFAQ = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return

    setAdding(true)

    try {
      const response = await fetch(`/api/agents/${agentId}/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
        }),
      })

      if (!response.ok) throw new Error("Failed to add FAQ")

      const { faq } = await response.json()

      setFaqs((prev) => [faq, ...prev])
      setNewQuestion("")
      setNewAnswer("")
      setShowForm(false)
      toast.success("FAQ added successfully")
      router.refresh()
    } catch {
      toast.error("Failed to add FAQ")
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteFAQ = async (id: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/faqs/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete FAQ")

      setFaqs((prev) => prev.filter((f) => f.id !== id))
      toast.success("FAQ deleted")
      router.refresh()
    } catch {
      toast.error("Failed to delete FAQ")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Add common questions and answers for your agent
              </CardDescription>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add FAQ
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/50 mb-4">
              <div className="space-y-2">
                <Input
                  placeholder="Question"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Answer"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddFAQ}
                  disabled={adding || !newQuestion.trim() || !newAnswer.trim()}
                >
                  {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add FAQ
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {faqs.length > 0 ? (
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div key={faq.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                        <p className="font-medium">{faq.question}</p>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        {faq.answer}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => handleDeleteFAQ(faq.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No FAQs yet</p>
              <p className="text-sm">
                Add questions and answers to help your agent respond better
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
