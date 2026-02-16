interface SendEmailParams {
  to: string
  subject: string
  body: string
  fromName?: string
  fromEmail?: string
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { success: false, error: "Resend API key not configured" }
  }

  const fromEmail = params.fromEmail || process.env.RESEND_FROM_EMAIL || "noreply@example.com"
  const fromName = params.fromName || "VoiceBot AI"

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [params.to],
        subject: params.subject,
        html: params.body.replace(/\n/g, "<br>"),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || `Resend error: ${response.status}` }
    }

    return { success: true, messageId: data.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email send failed",
    }
  }
}
