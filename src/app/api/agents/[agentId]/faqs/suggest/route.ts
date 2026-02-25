import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { createAdminClient } from "@/lib/supabase/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params

    const user = await getAuthenticatedUser()
    if (!user) return unauthorizedResponse()

    const ownership = await verifyAgentOwnership(agentId, user.id)
    if (!ownership) return forbiddenResponse()

    const { question } = await request.json()

    if (!question?.trim()) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 })
    }

    // Fetch name and system_prompt for context
    const supabase = await createAdminClient()
    const { data: agentRow } = await supabase
      .from("agents")
      .select("name, system_prompt")
      .eq("id", agentId)
      .single()

    const agentData = agentRow as { name: string; system_prompt?: string | null } | null

    const agentName = agentData?.name ?? "the assistant"
    const systemContext = agentData?.system_prompt
      ? `You are helping write FAQ entries for an AI assistant named "${agentName}".\n\nThe agent's role and context:\n${agentData.system_prompt}`
      : `You are helping write FAQ entries for an AI assistant named "${agentName}".`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContext },
        {
          role: "user",
          content: `A visitor asked this question and the agent was unable to answer it from its knowledge base:\n\n"${question}"\n\nWrite a clear, helpful FAQ answer for this question. Keep it concise and factual. If you don't have enough context from the agent's role to give a specific answer, write a placeholder like "[Add your answer here]" with a brief template.`,
        },
      ],
      max_tokens: 400,
      temperature: 0.4,
    })

    const answer = completion.choices[0]?.message?.content?.trim() || ""
    return NextResponse.json({ answer })
  } catch (error) {
    console.error("FAQ suggest error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
