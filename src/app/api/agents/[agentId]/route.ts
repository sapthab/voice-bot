import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { Agent } from "@/types/database"

interface QuickPrompt {
  id: string
  text: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params

  const supabase = await createAdminClient()

  // Fetch agent
  const agentResult = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("is_active", true)
    .single()

  const agent = agentResult.data as Agent | null

  if (agentResult.error || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  // Fetch quick prompts
  const promptsResult = await supabase
    .from("quick_prompts")
    .select("id, text")
    .eq("agent_id", agentId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  const quickPrompts = (promptsResult.data || []) as QuickPrompt[]

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      welcome_message: agent.welcome_message,
      widget_color: agent.widget_color,
      widget_title: agent.widget_title,
      widget_subtitle: agent.widget_subtitle,
      lead_capture_enabled: agent.lead_capture_enabled,
      lead_capture_message: agent.lead_capture_message,
      lead_capture_fields: agent.lead_capture_fields,
    },
    quickPrompts,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params
  const body = await request.json()

  const supabase = await createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("agents") as any)
    .update(body)
    .eq("id", agentId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ agent: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params

  const supabase = await createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("agents") as any).delete().eq("id", agentId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
