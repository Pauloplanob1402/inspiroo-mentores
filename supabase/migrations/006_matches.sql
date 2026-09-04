-- ============================================================
-- 006 — matches: par formado entre um moment e um mentor
-- sem reveal_consent — o mentor já é identificado desde o início,
-- não faz sentido revelação em camadas aqui como no STREIK
-- ============================================================
create table matches (
  id          uuid primary key default gen_random_uuid(),
  moment_id   uuid not null references moments(id),
  mentor_id   uuid not null references mentors(id),
  session_id  uuid not null references sessions(session_id),
  status      text not null default 'pending'
                check (status in ('pending','chatting','scheduled','closed')),
  created_at  timestamptz not null default now()
);

create index matches_session_idx on matches (session_id);
create index matches_mentor_idx on matches (mentor_id);
