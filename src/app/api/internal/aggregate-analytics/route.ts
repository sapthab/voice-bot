import { NextRequest, NextResponse } from "next/server"
import { runNightlyAggregation } from "@/lib/analytics/aggregator"

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
    await runNightlyAggregation()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Aggregation error:", error)
    return NextResponse.json({ error: "Aggregation failed" }, { status: 500 })
  }
}
