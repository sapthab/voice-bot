import mammoth from "mammoth"

interface ExtractedContent {
  text: string
  title: string
  metadata: {
    source: string
    type: string
    pageCount?: number
  }
}

export async function extractTextFromPDF(buffer: Buffer, filename: string): Promise<ExtractedContent> {
  // Dynamic import to avoid build-time canvas dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdf = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>
  const data = await pdf(buffer)

  return {
    text: data.text,
    title: filename.replace(/\.pdf$/i, ""),
    metadata: {
      source: filename,
      type: "pdf",
      pageCount: data.numpages,
    },
  }
}

export async function extractTextFromDOCX(buffer: Buffer, filename: string): Promise<ExtractedContent> {
  const result = await mammoth.extractRawText({ buffer })

  return {
    text: result.value,
    title: filename.replace(/\.docx?$/i, ""),
    metadata: {
      source: filename,
      type: "docx",
    },
  }
}

export async function extractTextFromTXT(buffer: Buffer, filename: string): Promise<ExtractedContent> {
  return {
    text: buffer.toString("utf-8"),
    title: filename.replace(/\.txt$/i, ""),
    metadata: {
      source: filename,
      type: "txt",
    },
  }
}

export async function processFile(buffer: Buffer, filename: string): Promise<ExtractedContent> {
  const ext = filename.toLowerCase().split(".").pop()

  switch (ext) {
    case "pdf":
      return extractTextFromPDF(buffer, filename)
    case "docx":
    case "doc":
      return extractTextFromDOCX(buffer, filename)
    case "txt":
      return extractTextFromTXT(buffer, filename)
    default:
      throw new Error(`Unsupported file type: ${ext}`)
  }
}
