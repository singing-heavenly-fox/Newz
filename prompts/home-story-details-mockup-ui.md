# Home + Story Details UI — mockup parity (dark)

## Goal
Rework the home page (`/`) and story details page (`/news/[id]`) to visually match the two user mockups, without touching pipeline layers (AGENTS.md §5):
1. Home: dark feed with search + pill filters + news cards showing sentiment / framing / L-C-R bar / confidence / "Read analysis →" (Image 2 left).
2. Story details: desktop 2-column layout from Image 1 (article left, sticky AI-analysis panel right) that collapses to the stacked mobile layout in Image 2 right. Update the existing details page styling/structure to this look.
3. Keep all data from stored fields only (`Article` + `ArticleAnalysis` + `Source`). No schema change, no scraper/analysis/API change, no new DB columns.

## Skills read
- `node_modules/next/dist/docs/index.md` + `01-app/` (App Router, Server Components default; only search input, pill filters, copy/share, mobile menu stay `use client`). No `node_modules/next/dist/docs/` API change needed — routing and server/client boundaries already correct.
- Global `supabase` SKILL.md: Supabase is source of truth; UI displays stored data only; no service-role key in browser; no `.eq('foreignTable.column')` filtering. This task only reads via existing `lib/data/articles.ts` shim (mock today, Supabase tomorrow) — no query change.
- Global `clerk` router → `clerk-nextjs-patterns`: public-first `proxy.ts`, `SignedIn/SignedOut/SignInButton/UserButton` stay as-is in `site-header.tsx`; only restyle to match mockup pill (dark outline + "8 stories analyzed" chip + Sign in button).
- Existing project patterns for Tailwind v4 (`app/globals.css` `@import "tailwindcss"`), shadcn `components/ui/*`, `Lib/types.ts` shapes (§7/§19).

No Oxylabs or AI-SDK skill needed — no scraping/analysis work in this task.

## Existing code inspected
- `app/page.tsx`: light hero ("News with the spin made visible") + stats + `<NewsGrid>` + how-it-works. To be restyled into dark feed (hero shrinks or is removed; search + pills become the top).
- `components/news-grid.tsx`: client search input + 3 `<select>` dropdowns + count + grid. To become search field + pill rows (Latest | All Sentiment | All Framing | Newest) per mockup; filtering logic stays.
- `components/news-card.tsx`: light `Card` with image, source/date/read-time, title, excerpt, `SentimentBadge` + `FramingBadge` + `ConfidenceMeter` + `FramingBar`, "Read analysis →". To become dark card (`#121826`-ish, 16px radius, 1px slate-800 border) with same data, mockup badge/bar styling.
- `app/news/[id]/page.tsx`: hero-overlay image + `KeyTakeaways` + `ByTheNumbers` + summary + sentiment/framing cards + body + notes + `ProvenanceCard` + `MethodologyCard` + `ShareRow` + at-a-glance sidebar + `RelatedArticles`. Structure is right; visual system must move to Image 1: plain top image with caption (no overlay), left article column with pull-quote / section heads / bullets, right sticky `AI ANALYSIS` panel (Overview gauge + Framing bar + Bias/Lean gradient + Key Takeaways + Compare Coverage).
- `components/site-header.tsx`: sticky glass bar, `Logo`, Latest/How-it-works pills, "8 stories analyzed" chip, Clerk sign-in, mobile hamburger. Already close to mockup desktop nav — keep, tune to dark.
- `components/logo.tsx`, `site-footer.tsx`, `framing-bar.tsx`, `framing-badge.tsx`, `sentiment-badge.tsx`, `confidence-meter.tsx`, `key-takeaways.tsx`, `provenance-card.tsx`, `related-articles.tsx`, `share-row.tsx`: reuse; add small variants (gauge arc, gradient bias bar) rather than rewriting.
- `lib/types.ts`: `Article` + `ArticleAnalysis` (§7/§19 shapes) — unchanged.
- `lib/data/articles.ts` + `lib/mock/articles.ts`: 8 mock articles; transit article is the mockup reference. No data change.
- `app/globals.css`: light `#faf9f7` / dark `#0b0f1a` tokens. Mockups are dark-first — page backgrounds go near `#0a0e1a` with radial indigo/amber glows.
- `app/layout.tsx`: Geist + conditional `ClerkProvider` + `SiteHeader`/`SiteFooter`. Unchanged except maybe `body` bg class.

## Decisions / assumptions
1. Dark-first to match mockups; light mode kept working via existing `dark:` variants but mockup fidelity is judged in dark mode.
2. Desktop home layout is not shown in mockups (only mobile HOME). Assumption: same feed pattern, responsive grid 1 → 2 → 3 columns, search on top, pill filter row horizontally scrollable on mobile, max-w-7xl container like today.
3. Home hero: shrink to a slim heading row (or drop the big "spin made visible" hero) because the mockup HOME goes straight to search + pills. Keep the `how-it-works` anchor section at the bottom for the nav link.
4. "Latest / All Sentiment / All Framing / Newest" pills map 1:1 to existing `NewsGrid` state (`sort`, `sentiment`, `framing` + `query`). "Latest" pill = sort newest (active state); sentiment/framing pills open the same option lists (dropdown/popover or cycle). No new filter semantics.
5. Details body sections in Image 1 ("Funding Breakdown and Timeline", bullets, "Public Response and Next Steps" + inline photo, pull-quote) are that article's copy, not new components. Generic implementation: excerpt as lede, `summary` as neutral-summary callout, pull-quote styled from first `framing_notes` or summary sentence, body = `splitParagraphs(raw_text)`, loaded-terms + disclaimer unchanged. No hardcoded transit copy; any article renders the same skeleton.
6. "Compare Coverage" row (Reuters/BBC/NPR with AI-center/AI-left chips) maps to existing `RelatedArticles` data (same list, new row styling). No new endpoint; reuse `getRelatedArticles(article.id, 5)`.
7. Sentiment gauge (semicircle 82%) and Bias/Lean gradient bar are pure CSS/SVG from existing `sentiment_score`, `confidence`, L/C/R numbers. No new fields.
8. Share + Bookmark icons in details header reuse existing `ShareRow` copy-link + original-link behavior; bookmark can be visual-only (no DB) or omitted if it implies persistence.
9. No new deps. Strict TS, no `any`. Server by default; `use client` only for search/filters/menu/share.

## Files likely to change
- `app/page.tsx` — dark feed composition (slim header, search + pills via `NewsGrid`, cards grid, how-it-works footer block).
- `components/news-grid.tsx` — search field + pill filter UI (same state/logic, new presentation, horizontally scrollable pills, result count).
- `components/news-card.tsx` — dark card styling per mockup (image, meta row, title, excerpt clamp, badges + confidence row, gradient L-C-R bar, legend, "Read analysis →").
- `app/news/[id]/page.tsx` — recompose to Image 1: back-link + eyebrow + title + byline/share row, captioned hero image, 2-col grid (article | sticky analysis panel), pull-quote block, section typography, bullets, inline-figure support.
- `components/analysis-panel.tsx` — NEW (or extend sidebar): AI ANALYSIS card with Overview (sentiment gauge + confidence, framing bar + alignment, bias/lean gradient), Key Takeaways, Compare Coverage.
- `components/sentiment-gauge.tsx` — NEW small SVG arc (or extend `confidence-meter.tsx`).
- `components/bias-gradient-bar.tsx` — NEW (or extend `framing-bar.tsx` with gradient variant showing L/C/R stops + labels).
- `components/site-header.tsx` — minor tune (dark pill, search affordance stays in feed not header on desktop; keep mobile menu).
- `app/globals.css` — dark bg `#0a0e1a`, radial glows, card/quote/gradient utilities (10–30 lines), `prefers-reduced-motion` kept.
- `components/share-row.tsx`, `related-articles.tsx`, `key-takeaways.tsx`, `provenance-card.tsx` — light restyle only, same props/data.

Explicitly NOT changing: `lib/types.ts`, `lib/data/*`, `lib/mock/*`, `supabase/*`, any `/api/*`, pipeline/lib code, `.env*`.

## Implementation requirements
1. Server by default; `use client` only: `news-grid` (query/pills), header scroll/menu, share copy button, gauge/bar if animated.
2. Strict TS, explicit props, no `any`; reuse `formatDate`, `normalizeFraming`, `clamp01`, `wordCount`, `splitParagraphs`.
3. UI displays stored data only; no fetch to `/api/*` from components; no secrets imported; external links keep `target="_blank" rel="noreferrer"`.
4. Accessibility: labels on search/filters, `aria-label` on gauge/bars (keep existing `role="img"` strings), focus-visible rings, contrast ≥ 4.5:1, keyboard-openable pill dropdowns, `prefers-reduced-motion` respected.
5. Images keep `next/image` with `alt`; hero uses stored `image_url` + caption line (title-based credit, not invented photographer).
6. Keep `generateStaticParams`, prev/next lookup, `notFound` guards, at-a-glance numbers, disclaimer, and Related section behavior.

## Security requirements
- Only `NEXT_PUBLIC_*` in browser; no service-role / Oxylabs / OpenAI / admin-secret imports in UI.
- No pipeline triggers from UI. No new env vars.

## Visual interpretation (from the 2 images)
- Theme: near-black navy `#0a0e1a` page, cards `#111a2e`/`#131c33` with 1px `slate-800` borders, 16px radius; subtle radial indigo top-left + amber top-right glows.
- Header: 64px sticky blur; `Logo` + `AI-ESTIMATED` violet chip; desktop pills (Latest active = violet bg), "8 stories analyzed" dim chip with green dot, "Sign in" outline pill. Mobile: logo + search icon + hamburger.
- Home search: rounded-xl dark input, magnifier icon, placeholder "Search headlines, topics…".
- Filter pills: rounded-full, 13px semibold; active (Latest) = violet `#7c3aed` bg white text; inactive = dark outline `slate-800` bg, slate-300 text. Row scrolls horizontally on mobile.
- Card: image 16/9 rounded-t; meta row 11px uppercase tracking-wide slate-400 (source in indigo-300); title 17–18px extrabold white 2-line clamp; excerpt 14px slate-300 2-line clamp; badge row: sentiment pill (green tint for positive) + framing pill (violet tint) + confidence % right-aligned; L-C-R bar = thin gradient (sky→violet→amber) with dot legend `L 25% · C 55% · R 20%`; footer link "Read analysis →" indigo-400 14px semibold.
- Details desktop (Image 1): max-w-7xl, "← Back to Stories" 13px slate-400; eyebrow "Article" slate-400; title 32–36px extrabold white tight; byline row (avatar dot + REUTERS · date · 6 MIN + Share/Bookmark right); hero image 21/9 rounded-xl + 12px slate-500 caption; body 15–16px/1.75 slate-200 with H2 18px white bold ("Funding Breakdown…", "Public Response…", "Addressing Historically…"); pull-quote: left violet border + italic 18px with gradient tint bg; bullets with violet markers; small inline figure floated right with caption.
- Analysis panel (right, ~320px, sticky top-20): rounded-2xl dark card, header pill "✦ AI ANALYSIS" violet; sections: Overview → Sentiment row (green "+ positive" pill + semicircle gauge + "82% confidence"), Framing row ("AI-center" pill + violet progress bar + "90% alignment"), Bias/Lean gradient bar with `L 28% · C 55% · R 20%` labels; Key Takeaways bullets 13px; Compare Coverage rows (source left, chip right, faint connector line + sparkle).
- Mobile details (Image 2 right): same blocks stacked; panel becomes full-width card under hero with 2-col mini-grid (Overview | Key Takeaways) then Bias/Lean; body follows.

## Typography / spacing / responsiveness
- Font: Geist (existing); title tracking-tight; meta uppercase 11–12px; body 15–16px leading 7–8.
- Spacing: page px-4 → sm:6 → lg:8; home grid gap-6; details grid `lg:grid-cols-[1fr_320px]` gap-6; panel `p-5`, sections `space-y-5`.
- Breakpoints: 390px single column, pills scroll, panel stacked; 768px 2-col cards; 1280px 3-col cards + details sidebar sticky. No horizontal scroll at any width; dark mode is the reference.

## Acceptance criteria
- [ ] `/` matches HOME mockup in dark: header, search, pill filters (working), cards with badges/bar/confidence/"Read analysis →", responsive 1/2/3 col.
- [ ] `/news/<id>` matches Image 1 on desktop (article + sticky analysis panel with gauge, framing bar, bias gradient, takeaways, compare rows) and Image 2 right on mobile (stacked, no overlap/h-scroll).
- [ ] Filters/search/sort still work; empty state intact; how-it-works anchor intact; sign-in intact.
- [ ] No data-layer change; stored-data-only rendering; disclaimer + AI-estimated labels present.
- [ ] `typecheck` + `lint` + `build` pass.

## Checks to run
- `npm run typecheck`, `npm run lint`, `npm run build` — report exact outputs (per AGENTS.md §22).

## Exact manual test steps expected after implementation
1. `npm run dev` → `/` (dark) → search "transit" filters the grid; pill filters narrow results; count updates; Clear resets.
2. Shrink to 390px → pills scroll horizontally, cards single column, no h-scroll; open mobile menu → links work.
3. Open `/news/city-council-approves-green-transit-plan` at 1280px → back link, title, byline, hero + caption, pull-quote, section heads, bullets, sticky AI panel (gauge, framing, bias bar, takeaways, compare rows).
4. Same URL at 390px → panel stacks under hero, body readable, no overlap.
5. Toggle sentiment/framing pills on home → card badges/bars reflect stored L/C/R + confidence; "Read analysis →" navigates to details.
6. `npm run typecheck && npm run lint && npm run build` → paste outputs.
