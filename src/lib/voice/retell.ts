import Retell from "retell-sdk"

let retellClient: Retell | null = null

export function getRetellClient(): Retell {
  if (!retellClient) {
    if (!process.env.RETELL_API_KEY) {
      throw new Error("RETELL_API_KEY is not configured")
    }
    retellClient = new Retell({
      apiKey: process.env.RETELL_API_KEY,
    })
  }
  return retellClient
}
