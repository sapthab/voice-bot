import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { executeTool, loadTools } from "@/lib/ai/tools"
import { Agent } from "@/types/database"

let toolsLoaded = false

export async function POST(request: NextRequest) {
  // Verify internal API secret
  const secret = process.env.INTERNAL_API_SECRET
  if (secret) {
    const providedSecret = request.headers.get("x-internal-secret")
    if (providedSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  // Ensure tools are loaded
  if (!toolsLoaded) {
    await loadTools()
    toolsLoaded = true
  }

  try {
    const { toolName, args, agentId, conversationId } = await request.json()

    if (!toolName || !agentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single()

    if (!agent) {
      return NextResponse.json({ success: false, error: "Agent not found" })
    }

    const result = await executeTool(toolName, args || {}, {
      agent: agent as Agent,
      conversationId: conversationId || "",
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Execute tool error:", error)
    return NextResponse.json(
      { success: false, error: "Tool execution failed" },
      { status: 500 }
    )
  }
}
