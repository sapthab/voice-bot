"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AudioPlayer } from "@/components/ui/audio-player"
import {
  PhoneIncoming,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

interface CallLogEntryProps {
  conversation: {
    id: string
    visitor_id: string
    created_at: string
    call_from: string | null
    call_to: string | null
    call_status: string | null
    call_duration: number | null
    call_recording_url: string | null
    call_transcript: string | null
    escalated?: boolean | null
    satisfaction_rating?: number | null
    agents: { id: string; name: string; widget_color: string } | null
  }
}

export function CallLogEntry({ conversation }: CallLogEntryProps) {
  const [showTranscript, setShowTranscript] = useState(false)

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  const statusColor = {
    completed: "success",
    in_progress: "default",
    ringing: "secondary",
    failed: "destructive",
    no_answer: "secondary",
  } as const

  const agent = conversation.agents

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: agent?.widget_color
                ? `${agent.widget_color}20`
                : "#e5e7eb",
            }}
          >
            <PhoneIncoming className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium font-mono text-sm">
                  {conversation.call_from || "Unknown Caller"}
                </span>
                <Badge
                  variant={
                    statusColor[
                      conversation.call_status as keyof typeof statusColor
                    ] || "secondary"
                  }
                  className="text-xs"
                >
                  {conversation.call_status || "unknown"}
                </Badge>
                {conversation.escalated && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Escalated
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatRelativeTime(conversation.created_at)}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="text-xs">
                {agent?.name || "Unknown Agent"}
              </Badge>
              {conversation.call_duration !== null && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(conversation.call_duration)}
                </span>
              )}
              {conversation.satisfaction_rating && (
                <Badge variant="outline" className="text-xs">
                  {"★".repeat(conversation.satisfaction_rating)}
                </Badge>
              )}
            </div>

            {/* Audio Player */}
            {conversation.call_recording_url && (
              <AudioPlayer src={conversation.call_recording_url} className="mt-2" />
            )}

            {/* Transcript Toggle */}
            {conversation.call_transcript && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="h-7 px-2 text-xs"
                >
                  {showTranscript ? (
                    <ChevronUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  )}
                  {showTranscript ? "Hide" : "View"} Transcript
                </Button>
                {showTranscript && (
                  <div className="mt-2 p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {conversation.call_transcript}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
