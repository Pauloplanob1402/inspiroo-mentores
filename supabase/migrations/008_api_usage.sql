-- ============================================================
-- 008 — api_usage: limite diário por sessão
-- protege a quota grátis do Gemini contra abuso/scraping
-- ============================================================
create table api_usage (
  session_id  uuid not null,
  day         date not null default current_date,
  calls       int  not null default 0,
  primary key (session_id, day)
);
