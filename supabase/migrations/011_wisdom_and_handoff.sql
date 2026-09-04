-- ============================================================
-- 011 — wisdom_chunks + controle de handoff IA/humano
-- wisdom_chunks: um registro por tema. Guarda uma SÍNTESE
-- (texto original, nunca citação literal longa dos livros) de
-- cada tema, pra servir de contexto de busca por similaridade
-- na mentor-reply.
-- ============================================================
create table wisdom_chunks (
  id           uuid primary key default gen_random_uuid(),
  theme        text not null,
  synthesis    text not null,
  embedding    vector(768),
  created_at   timestamptz not null default now()
);

create index wisdom_chunks_embedding_idx
  on wisdom_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- controle de handoff: quando a pessoa pede pra falar com o
-- mentor de verdade, human_requested vira true e a IA para de
-- responder automaticamente naquele match.
alter table matches
  add column human_requested boolean not null default false;

-- ai_generated: marca se aquela mensagem específica foi gerada
-- pela IA ou digitada por um humano (mentor ou você).
alter table messages
  add column ai_generated boolean not null default false;

-- marca no mentor se ele é uma persona com camada de IA
-- (por enquanto, só a sua, categoria "mente")
alter table mentors
  add column ai_persona boolean not null default false;

-- find_nearest_wisdom: acha os temas mais relevantes pra uma
-- pergunta, mesmo mecanismo do find_nearest_mentors
create or replace function find_nearest_wisdom(
  query_embedding vector(768),
  match_limit int default 5
)
returns table (
  id          uuid,
  theme       text,
  synthesis   text,
  similarity  float
)
language sql stable
as $$
  select
    w.id,
    w.theme,
    w.synthesis,
    1 - (w.embedding <=> query_embedding) as similarity
  from wisdom_chunks w
  order by w.embedding <=> query_embedding
  limit match_limit;
$$;

alter table wisdom_chunks enable row level security;
