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

  // Get config IDs for this agent
  const { data: configs } = await supabase
    .from("followup_configs")
    .select("id")
    .eq("agent_id", agentId)

  const configIds = (configs || []).map((c) => (c as { id: string }).id)

  if (configIds.length === 0) {
    return NextResponse.json({ deliveries: [] })
  }

  const { data: deliveries, error } = await supabase
    .from("followup_deliveries")
    .select("*, followup_configs!followup_deliveries_followup_config_id_fkey(channel)")
    .in("followup_config_id", configIds)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: "Failed to fetch deliveries" }, { status: 500 })
  }

  return NextResponse.json({ deliveries })
}
