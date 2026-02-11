"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Message } from "@/types/database"

export function useRealtimeMessages(conversationId: string | null) {
  const [newMessages, setNewMessages] = useState<Message[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as Message
          setNewMessages((prev) => [...prev, message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const clearMessages = () => setNewMessages([])

  return { newMessages, clearMessages }
}
