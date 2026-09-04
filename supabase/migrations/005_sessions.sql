-- ============================================================
-- 005 — sessions: contador das 3 conversas grátis por dispositivo
-- criada na primeira visita (mesmo session_id usado em moments).
-- decremento acontece na Edge Function match-entry, nunca no client.
-- ============================================================
create table sessions (
  session_id             uuid primary key,
  free_conversations_left int not null default 3 check (free_conversations_left >= 0),
  referred_by             uuid references sessions(session_id),
  created_at              timestamptz not null default now()
);
