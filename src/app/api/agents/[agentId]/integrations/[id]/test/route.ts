import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { testHubSpotConnection } from "@/lib/integrations/hubspot"

interface RouteParams {
  params: Promise<{ agentId: string; id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { agentId, id } = await params
  const agent = await verifyAgentOwnership(agentId, user.id)
  if (!agent) return forbiddenResponse()

  const supabase = await createAdminClient()
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", id)
    .eq("agent_id", agentId)
    .single()

  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 })
  }

  const intData = integration as Record<string, unknown>
  const provider = intData.provider as string
  const config = (intData.config || {}) as Record<string, unknown>

  let result: { success: boolean; error?: string }

  if (provider === "hubspot") {
    result = await testHubSpotConnection(config.api_key as string)
  } else if (provider === "webhook") {
    // Test webhook by sending a test event
    try {
      const response = await fetch(config.url as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "test",
          timestamp: new Date().toISOString(),
          agent: { id: agentId },
          data: { test: true },
        }),
        signal: AbortSignal.timeout(10000),
      })
      result = { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` }
    } catch (error) {
      result = { success: false, error: error instanceof Error ? error.message : "Connection failed" }
    }
  } else {
    result = { success: false, error: `Unknown provider: ${provider}` }
  }

  return NextResponse.json(result)
}
