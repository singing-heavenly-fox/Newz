# Supabase Database + Data Access for Newz

## Goal

Implement the Supabase source of truth and server/client data-access layer for Newz per AGENTS.md §§ 5, 6, 7, 21 (plus read-path parts of §§ 19–20), so the home page and news details page read real stored data instead of mock data:

- Committed initial schema in `supabase/schema.sql` covering the six core tables: `sources`, `articles`, `article_analyses`, `logs`, `oxylabs_schedules`, `oxylabs_schedule_runs` — WITHOUT the `embedding vector(1536)` column (per §7, embedding lands in §20 after pgvector is enabled).
- Typed DB row types in `lib/supabase/types.ts` matching the schema exactly.
- Supabase clients with correct server/client boundaries: browser anon client, server read client, and server-only service-role client.
- Query functions in `lib/supabase/queries/articles.ts` (`getArticles`, `getArticleById`, `getArticleIds`) reading stored analyzed articles only; `getRelatedArticles` stays a documented placeholder until §20 (no pgvector in this task).
- Swap `lib/data/articles.ts` from mock reads to Supabase reads (single swap point, no other UI file changes).
- RLS enabled on all public tables with minimal read policies for `anon`; writes stay service-role-only.
- Deps added: `@supabase/supabase-js`, `@supabase/ssr`, `server-only` (pinned, lockfile committed). No zod, no OpenAI, no Oxylabs, no pgvector in this task.
- UI keeps displaying stored data only (§5). No scraping, analysis, scheduler, cron, or embedding work in this task.

## Skills read

- `AGENTS.md` §§ 1, 5, 6, 7, 19, 20, 21 (product scope, layer separation, tech stack, Supabase source of truth, framing display rules, pgvector deferral, security/env/checks).
- Global `supabase` SKILL.md (location `C:\Users\tkund\.agents\skills\supabase\SKILL.md`: verify against changelog/docs before implementing, RLS on every table in exposed schemas, never expose service-role key, `NEXT_PUBLIC_*` browser rule, generate migration via `db pull` only when committing, run advisors, joined-table filter gotcha avoided by filtering in JS).
- Project constraint: repo has no local `.agents/skills/` directory (checked — `Test-Path .agents` is False); used the global skill equivalent above. `clerk` / `oxylabs-web-scraper` / `ai-sdk` skills intentionally not loaded — no auth, scraping, or model work in this task.
- Next.js server/client boundary: follow existing project pattern (pages are async Server Components; only `news-grid.tsx` filtering is `use client`) — no new boundary research needed beyond the established codebase pattern.

## Existing code inspected

- `package.json`: Next 16.3.4, React 19.2.8, Tailwind v4, `@clerk/nextjs` present; NO `@supabase/*`, `server-only`, or `zod` deps yet — must be added.
- `.env.example`: already canonical per §21 (Supabase URL + anon + service-role, Oxylabs, OpenAI, `BIASLY_ADMIN_SECRET`, optional `ANALYSIS_BATCH_SIZE`, `CRON_SECRET` correctly absent). No env changes expected except documenting that Supabase values must be filled in `.env.local` (never committed).
- `lib/types.ts`: UI types `Source` (id/name/listing_url/logo_url), `Article` (id/source/original_url/canonical_url/title/excerpt/image_url/published_at/raw_text/read_minutes/analysis), `ArticleAnalysis` (article_id/summary/sentiment_score −1..1/sentiment_label/bias_label/left/center/right 0–100/bias_score/confidence 0–1/framing_notes/loaded_terms/disclaimer/model/embedding). DB row types must mirror §7, not duplicate these UI shapes blindly.
- `lib/data/articles.ts`: mock shim (`getArticles` sorted desc, `getArticleById`, `getArticleIds`, mock `getRelatedArticles` placeholder) with `// TODO: swap to Supabase` — this file is the single swap point; no other UI file may change data source.
- `lib/mock/articles.ts` (302 lines, 8 diverse mock articles, deterministic 24-dim `fakeEmbedding` placeholder, `DISCLAIMER` constant): shapes match §7/§19 so the swap is trivial.
- `app/page.tsx`: async Server Component calling `getArticles()`, renders hero + `NewsGrid` + how-it-works. `app/news/[id]/` has `page.tsx` + `loading.tsx`.
- No `supabase/` directory, no `lib/supabase/**`, no `schema.sql`, no migrations exist yet (glob `**/*supabase*` empty).
- `prompts/news-ui-foundation.md`: used as the format reference for this prompt file.

## Decisions / assumptions

1. **Initial schema excludes `embedding`.** Per §7, `embedding vector(1536)` + IVFFlat index land in §20 after pgvector is enabled in the Dashboard. `supabase/schema.sql` v1 has NO embedding column. UI `ArticleAnalysis.embedding` stays as-is (nullable placeholder); `getRelatedArticles` keeps its current mock-compatible placeholder signature and returns `[]` when embedding is null — real cosine query comes in §20.
2. **No extra article columns.** §7 does not list `excerpt` or `read_minutes`, but UI needs them. They are DERIVED in the query mapper (`excerpt` = first ~160 chars of `raw_text` at a word boundary; `read_minutes` = `max(1, round(wordCount/200))`), not new columns. Keeps schema minimal per "do not overbuild".
3. **Article timestamps:** `articles.scraped_at timestamptz default now()`, `articles.analyzed_at timestamptz null` (set only after valid analysis is saved — §19 rule; read path never sets it).
4. **Dedupe:** `articles.original_url text unique not null` (canonical URL also stored, unique index on `canonical_url` where not null). Append-only: no deletes/replaces in queries.
5. **Sources:** `id uuid pk default gen_random_uuid()`, `name text not null`, `listing_url text unique not null`, `parser_strategy text null`, `is_active boolean not null default true`, `logo_url text null`, `created_at timestamptz default now()`.
6. **`article_analyses.article_id uuid unique not null references articles(id) on delete cascade`** (one-to-one). Columns: `summary text not null`, `sentiment_score float not null check (-1..1)`, `sentiment_label text not null check (positive/neutral/negative)`, `bias_label text not null check (left/center/right/mixed/unclear)`, `left_percentage int 0..100`, `center_percentage int 0..100`, `right_percentage int 0..100`, `bias_score float`, `confidence float 0..1`, `framing_notes text[] default '{}'`, `loaded_terms text[] default '{}'`, `disclaimer text not null`, `model text not null`, `created_at`. Percentage-sum-to-100 enforced in application/Zod later (§19), NOT a DB check constraint (keeps SQL portable; note as follow-up).
7. **`logs` minimal:** `id bigint generated always as identity pk`, `level text not null default 'info'`, `source text not null` (e.g. `scrape|analyze|scheduler|cron`), `message text not null`, `meta jsonb null`, `created_at timestamptz default now()`. Enough for pipeline log tracking; richer columns later if needed.
8. **`oxylabs_schedules` / `oxylabs_schedule_runs` forward-compatible minimal:** `oxylabs_schedules(id uuid pk, source_id uuid null references sources(id) on delete set null, oxylabs_schedule_id text unique null, name text null, is_active bool default true, created_at)`; `oxylabs_schedule_runs(id uuid pk, schedule_id uuid null references oxylabs_schedules(id) on delete set null, oxylabs_run_id text null, status text null, stats jsonb null, started_at timestamptz null, finished_at timestamptz null, created_at)`. Do NOT invent Oxylabs API shapes — scheduler section (§18) will extend these.
9. **Homepage visibility rule:** per §18, articles appear on the homepage only after `analyzed_at` is set. `getArticles()` therefore inner-joins `article_analyses` and orders by `articles.published_at desc`. Unanalyzed rows are invisible to UI reads (analysis backfill in §19 uses service-role LEFT JOIN, separate from UI reads).
10. **Defensive reads:** Supabase env missing → `lib/data/articles.ts` falls back to mock data with a server-side console warning (same defensive posture as the Clerk-keys-absent behavior), so `build`/`dev` never crash before keys exist. Real Supabase path activates when `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
11. **Supabase-changelog verification** (required by the skill) happens during implementation: check `https://supabase.com/changelog.md` for breaking changes affecting `supabase-js`/`@supabase/ssr` client init and RLS, and pin exact versions in `package.json`.
12. **Migration history:** this repo has no Supabase CLI project/migrations yet. `supabase/schema.sql` is the committed source of truth; the implementer runs it (or the ALTER equivalent) once in Dashboard → SQL Editor per §7, and notes that `supabase db pull` / CLI migration wiring is a later follow-up, not this task.

## Files likely to change

- `supabase/schema.sql` — NEW: full v1 DDL (extensions `pgcrypto` if needed for `gen_random_uuid`, six tables, unique indexes, `updated_at` triggers only if trivial, `enable row level security`, anon `select` policies, no `embedding`).
- `lib/supabase/types.ts` — NEW: `SourceRow`, `ArticleRow`, `ArticleAnalysisRow`, `LogRow`, `OxylabsScheduleRow`, `OxylabsScheduleRunRow` DB types (snake_case, nullable-accurate, no UI nesting).
- `lib/supabase/client.ts` — NEW: browser anon client (`createBrowserClient`, `NEXT_PUBLIC_*` only).
- `lib/supabase/server.ts` — NEW: server read client (anon key, read-only usage documented).
- `lib/supabase/service.ts` — NEW: server-only service-role client (`import "server-only"`, `SUPABASE_SERVICE_ROLE_KEY`; never imported by `app/`/`components/`).
- `lib/supabase/queries/articles.ts` — NEW: `getArticles()`, `getArticleById(id)`, `getArticleIds()` returning UI `Article` shapes via join + JS-side mapping (no `.eq('foreignTable.column')` filtering — §21 gotcha); `getRelatedArticles` re-exported placeholder marked `TODO §20 pgvector`.
- `lib/data/articles.ts` — EDIT: swap bodies to Supabase queries with mock fallback when env absent; keep exported signatures identical.
- `lib/types.ts` — EDIT only if needed to align nullability with DB mapper (no shape redesign).
- `package.json` + `package-lock.json` — EDIT: add pinned `@supabase/supabase-js`, `@supabase/ssr`, `server-only`.
- `.env.example` — EDIT only if a variable is missing vs §21 table (currently in sync; prefer no change).

## Implementation requirements

1. TypeScript strict, explicit types, small functions, no `any`. DB rows → UI `Article` mapping is a pure typed function, unit-testable by inspection.
2. `supabase/schema.sql` must run cleanly on a fresh Supabase Postgres (no `embedding`, no pgvector dependency). Include `create table if not exists`, PKs/FKs, `unique(original_url)`, `unique(article_id)` on analyses, `check` constraints for score ranges and label enums, `created_at` defaults, RLS enablement + anon read policies:
   - `sources`: anon `select` where `is_active = true` (public listing of active sources only).
   - `articles` + `article_analyses`: anon `select` allowed (writes are service-role-only and bypass RLS; UI reads only analyzed articles via inner join, enforced in the query, not the policy).
   - `logs` / `oxylabs_*`: NO anon access (no policy for anon; service-role only).
3. Query functions: use anon/browser-compatible reads; select with explicit column lists; join `articles → sources` and `articles → article_analyses` (one query per function, no N+1); apply the "analyzed only" condition in JS after fetch if PostgREST join filtering misbehaves (per §21 gotcha — never `.eq('article_analyses.xxx')` on a joined table).
4. `getArticles()` returns analyzed articles sorted `published_at desc`, mapped to full UI `Article` (source nested, excerpt/read_minutes derived, analysis attached, non-null). `getArticleById()` returns `Article | null`. `getArticleIds()` returns `string[]` of analyzed article ids (for `generateStaticParams`).
5. `getRelatedArticles(articleId, embedding?)` keeps current placeholder behavior (empty when no embedding), clearly marked `TODO §20`.
6. `lib/data/articles.ts` keeps identical exports; Supabase path first, mock fallback with `console.warn` when env vars absent. No changes to `app/` or `components/` imports.
7. RLS/policies verified by running each query with the ANON key (not service role) after applying SQL.
8. Keep it small: no API routes, no scraping/analysis/scheduler/cron, no seed scripts beyond 1–2 documented manual INSERT examples for testing, no refactors of unrelated files.

## Security requirements

- NEVER import `lib/supabase/service.ts` (service role) from `app/` or `components/` (browser-reachable). Service client is server-only via `import "server-only"`.
- Browser code touches only `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `SUPABASE_SERVICE_ROLE_KEY`, Oxylabs/OpenAI creds, `BIASLY_ADMIN_SECRET` never appear in client bundles — verify with a bundle grep.
- RLS enabled on all six tables. Anon policies are `select`-only and minimal (active sources; articles/analyses readable; logs/scheduler tables denied to anon).
- No secrets in `supabase/schema.sql` or committed files. `.env.local` never committed.
- Joined-table filtering done in JS, not `.eq('foreignTable.column')`.

## Acceptance criteria

- [ ] `supabase/schema.sql` exists, runs cleanly in Dashboard → SQL Editor on a fresh project, creates all six tables with PKs/FKs/uniques/checks/RLS + anon select policies, and contains NO `embedding` column.
- [ ] `lib/supabase/types.ts` matches the applied schema column-for-column (names, nullability).
- [ ] `lib/supabase/{client,server,service}.ts` exist with correct boundaries (`service.ts` has `import "server-only"`; clients use anon key only).
- [ ] `lib/supabase/queries/articles.ts` exports `getArticles`, `getArticleById`, `getArticleIds` (+ `getRelatedArticles` placeholder) with typed join→UI mapping, analyzed-only filtering, `published_at desc` ordering, derived `excerpt`/`read_minutes`.
- [ ] `lib/data/articles.ts` reads from Supabase when env is set, falls back to mock with a warning when not; zero import changes needed in `app/`/`components/`.
- [ ] With SQL applied + env set + one `sources` row + one `articles` + `article_analyses` pair inserted manually, `/` renders the real article card and `/news/<id>` renders the full analysis; with env absent, pages still render mock data.
- [ ] `npm run typecheck` + `npm run lint` pass; `npm run build` passes (new server modules SAYMENT affect build).
- [ ] No `service_role` / `BIASLY` / `OPENAI` / Oxylabs strings in browser bundle (grep check).

## Checks to run

- `npm run typecheck` (tsc --noEmit)
- `npm run lint` (eslint)
- `npm run build` (server modules + data layer changed)
- Report exact outputs; do not claim pass without running.

## Exact manual test steps expected after implementation

1. Apply schema: open Supabase Dashboard → SQL Editor → paste `supabase/schema.sql` → Run → confirm 6 tables exist (Table Editor shows `sources`, `articles`, `article_analyses`, `logs`, `oxylabs_schedules`, `oxylabs_schedule_runs`) and RLS is enabled.
2. Fill `.env.local` from `.env.example`: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (service key only here, never in code). Restart dev server.
3. Insert one test source + article + analysis (SQL Editor):
   ```sql
   insert into sources (name, listing_url, is_active)
   values ('Test Wire', 'https://example.com', true)
   returning id;
   -- use returned id as <SRC>
   insert into articles (source_id, original_url, canonical_url, title, image_url, published_at, raw_text, analyzed_at)
   values ('<SRC>', 'https://example.com/test-article-1', 'https://example.com/test-article-1',
     'Test article one', 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1200&q=80',
     now(), 'First paragraph of body text with enough meaningful content to read like one article. Second paragraph adds context and detail for the story.', now())
   returning id;
   -- use returned id as <ART>
   insert into article_analyses (article_id, summary, sentiment_score, sentiment_label, bias_label,
     left_percentage, center_percentage, right_percentage, bias_score, confidence,
     framing_notes, loaded_terms, disclaimer, model)
   values ('<ART>', 'Neutral summary of the test article.', 0.1, 'neutral', 'center',
     15, 70, 15, 0, 0.8, array['Centers on policy mechanics.'], array['landmark'],
     'AI-estimated sentiment and political framing — not objective truth.', 'manual-test');
   ```
4. `npm run dev` → open http://localhost:3000 → grid shows the "Test article one" card with neutral/center badges and 15/70/15 bars. Click it → `/news/<id>` shows summary, sentiment, framing %, confidence, notes, terms, disclaimer.
5. Env-absent check: temporarily unset the two `NEXT_PUBLIC_SUPABASE_*` vars → restart dev → homepage still renders the 8 mock cards (terminal shows fallback warning, no crash). Restore vars afterwards.
6. Bundle-secret grep (PowerShell): `rg -i "service_role|BIASLY|OPENAI|OXY_WSA" .next/static` → expect zero hits (excluding source-map noise is acceptable if documented).
7. `npm run typecheck && npm run lint && npm run build` → paste outputs.
