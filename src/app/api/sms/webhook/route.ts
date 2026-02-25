import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getAgentBySMSNumber, handleSMSInbound } from "@/lib/sms/message-handler"

/**
 * Verify the X-Twilio-Signature header to confirm the request came from Twilio.
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // Sort params alphabetically and concatenate key+value pairs onto the URL
  const data =
    url +
    Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], "")

  const expected = crypto.createHmac("sha1", authToken).update(data).digest("base64")
  return expected === signature
}

/**
 * Twilio inbound SMS webhook.
 * Twilio sends a form-encoded POST with: From, To, Body, MessageSid, AccountSid.
 * We respond with empty TwiML (reply is sent via the Twilio API in message-handler).
 *
 * Configure your Twilio number's SMS webhook URL to:
 *   https://your-domain.com/api/sms/webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form-encoded Twilio payload
    const formData = await request.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    const from = params["From"]
    const to = params["To"]
    const body = params["Body"]
    const messageSid = params["MessageSid"]

    if (!from || !to || body === undefined || !messageSid) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Verify Twilio signature
    const authToken = process.env.TWILIO_AUTH_TOKEN
    if (authToken) {
      const signature = request.headers.get("x-twilio-signature") || ""
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`

      if (!verifyTwilioSignature(authToken, signature, url, params)) {
        console.error("[SMS] Invalid Twilio signature")
        return new NextResponse("Unauthorized", { status: 401 })
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("[SMS] TWILIO_AUTH_TOKEN not configured in production")
      return new NextResponse("Webhook not configured", { status: 500 })
    }

    // Find the agent that owns this phone number
    const agent = await getAgentBySMSNumber(to)
    if (!agent) {
      console.warn(`[SMS] No SMS-enabled agent found for number: ${to}`)
      return new NextResponse(emptyTwiML(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      })
    }

    // Handle the message (save, generate reply, send back)
    await handleSMSInbound(agent, from, body, messageSid)

    // Return empty TwiML — the reply is sent via Twilio REST API in handleSMSInbound
    return new NextResponse(emptyTwiML(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    })
  } catch (error) {
    console.error("[SMS] Webhook error:", error)
    // Always return 200 to Twilio to prevent retries on application errors
    return new NextResponse(emptyTwiML(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    })
  }
}

function emptyTwiML(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
}
