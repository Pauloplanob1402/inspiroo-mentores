-- ============================================================
-- 009 — find_nearest_mentors: o coração do match
-- em vez de achar o desabafo mais parecido (STREIK), acha os
-- 3 mentores cujo embedding (bio + tags) está mais próximo do
-- texto que o usuário escreveu — é a Tela 2 do protótipo
-- ============================================================
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
    1 - (m.embedding <=> query_embedding) as similarity
  from mentors m
  order by m.embedding <=> query_embedding
  limit match_limit;
$$;
