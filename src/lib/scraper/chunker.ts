interface Chunk {
  content: string
  metadata: {
    url?: string
    title?: string
    chunkIndex: number
  }
}

// Approximate tokens per character (conservative estimate)
const CHARS_PER_TOKEN = 4
const TARGET_CHUNK_SIZE = 500 // tokens
const CHUNK_OVERLAP = 50 // tokens

const TARGET_CHARS = TARGET_CHUNK_SIZE * CHARS_PER_TOKEN
const OVERLAP_CHARS = CHUNK_OVERLAP * CHARS_PER_TOKEN

export function chunkText(
  content: string,
  metadata?: { url?: string; title?: string }
): Chunk[] {
  if (!content || content.trim().length === 0) {
    return []
  }

  const chunks: Chunk[] = []

  // Clean up content
  const cleanContent = content
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  if (cleanContent.length <= TARGET_CHARS) {
    return [
      {
        content: cleanContent,
        metadata: {
          ...metadata,
          chunkIndex: 0,
        },
      },
    ]
  }

  // Split by paragraphs first
  const paragraphs = cleanContent.split(/\n\n+/)
  let currentChunk = ""
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed target size
    if (currentChunk.length + paragraph.length > TARGET_CHARS) {
      // Save current chunk if it has content
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            ...metadata,
            chunkIndex,
          },
        })
        chunkIndex++

        // Start new chunk with overlap from previous
        const overlap = getOverlapText(currentChunk, OVERLAP_CHARS)
        currentChunk = overlap + (overlap ? "\n\n" : "") + paragraph
      } else {
        // Paragraph itself is too long, need to split it
        const splitChunks = splitLongText(paragraph, TARGET_CHARS, OVERLAP_CHARS)
        for (const splitChunk of splitChunks) {
          chunks.push({
            content: splitChunk.trim(),
            metadata: {
              ...metadata,
              chunkIndex,
            },
          })
          chunkIndex++
        }
        currentChunk = ""
      }
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        ...metadata,
        chunkIndex,
      },
    })
  }

  return chunks
}

function getOverlapText(text: string, overlapChars: number): string {
  if (text.length <= overlapChars) {
    return text
  }

  // Try to find a good break point (sentence or word boundary)
  const lastPart = text.slice(-overlapChars)

  // Look for sentence boundary
  const sentenceMatch = lastPart.match(/[.!?]\s+/)
  if (sentenceMatch && sentenceMatch.index !== undefined) {
    return lastPart.slice(sentenceMatch.index + sentenceMatch[0].length)
  }

  // Look for word boundary
  const wordMatch = lastPart.match(/\s+/)
  if (wordMatch && wordMatch.index !== undefined) {
    return lastPart.slice(wordMatch.index + wordMatch[0].length)
  }

  return lastPart
}

function splitLongText(
  text: string,
  maxChars: number,
  overlapChars: number
): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + maxChars

    // Don't cut in the middle of a word
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end)
      if (lastSpace > start) {
        end = lastSpace
      }
    }

    chunks.push(text.slice(start, end))

    // Move start with overlap
    start = end - overlapChars
    if (start < 0) start = 0

    // Avoid infinite loop
    if (end >= text.length) break
  }

  return chunks
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}
