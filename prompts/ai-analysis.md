# AI Article Analysis (`POST /api/analyze`) — Newz

## Goal

Implement AI analysis for scraped articles per AGENTS.md §19 (Option A from
the free-pipeline follow-up): process every valid article missing analysis,
generate neutral summaries + sentiment + AI-estimated political framing with
the Vercel AI SDK + OpenAI provider, validate with Zod, save to
`article_analyses`, set `analyzed_at`, and wire the cron pipeline's analysis
step (currently a `skipped-no-analyze-route` stub) to the real function.

No UI changes, no schema changes, no embedding/pgvector (§20 stays deferred).

## Skills read

- `AGENTS.md` §§ 5, 7, 14, 15, 17, 19, 21, 22 (layers, source of truth,
  route methods, admin secret, test output, framing rules, pending-analysis
  check, batching, security/env, checks).
- Global `supabase` SKILL.md: service-role for writes, joined-table filter
  gotcha (LEFT-JOIN pending detection filtered in JS), RLS untouched.
- `ai-sdk` skill (`C:\Users\tkund\.agents\skills\ai-sdk\SKILL.md`): never
  trust memory — verified every API against the installed version's bundled
  docs (`node_modules/ai/docs`, `node_modules/@ai-sdk/openai/docs`).
- Installed versions (pinned, `--save-exact`): `ai 7.0.137`,
  `@ai-sdk/openai 4.0.91`, `zod 4.6.5`.
- Verified API surface (v7, from bundled docs):
  - Structured output = `generateText({ model, instructions, prompt,
    output: Output.object({ schema }), temperature, maxRetries,
    maxOutputTokens })` from `ai` (no standalone `generateObject`; v7
    uses `instructions`, not `system`).
  - Provider = `openai('model-id')` from `@ai-sdk/openai`; apiKey defaults
    to `OPENAI_API_KEY`; default factory uses the Responses API.
  - Validation failure rejects with `NoObjectGeneratedError`
    (`NoObjectGeneratedError.isInstance(error)`; carries
    `text`/`response`/`usage`/`cause`).
  - Model IDs fetched live from the AI Gateway list (not memory):
    current cheap tier includes `gpt-5-mini` / `gpt-5-nano` / `gpt-4o-mini`.
    Default: **`gpt-5-mini`** (current-gen, cheap, strong structured output).

## Existing code inspected

- `lib/supabase/types.ts`: `ArticleAnalysisRow` matches §19 (no embedding);
  `Database` now uses `type` aliases so supabase-js v2.117 generics infer
  correctly (fixed during free-pipeline work).
- `lib/supabase/service.ts`: service-role client for all pipeline writes.
- `lib/free-scrape/pipeline.ts`: `ScrapeSummary` pattern, dual
  console + `logs` writes, `ANALYSIS`-free inserts with `analyzed_at: null`.
- `app/api/scrape-free/route.ts`: admin-secret + clamped-limit pattern to copy.
- `app/api/cron/pipeline-free/route.ts`: step-two stub to replace with the
  real `runAnalysis({})` call (still runs even if step one failed).
- `prompts/free-scraping-pipeline.md`: the parent spec (cron + analyze
  chaining promised best-effort there).
- `.env.example`: already has `OPENAI_API_KEY` + `ANALYSIS_BATCH_SIZE` —
  no new env vars; model is a code constant (`gpt-5-mini`).
- `.env.local` (boolean presence only, values never read): has
  Supabase service key + admin secret, **no `OPENAI_API_KEY`** — the user
  must add it before testing.

## Decisions / assumptions

1. **No embedding.** `article_analyses.embedding` (§20) is NOT added; the
   analyze insert omits it. Related-articles stays placeholder.
2. **Pending = no `article_analyses` row** (LEFT JOIN + JS filter, never
   `analyzed_at IS NULL` alone). Full runs loop until a fetch yields zero
   pending; `articleIds` runs skip already-analyzed (counted as `skipped`);
   `limit` caps the total analyzed per call.
3. **Retry exactly once** with the failure message appended as a hint
   (`maxRetries: 0` in-SDK; manual retry loop). Second failure → `failed`,
   nothing saved, `analyzed_at` untouched.
4. **Percentages are ints 0–100 summing to exactly 100** (Zod `.refine`);
   `bias_score` computed in code as `(right − left) / 100`, never from AI.
5. **Disclaimer guaranteed**: schema `z.string().min(10).default(...)` with
   our standard "AI-estimated … not objective truth" constant — model may
   write its own, otherwise the constant applies. Never saved without one.
6. **Batching**: `ANALYSIS_BATCH_SIZE` env (default 5, clamped 1–10);
   article text truncated to ~8000 chars per prompt (cost bound).
7. **Cron economy**: cron calls `runFreeScrape({ limitPerSource: 3 })` (fits
   serverless timeouts better than the manual default 5), then
   `runAnalysis({})`. Step two always runs.
8. **No zod version pinning issues**: zod 4.6.5 installed; schema uses
   `z.object/z.enum/z.number/z.array/.min/.max/.int()/.default()/.refine()`
   + `z.infer` — all stable across v3/v4.

## Files likely to change

- `lib/analysis/schema.ts` — NEW: `AnalysisOutputSchema` (Zod) + inferred
  `AnalysisOutput` type + `STANDARD_DISCLAIMER` constant.
- `lib/analysis/prompt.ts` — NEW: `ANALYSIS_INSTRUCTIONS` + `buildAnalysisPrompt(title, text)` (evidence-only framing rules, sum-to-100 rule, label-selection rule, weak-evidence → `unclear` + low confidence).
- `lib/analysis/pipeline.ts` — NEW: server-only `runAnalysis({ limit?, articleIds? })` → `AnalysisSummary`; pending detection, batch loop, per-article try → retry-with-hint → save (`article_analyses` insert + `analyzed_at`), console + `logs` writes.
- `app/api/analyze/route.ts` — NEW: `POST`, `x-biasly-admin-secret` → 401
  otherwise; `{ limit?, articleIds? }` passthrough with clamping.
- `app/api/cron/pipeline-free/route.ts` — EDIT: replace analysis stub with
  real `runAnalysis({})` in its own try/catch; scrape call gains
  `limitPerSource: 3`.
- `package.json` + `package-lock.json` — EDIT: pinned `ai`,
  `@ai-sdk/openai`, `zod` (already installed during planning).
- `.env.example`, `supabase/*`, UI files — NO changes.

## Implementation requirements

1. TypeScript strict, small functions, no `any`; every `lib/analysis/*`
   module starts with `import "server-only"`.
2. `generateText({ model: openai("gpt-5-mini"), instructions, prompt,
   output: Output.object({ schema: AnalysisOutputSchema }), temperature: 0.2,
   maxRetries: 0, maxOutputTokens: 1500 })`. Model id is a
   `DEFAULT_ANALYSIS_MODEL` constant; saved to `article_analyses.model`.
3. Pending fetch (service role): `from("articles").select("id,title,raw_text,article_analyses(article_id)")` ordered `created_at` asc, paged (100/iteration), pending = rows whose embed is null/empty (JS filter). `articleIds` path: `.in("id", ids)` + same filter; non-pending counted `skipped`.
4. Save path per article: insert `article_analyses` row
   (summary/sentiment_*/bias_label/left/center/right/bias_score/confidence/
   framing_notes/loaded_terms/disclaimer/model) then
   `update articles set analyzed_at = now()`. `analyzed_at` ONLY on success.
5. `AnalysisSummary`: `{ status: completed|partial|failed, pendingFound,
   analyzed, skipped, failed, totalDurationMs, model, errors: [{ articleId,
   error }] }` (errors capped at 10). Statuses: `failed` when nothing could
   run (no key / no pending and not a targeted call / all errored with zero
   analyzed); `partial` when errors occurred but some analyzed.
6. Missing `OPENAI_API_KEY` → summary `failed` with reason
   `missing-openai-key` (route returns 500 + hint, never throws raw).
7. Cron step two: `const { runAnalysis } = await import("@/lib/analysis/pipeline")`
   inside try/catch (static import is fine — module now exists); response
   `{ scrape, analysis }` unchanged in shape.

## Security requirements

- `lib/analysis/*` server-only; `OPENAI_API_KEY` never leaves the server
  (provider reads env server-side; never pass key in code/bundle).
- `POST /api/analyze` requires `x-biasly-admin-secret` (401 otherwise);
  cron keeps `CRON_SECRET` (never `BIASLY_ADMIN_SECRET`).
- No prompt-injection handling beyond scope: article text is untrusted model
  input, but output is schema-validated before storage; never executed.

## Acceptance criteria

- [ ] `POST /api/analyze` (valid secret) analyzes all pending articles:
  `article_analyses` rows saved, `analyzed_at` set, summary counts match.
- [ ] Invalid secret → 401; missing `OPENAI_API_KEY` → 500 with hint.
- [ ] Re-run with nothing pending → `analyzed: 0`, status completed.
- [ ] `articleIds` with already-analyzed ids → counted `skipped`, not re-analyzed.
- [ ] Percentages in DB always sum to 100; `bias_score = (right−left)/100`.
- [ ] Failed articles saved nowhere; `analyzed_at` stays null for them.
- [ ] Analyzed articles appear on `/` and `/news/[id]` with sentiment +
  framing badges (existing UI reads).
- [ ] Cron returns `{ scrape, analysis }` with real analysis results.
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` pass; no
  `OPENAI_API_KEY`/`BIASLY` strings in `.next/static` bundle grep.

## Checks to run

- `npm run typecheck`, `npm run lint`, `npm run build` (new route +
  server modules). Report exact outputs.

## Exact manual test steps expected after implementation

1. Add to `.env.local`: `OPENAI_API_KEY=<key from https://platform.openai.com/api-keys>`
   (Not added by implementer — user secret.) Restart dev server.
2. Ensure pending articles exist (run step-4 scrape from the free-pipeline
   prompt if `articles` has no unanalyzed rows).
3. Full analysis run (PowerShell):
   ```powershell
   Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/analyze" `
     -Headers @{"x-biasly-admin-secret" = "<BIASLY_ADMIN_SECRET>"} `
     -ContentType "application/json" -Body '{}'
   ```
   Watch dev terminal for per-batch progress + final summary.
4. Targeted run: `Body '{"limit": 2}'` → at most 2 analyzed.
5. Supabase check: `article_analyses` rows exist; `articles.analyzed_at`
   set; percentages sum to 100.
6. UI check: `/` shows new cards with sentiment + AI-estimated framing
   badges; `/news/<id>` shows summary, percentages, confidence, notes,
   terms, disclaimer.
7. Cron dry-run: `Invoke-RestMethod http://localhost:3000/api/cron/pipeline-free`
   → both steps real.
8. Bundle grep: `Select-String -Path ".next/static/**/*.js" -Pattern
   "OPENAI_API_KEY|BIASLY|CRON_SECRET"` → zero hits.
