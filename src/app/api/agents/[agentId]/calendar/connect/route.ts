import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { getGoogleAuthUrl } from "@/lib/calendar/google"

interface RouteParams {
  params: Promise<{ agentId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const authUrl = getGoogleAuthUrl(agentId)
  return NextResponse.json({ authUrl })
}
