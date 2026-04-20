# Regatta - Roadmap

**Last updated:** 2026-04-18 (Phase 0 landing)
**Current focus:** real sailing physics engine

This is the plan. Previous wave-by-wave plan was deleted because it no
longer matched reality (ROADMAP.md pre-Phase 0 was claiming "v7.0 pending"
while code already shipped multiplayer, replay, daily challenge).

Structure:
- **Phase** = a self-contained block that deploys end-to-end.
- Each phase ends with browser verification + MEMORY.md update.
- Do not start phase N+1 until phase N's exit criteria are green.

---

## Phase 0: cleanup + docs  **[DONE 2026-04-18]**

Goal: stop lying to ourselves. Remove dead code, fix rule violations,
replace stale docs.

Done:
- Removed `/knots` page, data, all references (nav, homepage, onboard,
  AI chat)
- Removed 3D anatomy (model-viewer, GLB files, CSS, CDN whitelist)
- Fixed em-dash / en-dash violations in 5 code files
- Rewrote `AUDIT.md` to reflect actual state
- Rewrote `ROADMAP.md` (this file)
- Created `MEMORY.md`, `PATTERNS.md`, `TECH.md`, `DECISIONS.md`
- `npx next build` passes clean

Exit criteria met:
- [x] `grep -rn em-dash/en-dash` in src/public/configs returns no real matches
- [x] Build passes with 0 TS errors
- [x] Docs system exists and is internally consistent

---

## Phase 1: sailing physics engine

Goal: replace the lookup-table illusion with a real force-balance VPP-style
engine. No UI changes yet. Module is isolated, pure, unit-tested.

Tracking: DECISIONS.md ADR-0001.

Structure:
```
src/lib/sailing-physics/
├── types.ts
├── wind.ts       # apparent-wind math
├── aero.ts       # Cl/Cd with stall
├── forces.ts     # drive + side per sail
├── balance.ts    # heel + leeway from moment balance
├── boat.ts       # abstract 2-sail cruiser params
├── simulate.ts   # tick(state, controls, dt) - pure function
└── simulate.test.ts
```

Scope (see ADR-0001 for full):
- 8-step tick pipeline
- Abstract 2-sail cruiser (~40 ft, ~8 tonnes, tunable)
- TWS slider 4-25 kn (not fixed)
- Manual heading (no rudder dynamics in V1)
- Soft slot/upwash modifier on main from jib, NOT a Venturi fairy-tale

Exit criteria:
- [ ] All 5 verification tests from ADR-0001 green
- [ ] `simulate.ts` is a pure function (no imports from `react`, `next`,
      `fetch`, etc.)
- [ ] MEMORY.md entry dated on completion summarizing tuning decisions made

Explicitly out of scope for V1 (Phase 1):
- ORC tables
- CFD
- Dynamic sail shape (luff tension, mast bend)
- Spinnaker, gennaker
- Traveler, vang, backstay
- Rudder / yaw dynamics
- Current, tide, waves

---

## Phase 2: new /simulator on the engine  **[DONE 2026-04-18]**

Goal: rebuild `/simulator` as one page with two panels, both reading
one shared state produced by one engine tick per frame.

**Top panel - Course and wind.**
- Big top-view canvas
- Live: boat, true-wind arrow, apparent-wind arrow, no-go cone, drive
  vector, side vector, boat track
- 6 metrics row: TWA, AWA, AWS, boat speed, heel, leeway
- 2-3 line live explanation block ("why did boat speed up / stop / heel")

**Bottom panel - Sail trim.**
- Left: compact top/side sail view
- Right: controls - mainSheet, jibSheet, mainTwist, jibTwist
- Diagnostics: main AoA, jib AoA, attached/stalled, slot health, drive,
  side, heel
- Basic vs Advanced mode toggle (Advanced unlocks twist)

Integration order (each step tested in browser via Playwright MCP):
1. Old `/simulator` stays live. New engine mounted as debug panel, visible
   under a "dev tools" toggle.
2. Replace top panel with engine-driven values (course, wind, no-go,
   vectors, metrics).
3. Replace bottom panel with engine-driven trim diagnostics.
4. Remove old `pointOfSailFor`, `speedFactorFromTWA`, `trimEff`, old
   `PolarDiagram` if still referenced.
5. Layout polish, mobile, overlap fixes.

Exit criteria:
- [ ] Both panels on one page read from one `BoatState` per frame
- [ ] Playwright test: turning course at top changes trim quality at bottom
      within 1 s (causal chain is visible)
- [ ] Playwright test: over-trim on bottom causes speed drop visible at top
      within 3 s
- [ ] No lookup tables in `/simulator` code path
- [ ] Mobile viewport: both panels usable without layout break
- [ ] MEMORY.md entry on completion

---

## Phase 3: migration + cleanup

Goal: retire old physics, collapse to a single source of truth.

Tasks:
- `/trim-trainer`: route onto the same engine OR merge into `/simulator`
  Advanced mode, then delete
- `/game`: migrate from `src/lib/race-physics.ts` to `sailing-physics`
  engine for boat motion; keep game-specific logic (collisions, AI opponents,
  mission evaluation) separate
- Delete `src/lib/race-physics.ts`
- `/courses` links: verify they still make sense with the new simulator
  (they likely do; page is conceptual, not physics)
- Run full Playwright smoke across all routes

Exit criteria:
- [ ] `src/lib/race-physics.ts` deleted
- [ ] `src/lib/sailing-physics/` is the only physics module in the tree
- [ ] All routes HTTP 200 in Playwright smoke
- [ ] AUDIT.md rewritten to reflect post-migration state

---

## Phase 4+ (candidates, not committed)

**Only pick these up after Phase 3 lands and stays healthy for 1-2 sessions.**

- **Helm simulator.** Rudder, yaw inertia, turn dynamics. Unlocks
  helmsmanship lessons.
- **Dynamic sail shape.** Cunningham, outhaul, backstay, luff tension.
  Richer trim teaching.
- **Current + wave modeling.** For coastal / offshore scenarios.
- **Gust model in engine.** Currently /game fakes gusts as a speed
  modulator; would become proper wind-field perturbation.
- **Third sail option.** Code 0 / gennaker for reaching. Requires rig
  type parameter.
- **Logbook / course-of-day challenge.** Use physics engine to grade
  user attempts at specific tactical puzzles.
- **Retire middleware/proxy rename warning** (`middleware.ts` ->
  `proxy.ts`) from Next 16 deprecation.
- **Retention + share mechanics** (OG cards for `/leaderboard` entries,
  email/Telegram notify for personal best, etc.). Defer until organic
  traffic justifies.

Each of these becomes a new ADR if picked up, so the "why" is captured
before the work starts.

---

## Operating rules

1. One phase in flight at a time. No concurrent physics + UI overhauls.
2. Every phase ends with a deploy AND a Playwright browser check.
3. Every phase updates MEMORY.md on completion.
4. Every non-trivial fork gets a new DECISIONS.md ADR.
5. `PATTERNS.md` is consulted before every commit. The "door" is not
   optional.
6. Stale docs are a P4 failure; rewriting them is part of the phase
   that invalidated them, not a future cleanup.
