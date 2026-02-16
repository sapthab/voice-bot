import { registerTool } from "./index"
import { ToolContext, ToolResult } from "./types"
import { createAdminClient } from "@/lib/supabase/server"
import { getValidTokens, listBusyTimes, encryptTokens } from "@/lib/calendar/google"
import { findAvailableSlots } from "@/lib/calendar/availability"
import { BookingSettings, DEFAULT_BOOKING_SETTINGS } from "@/lib/calendar/types"

registerTool({
  definition: {
    name: "check_availability",
    description:
      "Check calendar availability for appointment booking. Returns available time slots for a given date.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date to check availability for (YYYY-MM-DD format)",
        },
        duration_minutes: {
          type: "number",
          description: "Duration of the appointment in minutes (default: uses agent settings)",
        },
      },
      required: ["date"],
    },
  },
  requiredFeature: "booking_enabled",
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const date = args.date as string
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { success: false, error: "Invalid date format. Use YYYY-MM-DD." }
    }

    const supabase = await createAdminClient()

    // Get calendar connection
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("agent_id", context.agent.id)
      .single()

    if (!connection) {
      return { success: false, error: "No calendar connected for this agent." }
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

      // Get busy times for the date
      const timeMin = `${date}T00:00:00Z`
      const timeMax = `${date}T23:59:59Z`
      const busyTimes = await listBusyTimes(
        tokens.access_token,
        conn.calendar_id as string,
        timeMin,
        timeMax
      )

      // Get booking settings
      const agentAny = context.agent as Record<string, unknown>
      const settings: BookingSettings = (agentAny.booking_settings as BookingSettings) || DEFAULT_BOOKING_SETTINGS

      if (args.duration_minutes) {
        settings.duration_minutes = args.duration_minutes as number
      }

      // Find available slots
      const slots = findAvailableSlots(date, busyTimes, settings)

      if (slots.length === 0) {
        return {
          success: true,
          data: { date, available_slots: [] },
          message: `No available time slots on ${date}.`,
        }
      }

      // Format slots for readability
      const formattedSlots = slots.slice(0, 8).map((slot) => ({
        start: slot.start,
        end: slot.end,
        display: formatTimeDisplay(slot.start),
      }))

      return {
        success: true,
        data: {
          date,
          available_slots: formattedSlots,
          duration_minutes: settings.duration_minutes,
        },
        message: `Found ${formattedSlots.length} available slots on ${date}.`,
      }
    } catch (error) {
      console.error("[check-availability] Error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check availability",
      }
    }
  },
})

function formatTimeDisplay(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
