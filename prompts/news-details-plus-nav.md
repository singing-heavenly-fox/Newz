# Details-page depth + Nav + Logo refresh

## Goal
Improve the Newz UI foundation without touching pipeline layers (AGENTS.md §5):
1. Details page (`/news/[id]`) gets richer — all from already-stored fields (article + analysis + source). No new DB columns, no scraper/analysis changes.
2. Top nav becomes a polished sticky glass bar: scroll shadow, active-link state, mobile hamburger menu, better Clerk sign-in affordance.
3. Replace the plain "N" block logo with an aesthetic inline-SVG brand mark (gradient signal/prism + wordmark), wired into header, footer, favicon/metadata.

## Skills read
- `node_modules/next/dist/docs/index.md` + `01-app/02-guides/server-and-client-boundary.md`: App Router, Server Components default; only nav scroll-state, mobile menu, copy-link, share row are `use client`. Metadata icons via `app/icon.svg` / layout `metadata.icons`.
- Global `supabase` SKILL.md: Supabase is source of truth; UI displays stored data only; no service-role/admin keys in browser. New details sections derive from existing §7/§19 fields only.
- Global `clerk` router SKILL.md → `clerk-nextjs-patterns` (public-first `proxy.ts`, `SignedIn/SignedOut/SignInButton/UserButton`): nav keeps existing Clerk components, only restyled.

## Existing code inspected
- `app/news/[id]/page.tsx`: hero overlay, summary callout, sentiment + framing cards, framing-notes + loaded-terms, excerpt body, disclaimer, at-a-glance sidebar, related list.
- `components/site-header.tsx`: sticky glass bar, "N" block logo, Latest/How-it-works links, Clerk modal sign-in, disabled state when keys absent.
- `lib/types.ts`: `Article` (source, urls, title, excerpt, image, published_at, raw_text, read_minutes) + `ArticleAnalysis` (summary, sentiment_score/label, bias_label/scores, L/C/R, confidence, framing_notes, loaded_terms, disclaimer, model, embedding).
- `lib/mock/articles.ts`: 8 articles; `raw_text` currently 1 sentence (needs expanding to 3–4 paragraphs for a fuller body section).
- `app/layout.tsx`: Geist, metadata title/desc, conditional ClerkProvider; `public/` has only default Next SVGs (no brand favicon).

## Decisions / assumptions
1. No schema change: every new details block is derived from existing fields (counts, scores, dates, urls, notes). Mock `raw_text` expansion is display copy only, still a single string field.
2. New details sections: Key takeaways (3 bullets derived from summary + first framing note), By-the-numbers stat strip (sentiment, bias score, confidence, read time, word count computed from raw_text), expanded body (paragraph-split raw_text), Source & provenance card (source name, listing_url host, original/canonical URLs, published date, image credit line), How-we-analyzed (methodology + model + disclaimer, links to /#how-it-works), share row (copy-link client button with clipboard + fallback, open-original, prev/next story nav by date).
3. Sidebar keeps At-a-glance (adds bias-score + word-count rows) + Related; main column order: takeaways → numbers → summary → sentiment/framing → body → why-framing/terms → provenance → methodology → disclaimer.
4. Logo: new `components/logo.tsx` inline SVG — rounded-square gradient (indigo→violet→amber) with white signal bars forming an "N" pulse; wordmark "Newz" + tiny "AI-estimated" chip. `public/logo.svg` + `app/icon.svg` for favicon; layout `metadata.icons = { icon: "/logo.svg" }`.
5. Nav: scroll-shadow via tiny client hook, active state via `usePathname`, mobile menu with hamburger → dropdown panel (Latest, How it works, all-stories anchor), focus-visible rings, aria-expanded; Clerk buttons restyled (gradient sign-in, avatar button unchanged).
6. No new deps. No pipeline POSTs from UI. Dark-mode preserved. `prefers-reduced-motion` respected.

## Files likely to change
- `components/logo.tsx` — NEW brand SVG (sizes via prop).
- `public/logo.svg`, `app/icon.svg` — NEW favicon assets.
- `app/layout.tsx` — metadata icons + title template.
- `components/site-header.tsx` — rewrite: logo, scroll shadow, active links, mobile menu, Clerk restyle.
- `components/site-footer.tsx` — logo + brand line update.
- `components/share-row.tsx` — NEW client copy-link + original + prev/next.
- `components/key-takeaways.tsx`, `components/by-the-numbers.tsx`, `components/provenance-card.tsx`, `components/methodology-card.tsx` — NEW (server components, props-only).
- `app/news/[id]/page.tsx` — compose new sections, prev/next lookup, word-count calc.
- `lib/mock/articles.ts` — expand each `raw_text` to 3–4 paragraphs (same field, richer copy).
- `app/globals.css` — maybe 5–10 lines: logo gradient fallback, nav blur tweak only.

## Implementation requirements
1. Server by default; `use client` only: header scroll/menu, share-row copy button. No `useState/useEffect` in page.
2. Strict TS, no `any`; word count = `raw_text.split(/\s+/).length`; prev/next = date-sorted neighbors from `getArticles()`.
3. Copy-link uses `navigator.clipboard.writeText` with try/catch fallback + "Copied ✓" state; absolute URL built from `article.canonical_url` (no window-location guessing on server — pass URL as prop).
4. Logo SVG: `<svg viewBox="0 0 32 32">` gradient defs with unique id, 3 signal bars + orbit dot; `aria-hidden` when decorative, `<title>` when standalone; sizes 24/32/40.
5. Nav active: `usePathname()` — Latest active on `/`, story pages show none-active (or Latest dimmed). Mobile panel closes on link click (onClick handler).
6. Accessibility: nav landmark, aria-expanded/controls on hamburger, skip-link already via main; meters keep aria-labels; color contrast ≥ 4.5:1.
7. No secrets in client; no fetch to `/api/*` from UI; disclaimer stays on page.

## Security requirements
- Same as foundation: only `NEXT_PUBLIC_*` in browser; no service-role/Oxylabs/OpenAI/admin-secret imports.
- External original-URL links keep `target="_blank" rel="noreferrer"`.

## Visual interpretation
- Logo: 28px rounded-xl (radius 8) gradient `#4f46e5→#7c3aed→#d97706` at 135°, three white bars (heights 8/14/10, width 3.5, radius 2) rising left→right like a signal forming N, small amber dot top-right; wordmark Geist 800 tracking-tight, "Newz" ink + chip.
- Nav: 64px, `bg-white/85 dark:bg-slate-950/85` blur-xl, transparent top → `shadow-sm + border` after 8px scroll; links pill, active = indigo bg-soft + ink text; mobile panel rounded-2xl border shadow-lg, staggered fade-in (CSS).
- Details additions match existing cards: 16px radius, 1px slate borders, 20px padding, uppercase 12px section labels; stat strip 4–5 tiles with big numerals; takeaways with indigo check markers; provenance mono URLs truncated; methodology indigo-tint like summary.

## Acceptance criteria
- [ ] Details page shows takeaways, by-the-numbers, expanded multi-paragraph body, provenance, methodology, share row (copy works), prev/next links.
- [ ] Header shows new logo (header + footer + browser tab favicon), scroll shadow appears after scrolling, mobile 390px shows hamburger opening a panel, active states correct.
- [ ] No layout regression: 390/768/1280px no h-scroll; dark mode intact; keyboard tab order sane.
- [ ] `typecheck` + `lint` + `build` pass.

## Checks to run
- `npm run typecheck`, `npm run lint`, `npm run build` — report exact outputs.

## Exact manual test steps expected after implementation
1. `npm run dev` → `/` → new logo in header + tab icon; scroll down → header gains shadow.
2. Shrink to 390px → hamburger appears; open → Latest/How it works links work and panel closes.
3. Open any `/news/<id>` → takeaways (3), numbers strip, full body paragraphs, provenance URLs, methodology + model, disclaimer, share row.
4. Click copy-link → "Copied ✓" for 2s; paste → equals canonical URL. Click prev/next → navigates to neighbor story.
5. `npm run typecheck && npm run lint && npm run build` → paste outputs.
