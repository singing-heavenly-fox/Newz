-- Newz seed sources (AGENTS.md §§ 7–8, 11).
--
-- How to use: Supabase Dashboard → SQL Editor → New query → paste this
-- whole file → Run. Rerunnable: re-pasting changes nothing
-- (ON CONFLICT DO NOTHING on listing_url).
--
-- These five outlets match the source-specific URL patterns the spec names
-- in §11 (Reuters world sections, NPR /sections/*, Fox show/game/live,
-- BBC sport/live, Guardian /us/*), so the scraping filters in §§ 11–13
-- apply cleanly later. Homepage URLs only — never sub-endpoints (§8).
-- logo_url stays null: optional per §7, UI renders a letter-badge without
-- one (same as the current mock data).

insert into public.sources (name, listing_url, parser_strategy, is_active, logo_url)
values
  ('Reuters',      'https://www.reuters.com',        'reuters',  true, null),
  ('NPR',          'https://www.npr.org',            'npr',      true, null),
  ('BBC News',     'https://www.bbc.com/news',       'bbc',      true, null),
  ('Fox News',     'https://www.foxnews.com',        'fox',      true, null),
  ('The Guardian', 'https://www.theguardian.com/us', 'guardian', true, null)
on conflict (listing_url) do nothing;

-- Verify (expect 5 rows):
select name, listing_url, parser_strategy, rss_feed_url, is_active
from public.sources
order by name;

-- Backfill verified RSS feed URLs (all 5 verified live 2026-10-11: HTTP 200
-- with ≥3 <item> entries each). Reuters has no official public RSS
-- (feeds.reuters.com dead) so it uses the Google News site:reuters.com proxy
-- feed, which is a valid RSS document of current Reuters articles.
update public.sources set rss_feed_url = 'https://news.google.com/rss/search?q=when:24h+site:reuters.com&ceid=US:en&hl=en-US&gl=US'
  where listing_url = 'https://www.reuters.com';
update public.sources set rss_feed_url = 'https://feeds.npr.org/1001/rss.xml'
  where listing_url = 'https://www.npr.org';
update public.sources set rss_feed_url = 'https://feeds.bbci.co.uk/news/rss.xml'
  where listing_url = 'https://www.bbc.com/news';
update public.sources set rss_feed_url = 'https://moxie.foxnews.com/google-publisher/latest.xml'
  where listing_url = 'https://www.foxnews.com';
update public.sources set rss_feed_url = 'https://www.theguardian.com/us/rss'
  where listing_url = 'https://www.theguardian.com/us';

