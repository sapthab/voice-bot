import { createAdminClient } from "@/lib/supabase/server"
import { generateEmbedding } from "./embeddings"

interface RetrievedDocument {
  id: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

interface RetrievedFAQ {
  id: string
  question: string
  answer: string
  similarity: number
}

interface RAGContext {
  documents: RetrievedDocument[]
  faqs: RetrievedFAQ[]
}

export async function retrieveContext(
  query: string,
  agentId: string
): Promise<RAGContext> {
  const supabase = await createAdminClient()

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query)

  // Search for relevant documents
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: documents, error: docError } = await (supabase as any).rpc(
    "match_documents",
    {
      query_embedding: queryEmbedding,
      p_agent_id: agentId,
      match_threshold: 0.7,
      match_count: 5,
    }
  )

  if (docError) {
    console.error("Error searching documents:", docError)
  }

  // Search for relevant FAQs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: faqs, error: faqError } = await (supabase as any).rpc("match_faqs", {
    query_embedding: queryEmbedding,
    p_agent_id: agentId,
    match_threshold: 0.8,
    match_count: 3,
  })

  if (faqError) {
    console.error("Error searching FAQs:", faqError)
  }

  return {
    documents: (documents || []) as RetrievedDocument[],
    faqs: (faqs || []) as RetrievedFAQ[],
  }
}

export function buildContextPrompt(context: RAGContext): string {
  const parts: string[] = []

  // Add FAQ context
  if (context.faqs.length > 0) {
    parts.push("## Frequently Asked Questions\n")
    for (const faq of context.faqs) {
      parts.push(`Q: ${faq.question}\nA: ${faq.answer}\n`)
    }
  }

  // Add document context
  if (context.documents.length > 0) {
    parts.push("\n## Relevant Information from Website\n")
    for (const doc of context.documents) {
      if (doc.metadata?.title) {
        parts.push(`### ${doc.metadata.title}\n`)
      }
      parts.push(doc.content + "\n")
    }
  }

  return parts.join("\n")
}
