import { TimeSlot, BookingSettings, DEFAULT_BOOKING_SETTINGS } from "./types"

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

/**
 * Find available time slots for a given date, considering busy times and working hours.
 */
export function findAvailableSlots(
  date: string, // YYYY-MM-DD
  busyTimes: TimeSlot[],
  settings: BookingSettings = DEFAULT_BOOKING_SETTINGS,
  timezone: string = "America/New_York"
): TimeSlot[] {
  const dayOfWeek = DAY_NAMES[new Date(date + "T12:00:00").getDay()]
  const workingHours = settings.working_hours[dayOfWeek]

  if (!workingHours || !workingHours.enabled) {
    return [] // Not a working day
  }

  const slotDuration = settings.duration_minutes
  const buffer = settings.buffer_minutes

  // Build working hours window
  const dayStart = new Date(`${date}T${workingHours.start}:00`)
  const dayEnd = new Date(`${date}T${workingHours.end}:00`)

  // Convert busy times to date objects for the day
  const busySlots = busyTimes
    .map((slot) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
    }))
    .filter((slot) => {
      // Only include busy times that overlap with this day
      return slot.start < dayEnd && slot.end > dayStart
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  // Generate available slots
  const availableSlots: TimeSlot[] = []
  let current = new Date(dayStart)

  // Don't show slots in the past
  const now = new Date()
  if (current < now) {
    // Round up to next slot boundary
    const minutes = now.getMinutes()
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    current = new Date(now)
    current.setMinutes(roundedMinutes, 0, 0)
  }

  while (current.getTime() + slotDuration * 60000 <= dayEnd.getTime()) {
    const slotEnd = new Date(current.getTime() + slotDuration * 60000)

    // Check if slot conflicts with any busy time (including buffer)
    const hasConflict = busySlots.some((busy) => {
      const busyStart = new Date(busy.start.getTime() - buffer * 60000)
      const busyEnd = new Date(busy.end.getTime() + buffer * 60000)
      return current < busyEnd && slotEnd > busyStart
    })

    if (!hasConflict) {
      availableSlots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
      })
    }

    // Advance by slot duration
    current = new Date(current.getTime() + slotDuration * 60000)
  }

  return availableSlots
}
