# Free Web Scraping Pipeline (RSS + Cheerio) with Supabase — Newz

## Goal

Implement a 100% free article scraping pipeline (no Oxylabs) that collects real
news articles from configured sources and stores them in Supabase, per the
user request "web scraping pipeline for the articles for free without Oxylabs
and also connect Supabase with it".

User-locked decisions (from plan-phase questions):

- Method: RSS-first + Cheerio (RSS feeds give article URLs; article pages
  fetched directly with native fetch + Cheerio parse).
- Automation: Vercel Cron + scrape & analyze (cron runs scrape, then
  best-effort analysis chaining).
- Oxylabs fate: Oxylabs code/tables stay untouched but ignored; the free
  pipeline lives in parallel and is always the active path.

Scope is scraping + Supabase persistence + logging + cron wiring only. No UI
changes, no Clerk changes, no full AI-analysis build (cron chains into
analysis only on a best-effort basis — see §6 below).

## Skills read

- `AGENTS.md` §§ 5, 7–13, 15–17, 21–22 (layer separation, Supabase source of
  truth, scrape-to-insert pipeline, non-article reject list, link extraction,
  URL filtering, validation/cleanup, admin-secret rule, manual scrape
  behavior, test output, security/env, checks). §§ 18 (Oxylabs Scheduler) is
  explicitly NOT implemented — parallel free path replaces it.
- Global `supabase` SKILL.md (`C:\Users\tkund\.agents\skills\supabase\SKILL.md`):
  RLS on every public table, service-role never in browser, `NEXT_PUBLIC_*`
  browser rule, joined-table filter gotcha (filter in JS, never
  `.eq('foreignTable.column')`), verify with a test query.
- `node_modules/next/dist/docs/` (verified present: `01-app/`, `02-pages/`,
  `03-architecture/`, `04-community/`, `index.md`): App Router route handlers
  (`app/api/**/route.ts` exporting `POST`/`GET`), server-only modules,
  server/client boundaries.
- `clerk` / `oxylabs-web-scraper` / `ai-sdk` skills intentionally not loaded:
  no auth, Oxylabs, or model work in this task. Cheerio + RSS-XML parsing via
  package docs and existing project patterns (AGENTS.md §3 allows Cheerio via
  project patterns + package docs).

## Existing code inspected

- `supabase/schema.sql` v1: six tables (`sources`, `articles`,
  `article_analyses`, `logs`, `oxylabs_schedules`, `oxylabs_schedule_runs`);
  no `embedding` column (§7); RLS enabled; anon `select` only on
  `sources`/`articles`/`article_analyses`.
- `supabase/seed-sources.sql`: 5 active homepage-only sources (Reuters, NPR,
  BBC News, Fox News, The Guardian) with `parser_strategy` set.
- `lib/supabase/types.ts`: `SourceRow` has no RSS field — must gain
  `rss_feed_url`.
- `lib/supabase/service.ts`: server-only service-role client exists
  (`import "server-only"`) — pipeline writes go through it.
- `lib/supabase/server.ts` + `client.ts`: anon-key reads; `hasSupabaseEnv()`
  fallback pattern.
- `lib/supabase/queries/articles.ts`: analyzed-only reads, JS-side join
  filtering, `deriveExcerpt`/`deriveReadMinutes`; `getRelatedArticles` is a
  §20 placeholder (untouched).
- `lib/data/articles.ts`: Supabase↔mock swap point (untouched).
- `proxy.ts`: public-first Clerk middleware (untouched).
- Verified via shell: `node_modules/next/dist/docs` exists; `vercel.json`
  does NOT exist (must create); `.env.local` exists; `app/api` does NOT exist
  (must create); `package.json` has NO `cheerio` / `fast-xml-parser` yet.

## Decisions / assumptions

1. **Parallel pipeline, Oxylabs ignored.** New code lives under
   `lib/free-scrape/*` + `/api/scrape-free` + `/api/cron/pipeline-free`.
   Nothing under `oxylabs_*` tables/routes is read or written by the free
   path. No Oxylabs env vars required.
2. **RSS URLs live in Supabase, not code.** Add nullable
   `sources.rss_feed_url text`. Code loads it per active source; a hardcoded
   fallback map is FORBIDDEN (AGENTS.md §7: no hardcoded source URLs).
   Seeded RSS URLs are verified live during implementation (HTTP 200 + valid
   RSS items); unverifiable feeds stay NULL and that source is skipped with a
   logged reason. Expected candidates (verify, do not blindly trust):
   BBC `https://feeds.bbci.co.uk/news/rss.xml`, Guardian
   `https://www.theguardian.com/us/rss`, NPR `https://feeds.npr.org/1001/rss.xml`;
   Fox + Reuters resolved during implementation.
3. **RSS-first, homepage fallback deferred.** v1 implements RSS → article
   detail only. Direct homepage-HTML scraping is NOT built (bot-protection
   risk); if a source has no usable RSS it is skipped with a logged reason.
4. **Same §§9–13 rules, Oxylabs fetch swapped out.** Non-article reject list
   (§9), candidate URL check (§12), URL existence check in chunks of ≤15
   (§9), article content gate (§13), append-only inserts (§10), run-logging
   summary object (§9) all apply unchanged. Only the HTML acquisition changes
   (native fetch instead of Oxylabs).
5. **Article content gate enforced.** Save only with: article-specific URL +
   title, meaningful body (3+ paragraphs OR 900+ meaningful chars after
   cleanup), `image_url` (og:image → RSS media/enclosure fallback) AND
   `published_at` (article:published_time / time[datetime] / RSS pubDate
   fallback). Missing image or date = reject (logged by reason).
6. **Cron + analyze chaining is best-effort.** No `/api/analyze` route exists
   yet in this repo (verified: `app/api` absent). The cron route runs the
   free scrape, then dynamically imports analysis (`@/lib/analysis/pipeline`
   or `POST /api/analyze` handler if present at implementation time); if
   absent it returns `analysis: "skipped-no-analyze-route"` and logs it.
   Full AI analysis is NOT built in this task.
7. **Politeness + timeouts.** Native fetch with browser UA, 15s abort
   timeout per request, ~500ms delay between article fetches per source,
   default max 5 inserted per source (configurable per request, hard cap 10
   to avoid Vercel timeouts). Batch `articles` existence checks ≤15 URLs per
   `.in()` call.
8. **New deps minimal:** `cheerio` (HTML parse, already in AGENTS.md stack)
   + `fast-xml-parser` (RSS XML with namespaces). Both pinned in
   `package.json` + lockfile. No `zod` in this task (typed guards suffice);
   no OpenAI; no Oxylabs SDK.
9. **Logs dual-write.** Neat `console.log` progress (dev terminal per §17)
   AND rows in `public.logs` (`source='scrape-free'` / `'cron-free'`,
   `level`, `message`, `meta` JSON summary). Service-role bypasses RLS.

## Files likely to change

- `lib/free-scrape/types.ts` — NEW: `FreeSource`, `CandidateLink`,
  `ParsedArticle`, `ScrapeSummary`, `RejectionReason` types (no `any`).
- `lib/free-scrape/rss.ts` — NEW: server-only RSS fetch + `fast-xml-parser`
  item extraction (URL, RSS title/date/image).
- `lib/free-scrape/fetch.ts` — NEW: server-only polite `fetchHtml(url)`
  with UA + abort timeout.
- `lib/free-scrape/parse.ts` — NEW: server-only Cheerio extractor
  (title, canonical, image, published_at, cleaned body paragraphs).
- `lib/free-scrape/validate.ts` — NEW: reject-list, per-source URL check
  (reuters `/article|/world/|/business/`-style, npr `/sections/` reject,
  fox show/game/live reject, bbc `/sport`+`/live` reject, guardian
  section-only reject), content-gate check.
- `lib/free-scrape/pipeline.ts` — NEW: server-only orchestrator
  `runFreeScrape({ sourceIds?, limitPerSource? })` implementing the 9-step
  flow + summary object + logs writes. All Supabase writes via
  `createServiceSupabaseClient()`.
- `app/api/scrape-free/route.ts` — NEW: `POST` thin handler, requires
  `x-biasly-admin-secret` → 401 otherwise; parses `{ sourceIds?,
  limitPerSource? }`; calls `runFreeScrape`; returns summary JSON.
- `app/api/cron/pipeline-free/route.ts` — NEW: `GET` internal-only; enforces
  `CRON_SECRET` (bearer or `?` — header `authorization: Bearer <secret>`;
  skip check when `process.env.NODE_ENV !== 'production'` for local test);
  runs scrape then best-effort analysis chaining (§6); always returns both
  step results.
- `vercel.json` — NEW: `{ "crons": [{ "path": "/api/cron/pipeline-free",
  "schedule": "15 * * * *" }] }` (hourly at :15, mirroring §18 timing).
- `supabase/schema.sql` — EDIT: add `rss_feed_url text null` to
  `public.sources` (keep everything else identical).
- `supabase/migration_add_rss_column.sql` — NEW: rerunnable
  `alter table public.sources add column if not exists rss_feed_url text;`
  for Dashboard → SQL Editor.
- `supabase/seed-sources.sql` — EDIT: backfill verified `rss_feed_url`
  values per source (UPDATE … WHERE listing_url = …).
- `lib/supabase/types.ts` — EDIT: add `rss_feed_url: string | null` to
  `SourceRow` (+ Insert/Update inherit automatically).
- `package.json` + `package-lock.json` — EDIT: pinned `cheerio`,
  `fast-xml-parser`.
- `.env.example` — EDIT: comment-only — note free path needs no `OXY_*`
  vars (keep vars since Oxylabs code stays).

Explicitly OUT of scope: `app/`, `components/`, `lib/data/articles.ts`,
`lib/mock/*`, `proxy.ts`, `oxylabs_*` tables, AI analysis build, pgvector.

## Implementation requirements

1. TypeScript strict, explicit types, small pure functions, no `any`.
   Every `lib/free-scrape/*` module starts with `import "server-only"`.
2. Scrape-to-insert flow (mirrors §9, Oxylabs steps replaced):
   1. Load active sources: service-role
      `select id,name,listing_url,parser_strategy,rss_feed_url from sources
      where is_active = true` (optionally filtered by `sourceIds`).
   2. Per source: fetch RSS XML → parse ≤20 items → absolute-URL normalize
      (resolve relative against `listing_url`, strip `#` fragments, drop
      query-string duplicates) → in-memory dedupe.
   3. Reject non-article URLs (§§11–12 + `validate.ts` per-source checks).
   4. Chunked existence check: for remaining candidates in groups of ≤15,
      `select original_url from articles where original_url in (...)`;
      skip hits (count as `duplicatesSkipped`).
   5. Take first N (default 5, cap 10) survivors → `fetchHtml` (~500ms gap)
      → Cheerio `parse` → `validate` content gate.
   6. Insert valid rows append-only:
      `{ source_id, original_url, canonical_url, title, image_url,
      published_at, raw_text }` (never set `analyzed_at` here).
      Catch unique-violation races as `duplicatesSkipped`, not failures.
   7. Per-source try/catch → `sourceErrors[]`; pipeline never throws
      wholesale — one bad source must not kill others.
   8. Dual logging: console progress lines + `logs` inserts; final summary
      object returned and logged.
3. `raw_text` cleanup (§13): strip scripts/styles/nav/ads/newsletter/related
   blocks; paragraphs = `article p` → `main p` → `[itemprop=articleBody] p`
   → generic `p` fallback (≥30 chars each); if single giant block, split on
   double-newline/sentence boundaries before the 3-paragraph/900-char test.
4. Published-date parsing: `meta[property="article:published_time"]`,
   `time[datetime]`, JSON-LD `datePublished`, else RSS `pubDate`; invalid or
   missing → reject (`missing-date`).
5. Image resolution: `meta[property="og:image"]` → RSS
   `media:content`/`enclosure` → first in-body `<img>` (absolute URL only);
   missing → reject (`missing-image`).
6. `POST /api/scrape-free`: `export async function POST(req: Request)`;
   secret check first; `await req.json().catch(() => ({}))`; clamp
   `limitPerSource` to 1..10 (default 5); return
   `Response.json(summary, { status: summary.status === 'failed' ? 500 : 200 })`.
7. `GET /api/cron/pipeline-free`: `export async function GET(req: Request)`;
   if production, require `authorization: Bearer ${CRON_SECRET}` else 401;
   run `runFreeScrape({})` (all active, default limit) inside try/catch
   (step one), then best-effort analysis import/call inside its own
   try/catch (step two, never skipped even if step one failed); return
   `{ scrape, analysis }` JSON.
8. `vercel.json` cron path must exactly match the route
   (`/api/cron/pipeline-free`), schedule `15 * * * *`.
9. RSS seed verification during implementation: fetch each candidate RSS URL
   live, confirm HTTP 200 + ≥3 `<item>` entries with link URLs; only verified
   URLs go into `seed-sources.sql`.

## Security requirements

- `lib/free-scrape/*` and both routes are server-only. Never import them
  from `app/` pages or `components/`.
- Browser bundle touches only `NEXT_PUBLIC_*`. `SUPABASE_SERVICE_ROLE_KEY`,
  `BIASLY_ADMIN_SECRET`, `CRON_SECRET` never leave the server (grep-verify).
- `POST /api/scrape-free` requires `x-biasly-admin-secret` header, 401 on
  missing/invalid. No secret in query string.
- Cron route uses `CRON_SECRET` only (never `BIASLY_ADMIN_SECRET`); dev
  bypass only when not production. Do NOT add `CRON_SECRET` to `.env.local`
  or `.env.example` values.
- Supabase writes use service-role (bypasses RLS by design); no anon-key
  writes; no RLS policy changes (existing policies already deny anon writes
  to `logs`/pipeline tables by omission).
- SSRF hygiene: only fetch URLs derived from Supabase `rss_feed_url` +
  RSS-item links with `http(s)` protocol and same-registrable-domain or
  absolute-http allowlist per source; reject `file:`, `localhost`, private
  IP literals.

## Acceptance criteria

- [ ] `POST /api/scrape-free` with valid admin secret inserts real,
  valid-only articles (each with image + published date + 3 paras/900 chars)
  and returns the §9 summary object; invalid secret → 401.
- [ ] Re-scrape is idempotent: second identical run inserts 0 new rows,
  reports them as `duplicatesSkipped`.
- [ ] Invalid pages (section/show/live/product/support URLs, pages missing
  image/date) are rejected with grouped `rejectionReasons`, never inserted.
- [ ] `logs` table gains `scrape-free` run rows; dev terminal shows neat
  per-source progress + final summary.
- [ ] `GET /api/cron/pipeline-free` works locally without secret (dev
  bypass) and returns `{ scrape, analysis }`; in production it 401s without
  the bearer secret.
- [ ] `vercel.json` cron registered at :15 hourly for the free pipeline path.
- [ ] Supabase schema + types + seed updated for `rss_feed_url`; fresh-DB
  `schema.sql` + migration SQL both run cleanly.
- [ ] `npm run typecheck` + `npm run lint` pass; `npm run build` passes
  (new routes + server modules affect build).
- [ ] No `service_role` / `BIASLY` / `CRON_SECRET` / `OXY_` strings in the
  browser bundle grep.
- [ ] Zero changes to Oxylabs tables, UI pages, or mock data paths.

## Checks to run

- `npm run typecheck` (tsc --noEmit)
- `npm run lint` (eslint)
- `npm run build` (routes + server modules changed)
- Report exact outputs; do not claim pass without running.

## Exact manual test steps expected after implementation

1. Apply DB change: Supabase Dashboard → SQL Editor → run
   `supabase/migration_add_rss_column.sql` → Table Editor confirms
   `sources.rss_feed_url` exists. Re-run `supabase/seed-sources.sql`
   (updated with verified RSS URLs) → confirm 5 active rows each with
   `rss_feed_url` set (or NULL + documented reason for any skipped feed).
2. Fill `.env.local` from `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `BIASLY_ADMIN_SECRET` (no `OXY_*`, no `CRON_SECRET` needed locally).
   Restart dev server (`npm run dev`) — watch its terminal for pipeline logs.
3. Manual scrape (PowerShell, admin secret required):
   ```powershell
   Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/scrape-free" `
     -Headers @{"x-biasly-admin-secret" = "<BIASLY_ADMIN_SECRET>"} `
     -ContentType "application/json" -Body '{"limitPerSource": 3}'
   ```
   curl equivalent:
   ```bash
   curl -X POST http://localhost:3000/api/scrape-free \
     -H "x-biasly-admin-secret: <BIASLY_ADMIN_SECRET>" \
     -H "Content-Type: application/json" \
     -d '{"limitPerSource":3}'
   ```
   Expect JSON summary with `status`, `sourcesChecked`, `candidatesFound`,
   `articlesInserted` (≥1 on first run), `rejectionReasons` grouped.
4. Supabase check: Table Editor → `articles` shows new rows (title, image_url,
   published_at, raw_text reads like one article); `logs` shows
   `source='scrape-free'` rows. Re-run step 3 → `articlesInserted: 0`,
   `duplicatesSkipped` > 0.
5. Cron dry-run (local, no secret needed):
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/cron/pipeline-free"
   ```
   Expect `{ scrape: {...}, analysis: "skipped-no-analyze-route" }` (or real
   analysis results if an analyze module exists by then).
6. Negative test: omit the admin header → expect 401.
7. Bundle-secret grep (PowerShell):
   `rg -i "service_role|BIASLY|CRON_SECRET|OXY_WSA" .next/static` →
   expect zero hits.
8. Run `npm run typecheck && npm run lint && npm run build` → paste outputs.

## Deployment note (2026-10-11, verified against Vercel docs)

- Vercel **Hobby (free)** allows cron **once per day max** — hourly
  expressions fail deployment. `vercel.json` therefore registers two daily
  crons, not one hourly: `/api/cron/scrape-free` at `15 2 * * *` and
  `/api/cron/analyze-free` at `45 3 * * *` (UTC; Hobby precision ±59 min).
- Split for the 60s Hobby function cap too: measured locally, scrape
  (limit 3) ≈ 66s + analyze ≈ 17s combined would 504. Separate routes keep
  each invocation inside the cap (cron scrape uses limitPerSource 2).
- `/api/cron/pipeline-free` (combined) stays as a manual trigger.
- Hourly automation needs Pro, or a free GitHub Actions schedule hitting
  the deployed endpoints.
