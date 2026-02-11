import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { processFile } from "@/lib/scraper/file-processor"
import { chunkText, estimateTokens } from "@/lib/scraper/chunker"
import { generateEmbedding } from "@/lib/ai/embeddings"

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

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify agent exists and belongs to user
    const { data: agent } = await supabase
      .from("agents")
      .select("id, organization_id")
      .eq("id", agentId)
      .single()

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

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

    try {
      // Extract text from file
      const buffer = Buffer.from(await file.arrayBuffer())
      const extracted = await processFile(buffer, file.name)

      if (!extracted.text || extracted.text.trim().length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient.from("training_sources") as any)
          .update({ status: "failed", error_message: "No text content extracted" })
          .eq("id", trainingSource.id)

        return NextResponse.json(
          { error: "No text content could be extracted from this file" },
          { status: 400 }
        )
      }

      // Chunk the extracted text
      const chunks = chunkText(extracted.text, {
        title: extracted.title,
        url: `file://${file.name}`,
      })

      // Process chunks in batches
      let chunksCreated = 0
      const batchSize = 20

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)
        const insertData = []

        for (const chunk of batch) {
          const embedding = await generateEmbedding(chunk.content)
          insertData.push({
            agent_id: agentId,
            training_source_id: trainingSource.id,
            content: chunk.content,
            metadata: {
              ...chunk.metadata,
              source_type: extracted.metadata.type,
              filename: file.name,
            },
            embedding,
            token_count: estimateTokens(chunk.content),
          })
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (adminClient.from("document_chunks") as any)
          .insert(insertData)

        if (insertError) {
          console.error("Error inserting chunks:", insertError)
        } else {
          chunksCreated += insertData.length
        }
      }

      // Update training source status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from("training_sources") as any)
        .update({
          status: "completed",
          pages_found: 1,
          pages_scraped: 1,
          last_scraped_at: new Date().toISOString(),
        })
        .eq("id", trainingSource.id)

      // Mark agent as trained
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from("agents") as any)
        .update({ is_trained: true })
        .eq("id", agentId)

      return NextResponse.json({
        success: true,
        filename: file.name,
        chunksCreated,
        trainingSourceId: trainingSource.id,
      })
    } catch (processError) {
      // Update training source as failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from("training_sources") as any)
        .update({
          status: "failed",
          error_message: processError instanceof Error ? processError.message : "Processing failed",
        })
        .eq("id", trainingSource.id)

      throw processError
    }
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
