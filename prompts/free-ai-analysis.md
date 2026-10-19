# Free AI Analysis (Google Gemini free tier) — Newz

## Goal

Replace the paid OpenAI provider in the analysis pipeline with a fully free,
daily-resetting model so the hourly pipeline costs $0 forever: no billing,
no credits to top up, quota resets every midnight Pacific.

## Skills read

- `AGENTS.md` §§ 15, 19, 21 (admin secret, framing rules, env table sync).
- `ai-sdk` skill: verified against installed bundled docs
  (`node_modules/@ai-sdk/google/docs/15-google.mdx`, `node_modules/ai/docs`).
- Installed (pinned): `ai 7.0.137`, `@ai-sdk/google 4.0.93`, `zod 4.6.5`.
  `@ai-sdk/openai` removed.
- Verified API surface:
  - Factory `google('model-id')`; key defaults to
    `GOOGLE_GENERATIVE_AI_API_KEY` (free from AI Studio, no billing).
  - `generateText({ instructions, prompt, output: Output.object({ schema }),
    temperature, maxRetries, maxOutputTokens })` unchanged — only the model
    object changes.
  - `gemini-2.5-flash-lite` confirmed in the provider capability table
    (structured output supported) and in Google's current rate-limit docs.
    NOTE (2026-10-11): Google retired 2.5-flash-lite for NEW API keys
    ("no longer available to new users") — pipeline now defaults to
    `gemini-3.5-flash-lite`, verified listed on a fresh key.

## Existing code inspected

- `lib/analysis/pipeline.ts`: `openai(DEFAULT_ANALYSIS_MODEL)` is the only
  provider touchpoint; key check + summary shapes stay identical.
- `app/api/analyze/route.ts`: missing-key hint text mentions OpenAI.
- `app/api/cron/pipeline-free/route.ts`: uses `DEFAULT_ANALYSIS_MODEL`
  import — no change needed.
- `.env.example` + `AGENTS.md` §21 table: list `OPENAI_API_KEY` — both
  updated in sync to `GOOGLE_GENERATIVE_AI_API_KEY`.

## Decisions / assumptions

1. **Model: `gemini-3.5-flash-lite`** (was 2.5-flash-lite — see note above).
   Current lite model with a permissive free tier (RPD resets midnight
   Pacific). Pipeline worst case is ~360 calls/day (15/hr), realistic
   ~50–150 — fits with headroom. Sequential per-article calls stay far
   under RPM/TPM caps.
2. **Single provider, no fallback.** OpenAI path removed entirely
   (dependency uninstalled). Keeps the pipeline small per AGENTS.md §21.
3. **Quality tradeoff accepted:** flash-lite is weaker than `gpt-5-mini` at
   nuanced framing. Mitigations already in place: low temperature (0.2),
   retry-once with hint, strict Zod gate, `unclear` + low confidence when
   evidence is weak. If framing quality disappoints, upgrade path is one
   constant (`gemini-2.5-flash`, ~250 RPD free) or paid tier — no refactor.
4. **Privacy note:** Google's free tier uses API content to improve products
   (per their pricing page). News articles are public data — acceptable;
   documented for the user.
5. **429 handling:** quota exhaustion surfaces as a per-article failure
   (retry once, then `failed` + logged). Articles stay pending and are
   picked up on the next run after midnight-Pacific reset — same
   never-lose-work guarantee as before. No code change needed.

## Files likely to change

- `lib/analysis/pipeline.ts` — EDIT: `openai` → `google` import,
  `DEFAULT_ANALYSIS_MODEL = "gemini-2.5-flash-lite"`, key check →
  `GOOGLE_GENERATIVE_AI_API_KEY` with AI Studio instructions.
- `app/api/analyze/route.ts` — EDIT: missing-key hint → Google free key.
- `.env.example` — EDIT: replace OpenAI block with
  `GOOGLE_GENERATIVE_AI_API_KEY` (free, AI Studio) comment.
- `AGENTS.md` §21 — EDIT: one table row (`OPENAI_API_KEY` →
  `GOOGLE_GENERATIVE_AI_API_KEY`, purpose "AI analysis (free tier)").
- `package.json` + lockfile — EDIT: add `@ai-sdk/google`, drop
  `@ai-sdk/openai` (done during planning).
- Schema, prompt, pipeline logic, routes, cron, UI — NO changes.

## Implementation requirements

1. Only the model object + constant + key name + user-facing hint strings
   change. Zod schema, batching, pending detection, save path, summaries,
   logging all untouched.
2. `generateText({ model: google(DEFAULT_ANALYSIS_MODEL), ... })` with all
   other options identical (temperature 0.2, maxRetries 0 + manual retry,
   maxOutputTokens 1500).
3. Missing-key message must tell the user exactly where the free key comes
   from: Google AI Studio (`https://aistudio.google.com/apikey`), no card.

## Security requirements

- `GOOGLE_GENERATIVE_AI_API_KEY` server-only (provider reads env
  server-side); bundle grep must show zero hits.
- Admin-secret and cron-secret behavior unchanged.

## Acceptance criteria

- [ ] `npm run typecheck` + `lint` + `build` pass; no `@ai-sdk/openai`
  imports remain (grep).
- [ ] Missing-key path returns 500 with the AI Studio hint.
- [ ] No secret strings in `.next/static` bundle grep.
- [ ] Analysis output contract unchanged (same Zod schema, same DB columns).

## Checks to run

- `npm run typecheck`, `npm run lint`, `npm run build`. Report outputs.

## Exact manual test steps expected after implementation

1. `.env.local`: replace `OPENAI_API_KEY=...` with
   `GOOGLE_GENERATIVE_AI_API_KEY=<free key from https://aistudio.google.com/apikey>`
   (no billing, no card). Restart dev server.
2. `POST /api/analyze` with `{"limit": 1}` → 1 analyzed, $0 spent.
   Verify row in `article_analyses` + card on `/`.
3. Full run `'{}'` → all pending analyzed; homepage updates.
