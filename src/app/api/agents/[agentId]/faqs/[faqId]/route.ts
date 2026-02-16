import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; faqId: string }> }
) {
  try {
    const { agentId, faqId } = await params

    const user = await getAuthenticatedUser()
    if (!user) return unauthorizedResponse()

    const agent = await verifyAgentOwnership(agentId, user.id)
    if (!agent) return forbiddenResponse()

    const supabase = await createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("faqs") as any)
      .delete()
      .eq("id", faqId)
      .eq("agent_id", agentId)

    if (error) {
      console.error("FAQ deletion error:", error)
      return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("FAQ deletion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
