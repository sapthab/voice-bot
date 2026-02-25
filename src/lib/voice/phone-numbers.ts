import { createAdminClient } from "@/lib/supabase/server"
import { Agent } from "@/types/database"
import { VoiceProviderType } from "./types"
import { getVoiceProvider, resolveProvider } from "./provider-factory"

export async function provisionPhoneNumber(
  agentId: string,
  areaCode?: number,
  explicitProvider?: VoiceProviderType
) {
  const supabase = await createAdminClient()

  // Get agent details
  const { data, error: agentError } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single()

  if (agentError || !data) {
    throw new Error("Agent not found")
  }

  const agent = data as Agent

  // Resolve which provider to use
  const providerType = resolveProvider(
    agent.voice_language,
    undefined,
    explicitProvider
  )
  const provider = getVoiceProvider(providerType)

  // Provision via the resolved provider
  const result = await provider.provisionPhoneNumber(agent, areaCode)

  // Build update payload based on provider
  const updatePayload: Record<string, unknown> = {
    phone_number: result.phoneNumber,
    phone_number_sid: result.phoneNumberSid,
    voice_enabled: true,
    voice_provider: providerType,
  }

  if (providerType === "retell") {
    updatePayload.retell_agent_id = result.providerAgentId
  } else if (providerType === "bolna") {
    updatePayload.bolna_agent_id = result.providerAgentId
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("agents") as any)
    .update(updatePayload)
    .eq("id", agentId)

  return {
    providerAgentId: result.providerAgentId,
    phoneNumber: result.phoneNumber,
    phoneNumberSid: result.phoneNumberSid,
    provider: providerType,
    // Backward-compatible alias
    retellAgentId: providerType === "retell" ? result.providerAgentId : undefined,
  }
}

export async function releasePhoneNumber(agentId: string) {
  const supabase = await createAdminClient()

  // Get agent details including provider info
  const { data, error } = await supabase
    .from("agents")
    .select("retell_agent_id, bolna_agent_id, phone_number_sid, voice_provider")
    .eq("id", agentId)
    .single()

  if (error || !data) {
    throw new Error("Agent not found")
  }

  const agentData = data as {
    retell_agent_id: string | null
    bolna_agent_id: string | null
    phone_number_sid: string | null
    voice_provider: string | null
  }

  // Determine which provider to use
  const providerType = (agentData.voice_provider as VoiceProviderType) || "retell"
  const provider = getVoiceProvider(providerType)

  // Get the correct provider agent ID
  const providerAgentId =
    providerType === "bolna"
      ? agentData.bolna_agent_id
      : agentData.retell_agent_id

  if (providerAgentId && agentData.phone_number_sid) {
    await provider.releasePhoneNumber(providerAgentId, agentData.phone_number_sid)
  }

  // Clear all voice fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("agents") as any)
    .update({
      retell_agent_id: null,
      bolna_agent_id: null,
      phone_number: null,
      phone_number_sid: null,
      voice_enabled: false,
    })
    .eq("id", agentId)
}
