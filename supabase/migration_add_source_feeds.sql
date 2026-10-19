-- Newz — free-pipeline migration: add source_feeds table
-- (prompts/multi-feed-pipeline.md).
--
-- How to use: Supabase Dashboard → SQL Editor → New query → paste this
-- whole file → Run. Rerunnable (IF NOT EXISTS).
--
-- Multiple RSS feeds per source (section/topic feeds + Google News proxies).
-- Service-role only: RLS enabled, NO anon/authenticated policy (same
-- posture as logs / oxylabs_*). The UI never reads this table.

create table if not exists public.source_feeds (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources (id) on delete cascade,
  label text not null default 'Top stories',
  feed_url text not null unique,
  is_proxy boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.source_feeds enable row level security;
