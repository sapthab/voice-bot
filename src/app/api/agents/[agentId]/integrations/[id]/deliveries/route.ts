import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

interface RouteParams {
  params: Promise<{ agentId: string; id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId, id } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("webhook_deliveries")
    .select("*")
    .eq("integration_id", id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: "Failed to fetch deliveries" }, { status: 500 })
  }

  return NextResponse.json({ deliveries: data })
}
