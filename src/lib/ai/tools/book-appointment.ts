import { registerTool } from "./index"
import { ToolContext, ToolResult } from "./types"
import { createAdminClient } from "@/lib/supabase/server"
import { getValidTokens, createCalendarEvent, encryptTokens } from "@/lib/calendar/google"
import { BookingSettings, DEFAULT_BOOKING_SETTINGS } from "@/lib/calendar/types"

registerTool({
  definition: {
    name: "book_appointment",
    description: "Book an appointment at a specific time slot. Creates a calendar event and records the appointment.",
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
          description: "Customer's email address",
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
  requiredFeature: "booking_enabled",
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const startTime = args.start_time as string
    const customerName = args.customer_name as string
    const customerEmail = args.customer_email as string | undefined
    const customerPhone = args.customer_phone as string | undefined
    const notes = args.notes as string | undefined

    if (!startTime || !customerName) {
      return { success: false, error: "start_time and customer_name are required" }
    }

    const supabase = await createAdminClient()

    // Get calendar connection
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("agent_id", context.agent.id)
      .single()

    if (!connection) {
      return { success: false, error: "No calendar connected" }
    }

    const conn = connection as Record<string, unknown>

    try {
      // Get valid tokens
      const tokens = await getValidTokens(conn.encrypted_tokens as string)

      // Update stored tokens if refreshed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("calendar_connections") as any)
        .update({ encrypted_tokens: encryptTokens(tokens) })
        .eq("id", conn.id)

      // Calculate end time based on booking settings
      const agentAny = context.agent as Record<string, unknown>
      const settings: BookingSettings = (agentAny.booking_settings as BookingSettings) || DEFAULT_BOOKING_SETTINGS
      const startDate = new Date(startTime)
      const endDate = new Date(startDate.getTime() + settings.duration_minutes * 60000)

      const title = `Appointment with ${customerName}`

      // Create Google Calendar event
      const event = await createCalendarEvent(
        tokens.access_token,
        conn.calendar_id as string,
        {
          summary: title,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          description: [
            `Customer: ${customerName}`,
            customerEmail ? `Email: ${customerEmail}` : null,
            customerPhone ? `Phone: ${customerPhone}` : null,
            notes ? `Notes: ${notes}` : null,
            `Booked by ${context.agent.name} AI Assistant`,
          ]
            .filter(Boolean)
            .join("\n"),
          attendees: customerEmail ? [{ email: customerEmail }] : undefined,
        }
      )

      // Save appointment to database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: appointment } = await (supabase.from("appointments") as any)
        .insert({
          agent_id: context.agent.id,
          conversation_id: context.conversationId || null,
          calendar_connection_id: conn.id,
          external_event_id: event.id,
          title,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          notes: notes || null,
          status: "confirmed",
        })
        .select()
        .single()

      // Dispatch appointment_booked event to integrations
      try {
        const { dispatchEvent } = await import("@/lib/integrations")
        await dispatchEvent("appointment_booked", {
          agentId: context.agent.id,
          conversationId: context.conversationId,
          appointment: appointment as Record<string, unknown>,
          agent: context.agent as unknown as Record<string, unknown>,
        })
      } catch {
        // Integration dispatch is optional
      }

      const displayTime = startDate.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })

      return {
        success: true,
        data: {
          appointment_id: appointment?.id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          title,
          customer_name: customerName,
        },
        message: `Appointment booked for ${customerName} on ${displayTime}.`,
      }
    } catch (error) {
      console.error("[book-appointment] Error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to book appointment",
      }
    }
  },
})
