import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; sourceId: string }> }
) {
  try {
    const { agentId, sourceId } = await params

    const user = await getAuthenticatedUser()
    if (!user) return unauthorizedResponse()

    const agent = await verifyAgentOwnership(agentId, user.id)
    if (!agent) return forbiddenResponse()

    const supabase = await createAdminClient()

    // Delete associated document chunks first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("document_chunks") as any)
      .delete()
      .eq("training_source_id", sourceId)

    // Delete the training source
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("training_sources") as any)
      .delete()
      .eq("id", sourceId)
      .eq("agent_id", agentId)

    if (error) {
      console.error("Training source deletion error:", error)
      return NextResponse.json({ error: "Failed to delete training source" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Training source deletion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
