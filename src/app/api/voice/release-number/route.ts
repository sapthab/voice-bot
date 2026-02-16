import { NextRequest, NextResponse } from "next/server"
import { releasePhoneNumber } from "@/lib/voice/phone-numbers"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return unauthorizedResponse()

    const { agentId } = await request.json()

    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 })
    }

    const agent = await verifyAgentOwnership(agentId, user.id)
    if (!agent) return forbiddenResponse()

    await releasePhoneNumber(agentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Release phone number error:", error)
    return NextResponse.json(
      { error: "Failed to release phone number" },
      { status: 500 }
    )
  }
}
