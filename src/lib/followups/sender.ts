import { createAdminClient } from "@/lib/supabase/server"
import { interpolate, TemplateVariables } from "@/lib/templates/interpolate"
import { getConversationSummary } from "./summary"
import { sendSMS } from "./sms"
import { sendEmail } from "./email"

/**
 * Process follow-ups for a completed conversation.
 * Checks for enabled follow-up configs and sends them.
 */
export async function processFollowups(
  conversationId: string,
  conversation: Record<string, unknown>,
  agent: Record<string, unknown>
) {
  const supabase = await createAdminClient()

  // Get follow-up configs for this agent
  const { data: configs } = await supabase
    .from("followup_configs")
    .select("*")
    .eq("agent_id", agent.id as string)
    .eq("enabled", true)

  if (!configs || configs.length === 0) return

  // Get lead info if available
  let lead: Record<string, unknown> | null = null
  if (conversation.lead_id) {
    const { data: leadData } = await supabase
      .from("leads")
      .select("*")
      .eq("id", conversation.lead_id as string)
      .single()
    lead = leadData as Record<string, unknown> | null
  }

  // Get conversation summary
  const summary = await getConversationSummary(conversationId)

  // Build template variables
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

    // For delayed follow-ups, we'd need a queue system.
    // For now, if delay > 0, skip (in production, use a job queue)
    if (delayMinutes > 0) {
      console.log(`[Followups] Skipping delayed follow-up (${delayMinutes}m) for ${conversationId}`)
      continue
    }

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

    // Interpolate template
    const body = interpolate(config.template_body as string, variables)
    const subject = config.template_subject
      ? interpolate(config.template_subject as string, variables)
      : undefined

    // Create delivery record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: delivery } = await (supabase.from("followup_deliveries") as any)
      .insert({
        followup_config_id: config.id,
        conversation_id: conversationId,
        recipient,
        status: "pending",
      })
      .select()
      .single()

    const deliveryId = delivery?.id

    // Send
    let result: { success: boolean; messageId?: string; error?: string }
    if (channel === "sms") {
      result = await sendSMS({ to: recipient, body })
    } else if (channel === "email") {
      result = await sendEmail({
        to: recipient,
        subject: subject || `Follow-up from ${variables.business_name}`,
        body,
        fromName: (config.from_name as string) || undefined,
        fromEmail: (config.from_email as string) || undefined,
      })
    } else {
      result = { success: false, error: `Unknown channel: ${channel}` }
    }

    // Update delivery record
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
