import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/server"
import { EventPayload } from "./payload-builder"

const RETRY_DELAYS_MS = [
  1 * 60 * 1000,     // 1 min
  5 * 60 * 1000,     // 5 min
  15 * 60 * 1000,    // 15 min
  60 * 60 * 1000,    // 1 hour
  240 * 60 * 1000,   // 4 hours
]

interface WebhookConfig {
  url: string
  hmac_secret?: string
}

/**
 * Send a webhook payload to the configured URL with optional HMAC signature.
 */
export async function sendWebhook(
  integrationId: string,
  config: WebhookConfig,
  event: string,
  payload: EventPayload
): Promise<{ success: boolean; deliveryId?: string }> {
  const supabase = await createAdminClient()
  const payloadStr = JSON.stringify(payload)

  // Create delivery record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: delivery } = await (supabase.from("webhook_deliveries") as any)
    .insert({
      integration_id: integrationId,
      event,
      payload,
      status: "pending",
      attempts: 0,
    })
    .select()
    .single()

  const deliveryId = delivery?.id

  const result = await attemptWebhookDelivery(config, payloadStr)

  // Update delivery record
  if (deliveryId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("webhook_deliveries") as any)
      .update({
        status: result.success ? "sent" : "failed",
        response_code: result.statusCode,
        response_body: result.responseBody?.slice(0, 1000),
        attempts: 1,
        error_message: result.error,
        next_retry_at: result.success ? null : new Date(Date.now() + RETRY_DELAYS_MS[0]).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", deliveryId)
  }

  return { success: result.success, deliveryId }
}

async function attemptWebhookDelivery(
  config: WebhookConfig,
  payloadStr: string
): Promise<{ success: boolean; statusCode?: number; responseBody?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Add HMAC signature if secret is configured
    if (config.hmac_secret) {
      const signature = crypto
        .createHmac("sha256", config.hmac_secret)
        .update(payloadStr)
        .digest("hex")
      headers["X-Webhook-Signature"] = `sha256=${signature}`
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    const responseBody = await response.text().catch(() => "")
    const success = response.status >= 200 && response.status < 300

    return {
      success,
      statusCode: response.status,
      responseBody,
      error: success ? undefined : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Webhook delivery failed",
    }
  }
}

/**
 * Retry failed webhook deliveries.
 */
export async function retryFailedWebhooks() {
  const supabase = await createAdminClient()

  const now = new Date().toISOString()

  const { data: pendingRetries } = await supabase
    .from("webhook_deliveries")
    .select("*, integrations!webhook_deliveries_integration_id_fkey(config)")
    .eq("status", "failed")
    .lte("next_retry_at", now)
    .lt("attempts", RETRY_DELAYS_MS.length)
    .limit(20)

  if (!pendingRetries || pendingRetries.length === 0) return 0

  let retried = 0

  for (const delivery of pendingRetries as Array<Record<string, unknown>>) {
    const config = ((delivery.integrations as Record<string, unknown>)?.config as WebhookConfig) || {}
    if (!config.url) continue

    const payloadStr = JSON.stringify(delivery.payload)
    const result = await attemptWebhookDelivery(config, payloadStr)
    const attempts = (delivery.attempts as number) + 1

    const nextRetryDelay = RETRY_DELAYS_MS[attempts]
    const nextRetryAt = nextRetryDelay
      ? new Date(Date.now() + nextRetryDelay).toISOString()
      : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("webhook_deliveries") as any)
      .update({
        status: result.success ? "sent" : "failed",
        response_code: result.statusCode,
        response_body: result.responseBody?.slice(0, 1000),
        attempts,
        error_message: result.error,
        next_retry_at: result.success ? null : nextRetryAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", delivery.id)

    retried++
  }

  return retried
}
