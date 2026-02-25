import { createAdminClient } from "@/lib/supabase/server"
import { scrapeWebsite, simpleScrape } from "@/lib/scraper/firecrawl"
import { chunkText, estimateTokens } from "@/lib/scraper/chunker"
import { generateEmbeddings } from "@/lib/ai/embeddings"

const EMBEDDING_BATCH_SIZE = 100

interface ProcessScrapeParams {
  sourceId: string
  agentId: string
  url: string
}

interface ProcessUploadParams {
  sourceId: string
  agentId: string
  fileName: string
  extractedText: string
  extractedTitle?: string
  sourceType?: string
}

/**
 * Process a scrape job: scrape pages → chunk → batch-embed → store.
 */
export async function processTrainingScrape(params: ProcessScrapeParams) {
  const { sourceId, agentId, url } = params
  const supabase = await createAdminClient()

  try {
    // Scrape the website
    let pages
    if (process.env.FIRECRAWL_API_KEY) {
      pages = await scrapeWebsite(url)
    } else {
      pages = await simpleScrape(url)
    }

    if (!pages || pages.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("training_sources") as any)
        .update({ status: "failed", error_message: "No content found on website" })
        .eq("id", sourceId)
      return
    }

    // Update pages found
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("training_sources") as any)
      .update({ pages_found: pages.length })
      .eq("id", sourceId)

    // Collect all chunks across pages
    let pagesScraped = 0
    const allChunks: { content: string; metadata: Record<string, unknown> }[] = []

    for (const page of pages) {
      if (!page.content || page.content.trim().length < 50) continue

      const pageChunks = chunkText(page.content, {
        url: page.url,
        title: page.title,
      })

      for (const chunk of pageChunks) {
        allChunks.push({ content: chunk.content, metadata: chunk.metadata })
      }
      pagesScraped++
    }

    // Generate embeddings in batches and insert
    await batchEmbedAndStore(allChunks, agentId, sourceId)

    // Update training source status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("training_sources") as any)
      .update({
        status: "completed",
        pages_scraped: pagesScraped,
        last_scraped_at: new Date().toISOString(),
      })
      .eq("id", sourceId)

    // Mark agent as trained
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("agents") as any)
      .update({ is_trained: true })
      .eq("id", agentId)

    console.log(`[TrainingProcessor] Scrape completed for source ${sourceId}: ${allChunks.length} chunks`)
  } catch (error) {
    console.error(`[TrainingProcessor] Scrape failed for source ${sourceId}:`, error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("training_sources") as any)
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", sourceId)
  }
}

/**
 * Process an upload job: chunk extracted text → batch-embed → store.
 */
export async function processTrainingUpload(params: ProcessUploadParams) {
  const { sourceId, agentId, fileName, extractedText, extractedTitle, sourceType } = params
  const supabase = await createAdminClient()

  try {
    const chunks = chunkText(extractedText, {
      title: extractedTitle,
      url: `file://${fileName}`,
    })

    const allChunks = chunks.map((chunk) => ({
      content: chunk.content,
      metadata: {
        ...chunk.metadata,
        source_type: sourceType,
        filename: fileName,
      },
    }))

    await batchEmbedAndStore(allChunks, agentId, sourceId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("training_sources") as any)
      .update({
        status: "completed",
        pages_found: 1,
        pages_scraped: 1,
        last_scraped_at: new Date().toISOString(),
      })
      .eq("id", sourceId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("agents") as any)
      .update({ is_trained: true })
      .eq("id", agentId)

    console.log(`[TrainingProcessor] Upload completed for source ${sourceId}: ${allChunks.length} chunks`)
  } catch (error) {
    console.error(`[TrainingProcessor] Upload failed for source ${sourceId}:`, error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("training_sources") as any)
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Processing failed",
      })
      .eq("id", sourceId)
  }
}

/**
 * Generate embeddings in batches of EMBEDDING_BATCH_SIZE and insert into document_chunks.
 */
async function batchEmbedAndStore(
  chunks: { content: string; metadata: Record<string, unknown> }[],
  agentId: string,
  sourceId: string
) {
  const supabase = await createAdminClient()

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE)
    const texts = batch.map((c) => c.content)

    let embeddings: number[][]
    try {
      embeddings = await generateEmbeddings(texts)
    } catch (err) {
      console.error(`[TrainingProcessor] Embedding batch error at offset ${i}:`, err)
      continue
    }

    const insertData = batch.map((chunk, idx) => ({
      agent_id: agentId,
      training_source_id: sourceId,
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: embeddings[idx],
      token_count: estimateTokens(chunk.content),
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from("document_chunks") as any)
      .insert(insertData)

    if (insertError) {
      console.error(`[TrainingProcessor] Insert error at offset ${i}:`, insertError)
    }
  }
}

/**
 * Trigger training processing in the background (fire-and-forget).
 */
export function triggerTrainingProcessing(
  body: { type: "scrape"; sourceId: string; agentId: string; url: string } |
        { type: "upload"; sourceId: string; agentId: string; fileName: string; extractedText: string; extractedTitle?: string; sourceType?: string }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const secret = process.env.INTERNAL_API_SECRET

  fetch(`${baseUrl}/api/internal/process-training`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-internal-secret": secret } : {}),
    },
    body: JSON.stringify(body),
  }).catch((err) => {
    console.error("[TrainingProcessor] Failed to trigger processing:", err)
  })
}
