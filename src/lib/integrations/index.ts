import { createAdminClient } from "@/lib/supabase/server"
import { buildEventPayload } from "./payload-builder"
import { sendWebhook } from "./webhook"
import { syncToHubSpot } from "./hubspot"
import { getConversationSummary } from "@/lib/followups/summary"

export type IntegrationEvent =
  | "lead_captured"
  | "call_completed"
  | "chat_completed"
  | "appointment_booked"
  | "escalation_detected"

interface EventContext {
  agentId: string
  conversationId?: string
  conversation?: Record<string, unknown>
  agent?: Record<string, unknown>
  lead?: Record<string, unknown>
  appointment?: Record<string, unknown>
}

/**
 * Dispatch an event to all matching integrations for the agent.
 */
export async function dispatchEvent(event: IntegrationEvent, context: EventContext) {
  const supabase = await createAdminClient()

  // Find enabled integrations for this agent that listen to this event
  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .eq("agent_id", context.agentId)
    .eq("enabled", true)

  if (!integrations || integrations.length === 0) return

  // Get conversation summary if we have a conversation
  let summary: string | undefined
  if (context.conversationId) {
    try {
      summary = await getConversationSummary(context.conversationId)
    } catch {
      // Summary is optional
    }
  }

  const payload = buildEventPayload(event, { ...context, summary })

  for (const integration of integrations as Array<Record<string, unknown>>) {
    const enabledEvents = (integration.enabled_events as string[]) || []

    // Check if this integration listens to this event
    if (enabledEvents.length > 0 && !enabledEvents.includes(event)) continue

    const provider = integration.provider as string
    const config = (integration.config || {}) as Record<string, unknown>
    const fieldMapping = (integration.field_mapping || {}) as Record<string, string>

    try {
      if (provider === "webhook") {
        await sendWebhook(
          integration.id as string,
          { url: config.url as string, hmac_secret: config.hmac_secret as string | undefined },
          event,
          payload
        )
      } else if (provider === "hubspot") {
        // Only sync to HubSpot for lead-related events
        if (event === "lead_captured" || event === "call_completed" || event === "chat_completed") {
          // Get lead data if not in context
          let leadData = context.lead
          if (!leadData && context.conversation?.lead_id) {
            const { data: lead } = await supabase
              .from("leads")
              .select("*")
              .eq("id", context.conversation.lead_id as string)
              .single()
            leadData = lead ? (lead as unknown as Record<string, unknown>) : undefined
          }

          if (leadData) {
            await syncToHubSpot(
              { api_key: config.api_key as string },
              { lead: leadData, conversation: context.conversation },
              fieldMapping,
              summary ? `Call Summary: ${summary}` : undefined
            )
          }
        }
      }
    } catch (error) {
      console.error(`[Integrations] Error dispatching ${event} to ${provider}:`, error)
    }
  }
}
