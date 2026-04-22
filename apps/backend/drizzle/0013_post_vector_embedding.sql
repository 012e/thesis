-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to posts table
ALTER TABLE "posts" ADD COLUMN "embedding" vector(1536);

-- HNSW index for fast approximate nearest-neighbour cosine similarity search
CREATE INDEX "posts_embedding_hnsw_idx"
  ON "posts"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
