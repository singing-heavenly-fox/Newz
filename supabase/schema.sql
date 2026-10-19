-- Newz — Supabase source of truth, schema v1 (AGENTS.md §7).
--
-- Run once in Supabase Dashboard → SQL Editor (or paste into the SQL editor
-- and press Run). The script is rerunnable: tables use IF NOT EXISTS and
-- policies are dropped before creation.
--
-- Covers the six core tables: sources, articles, article_analyses, logs,
-- oxylabs_schedules, oxylabs_schedule_runs.
--
-- NOTE: no `embedding vector(1536)` column here. It is added in AGENTS §20
-- after pgvector is enabled (Dashboard → Database Extensions), via ALTER SQL.
-- NOTE: no extension version pinning (deprecated by Supabase — the version
-- clause is ignored and the default version is installed).

-- gen_random_uuid() for uuid PK defaults (pre-installed on Supabase).
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- sources
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  listing_url text not null unique,
  parser_strategy text,
  rss_feed_url text,
  is_active boolean not null default true,
  logo_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- articles
-- Append-only during scraping (§10). Dedupe on original_url (unique).
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources (id) on delete set null,
  original_url text not null unique,
  canonical_url text,
  title text not null,
  image_url text,
  published_at timestamptz,
  raw_text text not null default '',
  scraped_at timestamptz not null default now(),
  analyzed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists articles_canonical_url_uidx
  on public.articles (canonical_url)
  where canonical_url is not null;

create index if not exists articles_published_at_idx
  on public.articles (published_at desc);

-- ------------------------------------------------------- article_analyses
-- One row per analyzed article. embedding lands here in §20 (pgvector).
create table if not exists public.article_analyses (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null unique references public.articles (id) on delete cascade,
  summary text not null,
  sentiment_score double precision not null
    check (sentiment_score >= -1 and sentiment_score <= 1),
  sentiment_label text not null
    check (sentiment_label in ('positive', 'neutral', 'negative')),
  bias_label text not null
    check (bias_label in ('left', 'center', 'right', 'mixed', 'unclear')),
  left_percentage integer not null
    check (left_percentage >= 0 and left_percentage <= 100),
  center_percentage integer not null
    check (center_percentage >= 0 and center_percentage <= 100),
  right_percentage integer not null
    check (right_percentage >= 0 and right_percentage <= 100),
  bias_score double precision not null
    check (bias_score >= -1 and bias_score <= 1),
  confidence double precision not null
    check (confidence >= 0 and confidence <= 1),
  framing_notes text[] not null default '{}',
  loaded_terms text[] not null default '{}',
  disclaimer text not null,
  model text not null,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------- logs
create table if not exists public.logs (
  id bigint generated always as identity primary key,
  level text not null default 'info',
  source text not null,
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists logs_created_at_idx
  on public.logs (created_at desc);

-- ---------------------------------------------------------- source_feeds
-- Multiple RSS feeds per source (section/topic feeds + Google News proxies).
-- The free pipeline prefers active rows here; sources with none fall back
-- to sources.rss_feed_url. Service-role only (no anon policy, like logs).
create table if not exists public.source_feeds (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources (id) on delete cascade,
  label text not null default 'Top stories',
  feed_url text not null unique,
  is_proxy boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------ oxylabs_schedules
-- (unchanged legacy tables below; free pipeline uses source_feeds instead)
create table if not exists public.oxylabs_schedules (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources (id) on delete set null,
  oxylabs_schedule_id text unique,
  name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------- oxylabs_schedule_runs
create table if not exists public.oxylabs_schedule_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.oxylabs_schedules (id) on delete set null,
  oxylabs_run_id text,
  status text,
  stats jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- ================================================================ RLS ===
-- RLS enabled on every table in the exposed public schema (defense in
-- depth; service_role bypasses RLS for pipeline writes).
alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.article_analyses enable row level security;
alter table public.logs enable row level security;
alter table public.source_feeds enable row level security;
alter table public.oxylabs_schedules enable row level security;
alter table public.oxylabs_schedule_runs enable row level security;

-- Public read model: the website displays stored articles only.
--   sources: anon/authenticated may list active sources.
--   articles + article_analyses: anon/authenticated may read (the app query
--     filters to analyzed articles; unanalyzed rows stay invisible in UI).
--   logs / oxylabs_*: NO anon/authenticated policy → service-role only.
drop policy if exists "sources_select_active" on public.sources;
create policy "sources_select_active"
  on public.sources for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "articles_select" on public.articles;
create policy "articles_select"
  on public.articles for select
  to anon, authenticated
  using (true);

drop policy if exists "article_analyses_select" on public.article_analyses;
create policy "article_analyses_select"
  on public.article_analyses for select
  to anon, authenticated
  using (true);

-- ============================================ Data API exposure (GRANT) ==
-- Since the 2026-04-28 breaking change, new public tables are NOT exposed
-- to the Data (REST) API by default. Explicit GRANTs opt the three readable
-- tables in. (Separate from RLS, which filters rows once exposed.)
grant select on public.sources to anon, authenticated;
grant select on public.articles to anon, authenticated;
grant select on public.article_analyses to anon, authenticated;
-- logs and oxylabs_* intentionally NOT granted: service-role only.
