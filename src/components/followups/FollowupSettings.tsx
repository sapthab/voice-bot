"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TemplateEditor } from "./TemplateEditor"
import { MessageSquare, Mail, Plus, Trash2, Save } from "lucide-react"
import { toast } from "sonner"

interface FollowupConfig {
  id: string
  channel: "sms" | "email"
  enabled: boolean
  delay_minutes: number
  template_body: string
  template_subject: string | null
  from_name: string | null
  from_email: string | null
}

interface FollowupSettingsProps {
  agentId: string
}

export function FollowupSettings({ agentId }: FollowupSettingsProps) {
  const [configs, setConfigs] = useState<FollowupConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/agents/${agentId}/followups`)
      .then((r) => r.json())
      .then((data) => setConfigs(data.configs || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId])

  const addConfig = async (channel: "sms" | "email") => {
    const defaultBody =
      channel === "sms"
        ? "Hi {{customer_name}}, thanks for reaching out to {{business_name}}! Here's a summary: {{summary}}"
        : "Hi {{customer_name}},\n\nThank you for contacting {{business_name}}.\n\nHere's a summary of our conversation:\n{{summary}}\n\nBest regards,\n{{agent_name}}"

    const res = await fetch(`/api/agents/${agentId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        template_body: defaultBody,
        template_subject: channel === "email" ? "Follow-up from {{business_name}}" : null,
        enabled: false,
      }),
    })

    if (res.ok) {
      const { config } = await res.json()
      setConfigs([...configs, config])
      toast.success(`${channel.toUpperCase()} follow-up added`)
    } else {
      toast.error("Failed to create follow-up config")
    }
  }

  const updateConfig = async (id: string, updates: Partial<FollowupConfig>) => {
    const res = await fetch(`/api/agents/${agentId}/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (res.ok) {
      const { config } = await res.json()
      setConfigs(configs.map((c) => (c.id === id ? config : c)))
      toast.success("Follow-up config updated")
    } else {
      toast.error("Failed to update config")
    }
  }

  const deleteConfig = async (id: string) => {
    const res = await fetch(`/api/agents/${agentId}/followups/${id}`, {
      method: "DELETE",
    })

    if (res.ok) {
      setConfigs(configs.filter((c) => c.id !== id))
      toast.success("Follow-up config deleted")
    } else {
      toast.error("Failed to delete config")
    }
  }

  if (loading) {
    return <div className="h-40 bg-muted animate-pulse rounded-lg" />
  }

  const smsConfigs = configs.filter((c) => c.channel === "sms")
  const emailConfigs = configs.filter((c) => c.channel === "email")

  return (
    <div className="space-y-6">
      {/* SMS Follow-ups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Follow-ups
            </CardTitle>
            <CardDescription>
              Send automatic SMS messages after conversations
            </CardDescription>
          </div>
          {smsConfigs.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => addConfig("sms")}>
              <Plus className="h-4 w-4 mr-1" />
              Add SMS
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {smsConfigs.map((config) => (
            <FollowupConfigCard
              key={config.id}
              config={config}
              onUpdate={(updates) => updateConfig(config.id, updates)}
              onDelete={() => deleteConfig(config.id)}
              agentId={agentId}
            />
          ))}
          {smsConfigs.length === 0 && (
            <p className="text-sm text-muted-foreground">No SMS follow-up configured</p>
          )}
        </CardContent>
      </Card>

      {/* Email Follow-ups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Follow-ups
            </CardTitle>
            <CardDescription>
              Send automatic email messages after conversations
            </CardDescription>
          </div>
          {emailConfigs.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => addConfig("email")}>
              <Plus className="h-4 w-4 mr-1" />
              Add Email
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {emailConfigs.map((config) => (
            <FollowupConfigCard
              key={config.id}
              config={config}
              onUpdate={(updates) => updateConfig(config.id, updates)}
              onDelete={() => deleteConfig(config.id)}
              agentId={agentId}
            />
          ))}
          {emailConfigs.length === 0 && (
            <p className="text-sm text-muted-foreground">No email follow-up configured</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FollowupConfigCard({
  config,
  onUpdate,
  onDelete,
  agentId,
}: {
  config: FollowupConfig
  onUpdate: (updates: Partial<FollowupConfig>) => void
  onDelete: () => void
  agentId: string
}) {
  const [templateBody, setTemplateBody] = useState(config.template_body)
  const [templateSubject, setTemplateSubject] = useState(config.template_subject || "")
  const [delayMinutes, setDelayMinutes] = useState(config.delay_minutes)
  const [dirty, setDirty] = useState(false)

  const save = () => {
    onUpdate({
      template_body: templateBody,
      template_subject: templateSubject || null,
      delay_minutes: delayMinutes,
    })
    setDirty(false)
  }

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => onUpdate({ enabled })}
          />
          <span className="text-sm font-medium">
            {config.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <Button size="sm" onClick={save}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {config.channel === "email" && (
        <div className="space-y-1">
          <Label className="text-xs">Subject</Label>
          <Input
            value={templateSubject}
            onChange={(e) => {
              setTemplateSubject(e.target.value)
              setDirty(true)
            }}
            placeholder="Follow-up from {{business_name}}"
          />
        </div>
      )}

      <TemplateEditor
        value={templateBody}
        onChange={(v) => {
          setTemplateBody(v)
          setDirty(true)
        }}
        label="Message Template"
      />

      <div className="space-y-1">
        <Label className="text-xs">Delay (minutes)</Label>
        <Input
          type="number"
          min={0}
          value={delayMinutes}
          onChange={(e) => {
            setDelayMinutes(Number(e.target.value))
            setDirty(true)
          }}
          className="w-24"
        />
      </div>
    </div>
  )
}
