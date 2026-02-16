"use client"

import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const VARIABLES = [
  { key: "customer_name", label: "Customer Name" },
  { key: "business_name", label: "Business Name" },
  { key: "agent_name", label: "Agent Name" },
  { key: "summary", label: "Conversation Summary" },
  { key: "appointment_time", label: "Appointment Time" },
]

interface TemplateEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function TemplateEditor({ value, onChange, label }: TemplateEditorProps) {
  const insertVariable = (key: string) => {
    onChange(value + `{{${key}}}`)
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Write your follow-up message template..."
      />
      <div className="flex flex-wrap gap-1">
        <span className="text-xs text-muted-foreground mr-1 self-center">Insert:</span>
        {VARIABLES.map((v) => (
          <Button
            key={v.key}
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => insertVariable(v.key)}
            type="button"
          >
            {v.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
