import { NextRequest, NextResponse } from "next/server"
import { processConversation } from "@/lib/processing/conversation-processor"

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
    const { conversationId } = await request.json()

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
    }

    await processConversation(conversationId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Process conversation error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
