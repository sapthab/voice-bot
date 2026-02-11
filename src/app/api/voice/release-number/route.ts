import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { releasePhoneNumber } from "@/lib/voice/phone-numbers"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { agentId } = await request.json()

    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 })
    }

    // Verify user owns this agent
    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .single()

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    await releasePhoneNumber(agentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Release phone number error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
