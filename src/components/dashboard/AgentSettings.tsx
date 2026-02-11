"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Agent } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface AgentSettingsProps {
  agent: Agent
}

export function AgentSettings({ agent }: AgentSettingsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    name: agent.name,
    system_prompt: agent.system_prompt || "",
    welcome_message: agent.welcome_message,
    fallback_message: agent.fallback_message,
    widget_title: agent.widget_title,
    widget_subtitle: agent.widget_subtitle || "",
    widget_color: agent.widget_color,
    lead_capture_enabled: agent.lead_capture_enabled,
    lead_capture_message: agent.lead_capture_message,
    is_active: agent.is_active,
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) throw new Error("Failed to save")

      toast.success("Settings saved successfully")
      router.refresh()
    } catch (error) {
      toast.error("Failed to save settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic configuration for your agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={settings.name}
              onChange={(e) =>
                setSettings((s) => ({ ...s, name: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Agent Active</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable this agent
              </p>
            </div>
            <Switch
              checked={settings.is_active}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, is_active: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Behavior</CardTitle>
          <CardDescription>
            Configure how your agent responds to visitors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              value={settings.system_prompt}
              onChange={(e) =>
                setSettings((s) => ({ ...s, system_prompt: e.target.value }))
              }
              rows={8}
              placeholder="Instructions for how the AI should behave..."
            />
            <p className="text-xs text-muted-foreground">
              This prompt shapes the AI&apos;s personality and behavior
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcome_message">Welcome Message</Label>
            <Textarea
              id="welcome_message"
              value={settings.welcome_message}
              onChange={(e) =>
                setSettings((s) => ({ ...s, welcome_message: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fallback_message">Fallback Message</Label>
            <Textarea
              id="fallback_message"
              value={settings.fallback_message}
              onChange={(e) =>
                setSettings((s) => ({ ...s, fallback_message: e.target.value }))
              }
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Shown when the AI cannot understand a message
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Widget Appearance</CardTitle>
          <CardDescription>Customize how the chat widget looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="widget_title">Widget Title</Label>
              <Input
                id="widget_title"
                value={settings.widget_title}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, widget_title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="widget_subtitle">Widget Subtitle</Label>
              <Input
                id="widget_subtitle"
                value={settings.widget_subtitle}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, widget_subtitle: e.target.value }))
                }
                placeholder="Optional subtitle"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="widget_color">Widget Color</Label>
            <div className="flex gap-2">
              <Input
                id="widget_color"
                type="color"
                value={settings.widget_color}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, widget_color: e.target.value }))
                }
                className="w-16 h-9 p-1"
              />
              <Input
                value={settings.widget_color}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, widget_color: e.target.value }))
                }
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead Capture</CardTitle>
          <CardDescription>
            Collect visitor information during conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Lead Capture</Label>
              <p className="text-sm text-muted-foreground">
                Ask visitors for their contact information
              </p>
            </div>
            <Switch
              checked={settings.lead_capture_enabled}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, lead_capture_enabled: checked }))
              }
            />
          </div>
          {settings.lead_capture_enabled && (
            <div className="space-y-2">
              <Label htmlFor="lead_capture_message">Lead Capture Message</Label>
              <Textarea
                id="lead_capture_message"
                value={settings.lead_capture_message}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    lead_capture_message: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
