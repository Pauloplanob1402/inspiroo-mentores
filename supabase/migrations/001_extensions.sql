-- ============================================================
-- 001 — extensões necessárias
-- ============================================================
create extension if not exists vector;    -- busca por similaridade (embeddings)
create extension if not exists pgcrypto;  -- gen_random_uuid()
