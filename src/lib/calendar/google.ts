import { CalendarTokens, TimeSlot } from "./types"
import { encrypt, decrypt } from "@/lib/crypto/encrypt"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"

function getGoogleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  }
}

/**
 * Generate the Google OAuth authorization URL.
 */
export function getGoogleAuthUrl(agentId: string): string {
  const { clientId, redirectUri } = getGoogleConfig()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
    state: agentId,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<CalendarTokens> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig()

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Token exchange failed")
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
  }
}

/**
 * Refresh an expired access token.
 */
async function refreshTokens(refreshToken: string): Promise<CalendarTokens> {
  const { clientId, clientSecret } = getGoogleConfig()

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Token refresh failed")
  }

  return {
    access_token: data.access_token,
    refresh_token: refreshToken,
    expiry_date: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
  }
}

/**
 * Get a valid access token, refreshing if necessary.
 */
export async function getValidTokens(encryptedTokens: string): Promise<CalendarTokens> {
  const tokens: CalendarTokens = JSON.parse(decrypt(encryptedTokens))

  // Refresh if token expires in less than 5 minutes
  if (tokens.expiry_date < Date.now() + 5 * 60 * 1000) {
    const refreshed = await refreshTokens(tokens.refresh_token)
    return refreshed
  }

  return tokens
}

export function encryptTokens(tokens: CalendarTokens): string {
  return encrypt(JSON.stringify(tokens))
}

/**
 * List events (busy times) in a date range.
 */
export async function listBusyTimes(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<TimeSlot[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    fields: "items(start,end,status)",
  })

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || `Calendar API error: ${response.status}`)
  }

  const data = await response.json()
  const events = (data.items || []) as Array<{
    start: { dateTime?: string; date?: string }
    end: { dateTime?: string; date?: string }
    status?: string
  }>

  return events
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      start: e.start.dateTime || e.start.date || "",
      end: e.end.dateTime || e.end.date || "",
    }))
    .filter((e) => e.start && e.end)
}

/**
 * Create a calendar event.
 */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string
    start: string
    end: string
    description?: string
    attendees?: { email: string }[]
  }
): Promise<{ id: string; htmlLink: string }> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.start },
        end: { dateTime: event.end },
        attendees: event.attendees,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || `Calendar API error: ${response.status}`)
  }

  const data = await response.json()
  return { id: data.id, htmlLink: data.htmlLink }
}

/**
 * List calendars for the authenticated user.
 */
export async function listCalendars(
  accessToken: string
): Promise<Array<{ id: string; summary: string; primary: boolean }>> {
  const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Calendar list error: ${response.status}`)
  }

  const data = await response.json()
  return (data.items || []).map((c: { id: string; summary: string; primary?: boolean }) => ({
    id: c.id,
    summary: c.summary,
    primary: c.primary || false,
  }))
}
