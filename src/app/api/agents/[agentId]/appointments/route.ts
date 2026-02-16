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
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")
  const upcoming = searchParams.get("upcoming") === "true"

  let query = supabase
    .from("appointments")
    .select("*")
    .eq("agent_id", agentId)
    .order("start_time", { ascending: true })

  if (status) {
    query = query.eq("status", status)
  }

  if (upcoming) {
    query = query.gte("start_time", new Date().toISOString())
  }

  const { data, error } = await query.limit(50)

  if (error) {
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
  }

  return NextResponse.json({ appointments: data })
}
