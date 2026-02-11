import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const agentId = request.nextUrl.searchParams.get("agentId")

    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 })
    }

    // Get agent voice details
    const { data: agent, error } = await supabase
      .from("agents")
      .select("voice_enabled, phone_number, retell_agent_id, voice_id, voice_language, voice_speed, voice_welcome_message")
      .eq("id", agentId)
      .single()

    if (error || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Get call stats
    const { count: totalCalls } = await supabase
      .from("conversations")
      .select("id", { count: "exact" })
      .eq("agent_id", agentId)
      .eq("channel", "voice")

    const { count: completedCalls } = await supabase
      .from("conversations")
      .select("id", { count: "exact" })
      .eq("agent_id", agentId)
      .eq("channel", "voice")
      .eq("call_status", "completed")

    const { data: avgDuration } = await supabase
      .from("conversations")
      .select("call_duration")
      .eq("agent_id", agentId)
      .eq("channel", "voice")
      .not("call_duration", "is", null)

    const avgDurationValue = avgDuration && avgDuration.length > 0
      ? Math.round(
          avgDuration.reduce((sum, c) => sum + ((c as { call_duration: number }).call_duration || 0), 0) /
            avgDuration.length
        )
      : 0

    const agentData = agent as Record<string, unknown>
    return NextResponse.json({
      ...agentData,
      stats: {
        totalCalls: totalCalls || 0,
        completedCalls: completedCalls || 0,
        averageDuration: avgDurationValue,
      },
    })
  } catch (error) {
    console.error("Voice status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
