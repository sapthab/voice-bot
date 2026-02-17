export interface VoiceOption {
  id: string
  name: string
  gender: "male" | "female"
  accent: string
  languages: string[]
  persona: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "11labs-Adrian",
    name: "Adrian",
    gender: "male",
    accent: "American",
    languages: ["en-US", "en-GB"],
    persona: "Professional and confident",
  },
  {
    id: "11labs-Myra",
    name: "Myra",
    gender: "female",
    accent: "American",
    languages: ["en-US", "en-GB"],
    persona: "Friendly and approachable",
  },
  {
    id: "11labs-Chris",
    name: "Chris",
    gender: "male",
    accent: "British",
    languages: ["en-US", "en-GB"],
    persona: "Polished and articulate",
  },
  {
    id: "11labs-Ellie",
    name: "Ellie",
    gender: "female",
    accent: "British",
    languages: ["en-US", "en-GB"],
    persona: "Warm and welcoming",
  },
  {
    id: "11labs-Mark",
    name: "Mark",
    gender: "male",
    accent: "American",
    languages: ["en-US", "en-GB"],
    persona: "Authoritative and professional",
  },
  {
    id: "11labs-Sara",
    name: "Sara",
    gender: "female",
    accent: "American",
    languages: ["en-US", "en-GB"],
    persona: "Caring and professional",
  },
  {
    id: "11labs-Sofia",
    name: "Sofia",
    gender: "female",
    accent: "Spanish",
    languages: ["es-ES", "es-MX"],
    persona: "Warm and professional",
  },
  {
    id: "11labs-Carlos",
    name: "Carlos",
    gender: "male",
    accent: "Spanish",
    languages: ["es-ES", "es-MX"],
    persona: "Friendly and energetic",
  },
  {
    id: "11labs-Marie",
    name: "Marie",
    gender: "female",
    accent: "French",
    languages: ["fr-FR"],
    persona: "Elegant and professional",
  },
  {
    id: "11labs-Hans",
    name: "Hans",
    gender: "male",
    accent: "German",
    languages: ["de-DE"],
    persona: "Clear and efficient",
  },
]

export function getVoicesForLanguage(languageCode: string): VoiceOption[] {
  const voices = VOICE_OPTIONS.filter((v) => v.languages.includes(languageCode))
  if (voices.length > 0) return voices
  // Fallback to English voices for languages without native voices
  return VOICE_OPTIONS.filter((v) => v.languages.includes("en-US"))
}

export function getDefaultVoiceForLanguage(languageCode: string): VoiceOption {
  const voices = getVoicesForLanguage(languageCode)
  return voices[0]
}

export function hasNativeVoice(languageCode: string): boolean {
  return VOICE_OPTIONS.some((v) => v.languages.includes(languageCode))
}
