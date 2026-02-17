"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Agent } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Phone, PhoneOff, PhoneCall, AlertCircle } from "lucide-react"
import { SUPPORTED_LANGUAGES } from "@/lib/constants/languages"
import { getVoicesForLanguage, getDefaultVoiceForLanguage, hasNativeVoice } from "@/lib/constants/voices"

interface VoiceSettingsProps {
  agent: Agent
}

interface VoiceStatus {
  voice_enabled: boolean
  phone_number: string | null
  retell_agent_id: string | null
  voice_id: string | null
  voice_language: string
  voice_speed: number
  voice_welcome_message: string
  stats: {
    totalCalls: number
    completedCalls: number
    averageDuration: number
  }
}

export function VoiceSettings({ agent }: VoiceSettingsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null)
  const [settings, setSettings] = useState({
    voice_id: agent.voice_id || "11labs-Adrian",
    voice_language: agent.voice_language || "en-US",
    voice_speed: agent.voice_speed || 1.0,
    voice_welcome_message:
      agent.voice_welcome_message ||
      "Hello! Thank you for calling. How can I help you today?",
    language: (agent as Record<string, unknown>).language as string || "en-US",
  })

  const filteredVoices = getVoicesForLanguage(settings.voice_language)
  const showNoNativeVoiceWarning = !hasNativeVoice(settings.voice_language)

  useEffect(() => {
    fetchVoiceStatus()
  }, [agent.id])

  const fetchVoiceStatus = async () => {
    try {
      const response = await fetch(`/api/voice/status?agentId=${agent.id}`)
      if (response.ok) {
        const data = await response.json()
        setVoiceStatus(data)
      }
    } catch (error) {
      console.error("Failed to fetch voice status:", error)
    }
  }

  const handleLanguageChange = (value: string) => {
    const defaultVoice = getDefaultVoiceForLanguage(value)
    setSettings((s) => ({
      ...s,
      voice_language: value,
      language: value,
      voice_id: defaultVoice.id,
    }))
  }

  const handleProvision = async () => {
    setProvisioning(true)
    try {
      const response = await fetch("/api/voice/provision-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to provision number")
      }

      toast.success("Phone number provisioned successfully!")
      await fetchVoiceStatus()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to provision phone number")
    } finally {
      setProvisioning(false)
    }
  }

  const handleRelease = async () => {
    setReleasing(true)
    try {
      const response = await fetch("/api/voice/release-number", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id }),
      })

      if (!response.ok) throw new Error("Failed to release number")

      toast.success("Phone number released")
      await fetchVoiceStatus()
      router.refresh()
    } catch (error) {
      toast.error("Failed to release phone number")
    } finally {
      setReleasing(false)
    }
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) throw new Error("Failed to save")

      toast.success("Voice settings saved")
      router.refresh()
    } catch (error) {
      toast.error("Failed to save voice settings")
    } finally {
      setLoading(false)
    }
  }

  const isVoiceEnabled = voiceStatus?.voice_enabled || agent.voice_enabled

  return (
    <div className="space-y-6">
      {/* Voice Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Voice Status
          </CardTitle>
          <CardDescription>
            Enable voice calling for your AI agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isVoiceEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Active</Badge>
                    <span className="text-sm font-medium">Voice Enabled</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Phone Number:{" "}
                    <span className="font-mono font-medium">
                      {voiceStatus?.phone_number || agent.phone_number || "Loading..."}
                    </span>
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRelease}
                  disabled={releasing}
                >
                  {releasing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PhoneOff className="h-4 w-4 mr-2" />
                  )}
                  Release Number
                </Button>
              </div>

              {/* Call Stats */}
              {voiceStatus?.stats && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="text-2xl font-bold">{voiceStatus.stats.totalCalls}</div>
                    <div className="text-xs text-muted-foreground">Total Calls</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="text-2xl font-bold">{voiceStatus.stats.completedCalls}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="text-2xl font-bold">
                      {voiceStatus.stats.averageDuration > 0
                        ? `${Math.floor(voiceStatus.stats.averageDuration / 60)}:${String(voiceStatus.stats.averageDuration % 60).padStart(2, "0")}`
                        : "0:00"}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Duration</div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium mb-1">Call Forwarding</p>
                <p className="text-muted-foreground">
                  Forward your business phone to{" "}
                  <span className="font-mono">{voiceStatus?.phone_number || agent.phone_number}</span>{" "}
                  so the AI answers when you&apos;re unavailable.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <PhoneCall className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">Enable Voice Calling</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Get a phone number for your AI agent. Callers will interact with your
                  trained AI via voice.
                </p>
              </div>
              <Button onClick={handleProvision} disabled={provisioning}>
                {provisioning ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Phone className="h-4 w-4 mr-2" />
                )}
                Provision Phone Number
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voice Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Configuration</CardTitle>
          <CardDescription>
            Customize how your AI sounds on the phone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={settings.voice_language}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Voice</Label>
            <Select
              value={settings.voice_id}
              onValueChange={(value) =>
                setSettings((s) => ({ ...s, voice_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {filteredVoices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender === "male" ? "M" : "F"}, {voice.accent})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showNoNativeVoiceWarning && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                No native voice available for this language. Using English voices as fallback.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Speaking Speed: {settings.voice_speed.toFixed(1)}x
            </Label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.voice_speed}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  voice_speed: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slow (0.5x)</span>
              <span>Normal (1.0x)</span>
              <span>Fast (2.0x)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice_welcome_message">Welcome Message</Label>
            <Textarea
              id="voice_welcome_message"
              value={settings.voice_welcome_message}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  voice_welcome_message: e.target.value,
                }))
              }
              rows={3}
              placeholder="What the AI says when answering a call..."
            />
            <p className="text-xs text-muted-foreground">
              This is the first thing callers hear when the AI answers
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Voice Settings
        </Button>
      </div>
    </div>
  )
}
