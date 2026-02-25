import { VoiceProvider, VoiceProviderType } from "./types"
import { RetellProvider } from "./providers/retell-provider"
import { BolnaProvider } from "./providers/bolna-provider"

// Singleton instances
let retellProvider: RetellProvider | null = null
let bolnaProvider: BolnaProvider | null = null

// Indian language codes that should auto-route to Bolna
const INDIAN_LANGUAGE_CODES = ["hi-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN"]

export function getVoiceProvider(type: VoiceProviderType): VoiceProvider {
  switch (type) {
    case "retell":
      if (!retellProvider) {
        retellProvider = new RetellProvider()
      }
      return retellProvider

    case "bolna":
      if (!bolnaProvider) {
        bolnaProvider = new BolnaProvider()
      }
      return bolnaProvider

    default:
      throw new Error(`Unknown voice provider: ${type}`)
  }
}

/**
 * Auto-routing logic:
 * - Explicit provider override always wins
 * - Indian language codes → Bolna
 * - Indian phone numbers (+91) → Bolna
 * - Everything else → Retell
 */
export function resolveProvider(
  language?: string,
  phoneCountryCode?: string,
  explicitProvider?: VoiceProviderType
): VoiceProviderType {
  // Explicit override always wins
  if (explicitProvider) return explicitProvider

  // Indian language codes → Bolna
  if (language && INDIAN_LANGUAGE_CODES.includes(language)) return "bolna"

  // Indian phone numbers → Bolna
  if (phoneCountryCode === "+91") return "bolna"

  // Default to Retell
  return "retell"
}
