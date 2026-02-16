import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, getUserOrgId, unauthorizedResponse } from "@/lib/auth/api-auth"
import { getOverviewStats } from "@/lib/analytics/queries"

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const orgId = await getUserOrgId(user.id)
  if (!orgId) return unauthorizedResponse()

  const searchParams = request.nextUrl.searchParams
  const agentId = searchParams.get("agentId")
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const to = searchParams.get("to") || new Date().toISOString()

  const stats = await getOverviewStats(agentId, orgId, { from, to })
  return NextResponse.json(stats)
}
