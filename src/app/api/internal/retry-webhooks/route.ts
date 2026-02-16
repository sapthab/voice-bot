import { NextRequest, NextResponse } from "next/server"
import { retryFailedWebhooks } from "@/lib/integrations/webhook"

export async function POST(request: NextRequest) {
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
    const retried = await retryFailedWebhooks()
    return NextResponse.json({ retried })
  } catch (error) {
    console.error("Webhook retry error:", error)
    return NextResponse.json({ error: "Retry failed" }, { status: 500 })
  }
}
