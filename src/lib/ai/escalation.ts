import { Vertical } from "@/types/database"

interface EscalationResult {
  shouldEscalate: boolean
  reason: string | null
}

const UNIVERSAL_TRIGGERS = [
  { pattern: /\b(emergency|urgent|911|police|fire department|ambulance)\b/i, reason: "Emergency mentioned" },
  { pattern: /\b(speak to|talk to|transfer to|connect me with)\s+(a\s+)?(human|person|agent|manager|supervisor|representative)\b/i, reason: "Requested human agent" },
  { pattern: /\b(sue|lawsuit|legal action|attorney|lawyer)\b/i, reason: "Legal threat" },
  { pattern: /\b(complaint|complain|report|BBB|better business)\b/i, reason: "Complaint filed" },
]

const VERTICAL_TRIGGERS: Record<string, { pattern: RegExp; reason: string }[]> = {
  home_services: [
    { pattern: /\b(gas leak|carbon monoxide|flooding|burst pipe|electrical fire|power outage)\b/i, reason: "Home emergency" },
    { pattern: /\b(mold|asbestos|structural damage)\b/i, reason: "Health/safety hazard" },
  ],
  dental: [
    { pattern: /\b(severe pain|swelling|bleeding won't stop|knocked out tooth|abscess|infection)\b/i, reason: "Dental emergency" },
    { pattern: /\b(allergic reaction|difficulty breathing|chest pain)\b/i, reason: "Medical emergency" },
  ],
  medical: [
    { pattern: /\b(chest pain|difficulty breathing|stroke|heart attack|unconscious|seizure|suicide|self.?harm)\b/i, reason: "Medical emergency" },
    { pattern: /\b(overdose|poisoning|severe bleeding)\b/i, reason: "Medical emergency" },
  ],
  legal: [
    { pattern: /\b(arrested|custody|court date tomorrow|warrant|detained)\b/i, reason: "Urgent legal matter" },
    { pattern: /\b(statute of limitations|deadline today)\b/i, reason: "Time-sensitive legal issue" },
  ],
  real_estate: [
    { pattern: /\b(closing tomorrow|lost earnest money|contract dispute|eviction)\b/i, reason: "Urgent real estate issue" },
  ],
  restaurant: [
    { pattern: /\b(food poisoning|allergic reaction|sick after eating)\b/i, reason: "Food safety concern" },
  ],
  ecommerce: [
    { pattern: /\b(fraud|unauthorized charge|identity theft|stolen card)\b/i, reason: "Fraud/security issue" },
  ],
}

/**
 * Build the system-prompt snippet the AI should follow when a conversation
 * has been escalated. Informs the AI to acknowledge and hand off.
 */
export function buildEscalationSystemNote(
  agent: { name: string; escalation_email?: string | null; escalation_phone?: string | null },
  reason: string,
  conversationType: "chat" | "voice" = "chat"
): string {
  const contacts: string[] = []
  if (agent.escalation_email) contacts.push(`email: ${agent.escalation_email}`)
  if (agent.escalation_phone) contacts.push(`phone: ${agent.escalation_phone}`)

  const contactLine =
    contacts.length > 0
      ? `Provide the customer with these contact details: ${contacts.join(" or ")}.`
      : "Let the customer know a team member will follow up with them shortly."

  if (conversationType === "voice") {
    return `\n\nESCALATION: This caller requires human assistance (${reason}). Tell them you are connecting them with a team member and keep your response brief and reassuring. ${contactLine}`
  }

  return `\n\n## Escalation Required
The customer's message has triggered an escalation (${reason}).
You MUST:
1. Acknowledge their concern with empathy
2. Clearly let them know they will be connected with a human team member
3. ${contactLine}
4. Do not attempt to resolve this yourself — this requires human attention`
}

export function checkEscalation(message: string, vertical: Vertical): EscalationResult {
  // Check universal triggers
  for (const trigger of UNIVERSAL_TRIGGERS) {
    if (trigger.pattern.test(message)) {
      return { shouldEscalate: true, reason: trigger.reason }
    }
  }

  // Check vertical-specific triggers
  const verticalTriggers = VERTICAL_TRIGGERS[vertical] || []
  for (const trigger of verticalTriggers) {
    if (trigger.pattern.test(message)) {
      return { shouldEscalate: true, reason: trigger.reason }
    }
  }

  return { shouldEscalate: false, reason: null }
}
