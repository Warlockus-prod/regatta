# Regatta - State Audit

**Date:** 2026-04-18
**Live:** https://regatta.icoffio.com
**Repo:** https://github.com/Warlockus-prod/regatta
**Phase:** Phase 0 complete (cleanup + docs)

This document is a snapshot of the code as it stands. When it goes stale,
rewrite it - don't patch.

---

## What exists (post-Phase 0)

### Content routes (solid)
- `/` landing
- `/start` 8-lesson bootcamp
- `/quick` 15-min refresh
- `/onboard` first week on board (sections open by default)
- `/courses` points of sail + diagram
- `/racing` tactics
- `/rules` 8 scenario cards
- `/anatomy` Bavaria 46 2D profile, 17 hotspots (3D removed Phase 0)
- `/checklist` 48 items, 4 groups
- `/glossary` 51 terms

### Interactive routes (mix of solid + known-fake)
- `/simulator` - **CORE PRODUCT. REAL PHYSICS (post-Phase 2).** Reads live
  state from `src/lib/sailing-physics/` each tick. Optimal-trim overlay,
  delta chips, commentary feedback.
- `/game` - race with AI opponents, Claude Haiku coach on finish. Uses
  `race-physics.ts` (same lookup approach). Gameplay works but physics is
  the same illusion as /simulator.
- `/multiplayer` - WebSocket room, 2-8 players. Works, stress-tested 8
  clients at 20.3 Hz.
- `/leaderboard` - top times per bucket, works.
- `/r/[code]` - replay viewer, works.

### Admin / infra routes
- `/stats` - auth-gated dashboard (users, sessions, events, feedback).
  Works.

### APIs
All under `/api/`: `log`, `feedback`, `coach`, `ai-chat`, `daily`,
`leaderboard`, `player`, `race-result`, `replay`, `replay/[code]`,
`og/result`, `admin/feedback`. All under rate-limit + CSP.

---

## What was removed in Phase 0

- `/knots` (page, data, all nav + homepage + onboard links)
- `Icon.knots` dead nav icon
- 3D anatomy view (the `<model-viewer>` Kenney placeholder) + `public/models/`
  GLB files + CSS hotspot-3d rules + `@google/model-viewer` CDN entry in CSP
- AI chat "knots" sample prompts
- `ai-chat` and `coach` system prompts had literal em-dashes; replaced
  with hex-code references (`(U+2014)`) to avoid violating the rule they
  describe
- 5 em-dash/en-dash violations in code (`manifest.json`, `nginx.conf`,
  `og/result/route.tsx`, `game/GameClient.tsx`, `r/[code]/ReplayViewer.tsx`)

Build passes cleanly after Phase 0.

---

## What's honestly broken (not hidden, not fixed yet)

### B1. Simulator physics is fake
**Severity:** core product claim is undermined.
**Files:** `src/app/simulator/page.tsx`, `src/app/trim-trainer/TrimTrainerClient.tsx`,
`src/lib/race-physics.ts`.
**Plan:** Phase 1 (engine) + Phase 2 (new UI) + Phase 3 (migration).
**Tracked:** DECISIONS.md ADR-0001, ROADMAP.md Phase 1-3.

### B2. Race uses same fake physics
**Severity:** gameplay works because it's a game, but any claim of
"realistic simulation" in `/game` is false.
**Plan:** migrate to new engine after Phase 2 validates it.

### B3. Middleware convention deprecated warning
**Severity:** cosmetic in Next.js 16 build output. Needs rename
`src/middleware.ts` -> `src/proxy.ts` eventually.
**Plan:** bundle with next refactor wave.

### B4. `metadataBase` warning on OG generation
**Severity:** cosmetic; OG still works.
**Plan:** set in `src/app/layout.tsx`.

### B5. Legacy docs still in tree
**Files:** `PROBLEMS.md`, `WAVE6.md` - stale wave logs.
**Plan:** fold into MEMORY.md in a later cleanup, or delete.

---

## Infrastructure status

- Docker Compose on VPS, healthy
- Nginx + Let's Encrypt, auto-renew
- CI/CD via GitHub Actions, push-to-deploy on main
- SQLite persisted in `/data` volume, survives redeploy
- WS server running on `:4501`
- `ANTHROPIC_API_KEY` set in VPS `.env`
- `ADMIN_PASSWORD` set in VPS `.env` (avoid hardcoded `regattA` default)

---

## Process notes (this phase)

**What worked:**
- Starting with deletions before writing new code - tree got smaller and
  more honest in one sweep.
- Grepping both unicode chars (U+2014, U+2013) in every commit-prep step.
- Writing MEMORY / PATTERNS / TECH / DECISIONS / AUDIT / ROADMAP in one
  burst while context was loaded. Each file has a clear job and doesn't
  overlap the others.

**What hurt:**
- I almost wrote new docs without deleting stale ones. Caught myself only
  after cross-checking this AUDIT against ROADMAP v5 claims.
- Nearly missed em-dashes inside system prompts (AI chat, coach). They
  were literal chars despite the prompts being about the rule itself.

**For the next session:**
- Read MEMORY.md + PATTERNS.md FIRST. Don't trust my own summary of state
  without checking this AUDIT.md.
- Phase 1 starts at `src/lib/sailing-physics/`. Do NOT touch
  `/simulator` UI until the engine has all 5 verification tests in
  DECISIONS.md ADR-0001 green.
- When tempted to open GameClient.tsx or simulator/page.tsx for "one small
  fix": pattern P2 (polishing fake). Stop.

---

## Quick commands

**Deploy from local:**
```bash
git push origin main   # CI picks it up
```

**Rollback:**
```bash
ssh -i ~/.ssh/aiw_new_vps_ed25519 root@46.225.11.249
cd /opt/repos/regatta
git checkout <tag>
docker compose up -d --build
```

**Inspect logs:**
```bash
ssh ... root@46.225.11.249
docker logs --tail 500 regatta
docker logs --tail 500 regatta-ws
```

**Database poke:**
```bash
docker exec regatta sh -c 'sqlite3 /data/regatta-stats.db "SELECT COUNT(*) FROM events"'
```
