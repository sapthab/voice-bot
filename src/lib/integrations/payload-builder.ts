/**
 * Build Zapier-compatible event payloads for integrations.
 */
export interface EventPayload {
  event: string
  timestamp: string
  agent: {
    id: string
    name: string
  }
  data: Record<string, unknown>
}

export function buildEventPayload(
  event: string,
  context: {
    agentId: string
    conversationId?: string
    conversation?: Record<string, unknown>
    agent?: Record<string, unknown>
    lead?: Record<string, unknown>
    summary?: string
    appointment?: Record<string, unknown>
  }
): EventPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    agent: {
      id: context.agentId,
      name: (context.agent?.name as string) || "",
    },
    data: {
      ...(context.conversation ? { conversation: sanitizeForPayload(context.conversation) } : {}),
      ...(context.lead ? { lead: sanitizeForPayload(context.lead) } : {}),
      ...(context.summary ? { summary: context.summary } : {}),
      ...(context.appointment ? { appointment: sanitizeForPayload(context.appointment) } : {}),
      ...(context.conversationId ? { conversation_id: context.conversationId } : {}),
    },
  }
}

function sanitizeForPayload(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    // Skip internal fields
    if (key.startsWith("_") || key === "embedding") continue
    clean[key] = value
  }
  return clean
}

/**
 * Map fields from our payload to the integration's field mapping.
 */
export function applyFieldMapping(
  data: Record<string, unknown>,
  fieldMapping: Record<string, string>
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}

  for (const [ourField, theirField] of Object.entries(fieldMapping)) {
    const value = getNestedValue(data, ourField)
    if (value !== undefined) {
      mapped[theirField] = value
    }
  }

  return mapped
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
