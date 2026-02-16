import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { processConversation } from "@/lib/processing/conversation-processor"

/**
 * Cron endpoint to retry failed conversation processing.
 * Should be called periodically (e.g., every 5 minutes).
 */
export async function POST(request: NextRequest) {
  // Verify internal API secret
  const secret = process.env.INTERNAL_API_SECRET
  if (secret) {
    const providedSecret = request.headers.get("x-internal-secret")
    if (providedSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  try {
    const supabase = await createAdminClient()

    // Find failed conversations from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: failed } = await supabase
      .from("conversations")
      .select("id")
      .eq("post_processing_status", "failed")
      .gte("created_at", twentyFourHoursAgo)
      .limit(10)

    if (!failed || failed.length === 0) {
      return NextResponse.json({ retried: 0 })
    }

    let retried = 0
    for (const conv of failed) {
      try {
        await processConversation((conv as { id: string }).id)
        retried++
      } catch (err) {
        console.error(`Retry failed for ${(conv as { id: string }).id}:`, err)
      }
    }

    return NextResponse.json({ retried, total: failed.length })
  } catch (error) {
    console.error("Retry processing error:", error)
    return NextResponse.json({ error: "Retry failed" }, { status: 500 })
  }
}
