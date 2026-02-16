import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

export async function POST(request: NextRequest) {
  try {
    const { agentId, conversationId, name, email, phone, company, ...customFields } =
      await request.json()

    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Create lead
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lead, error } = await (supabase.from("leads") as any)
      .insert({
        agent_id: agentId,
        conversation_id: conversationId || null,
        name: name || null,
        email: email || null,
        phone: phone || null,
        company: company || null,
        custom_fields: customFields,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating lead:", error)
      return NextResponse.json(
        { error: "Failed to create lead" },
        { status: 500 }
      )
    }

    // Update conversation with lead reference
    if (conversationId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("conversations") as any)
        .update({ lead_id: lead.id })
        .eq("id", conversationId)
    }

    // Track analytics event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("analytics_events") as any).insert({
      agent_id: agentId,
      event_type: "lead_captured",
      conversation_id: conversationId,
    })

    // Dispatch lead_captured to integrations (fire-and-forget)
    import("@/lib/integrations").then(({ dispatchEvent }) => {
      dispatchEvent("lead_captured", {
        agentId,
        conversationId,
        lead: lead as Record<string, unknown>,
      }).catch((err: unknown) => console.error("Integration dispatch error:", err))
    }).catch(() => {})

    return NextResponse.json({ lead })
  } catch (error) {
    console.error("Leads API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const searchParams = request.nextUrl.searchParams
  const agentId = searchParams.get("agentId")

  if (!agentId) {
    return NextResponse.json({ error: "Missing agentId" }, { status: 400 })
  }

  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const supabase = await createAdminClient()

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*, conversations!leads_conversation_id_fkey(id, started_at)")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Leads fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }

  return NextResponse.json({ leads })
}
