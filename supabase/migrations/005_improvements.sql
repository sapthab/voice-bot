-- 005_improvements.sql
-- 1. Replace IVFFlat indexes with HNSW for better recall/performance
-- 2. Add per-agent similarity threshold columns

-- -------------------------------------------------------------------------
-- HNSW indexes (replace IVFFlat)
-- -------------------------------------------------------------------------

DROP INDEX IF EXISTS idx_document_chunks_embedding;
DROP INDEX IF EXISTS idx_faqs_embedding;

CREATE INDEX idx_document_chunks_embedding
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_faqs_embedding
  ON faqs
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- -------------------------------------------------------------------------
-- Per-agent similarity thresholds
-- -------------------------------------------------------------------------

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS doc_similarity_threshold FLOAT DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS faq_similarity_threshold FLOAT DEFAULT 0.8;
