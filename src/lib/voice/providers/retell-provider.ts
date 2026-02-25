import { Agent } from "@/types/database"
import { getRetellClient } from "../retell"
import {
  VoiceProvider,
  ProvisionResult,
  VoiceAgentConfig,
  NormalizedCallEvent,
} from "../types"
import crypto from "crypto"

export class RetellProvider implements VoiceProvider {
  readonly type = "retell" as const

  async provisionPhoneNumber(
    agent: Agent,
    areaCode?: number
  ): Promise<ProvisionResult> {
    const retell = getRetellClient()

    // Create Retell LLM
    await retell.llm.create({
      general_prompt:
        agent.system_prompt ||
        `You are a helpful AI assistant for ${agent.name}.`,
      begin_message:
        agent.voice_welcome_message ||
        "Hello! Thank you for calling. How can I help you today?",
    })

    // Create Retell agent with Custom LLM response engine
    const retellAgent = await retell.agent.create({
      response_engine: {
        type: "custom-llm",
        llm_websocket_url: `${process.env.NEXT_PUBLIC_APP_URL!.replace(/^http/, "ws")}/ws/retell/llm`,
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

    return {
      providerAgentId: retellAgent.agent_id,
      phoneNumber: phoneNumber.phone_number,
      phoneNumberSid: phoneNumber.phone_number,
      provider: "retell",
    }
  }

  async releasePhoneNumber(
    providerAgentId: string,
    phoneNumberSid: string
  ): Promise<void> {
    const retell = getRetellClient()

    if (phoneNumberSid) {
      await retell.phoneNumber.delete(phoneNumberSid)
    }

    if (providerAgentId) {
      await retell.agent.delete(providerAgentId)
    }
  }

  async updateAgentConfig(
    providerAgentId: string,
    config: VoiceAgentConfig
  ): Promise<void> {
    const retell = getRetellClient()

    await retell.agent.update(providerAgentId, {
      ...(config.voiceId && { voice_id: config.voiceId }),
      ...(config.language && { language: config.language as "en-US" }),
      ...(config.speed !== undefined && { responsiveness: config.speed }),
    })
  }

  parseWebhookEvent(
    body: Record<string, unknown>
  ): NormalizedCallEvent | null {
    const event = body.event as string
    const call = body.call as Record<string, unknown> | undefined
    const callId = call?.call_id as string

    if (!callId) return null

    switch (event) {
      case "call.started":
      case "call_started":
        return { type: "call.started", callId }

      case "call.ended":
      case "call_ended": {
        const durationMs = call?.duration_ms as number | undefined
        const callDuration = call?.call_duration as number | undefined
        const duration = durationMs
          ? Math.round(durationMs / 1000)
          : callDuration || undefined

        return { type: "call.ended", callId, duration }
      }

      case "call.analyzed":
      case "call_analyzed": {
        const durationMs = call?.duration_ms as number | undefined
        const callDuration = call?.call_duration as number | undefined
        const duration = durationMs
          ? Math.round(durationMs / 1000)
          : callDuration || undefined

        return {
          type: "call.analyzed",
          callId,
          duration,
          recordingUrl: (call?.recording_url as string) || undefined,
          transcript: (call?.transcript as string) || undefined,
        }
      }

      default:
        return null
    }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const secret = process.env.RETELL_WEBHOOK_SECRET
    if (!secret) return false

    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex")

    return signature === expected
  }
}
