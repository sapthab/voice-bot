import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { conversationId, rating } = await request.json()

    if (!conversationId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Missing conversationId or invalid rating (1-5)" },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("conversations") as any)
      .update({ satisfaction_rating: rating })
      .eq("id", conversationId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Track analytics
    const { data: conversation } = await supabase
      .from("conversations")
      .select("agent_id, visitor_id")
      .eq("id", conversationId)
      .single()

    if (conversation) {
      const convData = conversation as { agent_id: string; visitor_id: string }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("analytics_events") as any).insert({
        agent_id: convData.agent_id,
        event_type: "satisfaction_rated",
        visitor_id: convData.visitor_id,
        conversation_id: conversationId,
        metadata: { rating },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Rating error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
