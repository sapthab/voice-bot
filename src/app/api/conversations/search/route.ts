import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

interface SearchResultRow {
  conversation_id: string
  content: string
  role: string
  conversations: {
    id: string
    visitor_id: string
    channel: string
    created_at: string
    agent_id: string
    agents: { id: string; name: string; widget_color: string } | null
    leads: { id: string; name: string | null; email: string | null } | null
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const query = request.nextUrl.searchParams.get("q")
    const agentId = request.nextUrl.searchParams.get("agentId")

    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Query too short" }, { status: 400 })
    }

    // Get user's organization agents
    const membershipResult = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    const membership = membershipResult.data as { organization_id: string } | null
    if (!membership) {
      return NextResponse.json({ conversations: [] })
    }

    const agentsResult = await supabase
      .from("agents")
      .select("id")
      .eq("organization_id", membership.organization_id)

    const agentIds = (agentsResult.data || []).map((a: { id: string }) => a.id)

    if (agentIds.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    // Search messages using admin client for cross-table join
    const adminClient = await createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let messagesQuery = (adminClient.from("messages") as any)
      .select(`
        conversation_id,
        content,
        role,
        created_at,
        conversations!inner(
          id,
          visitor_id,
          channel,
          created_at,
          agent_id,
          agents(id, name, widget_color),
          leads(id, name, email)
        )
      `)
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(20)

    if (agentId) {
      messagesQuery = messagesQuery.eq("conversations.agent_id", agentId)
    }

    const { data: results, error } = await messagesQuery

    if (error) {
      console.error("Search error:", error)
      return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }

    // Deduplicate by conversation_id
    const seen = new Set<string>()
    const conversations = ((results || []) as SearchResultRow[])
      .filter((r) => {
        if (seen.has(r.conversation_id)) return false
        seen.add(r.conversation_id)
        return true
      })
      .map((r) => ({
        conversationId: r.conversation_id,
        matchedContent: r.content,
        matchedRole: r.role,
        conversation: r.conversations,
      }))

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("Conversation search error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
