import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { generateEmbedding } from "@/lib/ai/embeddings"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params

    const user = await getAuthenticatedUser()
    if (!user) return unauthorizedResponse()

    const agent = await verifyAgentOwnership(agentId, user.id)
    if (!agent) return forbiddenResponse()

    const { question, answer } = await request.json()

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Missing question or answer" },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Generate embedding for the FAQ (combine question + answer for better matching)
    const embedding = await generateEmbedding(`${question} ${answer}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("faqs") as any)
      .insert({
        agent_id: agentId,
        question,
        answer,
        embedding,
      })
      .select()
      .single()

    if (error) {
      console.error("FAQ creation error:", error)
      return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 })
    }

    return NextResponse.json({ faq: data })
  } catch (error) {
    console.error("FAQ creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
