# Regatta - State Audit

**Date:** 2026-04-20
**Live:** https://weektoregatta.com
**Repo:** https://github.com/Warlockus-prod/regatta
**Status:** Phase 0 + 1 + 2 landed. Three simulators (V1/V2/V3) live
over one physics engine. 6 post-audit bugs fixed + verified in browser.

This is a snapshot of the code as it stands. When it goes stale,
rewrite - don't patch. Previous audit (2026-04-18) is preserved in git
history.

Related docs:
- `FEATURES.md` - user-facing feature inventory
- `TECH.md` - architecture + module map + commands
- `ROADMAP.md` - phases and exit criteria
- `MEMORY.md` - dated decisions log
- `DECISIONS.md` - ADRs (physics spec in ADR-0001)
- `PATTERNS.md` - failure patterns + the "door" checklist
- `docs/I18N_AUDIT.md` - PL coverage per page
- `docs/TEST_RUN_2026-04-20*.md` - three browser-verified audit passes

---

## What exists

### Content routes
- `/` landing
- `/start` 8-lesson bootcamp
- `/quick` 15-min refresh
- `/onboard` first week on board (sections open by default)
- `/courses` points of sail + diagram (boats rotate by TWA, tack labels
  at bottom horizontal)
- `/racing` tactics
- `/rules` 8 scenario cards + 3 external RRS links in footer (all
  verified 200 OK server-side)
- `/anatomy` Bavaria 46 2D profile, 17 hotspots (3D removed Phase 0)
- `/checklist` reading reference, 8 sections
- `/glossary` 51 terms, RU + EN

### Simulator line
- `/simulator` V1 - Canvas. Drag + keyboard. Sails on leeward side
  (tack-sign fixed 2026-04-20).
- `/simulator2` V2 - Three.js. Sky preset + local lights (Drei
  Environment removed; HDR was fetched from raw.githack.com and
  blocked by our CSP).
- `/simulator-v3` V3 - SVG cockpit with 4 corner pods, inflated sails
  (two Q-curve belly + linear gradient), optim button, glossary footer.

All three read the same `sailing-physics` engine.

### Interactive routes
- `/game` - race with AI opponents, Claude Haiku coach on finish.
  Arcade physics in `race-physics.ts` (by design - not fake).
- `/multiplayer` - WebSocket room, up to 10 players, 20 Hz
  authoritative. Lobby creation verified 2026-04-20; true 2-client
  sync stress-tested earlier with 8 clients at 20.3 Hz.
- `/leaderboard` - top times per bucket.
- `/r/[code]` - replay viewer, handles invalid codes gracefully.

### Admin / infra
- `/stats` - auth-gated dashboard, HTTP Basic Auth middleware.
- All `/api/*` under rate-limit + CSP.

---

## Physics engine status

`npm run test:physics`: **8/8 green**, no regression since Phase 1.

| Test | Measured | Expected | Pass |
|---|---|---|---|
| Beam reach TWS=12 | bs 6.44 kt, heel 7.5° | bs [5, 6.5], heel [6, 15] | yes |
| Over-trim stall | 12.4% drop | >= 10% | yes |
| Close-hauled TWA=40 | bs 5.17, AWA 25 < TWA, AWS 15.7 > TWS | forward apparent | yes |
| Heavy TWS=22 unreefed | bs 8.23, heel 40.6° | heel > 25° | yes |
| Heavy TWS=22 reefed | bs 5.94, heel 17.7° | heel < 22° | yes |
| Wing-on-wing TWA=180 | drive 899 > same-side 754 | wing wins | yes |
| Sanity: TWS=0 | zero forces | yes | yes |
| Sanity: head-to-wind | drive ~= 0 | yes | yes |

Spec: `DECISIONS.md` ADR-0001.

---

## Bugs fixed since the 2026-04-18 audit

All found by browser testing (Playwright MCP or user screenshot),
root-caused in commit message, deployed, and re-verified post-deploy.

1. **V1 simulator running lookup-table "physics"** (old B1) -> fixed
   Phase 2. `/simulator` now reads `sailing-physics.settle()` per
   frame. Optimal-trim overlay + delta chips. 0 console errors.

2. **V2 "page couldn't load" in production** -> Drei
   `<Environment preset="sunset">` HDR fetch blocked by CSP. Removed
   Environment; kept local Sky + lights.

3. **V3 default state was stalled** -> speed 2.8 kt, trim 46%, both
   sails red. `DEFAULT_UI.jibAngle = 42` was too tight for TWA=90 at
   low seed bs. Bumped defaults to `mainAngle=52, jibAngle=54`; raised
   initial bs seed to `max(3, TWS * 0.45)`. Now 6.1 kt + trim 90%
   + both sails green out of the gate.

4. **`/courses` thumbnails all pointing up** -> the boat render
   didn't rotate by TWA; only the sail angle changed. Wrapped hull +
   mast + sails in `<g rotate(twa)>`. Added bow marker dot. Moved
   speed indicator dots to fixed screen-frame.

5. **`/courses` tack labels overlapping sector labels on mobile** ->
   "ЛЕВЫЙ ГАЛС" and "ПРАВЫЙ ГАЛС" were drawn rotated vertical at
   east/west, colliding with horizontal "Галфвинд" at narrow widths.
   Moved to bottom horizontal at `cy + mainR + 62`. Verified no
   overlap at 420x800 and 320x568.

6. **V1 sail rendered on windward side** (physics-violating) ->
   `getTackSide(boatHeading, windDir)` had the wrong sign:
   `normalizeAngle(boatHeading - windDir)` instead of
   `normalizeAngle(windDir - boatHeading)`. Fixed. Sail now goes
   leeward (correct).

7. **V3 jib drew flat, not inflated** -> single Q curve with small
   offset. Redrew jib + main as two Q curves forming a belly with a
   linear gradient (`#dce7ee -> #ffffff -> #b9c9d4`). Reads as
   sailcloth under pressure.

8. **MP guest briefly saw "хост" badge next to own name** -> found
   while testing 2-tab join flow. Client set `hostId: msg.id` on
   every `joined` message regardless of `isHost`. Fixed to set
   `hostId` to `msg.id` only when `msg.isHost === true`, otherwise
   leave empty until `lobby-state` arrives with the real value.

See `docs/TEST_RUN_2026-04-20*.md` for the full audit trail of all
three passes.

---

## What's honestly still rough (non-blocking)

### R1. Middleware deprecation warning
**Severity:** cosmetic. Next 16 logs a warning about the
`src/middleware.ts` convention. Rename to `src/proxy.ts` eventually.

### R2. `metadataBase` warning
**Severity:** cosmetic. OG image generation logs a warning. Set
`metadataBase` in `src/app/layout.tsx`.

### R3. `race-physics.ts` parallel to `sailing-physics`
**Severity:** by design for now. `/game` is an arcade, not a
simulator. Migration is ROADMAP.md Phase 3.

### R4. Polish content coverage
**Severity:** documented. Nav + home + rules + V2 + V3 UI fully PL.
Data-file-backed content (glossary, anatomy, onboard, start, checklist
section bodies, rules scenario bodies) falls back to EN. See
`docs/I18N_AUDIT.md` for file-by-file status and effort.

### R5. V1 info-panel labels
**Severity:** low. Original `/simulator` V1 info-panel strings are RU
+ EN only; PL falls back to EN. Candidate for a small pass if PL
becomes a real usage cohort.

### R6. V2 desktop camera
**Severity:** cosmetic. Camera at `[5, 4.5, 11]` reads better than the
old `[8, 5, 9]` but still shows sails flat at some TWA combinations.

---

## Verified in this audit window (2026-04-20)

Playwright MCP on production live URL, desktop 1280x800 + mobile
390x844 unless noted.

- Deploy health: CI green, HTTP 200 on all 16 routes tested.
- Console errors: 0 across all routes tested.
- Physics: 8/8 green, no regression on any UI commit in this window.
- Em-dash sweep: 0 real matches across `*.ts*`/`*.md` in repo.
- /stats auth flow: works (password-gated as expected).
- /r/[code] invalid code: renders a clean error state, not 500.
- V1 drag hit-test: verified via synthetic PointerEvent sequence
  (Playwright MCP lacks native drag; code-level defensive checks on
  radius + cone verified to behave).
- /rules footer links: 3 external RRS URLs, all HTTP 200
  (server-side curl; cross-origin fetch from browser blocked by CSP).
- /game: briefing flow -> countdown -> race -> Claude coach analysis
  on finish. Works end-to-end.
- /multiplayer: lobby create + join-by-code render correctly; 2-tab
  sync in single browser is structurally limited by shared session
  cookie (not a product bug).
- PL coverage: per-route spot check matches `docs/I18N_AUDIT.md`.

---

## Infrastructure snapshot

- Docker Compose on VPS, healthy
- Nginx + Let's Encrypt, auto-renew
- CI/CD via GitHub Actions, push-to-deploy on main
- SQLite persisted in `/data` volume, survives redeploy
- WS server running on `:4501`
- `ANTHROPIC_API_KEY` + `ADMIN_PASSWORD` set in VPS `.env`

---

## Quick commands

**Deploy:**
```bash
git push origin main
```

**Rollback:**
```bash
ssh root@46.225.11.249
cd /opt/repos/regatta
git checkout <tag>
docker compose up -d --build
```

**Inspect logs:**
```bash
ssh root@46.225.11.249
docker logs --tail 500 regatta
docker logs --tail 500 regatta-ws
```

**DB poke:**
```bash
docker exec regatta sh -c 'sqlite3 /data/regatta-stats.db "SELECT COUNT(*) FROM events"'
```
