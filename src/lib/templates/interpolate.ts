export interface TemplateVariables {
  customer_name?: string
  business_name?: string
  agent_name?: string
  summary?: string
  appointment_time?: string
  customer_email?: string
  customer_phone?: string
  [key: string]: string | undefined
}

/**
 * Replace {{variable}} placeholders in a template string with values.
 * Unknown variables are left as-is.
 */
export function interpolate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key]
    return value !== undefined ? value : match
  })
}
