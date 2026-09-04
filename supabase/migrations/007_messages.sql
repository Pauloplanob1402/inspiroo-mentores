-- ============================================================
-- 007 — messages: chat da sala de mentoria
-- sender distingue user/mentor porque, ao contrário do STREIK,
-- os dois lados não são simétricos — a UI precisa saber quem é quem
-- ============================================================
create table messages (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches(id),
  sender      text not null check (sender in ('user','mentor')),
  content     text not null check (char_length(content) <= 1000),
  flagged     boolean not null default false, -- marcado pela moderação
  created_at  timestamptz not null default now()
);

create index messages_match_idx on messages (match_id, created_at);
