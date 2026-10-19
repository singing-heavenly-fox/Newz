# Signature Loading Animation + Glitch-Free Route Transitions — Newz

## Goal

Replace the generic gray skeleton loaders with a signature "Newz signal"
loading experience, and eliminate the visual glitch when navigating between
home (`/`) and news details (`/news/[id]`) or on refresh. The current
`app/loading.tsx` and `app/news/[id]/loading.tsx` render plain `animate-pulse`
blocks whose layouts don't match the real pages, so every navigation flashes
blank boxes then jumps when content lands.

## Skills read

- `AGENTS.md` §§ 1, 5, 6, 21 (product scope, layers, tech stack, code
  standards). No DB/scraping/AI/env changes in this task.
- Next.js App Router conventions from `node_modules/next/dist/docs/`
  (verified present): `loading.tsx` suspense boundaries per route segment,
  `template.tsx` (re-mounts + re-animates on every navigation, unlike
  `layout.tsx` which persists) for enter transitions.
- Tailwind v4 (`@import "tailwindcss"` in `app/globals.css`): custom
  keyframes as plain CSS; `prefers-reduced-motion` guard already exists and
  must be respected (animations collapse to near-instant under it).

## Existing code inspected

- `app/loading.tsx`: home fallback — hero skeleton + 6 card skeletons.
  Shapes roughly match but styling is generic gray pulse.
- `app/news/[id]/loading.tsx`: details fallback — hero block + 3 stacked
  blocks + sidebar block. Does NOT match the real details layout (which has
  a 21/9 hero, meta row, story pane + 320px rail, share row), causing the
  jump on load.
- `components/ui/skeleton.tsx`: single `animate-pulse` gray block primitive.
- `components/logo.tsx`: static `LogoMark` SVG — three white signal bars +
  amber dot on an indigo→violet→amber gradient tile. This is the motif to
  animate (equalizer bars), keeping brand identity.
- `components/news-card.tsx`: card anatomy to mirror in skeleton form
  (16/9 media, source/date/read row, 2-line title, 2-line excerpt, badges +
  framing bar, "Read analysis" link row).
- `app/layout.tsx`: `SiteHeader` + `SiteFooter` persist across routes
  (good — loader only replaces page content, header never flashes).
- `app/globals.css`: theme vars, custom scrollbar, reduced-motion guard.

## Decisions / assumptions

1. **Signature element: animated "signal bars".** New `LoadingSignal`
   component (CSS-only, no JS, no new deps): the three logo bars bouncing
   like an equalizer inside the gradient tile + sweeping shimmer +
   "Tuning the signal…" caption. Same component reused on both loading
   screens for brand consistency.
2. **Layout-matched skeletons kill the glitch.** Each `loading.tsx` mirrors
   its real page's exact spacing/containers (same `max-w-7xl` wrappers,
   same aspect ratios, same grid), with the `LoadingSignal` as the hero of
   the fallback. When content lands, boxes fill in place instead of jumping.
3. **Enter transition via `template.tsx`.** New root `app/template.tsx`
   wrapping children in a keyed div with a short fade+rise animation
   (~180ms). Because templates re-mount per navigation (unlike layouts),
   every route change — home→article, article→home, refresh — gets the
   same smooth entrance. Pure CSS, respects reduced-motion.
4. **No layout shift in header/footer:** untouched; only page segment
   changes animate.
5. **No data/API/DB changes.** No new env vars, no new dependencies.

## Files likely to change

- `components/loading-signal.tsx` — NEW: `LoadingSignal` (animated tile +
  caption, `size` prop) + `LoadingScreen` (centered full-segment fallback
  combining signal + layout skeleton children).
- `app/globals.css` — EDIT: append `@keyframes` (`newz-eq1/2/3` bar bounce
  with staggered delays, `newz-sheen` gradient sweep, `newz-enter`
  fade+rise) + utility classes. Reduced-motion guard already covers them.
- `app/loading.tsx` — EDIT: signature loader + home-matched skeleton grid
  (hero block, filter-row chips skeleton, card skeletons mirroring
  `news-card.tsx` anatomy incl. badge-row + framing-bar rows).
- `app/news/[id]/loading.tsx` — EDIT: signature loader + details-matched
  skeleton (21/9 hero, meta row, story-pane + 320px rail proportions).
- `app/template.tsx` — NEW: enter-transition wrapper.
- `components/ui/skeleton.tsx` — EDIT only if needed (e.g. shimmer
  variant); prefer leaving untouched.

Explicitly OUT of scope: data layer, API routes, pipeline, env, deps.

## Implementation requirements

1. CSS-only animation (no framer-motion, no new packages). Bars animate via
   `transform: scaleY` with `transform-origin: bottom`, staggered
   `animation-delay` (0ms / 150ms / 300ms), ~900ms cycle, `ease-in-out
   infinite`.
2. Colors from the brand tile: indigo `#4f46e5` → violet `#7c3aed` →
   amber `#d97706`; page bg stays `bg-[#111a2e]`-family dark / light slate
   via existing theme (match surrounding page classes, don't invent a new
   palette).
3. Skeleton blocks keep `animate-pulse`-style shimmer but tinted to match
   cards (`bg-slate-800` dark) — no layout-affecting changes (same
   aspect ratios, same gaps, same padding as real components).
4. `template.tsx` must be a Client Component (`"use client"` is required
   for templates? No — template can be a Server Component; but keyed
   re-animation needs no client JS since CSS animations run on mount.
   Keep it a Server Component with a CSS `animation` class to avoid
   unnecessary client JS).
5. Accessible: loaders wrapped in `role="status"` + `aria-label="Loading…"`;
   caption text is real text (not aria-hidden).
6. TypeScript strict, no `any`; small components.

## Security requirements

- None beyond standard: no secrets, no data fetching in loaders (skeletons
  only — never trigger scrape/analyze from UI per §5).

## Visual interpretation

- **Home loading:** dark page, centered signal tile (~56px) with bouncing
  white bars + amber dot pulse, caption "Tuning the signal…" in slate-400;
  below, the familiar hero block + 6 card skeletons fade in with a
  staggered shimmer so the screen feels alive, not frozen.
- **Details loading:** same signal tile centered over a 21/9 hero
  skeleton, meta-row line skeletons, then story-pane column + 320px rail
  skeletons in the real `lg:grid-cols-[1fr_320px]` proportions.
- **Transitions:** 180ms `opacity 0→1` + `translateY(6px→0)` on every page
  mount — fast enough to feel instant, smooth enough to erase the flash.
- **Pixel expectations:** skeleton containers reuse the exact Tailwind
  classes of the real layouts (`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`,
  `aspect-[16/9]`, `gap-6`) so swap-in is pixel-stable.

## Acceptance criteria

- [ ] Navigating home→article, article→home, and hard refresh all show
  the branded signal loader (never a blank flash) then settle without
  visible layout jump.
- [ ] Both loading screens reuse `LoadingSignal`; no duplicated animation
  code.
- [ ] `prefers-reduced-motion` users get a static loader (existing guard
  covers new keyframes — verify by inspection).
- [ ] Header/footer never flicker during navigation (untouched segments).
- [ ] `npm run typecheck` + `lint` pass; `npm run build` passes (new
  template + css affect build).

## Checks to run

- `npm run typecheck`, `npm run lint`, `npm run build`. Report outputs.

## Exact manual test steps expected after implementation

1. `npm run dev` → open http://localhost:3000 → hard refresh (Ctrl+Shift+R)
   → branded signal loader appears, homepage settles with zero jump.
2. Click any card → details loader (signal + matched skeleton) → article
   settles without jump. Click browser Back → home loader → grid settles.
3. Throttle network (DevTools → Network → Slow 3G) and repeat 1–2 to
   actually see the loader states linger.
4. `npm run typecheck && npm run lint && npm run build` → paste outputs.
