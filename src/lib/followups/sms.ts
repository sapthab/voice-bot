interface SendSMSParams {
  to: string
  body: string
  from?: string
}

interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendSMS(params: SendSMSParams): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = params.from || process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio credentials not configured" }
  }

  if (!fromNumber) {
    return { success: false, error: "Twilio from number not configured" }
  }

  try {
    // Use fetch directly to avoid requiring twilio SDK at import time
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    const body = new URLSearchParams({
      To: params.to,
      From: fromNumber,
      Body: params.body,
    })

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || `Twilio error: ${response.status}` }
    }

    return { success: true, messageId: data.sid }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS send failed",
    }
  }
}
