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

// Indian language codes → country "IN" for phone number search
const INDIAN_LANGUAGE_CODES = new Set(["hi-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN"])

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

    const BOLNA_DEFAULT_VOICE = "V9LCAAi4tTlqe9JadbCo"
    const voiceId = (agent.voice_id || "").startsWith("11labs-")
      ? BOLNA_DEFAULT_VOICE
      : agent.voice_id || BOLNA_DEFAULT_VOICE

    const llmBaseUrl = `${appUrl}/api/voice/bolna`

    // ── Step 1: Create Bolna agent ────────────────────────────────────────────
    const createResponse = await bolnaFetch("/v2/agent", {
      method: "POST",
      body: JSON.stringify({
        agent_config: {
          agent_name: agent.name,
          agent_type: "inbound",
          agent_welcome_message:
            agent.voice_welcome_message ||
            "Hello! Thank you for calling. How can I help you today?",
          webhook_url: `${appUrl}/api/voice/bolna/webhook`,

          tasks: [
            {
              task_type: "conversation",
              toolchain: {
                execution: "parallel",
                pipelines: [["transcriber", "llm", "synthesizer"]],
              },
              tools_config: {
                input: { provider: "plivo", format: "wav" },
                output: { provider: "plivo", format: "wav" },

                transcriber: {
                  provider: "deepgram",
                  model: "nova-3",
                  language: langConfig.asr,
                  stream: true,
                  encoding: "linear16",
                },

                llm_agent: {
                  agent_type: "simple_llm_agent",
                  agent_flow_type: "streaming",
                  llm_config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    base_url: llmBaseUrl,
                    max_tokens: 450,
                    temperature: 0.2,
                    request_json: true,
                  },
                },

                synthesizer: {
                  provider: "elevenlabs",
                  stream: true,
                  buffer_size: 200,
                  audio_format: "wav",
                  provider_config: {
                    voice: voiceId,
                    model: "eleven_turbo_v2_5",
                    voice_id: voiceId,
                    speed: agent.voice_speed || 1,
                  },
                },
              },

              task_config: {
                hangup_after_silence: 10,
                call_terminate: 300,
                number_of_words_for_interruption: 2,
                incremental_delay: 200,
              },
            },
          ],
        },

        agent_prompts: {
          task_1: {
            system_prompt: agent.system_prompt || "",
          },
        },
      }),
    })

    const bolnaAgent = await createResponse.json()
    console.log("[Bolna] Agent creation response:", JSON.stringify(bolnaAgent))

    const agentId = bolnaAgent.agent_id || bolnaAgent.id
    if (!agentId) {
      throw new Error("Bolna agent creation did not return an agent_id")
    }

    // ── Step 2: Search for available phone numbers ────────────────────────────
    const country = INDIAN_LANGUAGE_CODES.has(agent.voice_language) ? "IN" : "US"
    const searchParams = new URLSearchParams({ country })
    if (areaCode && country === "US") {
      searchParams.set("pattern", String(areaCode).substring(0, 3))
    }

    let boughtNumber: { id: string; phone_number: string }

    try {
      const searchResponse = await bolnaFetch(`/phone-numbers/search?${searchParams}`)
      const availableNumbers = await searchResponse.json() as Array<{
        phone_number: string; region?: string; price?: number
      }>

      if (!Array.isArray(availableNumbers) || availableNumbers.length === 0) {
        throw new Error(`No Bolna phone numbers available for country: ${country}`)
      }

      // ── Step 3: Buy the first available number ──────────────────────────────
      const buyResponse = await bolnaFetch("/phone-numbers/buy", {
        method: "POST",
        body: JSON.stringify({ country, phone_number: availableNumbers[0].phone_number }),
      })
      boughtNumber = await buyResponse.json()
      console.log("[Bolna] Phone number purchase response:", JSON.stringify(boughtNumber))
    } catch (err) {
      // Clean up the agent we just created so it doesn't become orphaned
      try {
        await bolnaFetch(`/v2/agent/${agentId}`, { method: "DELETE" })
        console.log("[Bolna] Cleaned up orphaned agent:", agentId)
      } catch (cleanupErr) {
        console.error("[Bolna] Failed to clean up agent after number error:", cleanupErr)
      }
      throw err
    }

    // ── Step 4: Link the number to the agent for inbound calls ────────────────
    const linkResponse = await bolnaFetch("/inbound/setup", {
      method: "POST",
      body: JSON.stringify({ agent_id: agentId, phone_number_id: boughtNumber.id }),
    })
    const linkResult = await linkResponse.json() as { phone_number?: string }
    console.log("[Bolna] Inbound setup response:", JSON.stringify(linkResult))

    return {
      providerAgentId: agentId,
      phoneNumber: linkResult.phone_number || boughtNumber.phone_number,
      phoneNumberSid: boughtNumber.id,
      provider: "bolna",
    }
  }

  async releasePhoneNumber(
    providerAgentId: string,
    phoneNumberSid: string
  ): Promise<void> {
    // Unlink the number from the agent first (best-effort)
    if (phoneNumberSid) {
      try {
        await bolnaFetch("/inbound/unlink", {
          method: "POST",
          body: JSON.stringify({ phone_number_id: phoneNumberSid }),
        })
      } catch (e) {
        console.error("[Bolna] Failed to unlink phone number:", e)
      }

      try {
        await bolnaFetch(`/phone-numbers/${phoneNumberSid}`, { method: "DELETE" })
      } catch (e) {
        console.error("[Bolna] Failed to delete phone number:", e)
      }
    }

    // Delete the agent
    await bolnaFetch(`/v2/agent/${providerAgentId}`, { method: "DELETE" })
  }

  async updateAgentConfig(
    providerAgentId: string,
    config: VoiceAgentConfig
  ): Promise<void> {
    const agentConfigPatch: Record<string, unknown> = {}
    const agentPromptsPatch: Record<string, unknown> = {}
    const toolsConfigPatch: Record<string, unknown> = {}

    if (config.welcomeMessage) {
      agentConfigPatch.agent_welcome_message = config.welcomeMessage
    }

    if (config.systemPrompt) {
      agentPromptsPatch.task_1 = { system_prompt: config.systemPrompt }
    }

    if (config.voiceId || config.speed || config.language) {
      const synthPatch: Record<string, unknown> = {
        provider: "elevenlabs",
        provider_config: {
          ...(config.voiceId ? { voice: config.voiceId, voice_id: config.voiceId } : {}),
          ...(config.speed ? { speed: config.speed } : {}),
        },
      }
      if (config.language) {
        const langConfig = BOLNA_LANGUAGE_MAP[config.language] ||
          BOLNA_LANGUAGE_MAP["hi-IN"]
        ;(synthPatch.provider_config as Record<string, unknown>).language = langConfig.tts
        toolsConfigPatch.transcriber = {
          provider: "deepgram",
          model: "nova-3",
          language: langConfig.asr,
          stream: true,
          encoding: "linear16",
        }
      }
      toolsConfigPatch.synthesizer = synthPatch
    }

    if (Object.keys(toolsConfigPatch).length > 0) {
      agentConfigPatch.tasks = [
        { task_type: "conversation", tools_config: toolsConfigPatch },
      ]
    }

    const hasConfigChanges = Object.keys(agentConfigPatch).length > 0
    const hasPromptChanges = Object.keys(agentPromptsPatch).length > 0

    if (hasConfigChanges || hasPromptChanges) {
      await bolnaFetch(`/v2/agent/${providerAgentId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...(hasConfigChanges ? { agent_config: agentConfigPatch } : {}),
          ...(hasPromptChanges ? { agent_prompts: agentPromptsPatch } : {}),
        }),
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
