-- ============================================================
-- Run this ONCE in your Supabase project → SQL Editor
-- ============================================================

-- 1. Enable the pgvector extension
create extension if not exists vector;

-- 2. Create the documents table
create table if not exists documents (
  id         text primary key,
  org_id     text not null default 'default',
  source     text not null,           -- 'google_drive' | 'slack'
  title      text,
  url        text,
  content    text not null,
  embedding  vector(384),             -- matches all-MiniLM-L6-v2 dims
  metadata   jsonb,
  created_at timestamptz default now()
);

-- 3. Index for fast similarity search
create index if not exists documents_embedding_idx
  on documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. Index for org filtering
create index if not exists documents_org_idx on documents (org_id);

-- 5. The search function (called from Python)
create or replace function match_documents(
  query_embedding vector(384),
  match_org_id    text,
  match_count     int default 5
)
returns table (
  id         text,
  content    text,
  title      text,
  url        text,
  source     text,
  metadata   jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    title,
    url,
    source,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where org_id = match_org_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
