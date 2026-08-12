create extension if not exists vector;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  description text,
  summary text,
  pdf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists highlights (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid not null,
  text text not null,
  page_title text,
  page_url text,
  heading text,
  surrounding_text text,
  user_note text,
  created_at timestamptz default now()
);

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  url text not null,
  title text,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  highlight_id uuid references highlights(id) on delete cascade,
  content text not null,
  embedding vector(768),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  sources jsonb,
  created_at timestamptz default now()
);

create table if not exists pdfs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid not null,
  file_url text not null,
  title text,
  created_at timestamptz default now()
);

create or replace function match_chunks(
  query_embedding vector(768),
  match_session_id uuid,
  match_count int default 8
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    chunks.id,
    chunks.content,
    chunks.metadata,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  where chunks.session_id = match_session_id
  order by chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- MVP note:
-- RLS is intentionally not enabled yet because this scaffold uses a fake user_id.
-- Before production:
-- 1. Enable RLS.
-- 2. Replace fake user_id with auth.uid().
-- 3. Add owner-based policies.
