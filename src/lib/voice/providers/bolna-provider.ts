import { Agent } from "@/types/database"
import {
  VoiceProvider,
  ProvisionResult,
  VoiceAgentConfig,
  NormalizedCallEvent,
} from "../types"
import crypto from "crypto"

const BOLNA_API_BASE = "https://api.bolna.ai"

// Language mapping: our language codes → Bolna's ASR/TTS codes + display name
const BOLNA_LANGUAGE_MAP: Record<
  string,
  { asr: string; tts: string; language: string }
> = {
  "hi-IN": { asr: "hi", tts: "hi-IN", language: "Hindi" },
  "ta-IN": { asr: "ta", tts: "ta-IN", language: "Tamil" },
  "te-IN": { asr: "te", tts: "te-IN", language: "Telugu" },
  "bn-IN": { asr: "bn", tts: "bn-IN", language: "Bengali" },
  "mr-IN": { asr: "mr", tts: "mr-IN", language: "Marathi" },
  "en-US": { asr: "en", tts: "en-US", language: "English" },
  "en-GB": { asr: "en", tts: "en-GB", language: "English" },
}

async function bolnaFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = process.env.BOLNA_API_KEY
  if (!apiKey) {
    throw new Error("BOLNA_API_KEY is not configured")
  }

  const response = await fetch(`${BOLNA_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Bolna API error (${response.status}): ${errorBody}`
    )
  }

  return response
}

export class BolnaProvider implements VoiceProvider {
  readonly type = "bolna" as const

  async provisionPhoneNumber(
    agent: Agent,
    areaCode?: number
  ): Promise<ProvisionResult> {
    const langConfig = BOLNA_LANGUAGE_MAP[agent.voice_language] ||
      BOLNA_LANGUAGE_MAP["hi-IN"]

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    // Create Bolna agent with full configuration
    const createResponse = await bolnaFetch("/agent", {
      method: "POST",
      body: JSON.stringify({
        agent_name: agent.name,
        agent_type: "inbound",
        agent_welcome_message:
          agent.voice_welcome_message ||
          "Hello! Thank you for calling. How can I help you today?",
        agent_prompt: agent.system_prompt || "",

        // Audio — language
        language: langConfig.language,

        // STT: Deepgram nova-3
        asr_config: {
          provider: "deepgram",
          model: "nova-3",
          language: langConfig.asr,
          keywords: [],
        },

        // TTS: ElevenLabs
        tts_config: {
          provider: "elevenlabs",
          model: "eleven_turbo_v2_5",
          voice: agent.voice_id || "bolna-anita",
          language: langConfig.tts,
          buffer_size: 200,
          speed_rate: agent.voice_speed || 1,
          similarity_boost: 0.75,
          stability: 0.5,
          style_exaggeration: 0,
        },

        // LLM: custom endpoint (our backend)
        llm_config: {
          provider: "custom",
          custom_llm_url: `${appUrl}/api/voice/bolna/llm`,
          model: "custom",
          max_tokens: 450,
          temperature: 0.2,
        },

        // Engine config
        engine_config: {
          interruption_words: 2,
          response_rate: "rapid",
          endpointing_ms: 100,
          linear_delay_ms: 200,
          user_online_detection: {
            enabled: true,
            message: "Hey, are you still there?",
            timeout_seconds: 9,
          },
        },

        // Call config
        call_config: {
          telephony_provider: "plivo",
          noise_cancellation: true,
          voicemail_detection: false,
          hangup_on_silence: 10,
          total_call_timeout: 300,
        },

        // Analytics
        webhook_url: `${appUrl}/api/voice/bolna/webhook`,

        ...(areaCode ? { area_code: areaCode } : {}),
      }),
    })

    const bolnaAgent = await createResponse.json()

    const agentId = bolnaAgent.agent_id || bolnaAgent.id
    const phoneNumber = bolnaAgent.phone_number || ""
    const phoneNumberSid = bolnaAgent.phone_number_sid || phoneNumber

    return {
      providerAgentId: agentId,
      phoneNumber,
      phoneNumberSid,
      provider: "bolna",
    }
  }

  async releasePhoneNumber(
    providerAgentId: string,
    _phoneNumberSid: string
  ): Promise<void> {
    await bolnaFetch(`/agent/${providerAgentId}`, {
      method: "DELETE",
    })
  }

  async updateAgentConfig(
    providerAgentId: string,
    config: VoiceAgentConfig
  ): Promise<void> {
    const updatePayload: Record<string, unknown> = {}

    if (config.voiceId) {
      updatePayload.tts_config = {
        provider: "elevenlabs",
        voice: config.voiceId,
        ...(config.speed ? { speed_rate: config.speed } : {}),
      }
    }

    if (config.language) {
      const langConfig = BOLNA_LANGUAGE_MAP[config.language] ||
        BOLNA_LANGUAGE_MAP["hi-IN"]
      updatePayload.asr_config = {
        provider: "deepgram",
        model: "nova-3",
        language: langConfig.asr,
      }
      updatePayload.language = langConfig.language
      if (!updatePayload.tts_config) {
        updatePayload.tts_config = { provider: "elevenlabs" }
      }
      ;(updatePayload.tts_config as Record<string, string>).language =
        langConfig.tts
    }

    if (config.welcomeMessage) {
      updatePayload.agent_welcome_message = config.welcomeMessage
    }

    if (config.systemPrompt) {
      updatePayload.agent_prompt = config.systemPrompt
    }

    if (config.engineConfig) {
      const ec = config.engineConfig
      updatePayload.engine_config = {
        ...(ec.interruptionWords != null
          ? { interruption_words: ec.interruptionWords }
          : {}),
        ...(ec.responseRate ? { response_rate: ec.responseRate } : {}),
        ...(ec.endpointingMs != null
          ? { endpointing_ms: ec.endpointingMs }
          : {}),
        ...(ec.linearDelayMs != null
          ? { linear_delay_ms: ec.linearDelayMs }
          : {}),
        ...(ec.userOnlineDetection
          ? {
              user_online_detection: {
                enabled: ec.userOnlineDetection.enabled,
                message: ec.userOnlineDetection.message,
                timeout_seconds: ec.userOnlineDetection.timeoutSeconds,
              },
            }
          : {}),
      }
    }

    if (config.callConfig) {
      const cc = config.callConfig
      updatePayload.call_config = {
        ...(cc.telephonyProvider
          ? { telephony_provider: cc.telephonyProvider }
          : {}),
        ...(cc.noiseCancellation != null
          ? { noise_cancellation: cc.noiseCancellation }
          : {}),
        ...(cc.voicemailDetection != null
          ? { voicemail_detection: cc.voicemailDetection }
          : {}),
        ...(cc.hangupOnSilence != null
          ? { hangup_on_silence: cc.hangupOnSilence }
          : {}),
        ...(cc.totalCallTimeout != null
          ? { total_call_timeout: cc.totalCallTimeout }
          : {}),
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      await bolnaFetch(`/agent/${providerAgentId}`, {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      })
    }
  }

  parseWebhookEvent(
    body: Record<string, unknown>
  ): NormalizedCallEvent | null {
    const event = body.event as string
    const data = (body.data || body) as Record<string, unknown>
    const callId = (data.call_id || data.conversation_id) as string

    if (!callId) return null

    switch (event) {
      case "call.started":
      case "call_initiated":
        return { type: "call.started", callId }

      case "call.ended":
      case "call_ended": {
        const duration = data.duration as number | undefined
        return { type: "call.ended", callId, duration }
      }

      case "call.analyzed":
      case "call_analyzed": {
        return {
          type: "call.analyzed",
          callId,
          duration: data.duration as number | undefined,
          recordingUrl: data.recording_url as string | undefined,
          transcript: data.transcript as string | undefined,
        }
      }

      default:
        return null
    }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const secret = process.env.BOLNA_WEBHOOK_SECRET
    if (!secret) return false

    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex")

    return signature === expected
  }
}
