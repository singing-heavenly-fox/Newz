-- Newz seed source feeds (prompts/multi-feed-pipeline.md).
--
-- How to use: Supabase Dashboard → SQL Editor → New query → paste this
-- whole file → Run. Rerunnable: ON CONFLICT (feed_url) DO NOTHING.
-- Requires: sources rows from seed-sources.sql + migration_add_source_feeds.sql.
--
-- All 23 section feeds verified live 2026-10-11 (HTTP 200, items present).
-- Google News proxy links redirect to the publisher at fetch time; the
-- pipeline resolves them to publisher canonicals (is_proxy = true).
-- Guardian US top-stories feed intentionally omitted: identical URL to the
-- US News section feed below (conflict guard would skip it anyway).
--
-- v2 (2026-10-11): Google News proxy article URLs do NOT resolve
-- server-side (200 "Google News" shell, JS redirect only), so all proxy
-- feeds were removed and replaced with direct publisher sitemaps below.
-- The DELETE converges databases seeded with v1 to the same final state.
delete from public.source_feeds where is_proxy = true;

-- BBC News (direct section feeds)
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'World', 'https://feeds.bbci.co.uk/news/world/rss.xml', false from public.sources where listing_url = 'https://www.bbc.com/news'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Business', 'https://feeds.bbci.co.uk/news/business/rss.xml', false from public.sources where listing_url = 'https://www.bbc.com/news'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Technology', 'https://feeds.bbci.co.uk/news/technology/rss.xml', false from public.sources where listing_url = 'https://www.bbc.com/news'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Science & Environment', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', false from public.sources where listing_url = 'https://www.bbc.com/news'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Politics', 'https://feeds.bbci.co.uk/news/politics/rss.xml', false from public.sources where listing_url = 'https://www.bbc.com/news'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Health', 'https://feeds.bbci.co.uk/news/health/rss.xml', false from public.sources where listing_url = 'https://www.bbc.com/news'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Top stories', 'https://feeds.bbci.co.uk/news/rss.xml', false from public.sources where listing_url = 'https://www.bbc.com/news'
on conflict (feed_url) do nothing;

-- The Guardian (direct section feeds)
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'World', 'https://www.theguardian.com/world/rss', false from public.sources where listing_url = 'https://www.theguardian.com/us'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'US News', 'https://www.theguardian.com/us-news/rss', false from public.sources where listing_url = 'https://www.theguardian.com/us'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Technology', 'https://www.theguardian.com/technology/rss', false from public.sources where listing_url = 'https://www.theguardian.com/us'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Environment', 'https://www.theguardian.com/environment/rss', false from public.sources where listing_url = 'https://www.theguardian.com/us'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Business', 'https://www.theguardian.com/business/rss', false from public.sources where listing_url = 'https://www.theguardian.com/us'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Football', 'https://www.theguardian.com/football/rss', false from public.sources where listing_url = 'https://www.theguardian.com/us'
on conflict (feed_url) do nothing;

-- Fox News: direct publisher sitemap feeds (no per-section RSS exists)
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Articles sitemap', 'https://www.foxnews.com/sitemap.xml?type=articles', false from public.sources where listing_url = 'https://www.foxnews.com'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Fast-changing sitemap', 'https://www.foxnews.com/sitemap.xml?type=fastchanging', false from public.sources where listing_url = 'https://www.foxnews.com'
on conflict (feed_url) do nothing;
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Top stories', 'https://moxie.foxnews.com/google-publisher/latest.xml', false from public.sources where listing_url = 'https://www.foxnews.com'
on conflict (feed_url) do nothing;

-- NPR: only the direct top-stories feed (npr.org blocks server-side
-- article fetching from datacenter IPs; section proxies can't resolve,
-- so extra feeds would only burn quota — one feed, failures logged)
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Top stories', 'https://feeds.npr.org/1001/rss.xml', false from public.sources where listing_url = 'https://www.npr.org'
on conflict (feed_url) do nothing;

-- Reuters: direct publisher sitemap (official feeds.reuters.com is dead)
insert into public.source_feeds (source_id, label, feed_url, is_proxy)
select id, 'Recent sitemap', 'https://www.reuters.com/arc/outboundfeeds/sitemap/?outputType=xml', false from public.sources where listing_url = 'https://www.reuters.com'
on conflict (feed_url) do nothing;

-- Verify (expect 18 active rows: BBC 7, Guardian 6, Fox 3, NPR 1, Reuters 1):
select s.name, count(*) as feeds
from public.source_feeds f join public.sources s on s.id = f.source_id
where f.is_active = true
group by s.name
order by s.name;
