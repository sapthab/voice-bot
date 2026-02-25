import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { triggerTrainingProcessing } from "@/lib/processing/training-processor"
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

    // --- Chunk cleanup: delete old source & chunks for same (agent_id, url) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingSources } = await (supabase.from("training_sources") as any)
      .select("id")
      .eq("agent_id", agentId)
      .eq("url", url)

    if (existingSources && existingSources.length > 0) {
      const oldIds = existingSources.map((s: { id: string }) => s.id)
      // Delete chunks belonging to old sources
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("document_chunks") as any)
        .delete()
        .in("training_source_id", oldIds)
      // Delete the old training source records
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("training_sources") as any)
        .delete()
        .in("id", oldIds)
    }

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

    // Fire-and-forget: trigger background processing
    triggerTrainingProcessing({
      type: "scrape",
      sourceId: source.id,
      agentId,
      url,
    })

    return NextResponse.json({
      sourceId: source.id,
      status: "processing",
    })
  } catch (error) {
    console.error("Scrape API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
