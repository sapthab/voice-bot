import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

interface RouteParams {
  params: Promise<{ agentId: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const supabase = await createAdminClient()

  // Delete calendar connection
  await supabase
    .from("calendar_connections")
    .delete()
    .eq("agent_id", agentId)

  // Disable booking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("agents") as any)
    .update({ booking_enabled: false })
    .eq("id", agentId)

  return NextResponse.json({ success: true })
}
