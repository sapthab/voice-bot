import { createAdminClient } from "@/lib/supabase/server"
import { interpolate, TemplateVariables } from "@/lib/templates/interpolate"
import { getConversationSummary } from "./summary"
import { sendSMS } from "./sms"
import { sendEmail } from "./email"

/**
 * Process follow-ups for a completed conversation.
 * Immediate follow-ups (delay_minutes = 0) are sent right away.
 * Delayed follow-ups are scheduled in followup_deliveries with a
 * scheduled_for timestamp; the /api/internal/process-followups cron
 * picks them up once they come due.
 */
export async function processFollowups(
  conversationId: string,
  conversation: Record<string, unknown>,
  agent: Record<string, unknown>
) {
  const supabase = await createAdminClient()

  const { data: configs } = await supabase
    .from("followup_configs")
    .select("*")
    .eq("agent_id", agent.id as string)
    .eq("enabled", true)

  if (!configs || configs.length === 0) return

  let lead: Record<string, unknown> | null = null
  if (conversation.lead_id) {
    const { data: leadData } = await supabase
      .from("leads")
      .select("*")
      .eq("id", conversation.lead_id as string)
      .single()
    lead = leadData as Record<string, unknown> | null
  }

  const summary = await getConversationSummary(conversationId)

  const variables: TemplateVariables = {
    customer_name: (lead?.name as string) || "Valued Customer",
    business_name: (agent.name as string) || "Our Business",
    agent_name: (agent.name as string) || "AI Assistant",
    summary,
    customer_email: (lead?.email as string) || "",
    customer_phone: (lead?.phone as string) || (conversation.call_from as string) || "",
  }

  for (const config of configs as Array<Record<string, unknown>>) {
    const channel = config.channel as string
    const delayMinutes = (config.delay_minutes as number) || 0

    // Resolve recipient
    let recipient = ""
    if (channel === "sms") {
      recipient = variables.customer_phone || ""
    } else if (channel === "email") {
      recipient = variables.customer_email || ""
    }

    if (!recipient) {
      console.log(`[Followups] No recipient for ${channel} follow-up on ${conversationId}`)
      continue
    }

    // Render template now so it reflects the conversation context
    const renderedBody = interpolate(config.template_body as string, variables)
    const renderedSubject = config.template_subject
      ? interpolate(config.template_subject as string, variables)
      : undefined

    if (delayMinutes > 0) {
      // Schedule for later — the process-followups cron will send it
      const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("followup_deliveries") as any).insert({
        followup_config_id: config.id,
        conversation_id: conversationId,
        recipient,
        status: "pending",
        scheduled_for: scheduledFor,
        rendered_body: renderedBody,
        rendered_subject: renderedSubject || null,
      })
      console.log(`[Followups] Scheduled ${channel} follow-up for ${recipient} at ${scheduledFor}`)
      continue
    }

    // Immediate delivery (delay_minutes === 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: delivery } = await (supabase.from("followup_deliveries") as any)
      .insert({
        followup_config_id: config.id,
        conversation_id: conversationId,
        recipient,
        status: "pending",
        scheduled_for: new Date().toISOString(),
        rendered_body: renderedBody,
        rendered_subject: renderedSubject || null,
      })
      .select()
      .single()

    const deliveryId = delivery?.id

    let result: { success: boolean; messageId?: string; error?: string }
    if (channel === "sms") {
      result = await sendSMS({ to: recipient, body: renderedBody })
    } else if (channel === "email") {
      result = await sendEmail({
        to: recipient,
        subject: renderedSubject || `Follow-up from ${variables.business_name}`,
        body: renderedBody,
        fromName: (config.from_name as string) || undefined,
        fromEmail: (config.from_email as string) || undefined,
      })
    } else {
      result = { success: false, error: `Unknown channel: ${channel}` }
    }

    if (deliveryId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("followup_deliveries") as any)
        .update({
          status: result.success ? "sent" : "failed",
          external_id: result.messageId || null,
          error_message: result.error || null,
          sent_at: result.success ? new Date().toISOString() : null,
        })
        .eq("id", deliveryId)
    }

    console.log(
      `[Followups] ${channel} to ${recipient}: ${result.success ? "sent" : "failed"} - ${result.error || result.messageId}`
    )
  }
}
