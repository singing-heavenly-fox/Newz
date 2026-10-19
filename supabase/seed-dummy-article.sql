-- Newz dummy article for visual testing (homepage + details page).
--
-- How to use: Supabase Dashboard → SQL Editor → New query → paste this
-- whole file → Run. Then `npm run dev` → http://localhost:3000 shows one
-- real Supabase-backed card; clicking it shows the full analysis.
-- Rerunnable: deletes the previous dummy first (analysis cascades).
-- Remove it anytime with the DELETE block at the bottom.
--
-- Identifiable as seed data by original_url (example.com) and model
-- ('manual-seed') — future scraper dedupe on original_url keeps it separate.

-- 1. Cleanup previous dummy (if any).
delete from public.articles
where original_url = 'https://example.com/dummy-harbor-bridge-reopens';

-- 2. Insert dummy article + analysis (linked to seeded Reuters source).
with src as (
  select id from public.sources
  where listing_url = 'https://www.reuters.com'
),
new_article as (
  insert into public.articles (
    source_id, original_url, canonical_url, title,
    image_url, published_at, raw_text, analyzed_at
  )
  select
    src.id,
    'https://example.com/dummy-harbor-bridge-reopens',
    'https://example.com/dummy-harbor-bridge-reopens',
    'Harbor bridge reopens after 18-month retrofit, cutting commute by 25 minutes',
    'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1200&q=80&auto=format&fit=crop',
    now() - interval '2 hours',
    'The Harbor Bridge reopened to traffic on Friday morning after an 18-month, $340 million seismic retrofit, restoring a crossing that carries 90,000 vehicles a day. Transportation officials said the first commute ran 25 minutes faster than the detour route that drivers endured during construction.' || chr(10) || chr(10) ||
    'The project finished two months ahead of schedule but 8% over budget after engineers discovered corroded support cables that were not in the original survey. ''We found problems our grandparents'' inspections missed,'' said project director Maria Santos at the ribbon-cutting. ''The bridge is now rated for a once-in-a-century quake.''' || chr(10) || chr(10) ||
    'Commuters celebrated the reopening while some watchdog groups questioned the cost overruns. The transit authority will publish a full audit next month, and tolls remain frozen through the end of the year.',
    now()
  from src
  returning id
)
insert into public.article_analyses (
  article_id, summary,
  sentiment_score, sentiment_label, bias_label,
  left_percentage, center_percentage, right_percentage,
  bias_score, confidence,
  framing_notes, loaded_terms, disclaimer, model
)
select
  new_article.id,
  'The Harbor Bridge reopened after an 18-month retrofit, restoring a 90,000-vehicle daily crossing. Officials tout an early finish and quake rating; watchdogs flag an 8% budget overrun pending audit.',
  0.35, 'positive', 'center',
  25, 50, 25,
  0, 0.78,
  array[
    'Centers on project facts: cost, timeline, capacity, audit next step.',
    'Quotes one official and one watchdog position with figures.',
    'No national-politics framing.'
  ],
  array['ribbon-cutting', 'once-in-a-century'],
  'AI-estimated sentiment and political framing — not objective truth. Based on article text evidence only, not the source name.',
  'manual-seed'
from new_article;

-- 3. Verify (expect 1 row):
select a.title, s.name as source, a.published_at,
       an.sentiment_label, an.bias_label,
       an.left_percentage, an.center_percentage, an.right_percentage
from public.articles a
join public.sources s on s.id = a.source_id
join public.article_analyses an on an.article_id = a.id
where a.original_url = 'https://example.com/dummy-harbor-bridge-reopens';

-- 4. Remove the dummy anytime (analysis row cascades):
-- delete from public.articles
-- where original_url = 'https://example.com/dummy-harbor-bridge-reopens';
