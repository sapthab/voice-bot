/**
 * Shared voice tool definitions.
 *
 * This file has NO @/ imports so it can be imported directly by server.ts
 * (which runs with tsx/tsc and cannot resolve Next.js path aliases) as well
 * as by the rest of the src/ tree.
 */

export interface VoiceToolDefinition {
  type: "function"
  function: {
    name: string
    description: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: Record<string, any>
  }
}

/**
 * Get tools available for a voice agent based on enabled feature flags.
 */
export function getVoiceTools(
  agentData: Record<string, unknown>
): VoiceToolDefinition[] {
  const tools: VoiceToolDefinition[] = []

  if (agentData.booking_enabled) {
    tools.push({
      type: "function",
      function: {
        name: "check_availability",
        description:
          "Check calendar availability for appointment booking. Returns available time slots.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description:
                "The date to check availability for (YYYY-MM-DD format)",
            },
            duration_minutes: {
              type: "number",
              description:
                "Duration of the appointment in minutes (default: 30)",
            },
          },
          required: ["date"],
        },
      },
    })
    tools.push({
      type: "function",
      function: {
        name: "book_appointment",
        description: "Book an appointment at a specific time slot.",
        parameters: {
          type: "object",
          properties: {
            start_time: {
              type: "string",
              description: "Start time in ISO 8601 format",
            },
            customer_name: {
              type: "string",
              description: "Customer's name",
            },
            customer_email: {
              type: "string",
              description: "Customer's email",
            },
            customer_phone: {
              type: "string",
              description: "Customer's phone number",
            },
            notes: {
              type: "string",
              description: "Any notes for the appointment",
            },
          },
          required: ["start_time", "customer_name"],
        },
      },
    })
  }

  return tools
}

/**
 * Execute a voice tool by calling the internal execute-tool API endpoint.
 */
export async function executeVoiceTool(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>,
  agentId: string,
  conversationId: string,
  baseUrl?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
  try {
    const url =
      baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const response = await fetch(`${url}/api/internal/execute-tool`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
      },
      body: JSON.stringify({ toolName, args, agentId, conversationId }),
    })

    if (!response.ok) {
      return { success: false, error: `Tool API returned ${response.status}` }
    }

    return await response.json()
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Tool execution failed"
    console.error(`Tool execution error (${toolName}):`, error)
    return { success: false, error: message }
  }
}
