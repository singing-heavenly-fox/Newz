# Story column — independent scroll pane (desktop)

## Goal
Give the story section (left-hand article column on `/news/[id]`) its own scrollbar and breathing room, so readers can scroll the story independently while the sticky AI-analysis panel stays put. Mobile keeps normal page scroll (nested panes are bad touch UX).

## Skills read
- `node_modules/next/dist/docs/01-app/` (server component; scroll pane is pure CSS — no client JS needed).
- Global `supabase` SKILL.md: display-only change, no data/layer impact.

## Existing code inspected
- `app/news/[id]/page.tsx`: `grid lg:grid-cols-[1fr_320px]` with left `<article className="min-w-0 space-y-6">` and sticky `<aside>`.
- `app/globals.css`: global thin-scrollbar baseline + `prefers-reduced-motion` guard.

## Decisions / assumptions
1. Desktop-only (`lg:`): left column gets `max-h-[calc(100vh-8rem)] overflow-y-auto` + gutter padding; below `lg` it flows normally with page scroll.
2. Keyboard access: `tabIndex={0}` + `role="region"` + `aria-label="Story"` on the pane so keyboard users can focus and scroll it; focus-visible ring.
3. Custom slim scrollbar (webkit + Firefox `scrollbar-width`) in `globals.css`, dark-theme slate tones; `prefers-reduced-motion` untouched (scrollbars aren't motion).
4. "Space": story body card padding `sm:p-6` → `sm:p-8`, pane right gutter `pr` so text never kisses the scrollbar.
5. No new deps, no client components, strict TS (class-only change).

## Files changing
- `app/news/[id]/page.tsx` — pane classes + a11y attrs + card padding.
- `app/globals.css` — `.story-pane` scrollbar styling.

## Acceptance criteria
- [ ] ≥1024px: story column scrolls internally with a slim styled scrollbar; AI panel stays visible; no page-level jump.
- [ ] <1024px: single normal page scroll, no nested scroller.
- [ ] Tab reaches the pane (visible focus), arrow/space scroll it; no h-scroll at 390/768/1280.
- [ ] `typecheck` + `lint` + `build` pass.

## Test steps
1. `npm run dev` → any `/news/<id>` at 1280px → scroll inside story card → panel fixed; thin scrollbar visible on hover/focus.
2. Tab to the story region → focus ring → ↓/Space scrolls story only.
3. 390px → one page scrollbar, everything flows.
4. `npm run typecheck && npm run lint && npm run build` → paste outputs.
