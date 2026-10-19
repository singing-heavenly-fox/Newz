# Article format — global magazine template (all stories, incl. future scrapes)

## Goal
Last round made only the transit story deep. Every article — all 8 mocks now, and every story the scraper stores later — must render with the same Image 1 depth: drop-cap lede, floated pull-quote with attribution, Key-Points H2 + bullets, Story H2 + full paragraphs, floated captioned figure when available, beside the sticky AI panel.

## Skills read
- `node_modules/next/dist/docs/01-app/` (server components; `next/image` remotePatterns `**`).
- Global `supabase` SKILL.md: UI displays stored data only. No schema/API/pipeline change in this task — only mock copy (same fields) + presentation + a documented `raw_text` convention the future scraper should emit.

## Existing code inspected
- `components/article-body.tsx`: block parser (`## `, `> `, `- `, `[figure:]`) + magazine renderer — currently only the transit mock uses markers; the other 7 mocks are flat 3-paragraph texts rendering thin.
- `lib/mock/articles.ts` (all 302 lines): excerpts, summaries, framing notes, loaded terms per story — the honest source material for extensions and derived bullets.
- `app/news/[id]/page.tsx`: passes `rawText` only.

## Decisions / assumptions
1. Dual-path `ArticleBody({ rawText, summary, framingNotes })`:
   - Path A (structured): markers present → exact render (transit today; any future scraped story whose `raw_text` preserves subheads/quotes/lists/figures).
   - Path B (generic, the global default): flat text → compose depth from stored fields only: lede (para 1, drop cap) → pull-quote (first `"..."` 20–240 chars in text with attribution mined from `said X` / `X said` / `— X` / `according to X`; fallback = summary first sentence cited "AI neutral summary") → H2 "Key Points" + bullets (summary sentences + framing notes, ≤4) → H2 "The Story" + remaining paragraphs.
2. Nothing is invented: quotes come from the article text, bullets from summary/notes, fallback quote is labeled AI summary. No article-specific H2s in Path B.
3. Extend the other 7 mocks to 5–7 paragraph bodies consistent with their excerpts/summaries, each containing ≥1 natural `"..."` quote for the extractor. `read_minutes` unchanged.
4. Document the marker convention in code comments + here so the future Oxylabs parsing step (AGENTS.md §13 cleanup) can emit `## ` subheads, `> ` blockquotes, `- ` lists, `[figure:URL|caption]` and auto-upgrade scraped stories to Path A.

## Files changing
- `components/article-body.tsx` — dual-path rewrite + extractor (server-only, no deps).
- `app/news/[id]/page.tsx` — pass `summary` + `framingNotes`.
- `lib/mock/articles.ts` — expand 7 bodies (transit untouched).

## Acceptance criteria
- [ ] All 8 stories show lede, floated attributed pull-quote, Key Points bullets, full multi-paragraph Story section.
- [ ] Transit keeps exact structured render (bullets, figure, topical H2s).
- [ ] Poll story (no embedding) still hides Related/Compare; body still deep.
- [ ] No h-scroll 390/768/1280. `typecheck` + `lint` + `build` pass.

## Test steps
1. `npm run dev` → open all 8 `/news/<id>` pages → each has quote + Key Points + ≥5 paragraphs.
2. 390px → quote stacks, no overlap.
3. `npm run typecheck && npm run lint && npm run build` → paste outputs.
