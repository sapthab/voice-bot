export interface Language {
  code: string
  name: string
  nativeName: string
  flag: string
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en-US", name: "English (US)", nativeName: "English", flag: "🇺🇸" },
  { code: "en-GB", name: "English (UK)", nativeName: "English", flag: "🇬🇧" },
  { code: "es-ES", name: "Spanish (Spain)", nativeName: "Español", flag: "🇪🇸" },
  { code: "es-MX", name: "Spanish (Mexico)", nativeName: "Español", flag: "🇲🇽" },
  { code: "fr-FR", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de-DE", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português", flag: "🇧🇷" },
  { code: "it-IT", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "nl-NL", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "ja-JP", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko-KR", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "中文", flag: "🇨🇳" },
]

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)
}

export function isEnglish(code: string): boolean {
  return code.startsWith("en")
}
