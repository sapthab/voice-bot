"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Conversation } from "@/types/database"

export function useRealtimeConversations(agentIds: string[]) {
  const [newConversations, setNewConversations] = useState<Conversation[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (agentIds.length === 0) return

    const channel = supabase
      .channel("conversations-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          const conversation = payload.new as Conversation
          if (agentIds.includes(conversation.agent_id)) {
            setNewConversations((prev) => [conversation, ...prev])
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          const updated = payload.new as Conversation
          if (agentIds.includes(updated.agent_id)) {
            setNewConversations((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [agentIds.join(",")])

  const clearNew = () => setNewConversations([])

  return { newConversations, clearNew }
}
