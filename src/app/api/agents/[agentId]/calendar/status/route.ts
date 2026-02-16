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

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("id, provider, calendar_id, calendar_name, settings, created_at")
    .eq("agent_id", agentId)
    .single()

  const { data: agentData } = await supabase
    .from("agents")
    .select("booking_enabled, booking_settings")
    .eq("id", agentId)
    .single()

  const agentRecord = agentData as Record<string, unknown> | null

  return NextResponse.json({
    connected: !!connection,
    connection: connection || null,
    bookingEnabled: agentRecord?.booking_enabled || false,
    bookingSettings: agentRecord?.booking_settings || null,
  })
}
