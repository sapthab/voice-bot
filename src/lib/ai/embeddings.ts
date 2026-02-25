import { createHash } from "crypto"
import { getOpenAIClient } from "./openai"

const EMBEDDING_MODEL = "text-embedding-3-small"

// ---------------------------------------------------------------------------
// LRU cache for single-query embeddings (max 1000 entries)
// ---------------------------------------------------------------------------

const CACHE_MAX = 1000
const cache = new Map<string, number[]>()

function cacheKey(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

function cacheGet(key: string): number[] | undefined {
  const value = cache.get(key)
  if (value !== undefined) {
    // Move to end (most-recently used)
    cache.delete(key)
    cache.set(key, value)
  }
  return value
}

function cacheSet(key: string, value: number[]): void {
  if (cache.has(key)) {
    cache.delete(key)
  } else if (cache.size >= CACHE_MAX) {
    // Evict oldest (first) entry
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateEmbedding(text: string): Promise<number[]> {
  const cleaned = text.replace(/\n/g, " ").trim()
  const key = cacheKey(cleaned)

  const cached = cacheGet(key)
  if (cached) return cached

  const openai = getOpenAIClient()

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleaned,
  })

  const embedding = response.data[0].embedding
  cacheSet(key, embedding)
  return embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const openai = getOpenAIClient()

  const cleanedTexts = texts.map((t) => t.replace(/\n/g, " ").trim())

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleanedTexts,
  })

  return response.data.map((item) => item.embedding)
}
