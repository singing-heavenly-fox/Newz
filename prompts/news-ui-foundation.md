# Newz UI Foundation — Home + News Details (visually attractive, interactive)

## Goal
Build the visually attractive, interactive, responsive UI shell for Newz per AGENTS.md §1, §5, §19:
- Home page (`/`) with news cards showing title, source, image, published date, sentiment label, AI-estimated framing label, left/center/right percentages, confidence when available.
- News details page (`/news/[id]`) with full analysis: summary, sentiment, framing percentages, confidence, framing notes, loaded terms, disclaimer, plus Related Articles section placeholder (up to 5, hidden when no embedding — §20 ready).
- Site header/footer + Clerk auth UI placeholder, empty/loading states, client-side search + sentiment/framing filters (UI-only, no pipeline mutation).
- UI displays stored data only (§5). No scraping, analysis, scheduler, OpenAI, Oxylabs, or service-role calls from browser code.

This is UI foundation only. Supabase reads, Clerk keys, AI pipeline, scraping, pgvector wiring come later and must be trivial to plug in.

## Skills read
- `node_modules/next/dist/docs/index.md` + `01-app/02-guides/server-and-client-boundary.md`: App Router, Server Components by default, `use client` only for interactive UI (search, filters, bars), server/client boundary preserved.
- `.agents/skills/supabase` → global `supabase` SKILL.md (Supabase source of truth, RLS, never expose service-role key, anon key only in client): UI must only use `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` when live data lands; no service-role import in components.
- `.agents/skills/clerk` → global `clerk` router SKILL.md (routes to `clerk-setup` / `clerk-nextjs-patterns` for Next.js auth UI): header uses Clerk components only; no custom auth logic.
- Project constraint: local `.agents/skills/` does not exist in repo (checked); used global skill equivalents above. `ai-sdk` / `oxylabs-web-scraper` skills intentionally not needed for pure UI — no model or scraper calls from UI.

## Existing code inspected
- `app/page.tsx`: stub `Home` returning `<div>Home</div>` — will be replaced.
- `app/layout.tsx`: Geist fonts, `h-full antialiased`, `min-h-full flex flex-col` body — keep, extend metadata to "Newz — AI-estimated news sentiment & framing".
- `app/globals.css`: Tailwind v4 (`@import "tailwindcss"`, `@theme inline`) + naive light/dark `:root` vars — will be extended with design tokens, no breaking change.
- `next.config.ts`: empty NextConfig — add `images.remotePatterns` allowlist only (needed for article images).
- `package.json`: Next 16.3.4, React 19.2.8, Tailwind v4, no Clerk/Supabase/shadcn deps yet — add only what UI needs (`@clerk/nextjs`, `@supabase/ssr` types optional, `clsx`/`tailwind-merge` if needed; prefer existing patterns, no separate backend).
- No `lib/`, `components/`, `supabase/`, `prompts/` logic yet; `prompts/` directory exists.

## Decisions / assumptions
1. Mock data lives in TypeScript (`lib/mock/articles.ts`), NOT local JSON files (§6 forbids local JSON app storage). Types mirror AGENTS.md §7 exactly (`Article`, `ArticleAnalysis` with sentiment_score −1..1, bias_score = (right−left)/100, left/center/right 0–100 sum 100, bias_label left/center/right/mixed/unclear, confidence 0–1, framing_notes, loaded_terms, disclaimer, model). Clearly marked `// TODO: replace with Supabase query`.
2. Clerk wiring is defensive: install `@clerk/nextjs`, add `middleware.ts` + `ClerkProvider` in layout, header uses `<SignedIn>/<SignedOut>/<SignInButton>/<UserButton>`. If keys are absent, app still builds and shows disabled auth state with console warning — no crash.
3. shadcn/ui: repo has no `components.json`; do NOT run full shadcn init. Hand-create minimal `components/ui/*` (badge, card, separator, skeleton) in shadcn style with `cn()` util so future shadcn CLI adoption is clean.
4. No real Supabase connection in this task. Data-fetch layer is `lib/data/articles.ts` with `getArticles()` / `getArticleById()` reading mock now, shaped so swapping to Supabase anon-client is a 5-line change.
5. Related Articles section renders from mock similarity now (same-source + closest framing), hidden when `embedding` is null — ready for `getRelatedArticles(articleId, embedding)` (§20) later.
6. Interactivity is client-only filtering (search box, sentiment select, framing select, sort newest/oldest) — no URL mutation of pipeline, no POST calls.

## Files likely to change
- `app/layout.tsx` — title/desc, ClerkProvider, header/footer shell, font smoothing.
- `app/page.tsx` — Server Component fetching list, renders hero + filterable grid.
- `app/news/[id]/page.tsx` — NEW Server Component: hero image, meta, summary, sentiment + framing panels, framing-notes, loaded-terms, disclaimer, related articles; `generateStaticParams` from mock, `notFound()` on miss.
- `app/loading.tsx`, `app/news/[id]/loading.tsx`, `app/not-found.tsx` — NEW skeletons / 404.
- `components/site-header.tsx`, `components/site-footer.tsx` — NEW (Clerk buttons in header, `use client` only where needed).
- `components/news-card.tsx`, `components/news-grid.tsx` (client filter), `components/sentiment-badge.tsx`, `components/framing-badge.tsx`, `components/framing-bar.tsx`, `components/confidence-meter.tsx`, `components/related-articles.tsx`, `components/empty-state.tsx` — NEW.
- `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/skeleton.tsx`, `components/ui/separator.tsx` — NEW minimal shadcn-style.
- `lib/types.ts` — NEW Article + Analysis types per §7/§19.
- `lib/mock/articles.ts` — NEW 8 diverse mock articles (positive/neutral/negative × left/center/right/mixed/unclear, confidences, loaded terms, disclaimer "AI-estimated...").
- `lib/data/articles.ts` — NEW data-access shim (`getArticles`, `getArticleById`, `getRelatedArticles` placeholder).
- `lib/utils.ts` — NEW `cn()`, formatters (date, percent).
- `app/globals.css` — extend tokens, line-clamp fallback, subtle grain/gradient utilities, scrollbar styling.
- `next.config.ts` — add `images.remotePatterns: [{protocol:'https',hostname:'**'}]` (tighten later).
- `middleware.ts` — NEW Clerk middleware (public `/`, `/news/*`, `/sign-in*`, `/sign-up*`).
- `package.json` — add `@clerk/nextjs` (and `clsx`, `tailwind-merge` if used).

## Implementation requirements
1. Server/Client boundaries: pages + data fetch are Server Components; only `news-grid.tsx` (search/filter), badges with hover tooltips, and meters are `use client`. No `useState/useEffect` in pages.
2. TypeScript strict, no `any`; Zod NOT needed for UI (validation lives in AI pipeline §19) — use explicit types + runtime sum-to-100 guard for bars.
3. Home: sticky glass header (logo mark "N", nav: Latest, About anchor, GitHub link placeholder; search input on desktop, auth buttons), hero band (headline, subcopy "AI-estimated sentiment & framing — not objective truth", stats: articles/sources/avg-confidence computed from data, CTA scroll to grid), filter toolbar (search, sentiment select, framing select, sort, result count, clear), responsive grid 1/2/3 cols, cards with 16/9 image (`next/image`), source + date row, 2-line title clamp, excerpt, sentiment + framing badges, L/C/R stacked bar with legend, confidence meter, "Read analysis →" link with hover lift. Empty state when filter yields 0.
4. Details: breadcrumb Back, full-bleed hero image with gradient overlay + title/source/date/read-time, 2-col on lg (main: summary callout, sentiment card with score bar −1..1, framing card with L/C/R bars + label + confidence + "AI-estimated" tooltip, framing notes list, loaded terms chips, disclaimer box, article body excerpt; sidebar: at-a-glance scorecard, source card, related articles stack). Related hidden when no embedding.
5. Visual design (see Visual interpretation below). Interactive: card hover lift + image zoom, filter transitions, animated bars/meters on mount (CSS only, respect `prefers-reduced-motion`), focus-visible rings, keyboard-accessible selects/inputs.
6. Accessibility: semantic landmarks, alt text, label elements, contrast ≥ 4.5:1 for text, aria-labels on meters/bars.
7. No secrets in client: only `NEXT_PUBLIC_*` referenced; no `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `BIASLY_ADMIN_SECRET`, Oxylabs creds. No fetch to `/api/scrape` or `/api/analyze` from UI.

## Security requirements
- Never import service-role client or admin secret into `app/` or `components/`.
- `middleware.ts` uses Clerk only; no pipeline logic.
- `next/image` remote patterns only; no `dangerouslySetInnerHTML` (mock body rendered as paragraphs).
- Disclaimer always rendered on details page: framing is AI-estimated, not objective truth.

## Visual interpretation
Editorial-modern news analyszer: light warm-paper background (#faf9f7) with ink text (#101828), accent indigo (#4f46e5) + sentiment hues (positive emerald #059669, neutral slate #64748b, negative rose #e11d48) and framing hues (left sky #0284c7, center violet #7c3aed, right amber #d97706). Dark mode via `prefers-color-scheme` flipping to #0b0f1a bg. Typography: Geist sans, tight display headlines (text-3xl→5xl, tracking-tight), 14px meta uppercase tracking-wide, 15–16px body leading-7. Spacing: max-w-7xl container px-4→8, 24px card gaps, 16px card padding, 8px badge radius-full. Cards: white, 1px slate-200 border, rounded-2xl, shadow-sm → shadow-lg + -translate-y-1 on hover. Framing bar: 3-segment rounded-full h-2 with legend dots. Hero: gradient mesh (indigo→violet→amber at 8% opacity) + subtle grid pattern. Responsive: 1 col <640px, 2 cols 640–1023px, 3 cols ≥1024px; details sidebar collapses below lg; header search collapses to icon on mobile (filter toolbar wraps).

## Acceptance criteria
- [ ] `/` renders header, hero with live stats, filters, ≥8 mock cards each showing title, source, image, date, sentiment label, framing label, L/C/R %, confidence.
- [ ] Typing in search / changing sentiment / framing / sort filters grid instantly without reload; clear resets; count updates; empty filter shows empty-state.
- [ ] `/news/[id]` for each mock id shows summary, sentiment score+label, bias label + L/C/R %, confidence, framing notes, loaded terms, disclaimer, related (≤5, hidden if no embedding); unknown id → not-found.
- [ ] Mobile 390px, tablet 768px, desktop 1280px all render without horizontal scroll; images have alt; keyboard tab order sane.
- [ ] No browser import of service-role/admin/Oxylabs/OpenAI; `npm run typecheck` + `lint` pass; `npm run build` passes.
- [ ] Layers respected: UI makes zero POST to pipeline routes; data shim is the single swap point for Supabase.

## Checks to run
- `npm run typecheck` (tsc --noEmit)
- `npm run lint` (eslint)
- `npm run build` (routes + server modules changed)
Report exact outputs; do not claim pass without running.

## Exact manual test steps expected after implementation
1. `npm run dev` → open http://localhost:3000 → header loads, hero stats show 8 articles, grid shows 8 cards with badges/bars.
2. Type "climate" in search → count drops, cards filter; clear → 8 return. Set Sentiment=Positive → only positives; Framing=Left → only left; Sort=Oldest → order flips.
3. Click first card "Read analysis →" → lands `/news/<id>` → summary, sentiment bar, L/C/R bars sum to 100, confidence meter, notes, chips, disclaimer, related 5 cards visible. Open DevTools → no `service_role` / `BIASLY` / `OPENAI` strings in page source.
4. Resize to 390×844 → single column, no h-scroll; 1280×800 → 3 columns + details sidebar side-by-side.
5. With no `.env` Clerk keys: pages still render; auth area shows "Sign in" disabled state + terminal warning (no crash). (Full Clerk sign-in test deferred until keys added.)
6. `npm run typecheck && npm run lint && npm run build` → paste outputs.
