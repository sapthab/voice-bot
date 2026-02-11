import { getOpenAIClient } from "./openai"

const EMBEDDING_MODEL = "text-embedding-3-small"

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient()

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, " ").trim(),
  })

  return response.data[0].embedding
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
