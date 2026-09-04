-- ============================================================
-- 004 — posts: textos que os mentores publicam
-- alimenta o "enquanto isso" da Tela 1, e reads_count é a
-- prova social real (nunca fabricada) que aparece no card
-- ============================================================
create table posts (
  id           uuid primary key default gen_random_uuid(),
  mentor_id    uuid not null references mentors(id),
  title        text not null check (char_length(title) <= 120),
  body         text not null,
  category     text not null,
  read_minutes int not null default 3,
  reads_count  int not null default 0,
  created_at   timestamptz not null default now()
);

create index posts_mentor_idx on posts (mentor_id);
create index posts_created_at_idx on posts (created_at desc);
