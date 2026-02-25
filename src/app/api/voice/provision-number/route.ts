import { NextRequest, NextResponse } from "next/server"
import { provisionPhoneNumber } from "@/lib/voice/phone-numbers"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { VoiceProviderType } from "@/lib/voice/types"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return unauthorizedResponse()

    const { agentId, areaCode, provider } = await request.json()

    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 })
    }

    const agent = await verifyAgentOwnership(agentId, user.id)
    if (!agent) return forbiddenResponse()

    const result = await provisionPhoneNumber(
      agentId,
      areaCode,
      provider as VoiceProviderType | undefined
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Provision phone number error:", error)
    return NextResponse.json(
      { error: "Failed to provision phone number" },
      { status: 500 }
    )
  }
}
