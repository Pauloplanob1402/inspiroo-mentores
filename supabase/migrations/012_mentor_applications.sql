-- ============================================================
-- 012 — mentor_applications + foto do mentor
-- Candidatura de mentor fica numa fila separada (pending) até
-- você aprovar manualmente — evita mentor não-curado indo pro
-- ar sozinho, sem precisar de painel admin ainda.
-- ============================================================
create table mentor_applications (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  bio          text not null,
  category     text not null,
  tags         text[] not null default '{}',
  contact      text not null,          -- e-mail ou whatsapp, só pra você entrar em contato
  photo_url    text,
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now()
);

alter table mentors
  add column photo_url text;

alter table mentor_applications enable row level security;

-- ------------------------------------------------------------
-- bucket público pra fotos de mentor (upload feito só pela
-- Edge Function, com a service role key — não é público pra
-- upload, só pra leitura das imagens já aprovadas)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('mentor-photos', 'mentor-photos', true)
on conflict (id) do nothing;

create policy "leitura pública das fotos de mentor"
on storage.objects for select
using (bucket_id = 'mentor-photos');

-- ------------------------------------------------------------
-- atualiza find_nearest_mentors pra também devolver photo_url
-- ------------------------------------------------------------
create or replace function find_nearest_mentors(
  query_embedding vector(768),
  match_limit int default 3
)
returns table (
  id              uuid,
  name            text,
  bio             text,
  category        text,
  tags            text[],
  verified        boolean,
  rating          numeric,
  sessions_count  int,
  weekly_slots    int,
  photo_url       text,
  similarity      float
)
language sql stable
as $$
  select
    m.id,
    m.name,
    m.bio,
    m.category,
    m.tags,
    m.verified,
    m.rating,
    m.sessions_count,
    m.weekly_slots,
    m.photo_url,
    1 - (m.embedding <=> query_embedding) as similarity
  from mentors m
  order by m.embedding <=> query_embedding
  limit match_limit;
$$;
