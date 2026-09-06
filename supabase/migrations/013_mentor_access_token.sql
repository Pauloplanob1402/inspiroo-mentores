-- ============================================================
-- 013 — access_token do mentor: um link secreto e único que
-- dá acesso à caixa de entrada dele (sem senha, sem login,
-- só um link comprido difícil de adivinhar — mesmo padrão de
-- segurança "por obscuridade" que já usamos no SEED_KEY).
-- ============================================================
alter table mentors
  add column access_token uuid not null default gen_random_uuid();

create unique index mentors_access_token_idx on mentors (access_token);
