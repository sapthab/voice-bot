import { Agent } from "@/types/database"

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "object" | "array"
  description: string
  enum?: string[]
  required?: boolean
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, ToolParameter>
    required?: string[]
  }
}

export interface ToolContext {
  agent: Agent
  conversationId: string
  visitorId?: string
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  /** User-facing message to include in the conversation */
  message?: string
}

export interface ToolHandler {
  definition: ToolDefinition
  /** Whether this tool requires a specific feature to be enabled on the agent */
  requiredFeature?: "booking_enabled"
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>
}
