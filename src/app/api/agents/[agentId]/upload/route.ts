import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { processFile } from "@/lib/scraper/file-processor"
import { triggerTrainingProcessing } from "@/lib/processing/training-processor"
import { getAuthenticatedUser, verifyAgentOwnership, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const SUPPORTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
]

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

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    if (!SUPPORTED_TYPES.includes(file.type) && !file.name.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Unsupported file type. Supported: PDF, DOCX, TXT" },
        { status: 400 }
      )
    }

    // Extract text before returning (we need the buffer from the request)
    const buffer = Buffer.from(await file.arrayBuffer())
    const extracted = await processFile(buffer, file.name)

    if (!extracted.text || extracted.text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text content could be extracted from this file" },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    // Create training source record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: trainingSource, error: tsError } = await (adminClient.from("training_sources") as any)
      .insert({
        agent_id: agentId,
        url: `file://${file.name}`,
        status: "processing",
      })
      .select()
      .single()

    if (tsError) {
      return NextResponse.json({ error: "Failed to create training source" }, { status: 500 })
    }

    // Fire-and-forget: trigger background processing
    triggerTrainingProcessing({
      type: "upload",
      sourceId: trainingSource.id,
      agentId,
      fileName: file.name,
      extractedText: extracted.text,
      extractedTitle: extracted.title,
      sourceType: extracted.metadata.type,
    })

    return NextResponse.json({
      sourceId: trainingSource.id,
      status: "processing",
      filename: file.name,
    })
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
