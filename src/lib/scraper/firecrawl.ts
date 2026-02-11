interface FirecrawlPage {
  url: string
  content: string
  title?: string
  description?: string
}

interface FirecrawlResponse {
  success: boolean
  data?: FirecrawlPage[]
  error?: string
}

export async function scrapeWebsite(url: string): Promise<FirecrawlPage[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY

  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured")
  }

  // Normalize URL
  let normalizedUrl = url
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    normalizedUrl = `https://${url}`
  }

  try {
    // Use Firecrawl's crawl endpoint
    const response = await fetch("https://api.firecrawl.dev/v1/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: normalizedUrl,
        limit: 20, // Limit pages to crawl
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Firecrawl API error: ${error}`)
    }

    const result = await response.json()

    // Firecrawl returns a job ID for async crawling
    if (result.id) {
      // Poll for results
      return await pollCrawlJob(result.id, apiKey)
    }

    // For sync response
    if (result.data) {
      return result.data.map((page: { url: string; markdown?: string; metadata?: { title?: string; description?: string } }) => ({
        url: page.url,
        content: page.markdown || "",
        title: page.metadata?.title,
        description: page.metadata?.description,
      }))
    }

    return []
  } catch (error) {
    console.error("Firecrawl error:", error)
    throw error
  }
}

async function pollCrawlJob(
  jobId: string,
  apiKey: string,
  maxAttempts = 60
): Promise<FirecrawlPage[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds

    const response = await fetch(
      `https://api.firecrawl.dev/v1/crawl/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to check crawl status: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.status === "completed") {
      return (result.data || []).map((page: { url: string; markdown?: string; metadata?: { title?: string; description?: string } }) => ({
        url: page.url,
        content: page.markdown || "",
        title: page.metadata?.title,
        description: page.metadata?.description,
      }))
    }

    if (result.status === "failed") {
      throw new Error("Crawl job failed")
    }

    // Continue polling if still in progress
  }

  throw new Error("Crawl job timed out")
}

// Simple fallback scraper for when Firecrawl is not available
export async function simpleScrape(url: string): Promise<FirecrawlPage[]> {
  try {
    const response = await fetch(url)
    const html = await response.text()

    // Basic HTML to text conversion
    const content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : undefined

    // Extract meta description
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
    )
    const description = descMatch ? descMatch[1].trim() : undefined

    return [
      {
        url,
        content,
        title,
        description,
      },
    ]
  } catch (error) {
    console.error("Simple scrape error:", error)
    return []
  }
}
