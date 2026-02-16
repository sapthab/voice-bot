import { applyFieldMapping } from "./payload-builder"

interface HubSpotConfig {
  api_key: string
}

interface HubSpotContactData {
  email?: string
  firstname?: string
  lastname?: string
  phone?: string
  company?: string
  [key: string]: string | undefined
}

/**
 * Create or update a HubSpot contact and optionally add a note.
 */
export async function syncToHubSpot(
  config: HubSpotConfig,
  data: Record<string, unknown>,
  fieldMapping: Record<string, string>,
  note?: string
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  if (!config.api_key) {
    return { success: false, error: "HubSpot API key not configured" }
  }

  try {
    // Map our fields to HubSpot fields
    const mapped = applyFieldMapping(data, fieldMapping) as HubSpotContactData
    const email = mapped.email || (data.lead as Record<string, unknown>)?.email as string

    if (!email) {
      return { success: false, error: "No email address available for HubSpot contact" }
    }

    // Try to find existing contact by email
    const searchRes = await hubspotFetch(config.api_key, "/crm/v3/objects/contacts/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: "email", operator: "EQ", value: email },
            ],
          },
        ],
      }),
    })

    const searchData = await searchRes.json()
    let contactId: string

    if (searchData.total > 0) {
      // Update existing contact
      contactId = searchData.results[0].id
      await hubspotFetch(config.api_key, `/crm/v3/objects/contacts/${contactId}`, {
        method: "PATCH",
        body: JSON.stringify({ properties: mapped }),
      })
    } else {
      // Create new contact
      const createRes = await hubspotFetch(config.api_key, "/crm/v3/objects/contacts", {
        method: "POST",
        body: JSON.stringify({ properties: { ...mapped, email } }),
      })

      const createData = await createRes.json()
      if (!createRes.ok) {
        return { success: false, error: createData.message || `HubSpot error: ${createRes.status}` }
      }
      contactId = createData.id
    }

    // Add note if provided
    if (note && contactId) {
      await hubspotFetch(config.api_key, "/crm/v3/objects/notes", {
        method: "POST",
        body: JSON.stringify({
          properties: {
            hs_note_body: note,
            hs_timestamp: new Date().toISOString(),
          },
          associations: [
            {
              to: { id: contactId },
              types: [
                {
                  associationCategory: "HUBSPOT_DEFINED",
                  associationTypeId: 202,
                },
              ],
            },
          ],
        }),
      })
    }

    return { success: true, contactId }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "HubSpot sync failed",
    }
  }
}

async function hubspotFetch(apiKey: string, path: string, init: RequestInit) {
  return fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers || {}),
    },
  })
}

export async function testHubSpotConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await hubspotFetch(apiKey, "/crm/v3/objects/contacts?limit=1", {
      method: "GET",
    })

    if (res.ok) {
      return { success: true }
    }

    const data = await res.json()
    return { success: false, error: data.message || `HTTP ${res.status}` }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed",
    }
  }
}
