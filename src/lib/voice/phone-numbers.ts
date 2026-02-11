import { getRetellClient } from "./retell"
import { createAdminClient } from "@/lib/supabase/server"
import { Agent } from "@/types/database"

export async function provisionPhoneNumber(
  agentId: string,
  areaCode?: number
) {
  const retell = getRetellClient()
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

  // Create Retell LLM
  const llm = await retell.llm.create({
    general_prompt: agent.system_prompt || `You are a helpful AI assistant for ${agent.name}.`,
    begin_message: agent.voice_welcome_message || "Hello! Thank you for calling. How can I help you today?",
  })

  // Create Retell agent with Custom LLM response engine
  const retellAgent = await retell.agent.create({
    response_engine: {
      type: "custom-llm",
      llm_websocket_url: `${process.env.NEXT_PUBLIC_APP_URL!.replace(/^http/, 'ws')}/ws/retell/llm`,
    },
    voice_id: agent.voice_id || "11labs-Adrian",
    agent_name: agent.name,
    language: (agent.voice_language as "en-US") || "en-US",
    responsiveness: agent.voice_speed || 1.0,
  })

  // Purchase phone number with inbound agent binding
  const phoneNumber = await retell.phoneNumber.create({
    inbound_agent_id: retellAgent.agent_id,
    ...(areaCode ? { area_code: areaCode } : {}),
  })

  // Update agent record with voice details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("agents") as any)
    .update({
      retell_agent_id: retellAgent.agent_id,
      phone_number: phoneNumber.phone_number,
      phone_number_sid: phoneNumber.phone_number,
      voice_enabled: true,
    })
    .eq("id", agentId)

  return {
    retellAgentId: retellAgent.agent_id,
    phoneNumber: phoneNumber.phone_number,
    phoneNumberSid: phoneNumber.phone_number,
  }
}

export async function releasePhoneNumber(agentId: string) {
  const retell = getRetellClient()
  const supabase = await createAdminClient()

  // Get agent details
  const { data, error } = await supabase
    .from("agents")
    .select("retell_agent_id, phone_number_sid")
    .eq("id", agentId)
    .single()

  if (error || !data) {
    throw new Error("Agent not found")
  }

  const agentData = data as { retell_agent_id: string | null; phone_number_sid: string | null }

  // Release phone number from Retell (uses phone_number as ID)
  if (agentData.phone_number_sid) {
    await retell.phoneNumber.delete(agentData.phone_number_sid)
  }

  // Delete Retell agent
  if (agentData.retell_agent_id) {
    await retell.agent.delete(agentData.retell_agent_id)
  }

  // Update agent record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("agents") as any)
    .update({
      retell_agent_id: null,
      phone_number: null,
      phone_number_sid: null,
      voice_enabled: false,
    })
    .eq("id", agentId)
}
