# Project rules

## Typography

- **Never use em-dash (unicode U+2014) or en-dash (U+2013) anywhere in the project.** Use a plain ASCII hyphen (`-`), or a comma/colon when a pause reads better. Applies to: TSX/TS string literals, comments, markdown docs, translations, commit messages, and AI prompts.
- Same rule for every language: RU / EN / PL / ES / FR / DE / IT.
- Double quotes for English strings. Russian text may use `«елочки»` where context fits.
- Polish: no diacritics (no `ą ę ż ł ó ć ń ś ź`). Drop them for consistency with the ASCII-only typography rule.
- Same principle for ES / FR / DE / IT: prefer plain ASCII letters. Diacritics ARE allowed in these languages (they carry meaning - e.g. `ñ` vs `n`, `é` vs `e`), but avoid unicode-escaped fancy punctuation (curly quotes, ellipsis, em-dashes). Use straight ASCII quotes.

## Code style

- TypeScript strict; prefer `tp(ru, en, pl)` for new UI strings. `t(ru, en)` is legacy, do not introduce new call sites.
- Keep the dark-ocean CSS vars (`--accent-cyan`, `--bg-primary`, etc).
- Client-only components must start with `'use client';`.
- Every edit: `npx tsc --noEmit` should stay clean before commit.
- Before push: `npm run build` must pass locally. Turbopack's production build is stricter than dev and catches issues that dev hides.
- Tests: `npm run test:physics` = 16/16 green, `npx playwright test` = 9/9 green. Don't merge if red.

## i18n

- 7-language app: RU / EN / PL / ES / FR / DE / IT. Source: RU.
- Priority chain (see `src/lib/i18n.tsx`): `?lang=` in URL > localStorage > cookie (SSR) > Accept-Language > RU fallback.
- Share-link shortcuts: `/pl`, `/en`, `/ru`, `/es`, `/fr`, `/de`, `/it` -> redirect to `/` with cookie pinned.
- Server lang pipeline: `src/proxy.ts` writes `regatta_lang` cookie, `src/app/layout.tsx` reads it for `<html lang>` and `generateMetadata`. Do not break this.
- Data-file rows use `LegacyLocalized<'field'>` adapter (`fieldRu/En/Pl` required + `fieldEs/Fr/De/It` optional). Consumers read via `legacyPick(obj, 'field', lang)`. New components prefer `tl({ru, en, pl, es, fr, de, it})` object form.
- Bulk translation: `ANTHROPIC_API_KEY=sk-... node scripts/translate-data-flat.mjs --file <path> --lang es,fr,de,it`.
- Cyrillic-leak scan: `npm run dev -- --port 3007 & node scripts/cyrillic-scan.mjs` (expects 0 leaks on content routes).
- Route status in `docs/I18N_AUDIT.md`. Keep it in sync with reality if you change coverage.

## Parallel-chat coordination (2026-04-22)

**Four chats run in parallel on this repo, one per lane.** Identify which
lane you are in from the user's instructions (e.g. "we're working on V3
here"), then stay in it. Lanes below use explicit names so "this chat"
never has to resolve at read time - if you're in the V3 lane, read the
"V3 lane" section; if Shared, read "Shared lane"; etc.

### V3 lane (Simulator V3)
- **Owns:** `src/app/simulator-v3/*`, `src/features/simulator-v3/*`, `docs/design/simulator-v3/*.md`
- **Shared deps it MAY read:** `src/lib/sailing-physics/*`, glossary, data files
- **Do NOT edit** shared i18n system, `/src/app/simulator/*` (V1), `/src/app/simulator2/*`, `/src/features/simulator-v2/*`, or mobile app
- Follows `docs/design/simulator-v3/PIPELINE.md` + `BACKLOG.md`. QA via `docs/design/simulator-v3/QA_CHECKLIST.md`.

### V2 lane (Simulator V2)
- **Owns:** `src/app/simulator2/*`, `src/features/simulator-v2/*` (if it grows there), `docs/design/simulator2/*`
- **Shared deps it MAY read:** `src/lib/sailing-physics/*` (VPP engine), `src/data/sailing-data.ts` glossary/points-of-sail data
- **Do NOT edit** shared i18n system, `/src/app/simulator/*` (V1), `/src/app/simulator-v3/*`, `/src/features/simulator-v3/*`, mobile app, or shared web content routes
- Follows the V2 roadmap in `docs/design/simulator2/ROADMAP.md` (PR-1..PR-7)

### Shared lane (misc / web / i18n / content / CI)
- i18n fixes, docs, content (`/rules`, `/onboard`, `/start`, `/checklist`), game HUD, navigation
- small bug fixes across the web app
- web API endpoints (`/api/*`)
- Owns: `src/proxy.ts`, `src/lib/i18n.tsx`, `src/app/layout.tsx`, `src/components/Navigation.tsx`, all content routes, CI / deploy config

### Mobile lane (design / scaffold)
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

#### Mobile cross-cutting decisions (for when the Mobile lane is ready)
When the Mobile lane makes a call that would duplicate or change existing
assets (content, physics, i18n), the decision goes into
`docs/design/mobile/DECISIONS.md` with a short ADR entry. Before any
data/physics/i18n duplication happens, come back to the Shared lane to
plan shared-package extraction (e.g. move `src/data/*` to
`packages/content/*` and publish so both web and mobile import it).
This avoids content divergence.

### Shared files touched by multiple lanes - ASK or LEAVE ALONE

Before editing any of these, check git log to see who touched them last. If unclear, post the change in the Shared lane chat and wait:

- `src/lib/sailing-physics/*.ts` (VPP engine - both V2 and V3 depend on this)
- `src/proxy.ts` (lang + auth middleware - Shared lane owns)
- `src/lib/i18n.tsx` (i18n hooks - Shared lane owns)
- `src/app/layout.tsx` (root layout - Shared lane owns)
- `src/components/Navigation.tsx` (shared nav - Shared lane owns)
- `CLAUDE.md` (this file - any lane can update, but coordinate via commit)
- `docs/TECH.md`, `docs/I18N_AUDIT.md`, `README.md` (docs)

### Don't-touch (hard rules, all lanes)

- **`src/app/simulator/*` is V1 - primary production simulator.** Do NOT refactor or "improve" it from V2/V3 lanes. V1 may only change in the Shared lane and only for isolated fixes, not physics rewrites. V2/V3 work does not touch V1.
- **i18n plumbing** (`src/lib/i18n.tsx`, `src/proxy.ts` lang handling, `src/app/layout.tsx` `generateMetadata`) is owned by the Shared lane. V2/V3 use it, don't redesign it.
- **`/game`, `/multiplayer`, `/rules`, `/onboard`, `/start`, `/checklist`, `/anatomy`, `/courses`, `/racing`, `/glossary`, `/gallery`, `/leaderboard`** - content routes, Shared lane owns.
- **CI / deploy** (GitHub Actions, nginx, Docker, .env on VPS) - Shared lane owns.

### Before starting any significant change in any lane

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

- Commit only the files your lane owns. Use `git add <specific files>`, not `git add -A`.
- Push to `main` directly is fine for any lane if files are isolated.
- If a big V3 refactor touches many files at once, use a feature branch: `git checkout -b feature/simulator-v3-refactor-N` then merge later with `git merge --no-ff`.
- Never `push --force` to `main`.
- Never `git reset --hard` without the other lanes knowing.

### Verification per lane

- Shared lane: prod smoke = `curl -I https://regatta.icoffio.com/`, playwright cyrillic scan, `/stats` auth.
- V2 lane: `/simulator2` routes, physics tests, browser console clean.
- V3 lane: `/simulator-v3` routes, physics tests, spec compliance per `docs/design/simulator-v3/BEHAVIORAL_CONTRACTS.md` + `QA_CHECKLIST.md`.
- Mobile lane: design docs in `docs/design/mobile/` stay current; any scaffold code builds in its own directory/repo; API contract docs stay in sync with web `src/app/api/*`.

## Server

- Next.js 16 (Turbopack) dev sometimes emits a noisy `Can't resolve 'tailwindcss' in /Users/Andrey/App/all` error that is cosmetic (tailwind lives in `regatta/node_modules`). Ignore unless the `/` route 500s.
- Deploy: push to `main` triggers GitHub Actions -> SSH to VPS -> `docker compose up -d --build regatta` -> serves via nginx on `regatta.icoffio.com`.
- `/stats` password: `regattA` (admin:regattA). Stored in VPS `.env`, no fallback in code.
- GA4 stream: `G-ZEWWJ4N31M` in `src/components/GoogleAnalytics.tsx`.

## Analytics (custom SQLite + GA4)

- Events table writes go through `insertEvent()` in `src/lib/db.ts`. As of 2026-04-25 events also store: `country`, `device_model`, `ms_since_start`, `utm_source/medium/campaign`, `referrer` (in addition to the original `device`, `viewport`, `language`).
- Country detection in `/api/log` reads `cf-ipcountry` / `x-vercel-ip-country` / `x-country-code` headers. Setup of nginx geoip2 module is in `docs/OPS.md` (one-time VPS task).
- Custom server-side events: `race.finish` (in `/api/race-result`) and `coach.requested` (in `/api/coach`) - both visible in /stats live feed.
- Client-side events from `ClientErrorReporter`: `page.view` (every navigation, with utm + viewport bucket + ms_since_start), `page.engaged` (on unload or 30s idle, with msOnPage + maxScrollPct), `js.uncaught`, `js.rejection`.
- Stats dashboard at `/stats` surfaces: Countries, Device models, Traffic sources (utm), Time-on-page KPIs in addition to legacy device/browser/OS/viewport/language splits. EmptyHint panels render when a metric has no data yet (e.g. before nginx geoip2 is wired).
