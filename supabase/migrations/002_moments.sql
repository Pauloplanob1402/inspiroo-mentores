-- ============================================================
-- 002 — moments: o que o usuário escreveu sobre seu momento de vida
-- (era "entries" no STREIK — mesmo mecanismo, sentido diferente:
-- aqui não procura outro usuário, procura o mentor mais parecido)
-- ============================================================
create table moments (
  id          uuid primary key default gen_random_uuid(),
  text        text not null check (char_length(text) <= 500),
  embedding   vector(768),         -- gemini-embedding-001, truncado pra 768 dims
  category    text,                -- preenchido quando vem de um chip, null quando é texto livre
  session_id  uuid not null,       -- identifica o dispositivo, ainda sem exigir cadastro
  created_at  timestamptz not null default now()
);

create index moments_embedding_idx
  on moments using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index moments_session_idx on moments (session_id);
