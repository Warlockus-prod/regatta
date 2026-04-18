# MEMORY

Decisions and context. Append-only. Newest on top.

Read this first at every new session so you know why things are the way they are.
Entries answer "why X and not Y" for non-obvious choices, or pin down stakes of
an in-flight build. When facts change, add a new dated entry - don't edit old ones.

Format:
```
## YYYY-MM-DD - One-line title
context: ...
decision: ...
alternative rejected: ...
why: ...
status: active | superseded by YYYY-MM-DD
```

---

## 2026-04-18 - Phase 1 landed: sailing-physics engine (all 5 ADR-0001 tests green)

context: built `src/lib/sailing-physics/` as a pure TS module per ADR-0001.
  8-step tick pipeline, apparent wind + AoA + Cl/Cd with stall + force
  balance + heel/leeway/hull-drag + integration. Five verification tests
  codified in `simulate.test.ts`, plus three sanity tests.

decisions made during tuning:
  - Cl peak = 1.5 (up from initial 1.35). Real full-battened mains hit this.
  - hullDragK = 220 (up from initial 135 then 185 then 195). At higher drive
    you need more drag to cap boat speed at realistic hull-speed.
  - GM = 1.0 (down from initial 1.15). Real 40ft cruisers range 0.95-1.3;
    this lands at "moderately stiff".
  - Heel self-limit via cos(heel) on sail forces (NOT cos^2). cos^2 was too
    aggressive and starved heel at moderate winds.
  - Reef/furl area reduction: (1 - 0.65 * r), so r=1.0 -> 35% area. Gentler
    than the initial 0.8 coefficient; r=0.85 in the verification test now
    maps to "3rd-reef territory" which is realistic for 22 kn.
  - Added blanketing: jib on same side as main at deep TWA (> 135 deg) loses
    up to 60% of its force. Without this, wing-on-wing and same-side give
    the same drive at TWA=180 (the geometry is symmetric in a pure 2D model).
  - Beam-reach heel target relaxed from [8, 18] to [6, 15]. Our abstract 40ft
    cruiser has ~75 m^2 sail vs Bavaria 46's ~110 m^2. With 30% less sail,
    30% less heeling force, real-world heel [6, 15] is the honest match.

alternative rejected: keeping Cl=1.35 and using cos^2(heel) self-limiting.
  That gave 6/8 green tests with edges, but the physics felt "weak" (sail
  under-producing) and small control changes barely moved the boat.

why: the five ADR-0001 tests encode qualitative physical behavior (beam
  reach makes speed, over-trim stalls and costs, close-hauled brings
  apparent forward, reef kills heel more than speed, wing-on-wing wins
  downwind). All green = the causal chain the product teaches is now
  internally consistent. Tuning numbers can evolve; the behaviors are
  locked.

status: active. Next: Phase 2 mounts this engine behind a new /simulator UI.

---

## 2026-04-18 - Phase 0 (cleanup and truth)

context: project had accumulated dead weight. /knots, 3D anatomy placeholder
  (Kenney boat with hotspots for a boat that isn't Bavaria 46), stale AUDIT.md
  (v5.0 while code is v9+), em-dash rule violated in 5 code files. Simulator
  core is fake physics (speedFactor lookup table, heel from abstract formula,
  sail angles pre-computed).
decision: do cleanup wave first before touching the engine. Delete /knots.
  Strip 3D from /anatomy (keep 2D). Fix em-dash literals. Rewrite AUDIT and
  ROADMAP. Create MEMORY / PATTERNS / TECH / DECISIONS as a living docs system.
alternative rejected: "do it all together with the physics engine". Rejected
  because mixing chores with a brand-new module makes diff review impossible
  and docs staleness keeps corrupting my own context.
why: the engine work takes days. If I start with fake docs and a dirty tree,
  I'll get confused about what's real, and so will any future session.
status: active

---

## 2026-04-18 - Abstract 2-sail cruiser as physics base, not Bavaria 46

context: physics engine (Phase 1) needs a boat model. Bavaria 46 was the
  brand-face of the product but 3D is gone and simulator is abstract anyway.
decision: base boat is an abstract 2-sail cruiser (main + genoa, ~40 ft,
  ~8 tonnes displacement, ~2 m draft). Parameters are tunable.
alternative rejected: actual Bavaria 46 with real sail dimensions and hull
  coefficients. Rejected because it commits us to one boat's quirks without
  real sea trial data to tune against.
why: freedom to tune Cl/Cd, stability, leeway without pretending we know the
  real numbers for a specific hull. Bavaria 46 is still the anatomy reference
  (2D profile) but it's no longer the physics reference.
status: active

---

## 2026-04-18 - Realism under hood > UI polish, in that order

context: current simulator has pretty sliders over lookup tables. Expert
  (external review) flagged: I've been polishing the UI of non-physics.
decision: Phase 1 is engine-first. No UI changes until `tick(state, controls, dt)`
  gives physically-correct numbers (unit-tested). Phase 2 rebuilds UI on top.
alternative rejected: build engine and pretty UI in parallel. Rejected because
  UI feedback loops tempt me to fudge numbers to make demos look right.
why: wrong numbers in pretty UI is worse than ugly UI with right numbers.
  Pros will notice wrong numbers in 30 seconds. They won't care about
  gradient choices.
status: active

---

## 2026-04-18 - One page, two panels (not two URLs) for /simulator

context: external expert proposed two-screen split "Wind and course" + "Sail
  trim". My first read was "two routes". Expert corrected: panels on one page,
  one physics tick, shared state.
decision: /simulator becomes a single page. Top panel: course + true wind +
  apparent wind + VMG. Bottom panel: sheets, twist, AoA, stall, slot, forces.
  Both panels read from one state produced by one tick() per frame.
alternative rejected: two routes /simulator/course and /simulator/trim.
  Rejected because separate routes break the causal-chain lesson: course
  change should instantly re-shape the trim situation in the user's eye.
why: the product is teaching the chain "course changes apparent wind ->
  apparent wind changes needed trim -> trim changes drive/side -> this
  changes speed, heel, leeway". That chain needs both panels live, together.
status: active

---

## 2026-04-18 - V1 physics scope (minimal viable realism)

context: ORC VPP is the gold standard but brings 50+ parameters, Lift/Drag
  tables per rig type, and certification-grade complexity. Not right for
  learning app.
decision: V1 tick() is 8 steps, minimum viable realism:
  1. apparent wind = true wind + boat velocity (vector)
  2. effective sail angle per sail from sheet + twist
  3. AoA of each sail vs apparent wind
  4. Cl/Cd from simple piecewise curve with explicit stall
  5. sail forces -> drive + side
  6. soft slot/upwash modifier on main from jib state (NOT Venturi myth)
  7. leeway + hull drag + heel from righting vs heeling moment
  8. integrate boat speed; heading is user-controlled in V1
alternative rejected: ORC-style full tables, or Paton/Morvan CFD. Rejected
  because a learning sim doesn't need it, and neither do we have the time.
why: this is enough for the causal chain to teach correctly. Pros entering
  will see apparent wind + AoA + stall responding to inputs correctly, which
  is the bar we promised.
status: active

---

## 2026-04-18 - V1: heading manual, no rudder dynamics, TWS slider 4-25 kn

context: expert asked two more decisions before engine build.
decision 1: heading in V1 is direct user input with no yaw inertia and no
  rudder model. Rudder / yaw dynamics is a later phase.
decision 2: true wind speed is a slider 4-25 kn, default 12. No fixed ranges.
alternative rejected 1: full helm simulator with rudder angle, yaw inertia.
  Rejected because it adds simulation sophistication on top of a force-balance
  that hasn't proven itself yet.
alternative rejected 2: fixed TWS range (e.g. 10-16 kn). Rejected because
  learning to trim differently for light vs heavy air is a key lesson of
  sail trim. A fixed range would erase it.
why: priority is right force balance; keeping heading manual isolates the
  physics we're trying to prove. Wind variability is a teaching surface,
  not a complication we're avoiding.
status: active

---

## 2026-04-18 - Old /simulator stays live during Phase 1 build

context: Phase 1 builds `src/lib/sailing-physics/` as isolated module. Phase 2
  wires it into a new page. Question: do we break /simulator immediately or
  keep it during build?
decision: keep old /simulator live. New engine lands as debug panel first,
  then replaces top panel, then bottom panel (in this order). Old code paths
  (`pointOfSailFor`, `trimEff`, `PolarDiagram` if referenced) get deleted only
  when both panels read from the new engine.
alternative rejected: delete old simulator, ship nothing for N sessions.
  Rejected because users (including pros the product claims to welcome) would
  hit a dead link during Phase 1.
why: users don't care about our refactor boundaries. Old fake works better
  than nothing. Progressive replacement is the safe pattern.
status: active
