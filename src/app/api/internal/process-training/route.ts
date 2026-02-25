import { NextRequest, NextResponse } from "next/server"
import { processTrainingScrape, processTrainingUpload } from "@/lib/processing/training-processor"

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
    const body = await request.json()

    if (body.type === "scrape") {
      const { sourceId, agentId, url } = body
      if (!sourceId || !agentId || !url) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }
      await processTrainingScrape({ sourceId, agentId, url })
    } else if (body.type === "upload") {
      const { sourceId, agentId, fileName, extractedText } = body
      if (!sourceId || !agentId || !fileName || !extractedText) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }
      await processTrainingUpload({
        sourceId,
        agentId,
        fileName,
        extractedText,
        extractedTitle: body.extractedTitle,
        sourceType: body.sourceType,
      })
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Process training error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
