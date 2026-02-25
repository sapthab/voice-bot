import { sendEmail } from "@/lib/followups/email"
import { sendSMS } from "@/lib/followups/sms"

interface EscalationNotifyParams {
  agent: {
    name: string
    id: string
    escalation_email?: string | null
    escalation_phone?: string | null
  }
  conversationId: string
  reason: string
  channel: string
}

/**
 * Notify the business owner when a conversation is escalated.
 * Sends an email and/or SMS to the configured escalation contacts.
 * Errors are logged but never thrown (notification is best-effort).
 */
export async function notifyEscalation(params: EscalationNotifyParams): Promise<void> {
  const { agent, conversationId, reason, channel } = params

  if (!agent.escalation_email && !agent.escalation_phone) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const dashboardUrl = `${appUrl}/conversations?id=${conversationId}`

  const subject = `[Action Required] ${reason} — ${agent.name}`
  const body = [
    `A ${channel} conversation needs human attention.`,
    ``,
    `Agent:   ${agent.name}`,
    `Reason:  ${reason}`,
    `Channel: ${channel}`,
    ``,
    `View conversation: ${dashboardUrl}`,
    ``,
    `Please follow up with this customer as soon as possible.`,
  ].join("\n")

  const tasks: Promise<unknown>[] = []

  if (agent.escalation_email) {
    tasks.push(
      sendEmail({ to: agent.escalation_email, subject, body }).catch((err) =>
        console.error("[Escalation] Email notification failed:", err)
      )
    )
  }

  if (agent.escalation_phone) {
    const smsBody = `${agent.name}: ${reason} — customer needs help. ${dashboardUrl}`
    tasks.push(
      sendSMS({ to: agent.escalation_phone, body: smsBody }).catch((err) =>
        console.error("[Escalation] SMS notification failed:", err)
      )
    )
  }

  await Promise.allSettled(tasks)
}
