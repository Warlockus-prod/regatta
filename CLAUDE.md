# Project rules

## Typography

- **Never use em-dash (unicode U+2014) or en-dash (U+2013) anywhere in the project.** Use a plain ASCII hyphen (`-`), or a comma/colon when a pause reads better. Applies to: TSX/TS string literals, comments, markdown docs, translations, commit messages, and AI prompts.
- Same rule for every language: RU / EN / PL.
- Double quotes for English strings. Russian text may use `«елочки»` where context fits.
- Polish: no diacritics (no `ą ę ż ł ó ć ń ś ź`). Drop them for consistency with the ASCII-only typography rule.

## Code style

- TypeScript strict; prefer `tp(ru, en, pl)` for new UI strings. `t(ru, en)` is legacy, do not introduce new call sites.
- Keep the dark-ocean CSS vars (`--accent-cyan`, `--bg-primary`, etc).
- Client-only components must start with `'use client';`.
- Every edit: `npx tsc --noEmit` should stay clean before commit.
- Tests: `npm run test:physics` = 16/16 green, `npx playwright test` = 9/9 green. Don't merge if red.

## i18n

- 3-language app: RU / EN / PL. Source: RU.
- Priority chain (see `src/lib/i18n.tsx`): `?lang=` in URL > localStorage > cookie (SSR) > Accept-Language > RU fallback.
- Share-link shortcuts: `/pl`, `/en`, `/ru` -> redirect to `/` with cookie pinned.
- Server lang pipeline: `src/proxy.ts` writes `regatta_lang` cookie, `src/app/layout.tsx` reads it for `<html lang>` and `generateMetadata`. Do not break this.
- Route status in `docs/I18N_AUDIT.md`. Keep it in sync with reality if you change coverage.

## Parallel-chat coordination (2026-04-22)

**Four chats run in parallel on this repo.** Stay in your lane:

### This chat (shared / misc / web)
- i18n fixes, docs, content (`/rules`, `/onboard`, `/start`, `/checklist`), game HUD, navigation
- small bug fixes across the web app
- web API endpoints (`/api/*`)
- **Do NOT edit** simulator-v2, simulator-v3 code, or mobile app scaffolding (see below)

### Simulator V2 chat
- **Owns:** `src/app/simulator2/*`, `src/features/simulator-v2/*` (if it grows there)
- **Shared deps it MAY read:** `src/lib/sailing-physics/*` (VPP engine), `src/data/sailing-data.ts` glossary/points-of-sail data
- **Do NOT edit** shared i18n system, `/src/app/simulator/*` (V1), `/src/app/simulator-v3/*`, or mobile app

### Simulator V3 chat
- **Owns:** `src/app/simulator-v3/*`, `src/features/simulator-v3/*`, `docs/design/simulator-v3/*.md`
- **Shared deps it MAY read:** `src/lib/sailing-physics/*`, glossary, data files
- **Do NOT edit** shared i18n system, `/src/app/simulator/*` (V1), `/src/app/simulator2/*`, or mobile app

### Mobile app chat (design / scaffold)
- **Owns:** `docs/design/mobile/*` (design docs, decisions, stack choice),
  `mobile/**` if a native app directory gets created, OR a separate repo
  (document the repo URL in `docs/design/mobile/README.md` so this repo
  stays coherent).
- **Shared deps it MAY read** (and extract into a shared package later):
  - `src/data/*` (bootcamp, rules, onboard, sailing-data, missions, anatomy, gallery)
    - **golden content asset**, keep one source of truth
  - `src/lib/sailing-physics/*` (VPP engine - same physics on mobile)
  - i18n keys and translations
  - HTTP API schemas for `/api/coach`, `/api/log`, `/api/feedback`, `/api/leaderboard`, `/api/multiplayer/*`
- **MUST hit the existing web API** - no separate mobile backend. The VPS
  already serves the API at `regatta.icoffio.com/api/*`; mobile consumes it.
- **Do NOT edit** any web route code (`src/app/*`), i18n plumbing, simulator V1/V2/V3,
  or the nginx / docker / CI setup for the web app.

#### Mobile cross-cutting decisions (for when the chat is ready)
When the mobile chat makes a call that would duplicate or change existing
assets (content, physics, i18n), the decision goes into
`docs/design/mobile/DECISIONS.md` with a short ADR entry. Before any
data/physics/i18n duplication happens, come back to THIS chat to plan
shared-package extraction (e.g. move `src/data/*` to
`packages/content/*` and publish so both web and mobile import it).
This avoids content divergence.

### Shared files touched by multiple chats - ASK or LEAVE ALONE

Before editing any of these, check git log to see who touched them last. If unclear, post the change in the shared chat (this one) and wait:

- `src/lib/sailing-physics/*.ts` (VPP engine - both V2 and V3 depend on this)
- `src/proxy.ts` (lang + auth middleware - this chat owns)
- `src/lib/i18n.tsx` (i18n hooks - this chat owns)
- `src/app/layout.tsx` (root layout - this chat owns)
- `src/components/Navigation.tsx` (shared nav - this chat owns)
- `CLAUDE.md` (this file - any chat can update, but coordinate via commit)
- `docs/TECH.md`, `docs/I18N_AUDIT.md`, `README.md` (docs)

### Don't-touch (hard rules, all chats)

- **`src/app/simulator/*` is V1 - primary production simulator.** Do NOT refactor or "improve" it from V2/V3 chats. V1 may only change in this (shared) chat and only for isolated fixes, not physics rewrites. V2/V3 work does not touch V1.
- **i18n plumbing** (`src/lib/i18n.tsx`, `src/proxy.ts` lang handling, `src/app/layout.tsx` `generateMetadata`) is owned by this chat. V2/V3 use it, don't redesign it.
- **`/game`, `/multiplayer`, `/rules`, `/onboard`, `/start`, `/checklist`, `/anatomy`, `/courses`, `/racing`, `/glossary`, `/gallery`, `/leaderboard`** - content routes, this chat owns.
- **CI / deploy** (GitHub Actions, nginx, Docker, .env on VPS) - this chat owns.

### Before starting any significant change in any chat

```
git fetch origin
git status
git log --oneline -10
```

If `main` moved since you last looked, rebase or pull before making more commits:

```
git pull --rebase origin main
```

### Commit / push etiquette

- Commit only the files your chat owns. Use `git add <specific files>`, not `git add -A`.
- Push to `main` directly is fine for this chat and for V2/V3 if files are isolated.
- If a big V3 refactor touches many files at once, use a feature branch: `git checkout -b feature/simulator-v3-refactor-N` then merge later with `git merge --no-ff`.
- Never `push --force` to `main`.
- Never `git reset --hard` without the other chats knowing.

### Verification per chat

- This chat: prod smoke = `curl -I https://regatta.icoffio.com/`, playwright cyrillic scan, `/stats` auth.
- V2 chat: `/simulator2` routes, physics tests, browser console clean.
- V3 chat: `/simulator-v3` routes, physics tests, spec compliance per `docs/design/simulator-v3/BEHAVIORAL_CONTRACTS.md`.
- Mobile chat: design docs in `docs/design/mobile/` stay current; any scaffold code builds in its own directory/repo; API contract docs stay in sync with web `src/app/api/*`.

## Server

- Next.js 16 (Turbopack) dev sometimes emits a noisy `Can't resolve 'tailwindcss' in /Users/Andrey/App/all` error that is cosmetic (tailwind lives in `regatta/node_modules`). Ignore unless the `/` route 500s.
- Deploy: push to `main` triggers GitHub Actions -> SSH to VPS -> `docker compose up -d --build regatta` -> serves via nginx on `regatta.icoffio.com`.
- `/stats` password: `regattA` (admin:regattA). Stored in VPS `.env`, no fallback in code.
- GA4 stream: `G-ZEWWJ4N31M` in `src/components/GoogleAnalytics.tsx`.
