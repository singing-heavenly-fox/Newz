-- Newz — free-pipeline migration: add sources.rss_feed_url (AGENTS.md §7 + prompts/free-scraping-pipeline.md).
--
-- How to use: Supabase Dashboard → SQL Editor → New query → paste this
-- whole file → Run. Rerunnable (ADD COLUMN IF NOT EXISTS).
--
-- The free RSS-first pipeline reads one RSS feed URL per active source from
-- this column. No hardcoded feed URLs in code. Sources without a usable feed
-- keep NULL and are skipped with a logged reason.

alter table public.sources
  add column if not exists rss_feed_url text;
