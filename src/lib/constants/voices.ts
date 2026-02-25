export interface VoiceOption {
  id: string
  name: string
  gender: "male" | "female"
  accent: string
  languages: string[]
  persona: string
  provider?: "retell" | "bolna"
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "11labs-Adrian",
    name: "Adrian",
    gender: "male",
    accent: "American",
    languages: ["en-US", "en-GB"],
    persona: "Professional and confident",
    provider: "retell",
  },
  {
    id: "11labs-Myra",
    name: "Myra",
    gender: "female",
    accent: "American",
    languages: ["en-US", "en-GB"],
    persona: "Friendly and approachable",
    provider: "retell",
  },
  {
    id: "11labs-Chris",
    name: "Chris",
    gender: "male",
    accent: "British",
    languages: ["en-US", "en-GB"],
    persona: "Polished and articulate",
    provider: "retell",
  },
  {
    id: "11labs-Ellie",
    name: "Ellie",
    gender: "female",
    accent: "British",
    languages: ["en-US", "en-GB"],
    persona: "Warm and welcoming",
    provider: "retell",
  },
  {
    id: "11labs-Mark",
    name: "Mark",
    gender: "male",
    accent: "American",
    languages: ["en-US", "en-GB"],
    persona: "Authoritative and professional",
    provider: "retell",
  },
  {
    id: "11labs-Sara",
    name: "Sara",
    gender: "female",
    accent: "American",
    languages: ["en-US", "en-GB"],
    persona: "Caring and professional",
    provider: "retell",
  },
  {
    id: "11labs-Sofia",
    name: "Sofia",
    gender: "female",
    accent: "Spanish",
    languages: ["es-ES", "es-MX"],
    persona: "Warm and professional",
    provider: "retell",
  },
  {
    id: "11labs-Carlos",
    name: "Carlos",
    gender: "male",
    accent: "Spanish",
    languages: ["es-ES", "es-MX"],
    persona: "Friendly and energetic",
    provider: "retell",
  },
  {
    id: "11labs-Marie",
    name: "Marie",
    gender: "female",
    accent: "French",
    languages: ["fr-FR"],
    persona: "Elegant and professional",
    provider: "retell",
  },
  {
    id: "11labs-Hans",
    name: "Hans",
    gender: "male",
    accent: "German",
    languages: ["de-DE"],
    persona: "Clear and efficient",
    provider: "retell",
  },
  // Indian voices (available on both Retell via ElevenLabs and Bolna native)
  {
    id: "11labs-Priya",
    name: "Priya",
    gender: "female",
    accent: "Indian",
    languages: ["hi-IN", "en-US"],
    persona: "Professional and warm",
    provider: "retell",
  },
  {
    id: "11labs-Raj",
    name: "Raj",
    gender: "male",
    accent: "Indian",
    languages: ["hi-IN", "en-US"],
    persona: "Confident and articulate",
    provider: "retell",
  },
  // Bolna voices (ElevenLabs voices configured in Bolna)
  {
    id: "bolna-anita",
    name: "Anita",
    gender: "female",
    accent: "Indian",
    languages: ["hi-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN"],
    persona: "Warm and professional",
    provider: "bolna",
  },
  {
    id: "bolna-vikram",
    name: "Vikram",
    gender: "male",
    accent: "Indian",
    languages: ["hi-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN"],
    persona: "Clear and trustworthy",
    provider: "bolna",
  },
]

export function getVoicesForLanguage(
  languageCode: string,
  providerFilter?: "retell" | "bolna"
): VoiceOption[] {
  let voices = VOICE_OPTIONS.filter((v) => v.languages.includes(languageCode))

  if (providerFilter) {
    voices = voices.filter((v) => !v.provider || v.provider === providerFilter)
  }

  if (voices.length > 0) return voices

  // Fallback to English voices for languages without native voices
  let fallback = VOICE_OPTIONS.filter((v) => v.languages.includes("en-US"))
  if (providerFilter) {
    fallback = fallback.filter((v) => !v.provider || v.provider === providerFilter)
  }
  return fallback
}

export function getDefaultVoiceForLanguage(
  languageCode: string,
  providerFilter?: "retell" | "bolna"
): VoiceOption {
  const voices = getVoicesForLanguage(languageCode, providerFilter)
  return voices[0]
}

export function hasNativeVoice(
  languageCode: string,
  providerFilter?: "retell" | "bolna"
): boolean {
  if (providerFilter) {
    return VOICE_OPTIONS.some(
      (v) => v.languages.includes(languageCode) && (!v.provider || v.provider === providerFilter)
    )
  }
  return VOICE_OPTIONS.some((v) => v.languages.includes(languageCode))
}
