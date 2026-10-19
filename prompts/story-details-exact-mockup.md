# Story details — exact Image 1 parity (follow-up fix)

## Goal
Close the depth gap on `/news/[id]`: the current page shows a thin body (excerpt + 3 paragraphs) while Image 1 shows a full magazine article (lede, pull-quote with attribution, "Funding Breakdown and Timeline" + bullets, "Public Response and Next Steps" with floated inline photo + caption, "Addressing Historically Underserved Communities", closing paragraphs) beside a sticky AI-analysis panel. Match Image 1 as closely as stored data allows.

## Skills read
- `node_modules/next/dist/docs/01-app/` (Server Components; `next/image` remotePatterns already `**` so Unsplash IDs are fine).
- Global `supabase` SKILL.md: UI displays stored data only. This fix changes only mock copy (same single-string `raw_text` field — still trivially swappable to Supabase) plus presentation. No schema, API, or pipeline change.

## Existing code inspected
- `app/news/[id]/page.tsx`, `components/analysis-panel.tsx`, `sentiment-gauge.tsx`, `article-actions.tsx`, `framing-badge.tsx`, `sentiment-badge.tsx`, `key-takeaways.tsx` (helpers reused), `lib/mock/articles.ts` (transit `raw_text` = 3 short paragraphs — the root cause of thin coverage).

## Decisions / assumptions
1. `raw_text` stays a single string (no schema change). Add a tiny block convention parsed at render: `## ` → section heading, `> ` → pull-quote (+ optional `— attribution` line), `- ` runs → bullet list, `[figure:URL|caption]` → floated inline figure, blank-line separation → paragraphs. Plain-paragraph articles (other 7 mocks) render unchanged.
2. Expand ONLY the transit mock's `raw_text` to the full Image 1 copy (~450 words, transcribed from the mockup). Display copy only, same field.
3. Inline figure uses curl-verified Unsplash ID `photo-1529107386315-e1a2ed48a620` (HTTP 200) with the mockup's caption.
4. Badge text parity with mockups: `FramingBadge` → `AI-center` (no middot); `SentimentBadge` gains sign prefix (`+ positive`, `− negative`, plain `neutral`) — matches both Image 1 panel and Image 2 cards.
5. Panel "90% alignment" is mockup fiction; show derived dominant-framing share (`{max}% alignment`) instead of inventing data. Confidence stays from `analysis.confidence`.
6. Compare Coverage rows: source name left + framing chip right, with decorative sparkle/connector (aria-hidden) echoing Image 1.

## Files changing
- `components/article-body.tsx` — NEW block parser + renderer (server component).
- `lib/mock/articles.ts` — expanded transit `raw_text` only.
- `app/news/[id]/page.tsx` — compose `ArticleBody`; pull-quote floats right on `lg`.
- `components/analysis-panel.tsx` — compare-coverage sparkle styling.
- `components/framing-badge.tsx`, `components/sentiment-badge.tsx` — text parity.

## Acceptance criteria
- [ ] Transit story shows lede, floated pull-quote with Mayor's Office attribution, Funding H2 + 4 bullets, Public-Response H2 with floated captioned photo, Underserved-Communities H2, closing paragraphs.
- [ ] Panel matches Image 1: Overview gauge, framing bar + alignment, bias gradient + L/C/R, takeaways, compare rows with sparkles.
- [ ] Other 7 stories render exactly as before (plain paragraphs). No h-scroll at 390/768/1280. `typecheck` + `lint` + `build` pass.

## Test steps
1. `npm run dev` → `/news/city-council-approves-green-transit-plan` at 1280px → compare against Image 1 section by section.
2. Same URL at 390px → quote/figure stack, no overlap.
3. Open 2 other stories → unchanged plain body rendering.
4. `npm run typecheck && npm run lint && npm run build` → paste outputs.
