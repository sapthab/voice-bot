import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { scrapeWebsite, simpleScrape } from "@/lib/scraper/firecrawl"
import { chunkText, estimateTokens } from "@/lib/scraper/chunker"
import { generateEmbedding } from "@/lib/ai/embeddings"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

/** Validate that the URL is HTTPS and not a private/loopback address */
function isValidScrapeUrl(urlString: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    return false
  }

  // Only allow http(s)
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block loopback
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return false
  }

  // Block private IP ranges
  const parts = hostname.split(".")
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const a = parseInt(parts[0])
    const b = parseInt(parts[1])
    if (a === 10) return false                          // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return false   // 172.16.0.0/12
    if (a === 192 && b === 168) return false             // 192.168.0.0/16
    if (a === 169 && b === 254) return false             // 169.254.0.0/16 (link-local / cloud metadata)
    if (a === 0) return false                            // 0.0.0.0/8
  }

  return true
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return unauthorizedResponse()

    const { agentId, url } = await request.json()

    if (!agentId || !url) {
      return NextResponse.json(
        { error: "Missing agentId or url" },
        { status: 400 }
      )
    }

    // Validate URL to prevent SSRF
    if (!isValidScrapeUrl(url)) {
      return NextResponse.json(
        { error: "Invalid URL. Please provide a valid public HTTP(S) URL." },
        { status: 400 }
      )
    }

    const agent = await verifyAgentOwnership(agentId, user.id)
    if (!agent) return forbiddenResponse()

    const supabase = await createAdminClient()

    // Create training source record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: source, error: sourceError } = await (supabase.from("training_sources") as any)
      .insert({
        agent_id: agentId,
        url,
        status: "processing",
      })
      .select()
      .single()

    if (sourceError) {
      console.error("Error creating training source:", sourceError)
      return NextResponse.json(
        { error: "Failed to create training source" },
        { status: 500 }
      )
    }

    // Scrape the website
    let pages
    try {
      if (process.env.FIRECRAWL_API_KEY) {
        pages = await scrapeWebsite(url)
      } else {
        // Fallback to simple scraper
        pages = await simpleScrape(url)
      }
    } catch (scrapeError) {
      console.error("Scraping error:", scrapeError)

      // Update source status to failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("training_sources") as any)
        .update({
          status: "failed",
          error_message: scrapeError instanceof Error ? scrapeError.message : "Unknown error",
        })
        .eq("id", source.id)

      return NextResponse.json(
        { error: "Failed to scrape website" },
        { status: 500 }
      )
    }

    if (!pages || pages.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("training_sources") as any)
        .update({
          status: "failed",
          error_message: "No content found on website",
        })
        .eq("id", source.id)

      return NextResponse.json(
        { error: "No content found" },
        { status: 400 }
      )
    }

    // Update pages found
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("training_sources") as any)
      .update({
        pages_found: pages.length,
      })
      .eq("id", source.id)

    // Process each page
    let pagesScraped = 0
    const chunks: {
      agent_id: string
      training_source_id: string
      content: string
      metadata: Record<string, unknown>
      embedding: number[]
      token_count: number
    }[] = []

    for (const page of pages) {
      if (!page.content || page.content.trim().length < 50) {
        continue
      }

      // Chunk the content
      const pageChunks = chunkText(page.content, {
        url: page.url,
        title: page.title,
      })

      // Generate embeddings for each chunk
      for (const chunk of pageChunks) {
        try {
          const embedding = await generateEmbedding(chunk.content)

          chunks.push({
            agent_id: agentId,
            training_source_id: source.id,
            content: chunk.content,
            metadata: chunk.metadata,
            embedding,
            token_count: estimateTokens(chunk.content),
          })
        } catch (embeddingError) {
          console.error("Embedding error:", embeddingError)
          // Continue with other chunks
        }
      }

      pagesScraped++
    }

    // Insert chunks in batches
    const BATCH_SIZE = 100
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase.from("document_chunks") as any)
        .insert(batch)

      if (insertError) {
        console.error("Error inserting chunks:", insertError)
      }
    }

    // Update training source status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("training_sources") as any)
      .update({
        status: "completed",
        pages_scraped: pagesScraped,
        last_scraped_at: new Date().toISOString(),
      })
      .eq("id", source.id)

    // Mark agent as trained
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("agents") as any)
      .update({ is_trained: true })
      .eq("id", agentId)

    return NextResponse.json({
      success: true,
      pagesFound: pages.length,
      pagesScraped,
      chunksCreated: chunks.length,
    })
  } catch (error) {
    console.error("Scrape API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
