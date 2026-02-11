"use client"

import { useEffect, useState, useRef, use, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
  X,
  MessageCircle,
  Loader2,
  User,
  Bot,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
}

interface Agent {
  id: string
  name: string
  welcome_message: string
  widget_color: string
  widget_title: string
  widget_subtitle: string | null
  lead_capture_enabled: boolean
  lead_capture_message: string
  lead_capture_fields: string[]
}

interface QuickPrompt {
  id: string
  text: string
}

interface WidgetPageProps {
  params: Promise<{ agentId: string }>
}

export default function WidgetPage({ params }: WidgetPageProps) {
  const { agentId } = use(params)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [showLeadCapture, setShowLeadCapture] = useState(false)
  const [leadData, setLeadData] = useState<Record<string, string>>({})
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize visitor ID
  useEffect(() => {
    let storedVisitorId = localStorage.getItem(`voicebot_visitor_${agentId}`)
    if (!storedVisitorId) {
      storedVisitorId = crypto.randomUUID()
      localStorage.setItem(`voicebot_visitor_${agentId}`, storedVisitorId)
    }
    setVisitorId(storedVisitorId)

    const leadKey = localStorage.getItem(`voicebot_lead_${agentId}`)
    if (leadKey) {
      setLeadSubmitted(true)
    }
  }, [agentId])

  // Fetch agent info
  useEffect(() => {
    async function fetchAgent() {
      try {
        const response = await fetch(`/api/agents/${agentId}`)
        if (response.ok) {
          const data = await response.json()
          setAgent(data.agent)
          setQuickPrompts(data.quickPrompts || [])
        }
      } catch (error) {
        console.error("Failed to fetch agent:", error)
      }
    }
    fetchAgent()
  }, [agentId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Show lead capture after 3 messages if enabled
  useEffect(() => {
    if (
      agent?.lead_capture_enabled &&
      !leadSubmitted &&
      messages.length >= 3 &&
      messages.length % 3 === 0
    ) {
      setShowLeadCapture(true)
    }
  }, [messages.length, agent?.lead_capture_enabled, leadSubmitted])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    // Create streaming placeholder
    const assistantMessageId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "", isStreaming: true },
    ])

    try {
      const response = await fetch("/api/chat?stream=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          conversationId,
          visitorId,
          message: text.trim(),
        }),
      })

      if (!response.ok || !response.body) {
        // Fallback to non-streaming
        const fallbackResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            conversationId,
            visitorId,
            message: text.trim(),
          }),
        })
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()
          setConversationId(data.conversationId)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: data.message, isStreaming: false }
                : msg
            )
          )
        }
        return
      }

      // Read conversation ID from headers
      const headerConvId = response.headers.get("X-Conversation-Id")
      const headerVisitorId = response.headers.get("X-Visitor-Id")
      if (headerConvId) setConversationId(headerConvId)
      if (headerVisitorId && !visitorId) setVisitorId(headerVisitorId)

      // Stream the response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.done) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, isStreaming: false }
                    : msg
                )
              )
            } else if (data.content) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + data.content }
                    : msg
                )
              )
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Sorry, something went wrong. Please try again.", isStreaming: false }
            : msg
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleLeadSubmit = async () => {
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          conversationId,
          ...leadData,
        }),
      })

      localStorage.setItem(`voicebot_lead_${agentId}`, "true")
      setLeadSubmitted(true)
      setShowLeadCapture(false)
    } catch (error) {
      console.error("Failed to submit lead:", error)
    }
  }

  const handleClose = useCallback(() => {
    // Show rating if 2+ user messages and not already rated
    const userMessages = messages.filter((m) => m.role === "user")
    if (userMessages.length >= 2 && !ratingSubmitted && conversationId) {
      setShowRating(true)
    } else {
      setIsOpen(false)
    }
  }, [messages, ratingSubmitted, conversationId])

  const handleRatingSubmit = async () => {
    if (rating > 0 && conversationId) {
      try {
        await fetch("/api/chat/rating", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, rating }),
        })
      } catch (error) {
        console.error("Failed to submit rating:", error)
      }
    }
    setRatingSubmitted(true)
    setShowRating(false)
    setIsOpen(false)
  }

  const widgetColor = agent?.widget_color || "#2563eb"

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
        style={{ backgroundColor: widgetColor }}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[380px] sm:h-[600px] sm:rounded-xl sm:shadow-2xl sm:border overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: widgetColor }}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{agent?.widget_title || "Chat with us"}</h3>
            {agent?.widget_subtitle && (
              <p className="text-sm opacity-80">{agent.widget_subtitle}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleClose}
          className="h-8 w-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Rating overlay */}
      {showRating && (
        <div className="absolute inset-0 bg-background/95 z-10 flex items-center justify-center">
          <div className="text-center space-y-4 p-6">
            <h3 className="text-lg font-semibold">How was your experience?</h3>
            <p className="text-sm text-muted-foreground">Rate your conversation</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      (ratingHover || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                onClick={handleRatingSubmit}
                style={{ backgroundColor: widgetColor }}
              >
                {rating > 0 ? "Submit" : "Skip"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {/* Welcome message */}
        {messages.length === 0 && agent && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${widgetColor}20` }}
              >
                <Bot className="h-4 w-4" style={{ color: widgetColor }} />
              </div>
              <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-[80%]">
                <p className="text-sm">{agent.welcome_message}</p>
              </div>
            </div>

            {quickPrompts.length > 0 && (
              <div className="flex flex-wrap gap-2 ml-11">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => sendMessage(prompt.text)}
                    className="text-sm px-3 py-1.5 rounded-full border hover:bg-muted transition-colors"
                  >
                    {prompt.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conversation */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 mb-4",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === "user" ? "bg-primary/10" : ""
              )}
              style={
                msg.role === "assistant"
                  ? { backgroundColor: `${widgetColor}20` }
                  : {}
              }
            >
              {msg.role === "user" ? (
                <User className="h-4 w-4 text-primary" />
              ) : (
                <Bot className="h-4 w-4" style={{ color: widgetColor }} />
              )}
            </div>
            <div
              className={cn(
                "rounded-lg p-3 max-w-[80%]",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-muted rounded-tl-none"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">
                {msg.content}
                {msg.isStreaming && msg.content === "" && (
                  <span className="inline-flex gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.1s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.2s]" />
                  </span>
                )}
                {msg.isStreaming && msg.content !== "" && (
                  <span className="inline-block w-1.5 h-4 bg-muted-foreground/50 animate-pulse ml-0.5 align-middle" />
                )}
              </p>
            </div>
          </div>
        ))}

        {/* Lead capture */}
        {showLeadCapture && !leadSubmitted && agent && (
          <div className="mt-4 p-4 rounded-lg border bg-muted/50">
            <p className="text-sm mb-3">{agent.lead_capture_message}</p>
            <div className="space-y-2">
              {(agent.lead_capture_fields as string[]).map((field: string) => (
                <Input
                  key={field}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={leadData[field] || ""}
                  onChange={(e) =>
                    setLeadData((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  className="text-sm"
                />
              ))}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleLeadSubmit}
                  style={{ backgroundColor: widgetColor }}
                >
                  Submit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowLeadCapture(false)}
                >
                  Maybe later
                </Button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            style={{ backgroundColor: widgetColor }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
