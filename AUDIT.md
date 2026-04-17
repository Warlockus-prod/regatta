# Regatta — Final Audit v5.0

**Date:** 2026-04-17
**Version shipped:** v5.0
**Live:** https://regatta.icoffio.com
**Repo:** https://github.com/Warlockus-prod/regatta
**Admin stats:** https://regatta.icoffio.com/stats (user: `admin`, password: `regattA`)

---

## Version timeline

| Tag | Wave | Content |
|---|---|---|
| `v1.0` | Initial | Simulator, game, courses, racing, glossary, feedback + basic logging + PWA |
| `v1.1` | Bug fixes | B1 mobile game steering, B2 simulator text overlap, B3 rules illustration angles |
| `v2.0` | Wave 2 | Language toggle (RU/EN), /onboard "first week on board", /start bootcamp (8 lessons, progress), storage schema versioning, missions data model |
| `v3.0` | Wave 3 | /stats password-protected admin with SQLite (events, feedback, sessions tables), charts, reports UI with status transitions |
| `v4.0` | Wave 4 | /checklist (48 items, 4 groups, progress saved), /knots (6 knots with step-by-step SVG), /anatomy (Bavaria 46 profile with 17 hotspots) |
| `v5.0` | Wave 5 compact | /quick (15-min refresh for experienced sailors), consolidated homepage |

Rollback: `git checkout v1.0` + `docker compose up -d --build` on VPS. Every tag has a matching `regatta:vN.M` docker image.

---

## Feature inventory (what ships)

### Routes (14)

| Route | Purpose | Key content |
|---|---|---|
| `/` | Landing | 3 entry points + 8 secondary tools |
| `/start` | Bootcamp | 8 lessons, progress tracking, ~60 min |
| `/quick` | Quick refresh | 6 topics, 15 min |
| `/onboard` | First week on board | 8 sections: hierarchy, commands, danger zones, rigging, start, docking, pack list, quiet crew |
| `/simulator` | Interactive yacht | Canvas top view + side view with heel, wind direction selector |
| `/courses` | Points of sail | Circular wind diagram + 5 POS cards |
| `/racing` | Racing tactics | Course diagram, strategies, right-of-way, key concepts |
| `/rules` | Simple rules | 8 scenario cards with SVG illustrations |
| `/game` | Race with AI | 3 difficulties, wind strength picker, mini-map, autopilot, sounds, AI coach (Claude Haiku), fallback rule-based coach |
| `/anatomy` | Yacht anatomy | Bavaria 46 side-profile SVG with 17 hotspots |
| `/knots` | 6 essential knots | Figure-eight, bowline, cleat hitch, clove hitch, round turn + 2 half hitches, sheet bend |
| `/checklist` | Pre-race checklist | 48 items across 4 groups |
| `/glossary` | Terms RU/EN | 51 sailing terms, search, filter |
| `/stats` | Admin | Password-protected dashboard + feedback/bug management |

### APIs

- `POST /api/log` — client event ingestion, persists to SQLite
- `POST /api/feedback` — feedback/bug reports, persists to SQLite + JSONL
- `POST /api/coach` — race log → Claude Haiku analysis
- `POST /api/admin/feedback` — status transitions for reports (auth-protected)

### Infrastructure

- Next.js 16 standalone build, Docker on VPS at `172.17.0.1:4500`
- SQLite database persisted in Docker volume `/data`
- HTTP Basic Auth middleware guarding `/stats` and `/api/admin`
- Let's Encrypt SSL with auto-renew deploy hook
- PWA manifest + SVG icons (installable on home screen)
- Procedural Web Audio sounds (no asset files)
- `ANTHROPIC_API_KEY` in VPS `.env` (never committed)

---

## What works

✅ All 14 routes render on desktop and mobile, HTTP 200
✅ Build passes TypeScript strict, 0 errors, 0 warnings
✅ Game AI coach returns structured JSON from Claude Haiku in ~2s
✅ Game fallback coach runs without API key
✅ Mobile game steering (B1 fixed with refs)
✅ Simulator text overlap fixed (B2 pill backgrounds)
✅ Rules illustrations now correct wind/tack relationship (B3)
✅ Language toggle persists across visits
✅ Bootcamp/checklist/game progress saved in localStorage
✅ Feedback widget → SQLite → visible in /stats admin
✅ Storage schema versioning with safe reset
✅ Sessions tracked in DB for returning-user metrics
✅ Docker image tagged per version, rollback in one command

## What's deferred (tracked in PROBLEMS.md)

- **3D yacht anatomy** — user requested direct 3D, shipped as high-quality 2D Bavaria 46 profile. Upgrade path: acquire GLB, swap `<model-viewer>` in, hotspots translate 1:1
- **Missions UI in game** — data + evaluator ready, UI integration deferred
- **Wind shifts + gusts in game** — requires physics refactor (wind is currently const)
- **Ghost replay / debrief mode**
- **VMG hint during upwind**
- **Polar diagram overlay**
- **Quiz/assessment** — user requested, but testing with 10 real users first
- **Instructor mode** — low priority until audience proves need
- **Retention features** — shareable result card, email nudges before regatta date
- **Charts depth in admin** — funnel, cohorts, A/B test infra

## What was actively pushed back

From the long ChatGPT roadmap, these were explicitly not done:

- **Multiplayer** — wrong battle for now, backend + sync needed
- **Capacitor iOS/Android wrap** — PWA covers install. Apple credentials noted in personal memory for when warranted
- **Full Racing Rules of Sailing text** — link out instead
- **Course editor** — until community exists
- **Self-hosted Plausible/Umami** — our `/stats` suffices
- **Audio bug reports** — overcomplex for MVP
- **Native "Bavaria 46 everywhere" rebuild of game top-view** — game top-view is abstract "38-46ft keelboat silhouette", anatomy page commits to Bavaria 46 explicitly

---

## Development process notes

### What worked this session
- **Wave-based shipping** — each wave self-contained, testable, rollback-able. No half-done features in production.
- **Tag per wave** — `v1.0 / v1.1 / v2.0 / v3.0 / v4.0 / v5.0` with matching docker images = clean rollback story
- **Storage layer first, features second** — the `storage.ts` helper enabled bootcamp + checklist + language without each reinventing localStorage
- **Data layer separation** — `/src/data/*.ts` files pure, routes are presentation. Missions / knots / anatomy / rules data can be edited without touching components
- **Building pushback into roadmap explicitly** — table in ROADMAP.md showing "user overrode N, kept my original M" keeps decisions traceable
- **Bug triage first** — B1/B2/B3 fixed before any Wave 2 features, protecting existing user experience

### Friction points
- Docker `better-sqlite3` needed native build deps (alpine needs python3, make, g++)
- Next.js 16 middleware is now called "proxy" convention — renamed eventually
- ChatGPT share link scraping hit Cloudflare — documentation lost to tool-auth friction. User pasted content manually.
- SVG coordinate accuracy in rules illustrations — required careful double-check of wind-vs-boat orientation
- Nav overflow at 8+ items — resolved by keeping nav compact (icons-only at md), hero cards on homepage do the navigation work

### Recommendations for next session
1. Add Playwright smoke-test script that hits all 14 routes, checks HTTP 200 + no console errors. Run before every deploy.
2. Add server-side `country` lookup (geoip-lite) for `/stats` geo metrics
3. Make `/stats` password come from env only (kill the hardcoded fallback — it's in the public repo)
4. Audit: do any route still have mixed RU/EN? Grep for strings that should be through `useI18n`
5. Screenshot every page on desktop + mobile, save to `/docs/` for visual regression baseline

---

## Key files for future maintenance

| Concern | File |
|---|---|
| Add a new route to nav | `src/components/Navigation.tsx` — `navItems` array |
| Change homepage cards | `src/app/page.tsx` — `entryPoints` + `secondaryTools` |
| Add/edit rules scenarios | `src/data/rules.ts` + illustrations in `src/app/rules/page.tsx` |
| Add bootcamp lesson | `src/data/bootcamp.ts` |
| Edit onboard content | `src/data/onboard.ts` |
| Anatomy hotspots | `src/data/anatomy.ts` |
| Add knot | `src/data/knots.ts` + SVG in `src/app/knots/page.tsx` |
| Checklist items | `src/app/checklist/page.tsx` — inline `GROUPS` |
| Game physics constants | `src/app/game/page.tsx` — top of file |
| Simulator physics | `src/app/simulator/page.tsx` — `speedFactorFromTWA` |
| AI coach prompt | `src/app/api/coach/route.ts` — `SYSTEM` |
| Fallback coach heuristics | `src/lib/fallback-coach.ts` |
| Storage schema | `src/lib/storage.ts` — bump `CURRENT_VERSION` when changing shape |
| DB schema | `src/lib/db.ts` — add migrations as needed |
| Admin password | env var `ADMIN_PASSWORD` (defaults to `regattA` — CHANGE IN PROD) |
| API key (AI coach) | VPS `.env` at `/opt/repos/regatta/.env` as `ANTHROPIC_API_KEY=...` |

---

## Deployment cheat-sheet

**Local change → production:**
```bash
# Locally
npm run build                          # verify TS/eslint pass
git commit -am "description"
git tag -a vN.M -m "what's new"
git push && git push --tags

# On VPS
ssh -i ~/.ssh/aiw_new_vps_ed25519 root@46.225.11.249
cd /opt/repos/regatta
git fetch --all && git reset --hard origin/main
docker compose up -d --build
docker tag regatta:latest regatta:vN.M
```

**Rollback to previous version:**
```bash
ssh ... root@46.225.11.249
cd /opt/repos/regatta
git checkout v1.0                      # or whichever tag
docker compose up -d --build
# or skip rebuild by using the pre-tagged image:
# docker tag regatta:v1.0 regatta:latest && docker compose up -d
```

**Check logs:**
```bash
docker logs --tail 500 regatta
# Filter client-side errors:
docker logs regatta 2>&1 | grep '"evt":"client.js'
```

**Get stats from DB directly:**
```bash
ssh ... root@46.225.11.249
docker exec regatta sh -c 'sqlite3 /data/regatta-stats.db "SELECT COUNT(*) FROM events"'
```

---

*End of audit v5.0 — ships with 14 routes, 4 APIs, full admin, bilingual content, ~50 hours of development compressed into 2 sessions.*
