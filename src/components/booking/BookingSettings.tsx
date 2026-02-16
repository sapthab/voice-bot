"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { WorkingHoursEditor } from "./WorkingHoursEditor"
import { Calendar, Link2, Unlink, Save } from "lucide-react"
import { toast } from "sonner"

interface CalendarStatus {
  connected: boolean
  connection: {
    calendar_name: string | null
    provider: string
  } | null
  bookingEnabled: boolean
  bookingSettings: BookingSettings | null
}

interface BookingSettings {
  duration_minutes: number
  buffer_minutes: number
  working_hours: Record<string, { enabled: boolean; start: string; end: string }>
  max_advance_days: number
}

const DEFAULT_SETTINGS: BookingSettings = {
  duration_minutes: 30,
  buffer_minutes: 15,
  working_hours: {
    monday: { enabled: true, start: "09:00", end: "17:00" },
    tuesday: { enabled: true, start: "09:00", end: "17:00" },
    wednesday: { enabled: true, start: "09:00", end: "17:00" },
    thursday: { enabled: true, start: "09:00", end: "17:00" },
    friday: { enabled: true, start: "09:00", end: "17:00" },
    saturday: { enabled: false, start: "10:00", end: "14:00" },
    sunday: { enabled: false, start: "10:00", end: "14:00" },
  },
  max_advance_days: 30,
}

interface BookingSettingsProps {
  agentId: string
}

export function BookingSettings({ agentId }: BookingSettingsProps) {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    fetch(`/api/agents/${agentId}/calendar/status`)
      .then((r) => r.json())
      .then((data) => {
        setStatus(data)
        if (data.bookingSettings) {
          setSettings(data.bookingSettings)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId])

  const connectCalendar = async () => {
    setConnecting(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/calendar/connect`, {
        method: "POST",
      })
      const { authUrl } = await res.json()
      window.location.href = authUrl
    } catch {
      toast.error("Failed to start Google Calendar connection")
      setConnecting(false)
    }
  }

  const disconnectCalendar = async () => {
    const res = await fetch(`/api/agents/${agentId}/calendar/disconnect`, {
      method: "DELETE",
    })
    if (res.ok) {
      setStatus({ connected: false, connection: null, bookingEnabled: false, bookingSettings: null })
      toast.success("Calendar disconnected")
    }
  }

  const saveSettings = async () => {
    const res = await fetch(`/api/agents/${agentId}/calendar/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    if (res.ok) {
      toast.success("Booking settings saved")
      setDirty(false)
    } else {
      toast.error("Failed to save settings")
    }
  }

  if (loading) {
    return <div className="h-40 bg-muted animate-pulse rounded-lg" />
  }

  return (
    <div className="space-y-6">
      {/* Calendar Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to enable appointment booking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.connected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="success">Connected</Badge>
                <span className="text-sm text-muted-foreground">
                  {status.connection?.calendar_name || "Primary Calendar"}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={disconnectCalendar}>
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={connectCalendar} disabled={connecting}>
              <Link2 className="h-4 w-4 mr-2" />
              {connecting ? "Connecting..." : "Connect Google Calendar"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Booking Settings — only show when connected */}
      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Booking Configuration</CardTitle>
            <CardDescription>
              Configure appointment duration, buffer time, and working hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={settings.duration_minutes}
                  onChange={(e) => {
                    setSettings({ ...settings, duration_minutes: Number(e.target.value) })
                    setDirty(true)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Buffer (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={settings.buffer_minutes}
                  onChange={(e) => {
                    setSettings({ ...settings, buffer_minutes: Number(e.target.value) })
                    setDirty(true)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Max advance (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.max_advance_days}
                  onChange={(e) => {
                    setSettings({ ...settings, max_advance_days: Number(e.target.value) })
                    setDirty(true)
                  }}
                />
              </div>
            </div>

            <WorkingHoursEditor
              value={settings.working_hours}
              onChange={(wh) => {
                setSettings({ ...settings, working_hours: wh })
                setDirty(true)
              }}
            />

            {dirty && (
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
