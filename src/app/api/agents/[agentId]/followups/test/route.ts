import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { sendSMS } from "@/lib/followups/sms"
import { sendEmail } from "@/lib/followups/email"

interface RouteParams {
  params: Promise<{ agentId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const { channel, recipient, body: messageBody, subject } = await request.json()

  if (!channel || !recipient || !messageBody) {
    return NextResponse.json(
      { error: "channel, recipient, and body are required" },
      { status: 400 }
    )
  }

  let result: { success: boolean; messageId?: string; error?: string }

  if (channel === "sms") {
    result = await sendSMS({ to: recipient, body: messageBody })
  } else if (channel === "email") {
    result = await sendEmail({
      to: recipient,
      subject: subject || "Test Follow-up",
      body: messageBody,
    })
  } else {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 })
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: result.messageId })
}
