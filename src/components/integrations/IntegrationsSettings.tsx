"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Save, TestTube, Webhook, Globe } from "lucide-react"
import { toast } from "sonner"

interface Integration {
  id: string
  provider: "hubspot" | "webhook"
  name: string
  enabled: boolean
  config: Record<string, unknown>
  field_mapping: Record<string, string>
  enabled_events: string[]
  created_at: string
}

interface IntegrationsSettingsProps {
  agentId: string
}

const ALL_EVENTS = [
  { id: "lead_captured", label: "Lead Captured" },
  { id: "call_completed", label: "Call Completed" },
  { id: "chat_completed", label: "Chat Completed" },
  { id: "appointment_booked", label: "Appointment Booked" },
]

export function IntegrationsSettings({ agentId }: IntegrationsSettingsProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/agents/${agentId}/integrations`)
      .then((r) => r.json())
      .then((data) => setIntegrations(data.integrations || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId])

  const addIntegration = async (provider: "hubspot" | "webhook") => {
    const name = provider === "hubspot" ? "HubSpot" : "Webhook"
    const res = await fetch(`/api/agents/${agentId}/integrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        name,
        config: provider === "hubspot" ? { api_key: "" } : { url: "", hmac_secret: "" },
        field_mapping:
          provider === "hubspot"
            ? { "lead.email": "email", "lead.name": "firstname", "lead.phone": "phone", "lead.company": "company" }
            : {},
        enabled_events: ["lead_captured", "call_completed", "chat_completed"],
        enabled: false,
      }),
    })

    if (res.ok) {
      const { integration } = await res.json()
      setIntegrations([...integrations, integration])
      toast.success(`${name} integration added`)
    }
  }

  const deleteIntegration = async (id: string) => {
    const res = await fetch(`/api/agents/${agentId}/integrations/${id}`, {
      method: "DELETE",
    })
    if (res.ok) {
      setIntegrations(integrations.filter((i) => i.id !== id))
      toast.success("Integration deleted")
    }
  }

  const updateIntegration = async (id: string, updates: Partial<Integration>) => {
    const res = await fetch(`/api/agents/${agentId}/integrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const { integration } = await res.json()
      setIntegrations(integrations.map((i) => (i.id === id ? integration : i)))
      toast.success("Integration updated")
    }
  }

  const testIntegration = async (id: string) => {
    toast.info("Testing connection...")
    const res = await fetch(`/api/agents/${agentId}/integrations/${id}/test`, {
      method: "POST",
    })
    const result = await res.json()
    if (result.success) {
      toast.success("Connection successful!")
    } else {
      toast.error(result.error || "Connection failed")
    }
  }

  if (loading) {
    return <div className="h-40 bg-muted animate-pulse rounded-lg" />
  }

  const hasHubSpot = integrations.some((i) => i.provider === "hubspot")
  const hasWebhook = integrations.some((i) => i.provider === "webhook")

  return (
    <div className="space-y-6">
      {/* Add buttons */}
      <div className="flex gap-2">
        {!hasHubSpot && (
          <Button variant="outline" onClick={() => addIntegration("hubspot")}>
            <Globe className="h-4 w-4 mr-2" />
            Add HubSpot
          </Button>
        )}
        {!hasWebhook && (
          <Button variant="outline" onClick={() => addIntegration("webhook")}>
            <Webhook className="h-4 w-4 mr-2" />
            Add Webhook
          </Button>
        )}
      </div>

      {integrations.map((integration) => (
        <IntegrationCard
          key={integration.id}
          integration={integration}
          agentId={agentId}
          onUpdate={(updates) => updateIntegration(integration.id, updates)}
          onDelete={() => deleteIntegration(integration.id)}
          onTest={() => testIntegration(integration.id)}
        />
      ))}

      {integrations.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No integrations configured yet. Add HubSpot or a webhook to get started.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function IntegrationCard({
  integration,
  agentId,
  onUpdate,
  onDelete,
  onTest,
}: {
  integration: Integration
  agentId: string
  onUpdate: (updates: Partial<Integration>) => void
  onDelete: () => void
  onTest: () => void
}) {
  const [config, setConfig] = useState(integration.config)
  const [events, setEvents] = useState(integration.enabled_events)
  const [dirty, setDirty] = useState(false)
  const [deliveries, setDeliveries] = useState<Array<Record<string, unknown>>>([])
  const [showDeliveries, setShowDeliveries] = useState(false)

  const save = () => {
    onUpdate({ config, enabled_events: events })
    setDirty(false)
  }

  const loadDeliveries = () => {
    if (!showDeliveries) {
      fetch(`/api/agents/${agentId}/integrations/${integration.id}/deliveries`)
        .then((r) => r.json())
        .then((data) => setDeliveries(data.deliveries || []))
    }
    setShowDeliveries(!showDeliveries)
  }

  const toggleEvent = (eventId: string) => {
    const newEvents = events.includes(eventId)
      ? events.filter((e) => e !== eventId)
      : [...events, eventId]
    setEvents(newEvents)
    setDirty(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {integration.provider === "hubspot" ? (
              <Globe className="h-5 w-5" />
            ) : (
              <Webhook className="h-5 w-5" />
            )}
            {integration.name}
          </CardTitle>
          <CardDescription className="capitalize">{integration.provider}</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={integration.enabled}
            onCheckedChange={(enabled) => onUpdate({ enabled })}
          />
          <Button variant="outline" size="sm" onClick={onTest}>
            <TestTube className="h-4 w-4 mr-1" />
            Test
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Config fields */}
        {integration.provider === "hubspot" ? (
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={(config.api_key as string) || ""}
              onChange={(e) => {
                setConfig({ ...config, api_key: e.target.value })
                setDirty(true)
              }}
              placeholder="pat-na1-xxxxxxxx"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                value={(config.url as string) || ""}
                onChange={(e) => {
                  setConfig({ ...config, url: e.target.value })
                  setDirty(true)
                }}
                placeholder="https://hooks.zapier.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>HMAC Secret (optional)</Label>
              <Input
                type="password"
                value={(config.hmac_secret as string) || ""}
                onChange={(e) => {
                  setConfig({ ...config, hmac_secret: e.target.value })
                  setDirty(true)
                }}
                placeholder="Optional signing secret"
              />
            </div>
          </div>
        )}

        {/* Event subscriptions */}
        <div className="space-y-2">
          <Label>Events</Label>
          <div className="flex flex-wrap gap-3">
            {ALL_EVENTS.map((event) => (
              <label key={event.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={events.includes(event.id)}
                  onCheckedChange={() => toggleEvent(event.id)}
                />
                {event.label}
              </label>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {dirty && (
            <Button size="sm" onClick={save}>
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadDeliveries}>
            {showDeliveries ? "Hide" : "Show"} Delivery Log
          </Button>
        </div>

        {/* Delivery log */}
        {showDeliveries && deliveries.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.slice(0, 10).map((d) => (
                <TableRow key={d.id as string}>
                  <TableCell className="text-sm">{d.event as string}</TableCell>
                  <TableCell>
                    <Badge variant={(d.status as string) === "sent" ? "success" : "destructive"}>
                      {d.status as string}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.response_code ? `HTTP ${d.response_code}` : (d.error_message as string) || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(d.created_at as string).toLocaleString()}
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
