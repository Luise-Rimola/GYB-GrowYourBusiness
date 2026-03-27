-- Enable pgvector extension in Supabase Postgres (idempotent).
create extension if not exists vector;

-- Ensure embedding column uses vector(1536) type.
alter table "KnowledgeChunk"
  alter column "embedding" type vector(1536)
  using null;

-- Approximate nearest-neighbor index (cosine distance).
create index if not exists "knowledgechunk_embedding_ivfflat_idx"
  on "KnowledgeChunk"
  using ivfflat ("embedding" vector_cosine_ops)
  with (lists = 100);
