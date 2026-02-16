import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

interface RouteParams {
  params: Promise<{ agentId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const body = await request.json()
  const supabase = await createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("agents") as any)
    .update({
      booking_settings: body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId)

  if (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
