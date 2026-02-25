import { Agent } from "@/types/database"

export type VoiceProviderType = "retell" | "bolna"

export interface ProvisionResult {
  providerAgentId: string
  phoneNumber: string
  phoneNumberSid: string
  provider: VoiceProviderType
}

export interface BolnaEngineConfig {
  interruptionWords?: number
  responseRate?: "rapid" | "normal" | "slow"
  endpointingMs?: number
  linearDelayMs?: number
  userOnlineDetection?: {
    enabled: boolean
    message: string
    timeoutSeconds: number
  }
}

export interface BolnaCallConfig {
  telephonyProvider?: "plivo" | "exotel"
  noiseCancellation?: boolean
  voicemailDetection?: boolean
  hangupOnSilence?: number
  totalCallTimeout?: number
}

export interface VoiceAgentConfig {
  voiceId?: string
  language?: string
  speed?: number
  welcomeMessage?: string
  systemPrompt?: string
  // Bolna-specific
  engineConfig?: BolnaEngineConfig
  callConfig?: BolnaCallConfig
}

export interface NormalizedCallEvent {
  type: "call.started" | "call.ended" | "call.analyzed"
  callId: string
  duration?: number
  recordingUrl?: string
  transcript?: string
  metadata?: Record<string, unknown>
}

export interface VoiceProvider {
  readonly type: VoiceProviderType

  provisionPhoneNumber(
    agent: Agent,
    areaCode?: number
  ): Promise<ProvisionResult>

  releasePhoneNumber(
    providerAgentId: string,
    phoneNumberSid: string
  ): Promise<void>

  updateAgentConfig(
    providerAgentId: string,
    config: VoiceAgentConfig
  ): Promise<void>

  parseWebhookEvent(
    body: Record<string, unknown>,
    headers: Record<string, string>
  ): NormalizedCallEvent | null

  verifyWebhookSignature(
    body: string,
    signature: string
  ): boolean
}
