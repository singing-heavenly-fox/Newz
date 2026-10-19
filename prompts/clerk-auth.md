# Clerk authentication — complete the wiring

## Goal
Finish Clerk auth for Newz (public news site): sign-in / sign-up works via the existing header controls, session state flows through `proxy.ts` + `ClerkProvider`, and key setup is documented. No route protection changes (site is public-first; only auth UI).

## Skills read
- `clerk` (router): @clerk/nextjs v7 = current SDK → `ClerkProvider` inside `<body>`, `<SignedIn>/<SignedOut>` valid, `proxy.ts` for Next 16.
- `clerk-setup`: existing-Clerk-project branch — NEVER run `clerk init` (would risk replacing keys); add only missing pieces from the Next.js quickstart; Node 24 ✓ (needs ≥20.9); no `components.json` → skip `@clerk/ui` shadcn theme step.
- `clerk-nextjs-patterns`: public-first middleware (already in `proxy.ts`); server `await auth()` vs client hooks (no server auth needed — site is public); never expose `CLERK_SECRET_KEY`.

## Existing code inspected
- `app/layout.tsx`: conditional `ClerkProvider` (renders without it when key absent — preview mode), metadata, Geist. Correct for current SDK.
- `components/site-header.tsx`: `SignedOut` + `SignInButton mode="modal"` gradient button, `SignedIn` + `UserButton`, disabled fallback when keys absent, mobile menu. Keep as-is.
- `proxy.ts`: public-first (passes through without keys), `auth.protect()` only for `/dashboard(.*)` + `/settings(.*)` (routes don't exist — harmless), matcher includes `/(api|trpc)(.*)`. Correct; no change needed.
- `package.json`: `@clerk/nextjs ^7.9.10`, `package-lock.json` present → `npm install` if adding packages (none needed).
- Missing: `.env.example` (AGENTS.md §21 requires it), `.env.local` (absent — keys never committed), `app/sign-in` + `app/sign-up` routes (header is modal-only).

## Decisions / assumptions
1. No `clerk init`, no key generation by me — user supplies keys from Clerk Dashboard (or request accountless flow explicitly).
2. Add `.env.example` with the full AGENTS.md §21 canonical list (placeholders only, never real secrets).
3. Add `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` with Clerk prebuilt `<SignIn>` / `<SignUp>` (dark card to match theme) as deep-link/OAuth-callback targets; keep the header modal button unchanged.
4. Keep preview-mode fallbacks (no-key renders without provider) so builds/previews never break.
5. No Supabase Auth, no user sync, no webhooks, no orgs — out of scope per AGENTS.md §6.

## Files likely to change
- `.env.example` — NEW (canonical vars, placeholder values).
- `app/sign-in/[[...sign-in]]/page.tsx` — NEW.
- `app/sign-up/[[...sign-up]]/page.tsx` — NEW.
- Nothing else (layout, header, proxy already correct).

## Implementation requirements
1. Current SDK patterns only: provider inside `<body>` (already), async `auth()` if ever used on server (not needed).
2. `CLERK_SECRET_KEY` server-only; only `NEXT_PUBLIC_*` in client code.
3. Dark-theme auth cards matching site (`#111a2e` tones), centered layout, focus-visible rings.
4. Strict TS, no `any`.

## Security requirements
- Never print or commit real keys; `.env.local` stays gitignored (verify `.gitignore` covers it).
- OAuth/account-callback routes use Clerk components only.

## Acceptance criteria
- [ ] `.env.example` exists with all §21 vars as placeholders.
- [ ] `/sign-in` and `/sign-up` render Clerk forms (with keys) / graceful fallback without.
- [ ] Header Sign in → modal works; signed-in → avatar `UserButton`.
- [ ] `typecheck` + `lint` + `build` pass with and without keys.

## Checks to run
- `npm run typecheck`, `npm run lint`, `npm run build` — report exact outputs.

## Exact manual test steps expected after implementation
1. Copy `.env.example` → `.env.local`, fill `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` from Clerk Dashboard (never commit this file).
2. `npm run dev` → `/` → header shows gradient Sign in (no keys: disabled pill).
3. Click Sign in → modal opens → complete sign-up → avatar appears; refresh → session persists.
4. Visit `/sign-in`, `/sign-up` directly → forms render.
5. `npm run typecheck && npm run lint && npm run build` → paste outputs.
