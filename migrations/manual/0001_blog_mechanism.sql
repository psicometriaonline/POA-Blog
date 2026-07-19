-- ============================================================
-- Migracao aditiva do mecanismo de geracao de posts ancorados em busca real.
-- (Fase 0: fila + log de execucao + indice do corpus para anti-canibalizacao.)
--
-- ORDEM DE EXECUCAO no Postgres do CMS (Replit/Neon):
--   1. Rode ESTE arquivo primeiro (habilita as extensoes vector e pg_trgm).
--   2. Depois `npm run db:push` (drizzle-kit) para materializar as tabelas e a
--      coluna posts.target_query a partir de shared/schema.ts.
--   3. Rode a secao "INDICES ESPECIALIZADOS" abaixo (trigrama + vetorial), que o
--      drizzle-kit nao expressa.
-- Como fallback (sem drizzle), o arquivo inteiro e idempotente e cria tudo.
--
-- Tudo aqui e ADITIVO: nao altera nem apaga nada dos 500+ posts existentes.
-- ============================================================

-- --- EXTENSOES (precisam existir ANTES de criar a coluna vector) ---
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- --- COLUNA ADITIVA NO POST (busca que ancorou o post; nula nos manuais) ---
ALTER TABLE posts ADD COLUMN IF NOT EXISTS target_query text;

-- --- FILA DE PALAVRAS-CHAVE MINERADAS ---
CREATE TABLE IF NOT EXISTS blog_keyword_queue (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  query text NOT NULL,
  query_normalized text NOT NULL UNIQUE,
  macro text NOT NULL,
  subcategoria text,
  is_question boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 0,
  lang text NOT NULL DEFAULT 'pt',
  source text NOT NULL DEFAULT 'autocomplete',
  status text NOT NULL DEFAULT 'pending',
  used_post_id integer,
  skip_reason text,
  discovered_at timestamp NOT NULL DEFAULT now(),
  used_at timestamp
);
CREATE INDEX IF NOT EXISTS blog_keyword_queue_macro_status_idx
  ON blog_keyword_queue (macro, status);
CREATE INDEX IF NOT EXISTS blog_keyword_queue_status_score_idx
  ON blog_keyword_queue (status, score);

-- --- LOG DE EXECUCAO DIARIA ---
CREATE TABLE IF NOT EXISTS blog_daily_runs (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_date text NOT NULL,
  macro text NOT NULL,
  status text NOT NULL,
  reason text,
  title text,
  post_id integer,
  correction_rounds integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_daily_runs_date_idx ON blog_daily_runs (run_date);

-- --- INDICE DO CORPUS (anti-canibalizacao) ---
CREATE TABLE IF NOT EXISTS blog_post_index (
  post_id integer PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  title_normalized text NOT NULL,
  embedded_text text,
  embedding vector(1024),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- ============================================================
-- INDICES ESPECIALIZADOS (rodar apos db:push; o drizzle-kit nao os expressa)
-- ============================================================

-- Camada 1 (lexical): busca por trigramas no titulo normalizado (pg_trgm).
CREATE INDEX IF NOT EXISTS blog_post_index_title_trgm_idx
  ON blog_post_index USING gin (title_normalized gin_trgm_ops);

-- Camada 2 (semantica): vizinhanca aproximada por cosseno (pgvector HNSW).
-- Se a versao do pgvector nao tiver HNSW, troque por ivfflat (ver README).
CREATE INDEX IF NOT EXISTS blog_post_index_embedding_hnsw_idx
  ON blog_post_index USING hnsw (embedding vector_cosine_ops);
