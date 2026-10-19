# Newz — AI-powered news analysis

**Newz** collects real news articles from configured sources, analyzes them with AI, stores them in Supabase, and displays reader-friendly sentiment and political-framing insights.

- Home page with news cards (sentiment label + AI-estimated left/center/right framing)
- News details page with full article analysis (summary, sentiment, framing percentages, confidence, framing notes, loaded terms, disclaimer)
- Clerk authentication (sign-in / sign-up)
- Supabase persistence (append-only articles + analyses, RLS, pgvector-ready schema)
- Free scraping pipeline: RSS feeds + Cheerio detail-page parsing ($0, no Oxylabs credentials required)
- Google Gemini AI analysis via Vercel AI SDK (`gemini-3.5-flash-lite`, free tier)
- Automated hourly pipeline: Vercel Cron (daily free fallback) + GitHub Actions (hourly, public repos)
- pgvector-ready schema for related-article similarity search
- Minimal responsive UI (Tailwind CSS, shadcn/ui primitives)

> **Note on AGENTS.md:** The project's `AGENTS.md` describes an Oxylabs scraping/scheduler path. The code actually implemented is the **free pipeline** (`/api/scrape-free`, `/api/analyze`, RSS + Cheerio + Gemini). Oxylabs tables (`oxylabs_schedules`, `oxylabs_schedule_runs`) and env vars (`OXY_WSA_*`) exist as legacy/unused scaffolding. This README documents the running free pipeline.

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Repository layout](#repository-layout)
4. [Prerequisites](#prerequisites)
5. [Local development](#local-development)
6. [Supabase setup](#supabase-setup)
7. [Clerk setup](#clerk-setup)
8. [Environment variables](#environment-variables)
9. [API reference](#api-reference)
10. [Hourly pipeline (production)](#hourly-pipeline-production)
11. [Manual testing with curl](#manual-testing-with-curl)
12. [Available checks](#available-checks)
13. [Security](#security)
14. [Troubleshooting](#troubleshooting)

---

## Features

| Area | What it does |
|------|--------------|
| **Collect** | Active news sources are scraped hourly via RSS feeds + Cheerio. Each article is validated (image, published date, meaningful body), deduped by URL, and appended to Supabase. |
| **Analyze** | Google Gemini writes a neutral summary, sentiment score/label, and AI-estimated political framing (left/center/right percentages that sum to 100, plus confidence, framing notes, loaded terms, disclaimer). |
| **Explore** | Home page shows analyzed news cards. Click a card for the full analysis on the news details page. |
| **Automate** | GitHub Actions runs scrape → analyze every hour at :15 UTC; Vercel Cron provides a daily free fallback. |

### Data model (Supabase source of truth)

- `sources` — name, homepage/listing URL, RSS feed URL, parser strategy, active flag, logo URL
- `articles` — source ref, original URL (unique, dedupe key), canonical URL, title, image URL, published date, raw text, scraped/analyzed timestamps
- `article_analyses` — article ref, summary, sentiment score/label, bias label, left/center/right percentages, bias score, confidence, framing notes, loaded terms, disclaimer, model name
- `logs` — pipeline run logs (scrape-free, analyze)
- `source_feeds` — multiple RSS feeds per source (section/topic feeds + Google News proxies)
- `oxylabs_schedules`, `oxylabs_schedule_runs` — legacy Oxylabs tables (unused by the free pipeline)

See `supabase/schema.sql` for the full DDL, RLS policies, and grants.

---

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Auth:** Clerk (`@clerk/nextjs`)
- **Database:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`), RLS + service-role client
- **Scraping:** native `fetch` + RSS (`fast-xml-parser`) + Cheerio detail-page parsing
- **AI:** Vercel AI SDK (`ai`, `@ai-sdk/google`) with Google Gemini `gemini-3.5-flash-lite`
- **Validation:** Zod
- **Styling:** Tailwind CSS v4, shadcn/ui primitives (`components/ui/*`)
- **Scheduling:** Vercel Cron (`vercel.json`) + GitHub Actions (`hourly-pipeline.yml`)
- **Checks:** `npm run typecheck`, `npm run lint`, `npm run build`

---

## Repository layout

```
winter/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home — news cards (analyzed articles only)
│   ├── layout.tsx                # Root layout + ClerkProvider
│   ├── not-found.tsx, loading.tsx
│   ├── news/[id]/page.tsx        # Article details + full analysis
│   ├── news/[id]/loading.tsx
│   ├── sign-in/[[...sign-in]]/page.tsx   # Clerk sign-in
│   ├── sign-up/[[...sign-up]]/page.tsx   # Clerk sign-up
│   └── api/
│       ├── scrape-free/route.ts  # POST manual scrape (x-biasly-admin-secret)
│       ├── analyze/route.ts      # POST manual AI analysis (x-biasly-admin-secret)
│       ├── cron/scrape-free/route.ts   # GET daily scrape cron
│       ├── cron/analyze-free/route.ts  # GET daily analyze cron
│       └── cron/pipeline-free/route.ts # GET combined manual trigger
├── components/                   # UI components (news-card, news-grid, analysis-panel, …)
├── components/ui/                # shadcn primitives (card, badge, separator, skeleton)
├── lib/
│   ├── free-scrape/              # scrape-to-insert pipeline (fetch, rss, parse, validate, pipeline, types)
│   ├── analysis/                 # AI analysis orchestration (pipeline, prompt, schema)
│   ├── supabase/                 # clients (service/server), types, queries
│   ├── data/articles.ts          # data-access swap: Supabase or mock fallback
│   ├── mock/articles.ts          # mock articles for pre-setup dev mode
│   ├── types.ts                  # UI types (Article, ArticleAnalysis, Source, …)
│   └── utils.ts
├── prompts/                      # implementation prompt files (AGENTS.md workflow)
├── supabase/                     # schema.sql, seed-sources.sql, migrations
├── .github/workflows/            # hourly-pipeline.yml (GitHub Actions scheduler)
├── .env.example                  # canonical env var list (copy to .env.local)
├── vercel.json                   # Vercel Cron config (daily free fallback)
├── AGENTS.md                     # agent operating rules for this repo
├── SETUP_GUIDE.txt               # step-by-step production setup guide
└── package.json
```

---

## Prerequisites

- Node.js 20+ and npm
- A Supabase account with a project created
- A Clerk account with an application created
- A Google AI Studio account (free Gemini API key, no credit card)
- A GitHub account + Vercel account (for production/hourly pipeline)

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the canonical example file and fill in your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` (never commit it):

```env
# Clerk — get from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Supabase — get from Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>   # server only

# AI — get a free key at https://aistudio.google.com/apikey
GOOGLE_GENERATIVE_AI_API_KEY=<gemini api key>

# Admin secret for scrape/analyze routes (any strong random string)
BIASLY_ADMIN_SECRET=<32+ char random string, e.g. openssl rand -hex 32>

# Optional: articles analyzed per batch (default 5)
# ANALYSIS_BATCH_SIZE=5
```

> `CRON_SECRET` is injected by Vercel automatically on cron requests — do **not** add it to `.env.local`. `OXY_WSA_USERNAME` / `OXY_WSA_PASSWORD` are not needed for the free pipeline.

### 3. Set up Supabase

1. Open your Supabase project → SQL Editor → New query.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
   - Creates: `sources`, `articles`, `article_analyses`, `logs`, `source_feeds`, plus legacy `oxylabs_*` tables.
   - Enables RLS and creates read policies for the website + grants for the Data API.
3. Paste the entire contents of `supabase/seed-sources.sql` and click **Run**.
   - Seeds 5 active sources (Reuters, NPR, BBC News, Fox News, The Guardian) with RSS feed URLs.
   - Verify: `select name, listing_url, rss_feed_url, is_active from public.sources order by name;` should return 5 active rows.

### 4. Set up Clerk

1. Create an application at https://dashboard.clerk.com.
2. Copy the Publishable key and Secret key into `.env.local` (see above).
3. In Clerk Dashboard → User & Authentication → URLs, set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in fallback: `/`
   - After sign-up fallback: `/`

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If Supabase env vars are absent, the app falls back to mock articles ("pre-setup dev mode"). Once `.env.local` is configured, it reads live analyzed articles from Supabase.

---

## Environment variables

| Variable | Purpose | Exposure |
|----------|---------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | client + server |
| `CLERK_SECRET_KEY` | Clerk secret key | server only |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk sign-in route | client + server |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk sign-up route | client + server |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | post-sign-in fallback | client + server |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | post-sign-up fallback | client + server |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (pipeline writes) | server only |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini API key (free tier) | server only |
| `BIASLY_ADMIN_SECRET` | admin secret for `x-biasly-admin-secret` header | server only |
| `ANALYSIS_BATCH_SIZE` | articles analyzed per batch (default 5) | server only |
| `CRON_SECRET` | Vercel-injected cron secret (do not set locally) | server only |

Keep `.env.example` and this table in sync when variables change.

---

## API reference

All routes are Next.js Route Handlers in `app/api/`.

### `POST /api/scrape-free`
Manual scrape trigger. Requires header `x-biasly-admin-secret: <BIASLY_ADMIN_SECRET>`.

Body (optional JSON):
```json
{ "sourceIds": ["<uuid>", "..."], "limitPerSource": 3 }
```
- `sourceIds`: subset of active sources to scrape (default: all active sources).
- `limitPerSource`: max valid articles per source (1–20, default 5).

Returns a run summary: status, sources/feeds checked, candidates found/rejected, duplicates skipped, detail pages scraped, articles inserted/rejected/failed, duration, rejection reasons, source errors, inserted IDs.

### `POST /api/analyze`
Manual AI analysis trigger. Requires header `x-biasly-admin-secret: <BIASLY_ADMIN_SECRET>`.

Body (optional JSON):
```json
{ "limit": 10, "articleIds": ["<uuid>", "..."] }
```
- `limit`: max articles to analyze this call (omitted = all pending).
- `articleIds`: analyze only these IDs (pending-only; others skipped).

Returns: status, pendingFound, analyzed, skipped, failed, totalDurationMs, model, errors.

Pending detection uses a LEFT JOIN on `article_analyses` — an article is pending when no analysis row exists, regardless of `analyzed_at`.

### Cron routes (GET)

| Route | Schedule | Protection |
|-------|----------|------------|
| `GET /api/cron/scrape-free` | `15 2 * * *` (daily, 02:15 UTC) | `CRON_SECRET` (Vercel-injected) |
| `GET /api/cron/analyze-free` | `45 3 * * *` (daily, 03:45 UTC) | `CRON_SECRET` (Vercel-injected) |

These are the free Vercel Hobby fallback (Vercel Hobby allows one cron per day). In local dev the secret check is skipped so they can be tested manually.

### Auth pages
- `GET /sign-in`, `GET /sign-up` — Clerk-managed authentication.

---

## Hourly pipeline (production)

The project uses two complementary schedulers so scraping/analysis runs hourly at $0:

1. **GitHub Actions (hourly, primary)** — `.github/workflows/hourly-pipeline.yml`
   - Cron: `15 * * * *` (every hour at :15 UTC), plus manual `workflow_dispatch`.
   - Job: `POST /api/scrape-free` (limit 5 per source) → `POST /api/analyze` (all pending).
   - Secrets required on GitHub (Settings → Secrets and variables → Actions):
     - `APP_URL` — your Vercel production URL, no trailing slash.
     - `BIASLY_ADMIN_SECRET` — same value as in Vercel env vars.

2. **Vercel Cron (daily, free fallback)** — `vercel.json`
   - `/api/cron/scrape-free` at 02:15 UTC daily
   - `/api/cron/analyze-free` at 03:45 UTC daily
   - Add env vars in Vercel Dashboard → Settings → Environment Variables (Production), then redeploy.

**Idempotency:** scraping dedupes by `original_url` (chunks of ≤15 URLs per `.in()` call); re-scraping inserts 0 new rows and reports `duplicatesSkipped`. Analysis skips any article that already has an `article_analyses` row.

---

## Manual testing with curl

Replace `<your-app>.vercel.app` and `<BIASLY_ADMIN_SECRET>` with your values.

### Test A — Manual scrape (expect 200 + JSON summary)
```bash
curl -X POST https://<your-app>.vercel.app/api/scrape-free \
  -H "x-biasly-admin-secret: <BIASLY_ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"limitPerSource": 3}'
```
Expected: `articlesInserted >= 1` on first run, plus `candidatesFound`, `duplicatesSkipped`, `articlesRejected`, `rejectionReasons`, `sourceErrors`.

### Test B — Manual analyze (expect 200 + analysis summary)
```bash
curl -X POST https://<your-app>.vercel.app/api/analyze \
  -H "x-biasly-admin-secret: <BIASLY_ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected: `pendingFound`, `analyzed`, `skipped`, `failed`, `totalDurationMs`, `model`.

### Test C — Missing secret (expect 401)
```bash
curl -X POST https://<your-app>.vercel.app/api/scrape-free \
  -H "Content-Type: application/json" \
  -d '{"limitPerSource": 1}'
```
Expected: HTTP 401 with `{"error":"Unauthorized"}`.

### Test D — Idempotency (re-run Test A)
Expected: `articlesInserted: 0`, `duplicatesSkipped > 0`.

### Verify in Supabase
- Table Editor → `articles`: rows with title, `image_url`, `published_at`, readable `raw_text`, `analyzed_at = null` (until analysis runs).
- Table Editor → `article_analyses`: after analyze, rows with `summary`, `sentiment_label`, `bias_label`, `left_percentage`/`center_percentage`/`right_percentage` (sum = 100), `confidence`, `framing_notes`, `loaded_terms`, `disclaimer`, `model`.
- Table Editor → `logs`: rows with `source = 'scrape-free'` and `source = 'analyze'`.

Watch the terminal running `npm run dev` — scrape and analysis progress is logged server-side there.

---

## Available checks

Run from the project root:

```bash
npm run typecheck   # TypeScript, no emit (tsc --noEmit)
npm run lint        # ESLint
npm run build       # Next.js production build
npm run dev         # start dev server (watch terminal for pipeline logs)
npm run start       # run production build locally (after `npm run build`)
```

Run `typecheck` and `lint` at minimum after changes; add `build` when routes, config, or server modules changed.

---

## Security

- Never expose to browser code: Supabase service role key, Google Gemini key, `BIASLY_ADMIN_SECRET`.
- Never run from browser code: scraping, AI analysis, scheduler processing.
- All mutating routes (`POST /api/scrape-free`, `POST /api/analyze`) require `x-biasly-admin-secret` and return `401` on missing/invalid secret.
- Cron routes are protected by Vercel-injected `CRON_SECRET`; the check is skipped in local dev only.
- Supabase RLS is enabled on all tables; the website reads via the anon key with public select policies; pipeline writes use the service-role client (server-only, bypasses RLS).

---

## License

Private project — all rights reserved.
