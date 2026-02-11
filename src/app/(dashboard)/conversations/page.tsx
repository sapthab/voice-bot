import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, User, Bot, Phone, AlertTriangle, Search } from "lucide-react"
import { ConversationSearch } from "@/components/dashboard/ConversationSearch"
import { formatRelativeTime } from "@/lib/utils"
import Link from "next/link"
import { CallLogEntry } from "@/components/dashboard/CallLogEntry"

interface AgentInfo {
  id: string
  name: string
  widget_color: string
}

interface LeadInfo {
  id: string
  name: string | null
  email: string | null
}

interface MessageInfo {
  id: string
  role: string
  content: string
  created_at: string
}

interface ConversationWithRelations {
  id: string
  visitor_id: string
  created_at: string
  channel: string
  call_from: string | null
  call_to: string | null
  call_status: string | null
  call_duration: number | null
  call_recording_url: string | null
  call_transcript: string | null
  escalated: boolean
  satisfaction_rating: number | null
  agents: AgentInfo | null
  messages: MessageInfo[]
  leads: LeadInfo | null
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string; channel?: string }>
}) {
  const { agentId, channel } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get organization
  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single()

  const membership = membershipResult.data as { organization_id: string } | null

  // Get agents for this organization
  const agentsResult = await supabase
    .from("agents")
    .select("id, name")
    .eq("organization_id", membership?.organization_id || "")

  const agents = (agentsResult.data || []) as { id: string; name: string }[]
  const agentIds = agents.map((a) => a.id)

  // Build query for conversations
  let query = supabase
    .from("conversations")
    .select(
      `
      *,
      agents(id, name, widget_color),
      messages(id, role, content, created_at),
      leads(id, name, email)
    `
    )
    .in("agent_id", agentIds.length > 0 ? agentIds : [""])
    .order("created_at", { ascending: false })
    .limit(50)

  if (agentId) {
    query = query.eq("agent_id", agentId)
  }

  if (channel && channel !== "all") {
    query = query.eq("channel", channel)
  }

  const { data } = await query
  const conversations = (data || []) as ConversationWithRelations[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold heading">Conversations</h1>
        <p className="text-muted-foreground">
          View chat and voice conversations with your visitors
        </p>
      </div>

      {/* Search */}
      <ConversationSearch />

      {/* Channel Filters */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`/conversations${agentId ? `?agentId=${agentId}` : ""}`}>
          <Badge
            variant={!channel || channel === "all" ? "default" : "outline"}
            className="cursor-pointer"
          >
            All
          </Badge>
        </Link>
        <Link
          href={`/conversations?channel=chat${agentId ? `&agentId=${agentId}` : ""}`}
        >
          <Badge
            variant={channel === "chat" ? "default" : "outline"}
            className="cursor-pointer"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Chat
          </Badge>
        </Link>
        <Link
          href={`/conversations?channel=voice${agentId ? `&agentId=${agentId}` : ""}`}
        >
          <Badge
            variant={channel === "voice" ? "default" : "outline"}
            className="cursor-pointer"
          >
            <Phone className="h-3 w-3 mr-1" />
            Voice
          </Badge>
        </Link>

        <span className="w-px bg-border mx-1" />

        {/* Agent Filters */}
        <Link href={`/conversations${channel ? `?channel=${channel}` : ""}`}>
          <Badge
            variant={!agentId ? "default" : "outline"}
            className="cursor-pointer"
          >
            All Agents
          </Badge>
        </Link>
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/conversations?agentId=${agent.id}${channel ? `&channel=${channel}` : ""}`}
          >
            <Badge
              variant={agentId === agent.id ? "default" : "outline"}
              className="cursor-pointer"
            >
              {agent.name}
            </Badge>
          </Link>
        ))}
      </div>

      {conversations.length > 0 ? (
        <div className="space-y-3">
          {conversations.map((conversation) => {
            // Voice conversations use CallLogEntry
            if (conversation.channel === "voice") {
              return (
                <CallLogEntry
                  key={conversation.id}
                  conversation={conversation}
                />
              )
            }

            // Chat conversations
            const messages = conversation.messages || []
            const lastMessage = messages[messages.length - 1]
            const agent = conversation.agents
            const lead = conversation.leads

            return (
              <Card
                key={conversation.id}
                className="hover:shadow-md transition-shadow"
              >
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
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {lead?.name ||
                              `Visitor ${conversation.visitor_id.slice(0, 8)}`}
                          </span>
                          {lead?.email && (
                            <span className="text-sm text-muted-foreground">
                              {lead.email}
                            </span>
                          )}
                          {conversation.escalated && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Escalated
                            </Badge>
                          )}
                          {conversation.satisfaction_rating && (
                            <Badge variant="outline" className="text-xs">
                              {"★".repeat(conversation.satisfaction_rating)}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatRelativeTime(conversation.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {agent?.name || "Unknown Agent"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {messages.length} messages
                        </span>
                      </div>
                      {lastMessage && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {lastMessage.role === "assistant" && (
                            <Bot className="h-3 w-3 inline mr-1" />
                          )}
                          {lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
            <p className="text-muted-foreground text-center">
              Conversations will appear here when visitors chat with or call your
              agents
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
