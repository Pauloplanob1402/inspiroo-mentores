-- ============================================================
-- 010 — RLS: bloqueia acesso direto do cliente por padrão
-- a anon key NUNCA lê/escreve tabela direto — tudo passa pelas
-- Edge Functions, que usam a service_role key (ignora RLS).
-- de propósito: nenhuma policy é criada aqui.
-- ============================================================
alter table moments     enable row level security;
alter table mentors     enable row level security;
alter table posts       enable row level security;
alter table sessions    enable row level security;
alter table matches     enable row level security;
alter table messages    enable row level security;
alter table api_usage   enable row level security;
