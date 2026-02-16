export interface TimeSlot {
  start: string // ISO 8601
  end: string // ISO 8601
}

export interface BookingRequest {
  agentId: string
  calendarConnectionId: string
  startTime: string
  endTime: string
  title: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  notes?: string
  conversationId?: string
}

export interface BookingResult {
  success: boolean
  appointmentId?: string
  externalEventId?: string
  error?: string
}

export interface CalendarTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
  token_type: string
}

export interface WorkingHours {
  [day: string]: {
    enabled: boolean
    start: string // "09:00"
    end: string // "17:00"
  }
}

export interface BookingSettings {
  duration_minutes: number
  buffer_minutes: number
  working_hours: WorkingHours
  max_advance_days: number
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  duration_minutes: 30,
  buffer_minutes: 15,
  working_hours: {
    monday: { enabled: true, start: "09:00", end: "17:00" },
    tuesday: { enabled: true, start: "09:00", end: "17:00" },
    wednesday: { enabled: true, start: "09:00", end: "17:00" },
    thursday: { enabled: true, start: "09:00", end: "17:00" },
    friday: { enabled: true, start: "09:00", end: "17:00" },
    saturday: { enabled: false, start: "10:00", end: "14:00" },
    sunday: { enabled: false, start: "10:00", end: "14:00" },
  },
  max_advance_days: 30,
}
