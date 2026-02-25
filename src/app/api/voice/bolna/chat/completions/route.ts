// Bolna v2 calls {base_url}/chat/completions (OpenAI-compatible path).
// Re-export the existing LLM handler so both paths work.
export { POST } from "@/app/api/voice/bolna/llm/route"
