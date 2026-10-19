# Multi-Feed Pipeline for ~10x Article Volume — Newz

## Goal

Remove the real volume bottleneck (one RSS feed per source ≈ 20 headlines)
so the free pipeline collects hundreds of candidate articles per day at $0:
multiple section/topic feeds per source, higher manual backfill caps, and an
hourly trigger that works on free tiers.

## Skills read

- `AGENTS.md` §§ 5, 7, 9–13, 21 (layers, source of truth, pipeline rules,
  validation, no `any`, joined-table gotcha).
- Global `supabase` SKILL.md: RLS on new table, service-role-only writes,
  explicit GRANT thinking (new table stays ungranted = service-role only,
  like `logs`).
- No AI-SDK/provider changes; Gemini free tier (~1,000 req/day) already
  covers the higher volume (worst case ≈ 25 feeds × few items × 24 runs,
  realistic ≈ 100–300 analyses/day).

## Existing code inspected

- `supabase/schema.sql` v1 + `migration_add_rss_column.sql`: `sources`
  holds a single `rss_feed_url`. Verified pattern to extend.
- `lib/supabase/types.ts`: `type`-alias rows (supabase-js v2.117 inference).
- `lib/free-scrape/{types,rss,fetch,parse,validate,pipeline}.ts`: per-source
  single-feed flow; `checkCandidateUrl(url, strategy, host)` allows
  `news.google.com` only for `reuters`; `MAX_LIMIT_PER_SOURCE = 10`;
  `fetchRssItems` caps at 20 items/feed.
- `app/api/scrape-free/route.ts`: clamps to `MAX_LIMIT_PER_SOURCE`.
- `app/api/cron/scrape-free/route.ts`: `limitPerSource: 2` (unchanged).
- `.github/`: does not exist (new).
- Feed verification (2026-10-11, live HTTP + item counts, all OK):
  BBC world/business/tech/science/politics/health (21–62 items each),
  Guardian world/us/tech/env/business/football (25–64),
  Google-News proxies for Fox politics/world/tech/us, NPR
  politics/business/science/culture, Reuters world/business/tech (each
  ~100 items, links are `news.google.com` redirects resolving to the
  publisher at fetch time).

## Decisions / assumptions

1. **New `source_feeds` table** (not an array column): `id, source_id FK
   (cascade), label, feed_url unique, is_proxy bool, is_active bool,
   created_at`. RLS enabled, NO anon policy/grant (service-role only).
   Pipeline prefers active feed rows; sources with none fall back to
   legacy `sources.rss_feed_url` (back-compat, zero-downtime).
2. **Seed = 23 verified section feeds + 4 migrated "Top stories" rows**
   (BBC front, NPR news, Fox latest, Reuters general; Guardian-US skipped
   as duplicate URL — `ON CONFLICT (feed_url) DO NOTHING` guards reruns).
   Total 27 feeds across the same 5 outlets. No new outlets (keeps §11
   URL-check matrix valid).
3. **Proxy generalization:** `checkCandidateUrl` gains `allowProxy` (true
   for items from `is_proxy` feeds); Google-News links accepted for any
   proxied strategy, resolved to publisher URLs at fetch (existing
   redirect behavior). PLUS a new post-parse guard: canonical hostname must
   match the source host (bare/subdomain, Guardian regional exception),
   else reject `uncertain-url`. One-validator-per-concern, no behavior
   change for direct feeds.
4. **Per-feed item cap 12** (`fetchRssItems` unchanged at 20 max; pipeline
   slices) to bound work; cross-feed in-memory dedupe before URL checks.
5. **Manual cap 10 → 25** (`MAX_LIMIT_PER_SOURCE`; default stays 5; cron
   scrape stays at 2). Summary gains additive `feedsChecked` field.
6. **GitHub Actions hourly trigger** (`.github/workflows/hourly-pipeline.yml`):
   cron `15 * * * *`, POSTs scrape then analyze against `${{ secrets.APP_URL }}`
   with `${{ secrets.BIASLY_ADMIN_SECRET }}`. Dormant until the user deploys
   + sets the two secrets (documented in-file). Vercel daily crons stay as
   the deploy-native fallback.

## Files likely to change

- `supabase/schema.sql` — EDIT: add `source_feeds` table + RLS (no anon policy).
- `supabase/migration_add_source_feeds.sql` — NEW: rerunnable DDL.
- `supabase/seed-source-feeds.sql` — NEW: 27 verified feed rows.
- `lib/supabase/types.ts` — EDIT: `SourceFeedRow` + `Database` table entry.
- `lib/free-scrape/types.ts` — EDIT: `FeedSpec { feedUrl, label, isProxy }`,
  `ScrapeSummary.feedsChecked`, `MAX_LIMIT_PER_SOURCE = 25`,
  `FEED_ITEM_CAP = 12`.
- `lib/free-scrape/validate.ts` — EDIT: `checkCandidateUrl(..., allowProxy?)`,
  NEW `canonicalHostMatches(canonical, sourceHost, strategy)`.
- `lib/free-scrape/pipeline.ts` — EDIT: load active feeds (JS-side source
  filter per §21 gotcha), group per source, per-feed fetch loop with
  feed-level error tolerance, cross-feed dedupe, canonical host guard,
  feedsChecked counting. Fallback to `rss_feed_url` when sourceless.
- `app/api/scrape-free/route.ts` — EDIT: clamp constant only (picks up 25).
- `.github/workflows/hourly-pipeline.yml` — NEW: hourly scrape→analyze.
- UI, analysis, env, Vercel config — NO changes.

## Implementation requirements

1. Feed loading: `from("source_feeds").select("...,sources(...)")`
   `.eq("is_active", true)` (base-table filter OK); drop rows whose
   embedded source is inactive/missing or (with `sourceIds`) unselected —
   in JS, never `.eq('sources.…')`.
2. Per source: for each feed (in seed order) `fetchRssItems` → slice 12 →
   normalize → map dedupe; feed fetch failure → `sourceErrors` entry
   `"<Source> / <label>"`, continue with other feeds (never abort source).
3. Candidate check passes `allowProxy = feed.isProxy`; proxy items keep
   Google-News URLs into fetch; post-parse canonical host guard applies to
   every inserted article.
4. Insert path, existence chunks (≤15), content gate, logging, summary
   shape otherwise unchanged; `feedsChecked` = feeds successfully fetched.
5. Workflow YAML: `on.schedule cron: "15 * * * *"`, `workflow_dispatch`
   for manual runs, two steps (scrape limitPerSource 5, then analyze full),
   `secrets.APP_URL` (e.g. `https://<app>.vercel.app`, no trailing slash)
   + `secrets.BIASLY_ADMIN_SECRET`; `curl --fail` so failures surface;
   echo summaries to the Actions log.

## Security requirements

- `source_feeds`: RLS on, no anon/authenticated policy or GRANT
  (service-role only, same posture as `logs`).
- Workflow secrets via GitHub Secrets only; never hardcoded URLs/keys.
- SSRF + secret-guard behavior unchanged.

## Acceptance criteria

- [ ] Migration + seed run cleanly; 27 active feed rows across 5 sources.
- [ ] Manual scrape returns `feedsChecked` > 0 with items from section
  feeds (e.g. Guardian football, BBC tech), still deduped + validated.
- [ ] Proxy items (Fox/NPR sections) resolve to publisher canonicals and
  pass the host guard; foreign-canonical pages rejected, never inserted.
- [ ] Sources without feed rows still scrape via legacy `rss_feed_url`.
- [ ] `limitPerSource: 25` accepted; `26` clamped to 25.
- [ ] `typecheck` + `lint` + `build` pass; bundle secret grep clean.

## Checks to run

- `npm run typecheck`, `npm run lint`, `npm run build`. Report outputs.
- No live bulk scrape in verification (would insert dozens of user rows);
  user runs the backfill manually (steps below).

## Exact manual test steps expected after implementation

1. Apply `supabase/migration_add_source_feeds.sql`, then
   `supabase/seed-source-feeds.sql` → confirm 27 rows, all `is_active`.
2. `POST /api/scrape-free` body `'{"limitPerSource": 3}'` → summary shows
   `feedsChecked` ≈ 27, inserts from section feeds, zero duplicates on
   immediate re-run.
3. Backfill (user's call, inserts real rows):
   `'{"limitPerSource": 15}'` → expect dozens of inserts over a few minutes.
4. `POST /api/analyze` `'{}'` → backlog analyzed (watch Gemini ~1k/day
   quota in AI Studio if backlog is large; remainder continues next runs).
5. GitHub: after Vercel deploy, repo Settings → Secrets → `APP_URL` +
   `BIASLY_ADMIN_SECRET` → Actions → run workflow manually once →
   confirm 200s in the log.

## v2 notes (2026-10-11, learned from the first backfill)

- Google News proxy article URLs do NOT resolve server-side (HTTP 200
  "Google News" shell, JS-only redirect). The 12 proxy feeds were removed
  from the seed (converging DELETE included) and replaced with direct
  publisher sitemaps: Fox `sitemap.xml?type=articles` (5,000 URLs) +
  `?type=fastchanging`, Reuters ARC outbound sitemap. `fetchRssItems` now
  also parses `<urlset>` (loc + lastmod + `news:` namespace), sorted
  newest-first. Proxy code paths (`is_proxy`, `allowProxy`, canonical
  host guard) stay as defense-in-depth.
- npr.org blocks datacenter-IP article fetching (all section/sitemap page
  fetches time out); NPR keeps only its direct top-stories RSS feed —
  its items will insert only where fetching works.
- Final seed: 18 feeds (BBC 7, Guardian 6, Fox 3, NPR 1, Reuters 1).
