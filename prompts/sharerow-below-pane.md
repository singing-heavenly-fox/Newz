# ShareRow below the story scroll pane

## Goal
The Copy-link / Read-original / Newer-Older nav block (`ShareRow`) currently lives inside the independently scrolling story pane, so it scrolls away with the story. Keep it in the left column but outside the pane, just below it, in normal page flow.

## Skills read
- `node_modules/next/dist/docs/01-app/` (server components; markup-only move).
- Global `supabase` SKILL.md: display-only, no data impact.

## Existing code inspected
- `app/news/[id]/page.tsx`: left grid cell is `<article story-pane>` containing summary, body, notes, provenance, methodology, then `<ShareRow>` last.

## Decisions
1. Left cell becomes a plain `<div className="min-w-0 space-y-6">` holding the scrollable `<article story-pane>` (summary → methodology) followed by `<ShareRow>` below it.
2. No prop/behavior change to `ShareRow`; no visual restyle; keyboard and mobile behavior unchanged.

## Files changing
- `app/news/[id]/page.tsx` only.

## Acceptance criteria
- [ ] Share/nav block renders below (outside) the scroll pane, same left column, above nothing else.
- [ ] Story pane still scrolls independently on desktop; page flows normally on mobile.
- [ ] `typecheck` + `lint` + `build` pass.

## Test steps
1. `npm run dev` → any story at 1280px → scroll story to bottom → Copy-link / Newer-Older block sits below the pane in page flow.
2. 390px → order unchanged: story, share block, then sidebar panel content.
3. `npm run typecheck && npm run lint && npm run build` → paste outputs.
