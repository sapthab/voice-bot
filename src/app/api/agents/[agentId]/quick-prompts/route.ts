import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const { text, sortOrder } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("quick_prompts") as any)
      .insert({
        agent_id: agentId,
        text,
        sort_order: sortOrder || 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quickPrompt: data })
  } catch (error) {
    console.error("Quick prompt creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
