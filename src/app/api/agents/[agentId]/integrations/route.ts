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
    .from("integrations")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 })
  }

  // Redact sensitive config fields
  const redacted = (data || []).map((i) => {
    const integration = i as Record<string, unknown>
    const config = (integration.config || {}) as Record<string, unknown>
    return {
      ...integration,
      config: {
        ...config,
        api_key: config.api_key ? "••••••••" : undefined,
        hmac_secret: config.hmac_secret ? "••••••••" : undefined,
      },
    }
  })

  return NextResponse.json({ integrations: redacted })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const body = await request.json()
  const { provider, name, config, field_mapping, enabled_events, enabled } = body

  if (!provider || !name) {
    return NextResponse.json({ error: "provider and name are required" }, { status: 400 })
  }

  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("integrations") as any)
    .insert({
      agent_id: agentId,
      provider,
      name,
      config: config || {},
      field_mapping: field_mapping || {},
      enabled_events: enabled_events || [],
      enabled: enabled ?? false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 })
  }

  return NextResponse.json({ integration: data }, { status: 201 })
}
