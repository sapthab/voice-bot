import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

/**
 * Authenticates the current request and returns the user.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Gets the organization ID for an authenticated user.
 * Returns null if the user has no org membership.
 */
export async function getUserOrgId(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .single()
  return (data as { organization_id: string } | null)?.organization_id ?? null
}

/**
 * Verifies that the user's organization owns the specified agent.
 * Returns the agent if authorized, null otherwise.
 */
export async function verifyAgentOwnership(agentId: string, userId: string) {
  const orgId = await getUserOrgId(userId)
  if (!orgId) return null

  const adminClient = await createAdminClient()
  const { data: agent } = await adminClient
    .from("agents")
    .select("id, organization_id")
    .eq("id", agentId)
    .single()

  const agentData = agent as { id: string; organization_id: string } | null
  if (!agentData || agentData.organization_id !== orgId) return null

  return agentData
}

/** Standard 401 response */
export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

/** Standard 403 response */
export function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
