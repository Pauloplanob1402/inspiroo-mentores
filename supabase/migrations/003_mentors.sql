-- ============================================================
-- 003 — mentors: perfis reais e verificados
-- diferente do STREIK, aqui a identidade é o produto, não o
-- oposto. embedding é gerado a partir de bio + tags, e é contra
-- ele que o texto do usuário é comparado no match.
-- ============================================================
create table mentors (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  bio             text not null check (char_length(bio) <= 300),
  category        text not null,   -- ex: 'carreira', 'mente', 'exterior', 'ia', 'familia', 'financas'
  tags            text[] not null default '{}',
  embedding       vector(768),     -- gerado a partir de bio + tags
  verified        boolean not null default false,
  rating          numeric(2,1) not null default 5.0,
  sessions_count  int not null default 0,
  weekly_slots    int not null default 10,  -- usado pra escassez real, não fabricada
  created_at      timestamptz not null default now()
);

create index mentors_embedding_idx
  on mentors using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

create index mentors_category_idx on mentors (category);
