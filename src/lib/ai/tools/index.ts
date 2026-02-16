import { Agent } from "@/types/database"
import { ToolHandler, ToolDefinition, ToolContext, ToolResult } from "./types"

// Tool registry — tools register themselves here
const toolRegistry = new Map<string, ToolHandler>()

export function registerTool(handler: ToolHandler) {
  toolRegistry.set(handler.definition.name, handler)
}

/**
 * Get the OpenAI-compatible tool definitions for an agent
 * based on which features are enabled.
 */
export function getAgentTools(agent: Agent): { type: "function"; function: ToolDefinition }[] {
  const tools: { type: "function"; function: ToolDefinition }[] = []

  for (const handler of toolRegistry.values()) {
    // Check if the tool requires a specific feature
    if (handler.requiredFeature) {
      const agentAny = agent as Record<string, unknown>
      if (!agentAny[handler.requiredFeature]) continue
    }
    tools.push({ type: "function", function: handler.definition })
  }

  return tools
}

/**
 * Execute a tool by name with the given arguments and context.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const handler = toolRegistry.get(name)
  if (!handler) {
    return { success: false, error: `Unknown tool: ${name}` }
  }

  try {
    return await handler.execute(args, context)
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    }
  }
}

/**
 * Check if any tools are available for the given agent.
 */
export function hasTools(agent: Agent): boolean {
  return getAgentTools(agent).length > 0
}

// Auto-register tools — import side-effect modules
// These will be populated as features are built
export async function loadTools() {
  // Phase 4: Appointment booking tools
  try {
    await import("./check-availability")
    await import("./book-appointment")
  } catch {
    // Tools not yet built — that's fine
  }
}
