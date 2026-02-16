import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

interface RouteParams {
  params: Promise<{ agentId: string; configId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId, configId } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const body = await request.json()
  const supabase = await createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("followup_configs") as any)
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", configId)
    .eq("agent_id", agentId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 })
  }

  return NextResponse.json({ config: data })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId, configId } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const supabase = await createAdminClient()
  const { error } = await supabase
    .from("followup_configs")
    .delete()
    .eq("id", configId)
    .eq("agent_id", agentId)

  if (error) {
    return NextResponse.json({ error: "Failed to delete config" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
