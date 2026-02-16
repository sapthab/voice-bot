import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

interface RouteParams {
  params: Promise<{ agentId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("followup_configs")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: "Failed to fetch configs" }, { status: 500 })
  }

  return NextResponse.json({ configs: data })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const body = await request.json()
  const { channel, template_body, template_subject, delay_minutes, from_name, from_email, enabled } = body

  if (!channel || !template_body) {
    return NextResponse.json({ error: "channel and template_body are required" }, { status: 400 })
  }

  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("followup_configs") as any)
    .insert({
      agent_id: agentId,
      channel,
      template_body,
      template_subject: template_subject || null,
      delay_minutes: delay_minutes || 0,
      from_name: from_name || null,
      from_email: from_email || null,
      enabled: enabled ?? true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to create config" }, { status: 500 })
  }

  return NextResponse.json({ config: data }, { status: 201 })
}
