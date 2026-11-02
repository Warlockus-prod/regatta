# DECISIONS

Architecture Decision Records (ADR style). Each entry pins down a major
structural choice: context, options considered, the choice, and consequences.

Write one ADR per significant fork. Once logged, don't rewrite - if a decision
is later reversed, add a new ADR referencing it as superseded.

Numbering is sequential. Date is "first captured", not "last edited".

---

## ADR-0001 - Real VPP-style sailing physics engine (replacing lookup tables)

**Date:** 2026-04-18
**Status:** accepted and implemented (Phase 1 landed 2026-04-18)

### Context

The product brands itself as a sailing trainer that "even pros would enter".
Current core simulator (`/simulator`) is not a simulator:

- `src/app/simulator/page.tsx:49` - `pointOfSailFor(twa)` hard-coded table
- `src/app/simulator/page.tsx:64` - `heelDeg(wa, speedFactor)` arbitrary formula
- `src/app/simulator/page.tsx:940` - `return pos.sailAngle` from lookup, NOT
  from trim
- `src/app/simulator/page.tsx:1400` - `trimEff(angle, optimum)` is
  distance-to-manually-set-constant, NOT force from angle of attack

Result: the trim panel controls don't actually affect physics. They only
affect a visualization overlay on top of the lookup-driven boat. A domain
expert noticed immediately.

External expert review pushed back on keeping any lookup-table approach and
proposed a VPP-style engine. Full ORC VPP would require 50+ parameters,
Lift/Drag tables per rig type, and certification-grade solver. Overkill for
a learning app.

### Decision

Build a new module `src/lib/sailing-physics/` as a pure TypeScript engine.
Minimum viable realism targeting **right force balance**, not **certified
accuracy**.

Engine is a pure function:
```
tick(state: BoatState, controls: Controls, dt: number): BoatState
```

State:
```
trueWindSpeed, trueWindDir,
heading, boatSpeed, heel, leeway,
mainSheet, jibSheet, mainTwist, jibTwist, reef, jibFurl
```

Tick pipeline (8 steps):
1. apparent wind = true wind + boat velocity (vector)
2. effective sail angle per sail from sheet + twist
3. AoA of each sail vs apparent wind
4. Cl/Cd from simple piecewise curve with explicit stall
5. sail forces → drive + side
6. soft slot/upwash modifier on main from jib state
7. leeway + hull drag + heel from righting vs heeling moment
8. integrate boat speed; heading is direct user input in V1

Engine has NO React, NO DOM, NO I/O. It's a pure math function so it can
be unit-tested and used by any UI or by the multiplayer server.

### Options considered

**A. Keep the lookup table, make UI prettier.**
Rejected. Expert review made clear this does not satisfy the product claim.
Pros would leave in 30 seconds.

**B. ORC VPP full certification-grade solver.**
Rejected. ORC docs (referenced by expert) list 50+ params and Lift/Drag
tables per rig type. Time cost wildly exceeds value for a learning app.
Can be revisited in V3 if we ever target handicap-racing simulation.

**C. Simplified VPP-style solver (chosen).**
Apparent wind + AoA + simple Cl/Cd with stall + force balance. Matches the
minimum expert called "enough for learning". Buildable in one focused wave,
unit-testable, extensible.

**D. External physics library (e.g. Paton/Morvan CFD paper implementation).**
Rejected. Not a TS library, paper implementation would be the same effort
as rolling our own.

### Consequences

**Positive:**
- UI finally means something. Slider changes produce causally-linked effects.
- Unit tests can assert behavior like "over-trim at beam reach reduces drive
  within N seconds" - gives us the D1 "done" discipline we lacked before.
- Multiplayer server can use same engine for authoritative simulation,
  removing divergence between single-player and multiplayer.
- Deletes a class of hacks (`pointOfSailFor`, `speedFactorFromTWA`,
  `trimEff`).

**Negative:**
- 2-3 focused sessions of engine work before any user-visible change.
- Risk of tuning hell: coefficients that feel right in numbers but wrong in
  the hands. Mitigation: test against 3 expected behaviors (beam reach
  speed, over-trim stall, close-hauled apparent wind closes) as reference
  points before UI integration.
- Old `/simulator` and `/trim-trainer` remain live with fake physics during
  build (see MEMORY.md 2026-04-18 entry on progressive replacement).
- `src/lib/race-physics.ts` (used by `/game`) eventually migrates too,
  which means the game loop will change integration shape.

### What we're explicitly NOT building in V1

- ORC-grade tables per rig type
- CFD (Paton/Morvan or anything else)
- Dynamic sail shape (luff/leech tension, mast bend, cunningham, outhaul)
- Spinnaker, gennaker, code-0
- Traveler, vang, backstay adjuster
- Autopilot / rudder dynamics / yaw inertia (exception since 2026-11-01:
  harbour mode of the Manoeuvres section only, ADR-0020)
- Current / tide / wave effects

These are candidates for V2+. None are required to deliver the causal-chain
lesson.

### Verification

V1 passes when these behavioral tests pass:

1. **Beam reach baseline.** TWA=90°, TWS=12 kn, neutral trim. Steady-state
   boatSpeed in [5.0, 6.5] kn, heel in [6°, 15°]. (Original spec said [8, 18]
   for heel; after tuning, [6, 15] matches our abstract 40 ft cruiser's
   moderate sail area. See MEMORY.md 2026-04-18 Phase 1 entry.)
2. **Over-trim stall.** Starting from beam reach steady state, pull mainSheet
   to hard-sheeted. Within 3 s, boatSpeed drops ≥10% AND main shows stalled.
3. **Close-hauled apparent wind.** TWA=40°, TWS=12 kn. Steady-state AWA ≤
   TWA (apparent comes forward), AWS > TWS.
4. **Reef in heavy air.** TWS=22 kn close-hauled. Un-reefed: heel > 25°
   (warning). Reefed: heel < 22°, boatSpeed only slightly lower.
5. **Wing-on-wing deep downwind.** TWA=170°, jib set opposite side. Drive
   force higher than jib-on-same-side at same TWA.

All five in `sailing-physics/simulate.test.ts`. Engine does not ship until
all five pass.

### Verification result (2026-04-18)

All 5 ADR tests + 3 sanity tests green. Final measured values from the
verification run:

| # | Test | Measured | Target | Status |
|---|------|----------|--------|--------|
| 1 | Beam reach bs | 6.44 kn | [5.0, 6.5] | ok |
| 1 | Beam reach heel | 7.5° | [6, 15] | ok |
| 2 | Over-trim speed drop (3 s) | 12.4% | >= 10% | ok |
| 2 | Over-trim main stalled | yes | yes | ok |
| 3 | Close-hauled AWA | 25° | <= TWA=40° | ok |
| 3 | Close-hauled AWS | 15.7 kn | > TWS=12 | ok |
| 4 | Unreefed heavy heel | 40.6° | > 25° | ok |
| 4 | Reefed heavy heel | 17.7° | < 22° | ok |
| 4 | Reefed/unreefed bs ratio | 0.72 | > 0.70 | ok |
| 5 | Wing-on-wing drive | 899 N | > same-side (754 N) | ok |

Sanity tests (deterministic tick, boat accelerates from rest, AWS ~ 0 when
boat runs with wind) also all green.

### References

- External expert review, 2026-04-18 (in conversation)
- ORC VPP documentation: https://orc.org/uploads/files/ORCsy/2025/2025-VPP-Documentation.pdf
- North Sails upwind power guide: https://www.northsails.com/en-us/blogs/north-sails-blog/upwind-sail-power-by-bill-gladstone
- Paton & Morvan 2009 (slot/upwash reference):
  https://www.sciencedirect.com/science/article/pii/S016761050900066X

---

## ADR-0002 - Physical leeway: keelK 6000, hull drag 240, keel grip falls with heel

**Date:** 2026-09-27
**Status:** accepted

### Context
Close-hauled leeway sat on the 12 deg clamp in `balance.ts` at every wind speed
from 8 to 22 kn (keelK 1500). The clamp, not the keel, was setting leeway, which
contradicts every source we have: Dedekam (p. 5) says leeway is marked upwind and
small to none downwind, and `docs/design/SAILING_PHYSICS_REFERENCE.md` 6.3 gives
3-5 deg close-hauled, near 0 on a reach or run. The keel also kept full grip at
any heel.

Leeway enters the model only through apparent wind (sideways drift carries the
boat away from the wind). A pinned 12 deg therefore bled apparent wind on every
close-hauled boat, and `hullDragK` 220 had been tuned around that loss.

### Decision
- `keelK` 1500 -> 6000.
- Keel lateral grip scales with cos^2(heel) (`KEEL_HEEL_EXP` in `balance.ts`):
  projected lateral area and the sideways share of keel lift each fall with
  cos(heel).
- `hullDragK` 220 -> 240, so boat speeds stay where they were.
- A non-finite leeway is caught with `Number.isFinite` (Math.max/min pass NaN
  through). The 12 deg clamp stays as a low-speed guard; it no longer binds
  while sailing.

Result, trimmed polar: close-hauled 3.3-4.6 deg at normal heel (8-12 kn), growing
to 5.1-5.8 at 30 deg heel and 7.1-8.0 at 41 deg; beam reach 1.1-1.8; run 0.2-0.3.
Speeds are within 1.95% of the old polar on average, worst cell 3.87%. ADR-0001
Test 1 reads 6.426 kn against 6.425 before.

### Options considered
- keelK alone (4500, 6000, 7500). 6000 put leeway in band, but less leeway lost
  the accidental brake on an overpowered boat: in ADR-0001 Test 4 the unreefed
  boat did 8.28 kn at 42 deg heel and reefing stopped paying (reefed 69.4% of it,
  the test needs more than 70%). Rejected on its own.
- Deferring the heel term, as the book audit first proposed. Rejected for the
  reason above: without it nothing slows a boat laid over at 40 deg.
- cos(heel) (n = 1): passes Test 4 with 70.9%, barely. cos^2 (n = 2) passes with
  75.3% and matches the physical argument. Chosen.
- hullDragK 235 / 245 / 250 with n = 2: 240 gave the smallest speed drift.
- Widening the clamp to 45 deg like the fuzz bound. Not needed: the clamp no
  longer binds while sailing, and wider values would only change low-speed HUD
  readouts in the V2/V3 lanes.

### Consequences
- Heel is still too large when a boat does not reef (41 deg at 22 kn unreefed).
  That is a righting-moment and depowering question, not a keel one.
- The broad reach (TWA 135) is still too slow, so its leeway exceeds the beam
  reach. Tests leave that pair out on purpose.
- The bot autopilot in `race-physics.ts` is pure pursuit toward points closer
  than its turning circle (about 154 units across at 3.5 kn; a rounding gate is
  70 long). It fails to finish from some start positions on both the old and
  the new physics. With this change, finishes from the real ws-server spawn
  positions went from 15/19 to 16/19 on a normal start and from 6/19 to 11/19
  after an early start. The single scripted early-start case in
  `race-course.test.ts` flipped from pass to fail and is kept as an `it.fails`
  tripwire; a fleet-level floor test locks the new completion counts. Fixing the
  autopilot is separate work.
- `ws-server/race-physics.js` and the mobile offline sailing bundle are
  regenerated from the engine.

### Verification
`polar.test.ts` "leeway follows the course and the heel, not the clamp";
ADR-0001 Tests 1-5; `race-course.test.ts` fleet floor; `npm run test:physics`
(including the race-server bundle check) and the mobile `npm run check`.

### References
Dedekam, "Sail and Rig Tuning", p. 5 (keel as a wing, leeway by course) and
p. 38 (reduce sail past 25 deg heel); `docs/design/SAILING_PHYSICS_REFERENCE.md`
6.3; `docs/design/books-audit-2026-09-26.md` (vpp-leeway-calibration).

---

## ADR-0003 - Bot autopilot: course loops, shed speed before the windward mark

**Date:** 2026-09-27
**Status:** accepted

### Context
`raceAutopilotTurn` (multiplayer bots, `/game` bots, the native app's AI) was
pure pursuit toward waypoints 60 units from the mark. Measured on the engine:
the full-rudder turning radius is about 21 units per knot (8 units per
knot-second at 22 deg/s), so 115-140 units at normal racing speed and up to 170
in a heavy breeze, while each rounding gate is 70 long. Brute force over the
start of a full-rudder bear-away found the three gates reachable with only 4-8
units of slack at normal speed and 0-4 in a heavy breeze. So bots missed gates,
and then: pointing downwind at an upwind target they flipped between the two
close-hauled headings every step and sailed to the bottom edge; after an early
start they orbited a point 60 units under the line, inside their own turning
circle. From the 19 real ws-server spawn places 16 finished, 11 after an early
start, 66 of 120 varied starts; median race 162 s.

### Decision
Steer along paths laid out from the course (`race-physics.ts`, `AUTOPILOT`):
- windward mark: a counter-clockwise stadium whose top is a circle (radius 80,
  centre 35 below the mark) through all three gates. The bot climbs the east
  leg in a tacking corridor that narrows toward the mark, sheds speed on the
  climb to about 3.3 kn (full-rudder radius near 70) by pointing 3-12 deg off
  the wind, sails the last stretch straight up the leg so no tack lands at the
  mark, then loops over it. A missed gate is another lap of the stadium;
- start: below the line, beat up its middle; over it early, a loop beside the
  line sized to the boat's turning circle whose rising side crosses the middle;
- finish: run down a lane of the line chosen from the boat id; after a miss,
  loop back above the line;
- the close-hauled side is committed with hysteresis (the downwind weave), and a
  bot never tacks below 2 kn and bears away when slow near the wind: stopped
  head to wind, a boat has no rudder authority and no drive, forever.
`raceWaypoint` stays the player hint and is unchanged; `updateLap` is untouched.

### Options considered
- Better-placed pure-pursuit waypoints or a per-phase retry. Aiming lower halved
  race times without adding finishes; a retry that U-turns at the gate misses
  again (the U-turn is wider than the gate) and dropped spawn finishes to 6/19.
- An open-loop full-rudder turn from a computed start point: the 4-8 unit slack
  above is too small for wind shifts, and the start point depends on the app's
  turning scale (the native app turns about 2.4 times tighter).
- Shedding speed exactly head to wind: fastest, but a collision there leaves the
  boat stopped in irons for good; 3-12 deg off the wind keeps a way out.
- Fleet-aware avoidance: the autopilot does not see other boats; left out.

### Consequences
- Single boats: all 19 spawns and 19 early starts finish (median 82 and 88 s),
  120 of 120 varied starts (87 s). Over 3950 races in 25 wind cases (8 seeds of
  shifting wind at light, normal and heavy strength) no boat fails and none
  needs more than 162 s, inside the server's 300 s cut. One cell is slower than
  before: a light-wind early start takes about 6 s longer (118 against 112 s),
  the price of a return loop that always works (the old one failed 4 of 19 early
  starts in normal wind and 12 of 19 in a heavy breeze).
- Fleets of 2-8 bots with the server's collisions and 300 s cut: 80% finish,
  was 45%; median 144 s, was 204. The rest are collision deadlocks, not
  steering: `resolveCollisions` damps both boats on any contact, low-speed
  leeway keeps them touching, and they end at zero speed, some head to wind.
  Damping only boats that close on each other would lift fleets to 97%; that
  changes collisions for players too, so it is left for a separate decision.
- Bots keep their state on the boat (`RaceBoat.autopilot`). The server used to
  merge a new spawn into the old bot object on a rematch, which also kept
  `started`, `roundPhase` and `finishTime`; it now creates fresh bot objects,
  and the autopilot resets itself when a boat's lap count goes back.
- The native app's AI keeps its finish times (within 1-2 s on every course and
  screen size) and passes `mobile/src/game/race.test.ts`.

### Verification
`race-course.test.ts`: every real spawn on time and early (19/19 each), 120
varied starts, all spawns in light, normal and heavy shifting wind inside 300 s,
a reused boat sails a new race like a fresh one; `npm run test:physics`;
`cd mobile && npm run check`.

### References
ADR-0002 (the leeway recalibration that exposed the old autopilot's margins);
`ws-server/server.js` spawnBoat and tick loop; `src/app/game/GameClient.tsx`
bot loop; `mobile/src/game/ai-boats.ts`.

---

## ADR-0004 - Collisions slow only boats closing on each other; finished boats leave the course

**Date:** 2026-09-27
**Status:** accepted

### Context
`resolveCollisions` (ws-server tick and `/game`) pushed overlapping boats apart
and multiplied both boats' speed by exp(-1.67 dt) on every step they overlapped,
whether they were approaching or not. Two boats grinding side by side stayed in
contact every step (low-speed leeway and slightly converging headings), so both
settled at 0.1-0.2 kn; near head to wind that is permanent, because the engine
gives no rudder authority at rest and no drive below about 8 deg TWA. Finished
boats also stayed in the collision list, parked just past the finish line, and
blocked the next boat on the same spot. With the ADR-0003 autopilot, fleets of
2-8 server bots (3 wind seeds x strengths 0.65 / 1 / 1.3, 300 s cut) finished
80%; with the old autopilot 45%.

### Decision
- Keep the push-apart. Damp both boats by exp(-1.67 dt k), where k is the
  closing speed along the contact normal divided by `FULL_BUMP_CLOSING_KN`
  (1 kn), clamped to 0..1. Velocity is over the ground, heading plus leeway,
  as stepBoat moves the boat. Touching or separating boats keep their speed; a
  ram at 1 kn or more costs what it always did.
- Boats with `lapDone >= 2` skip collisions, inside `resolveCollisions`, so the
  server (through the generated `ws-server/race-physics.js`) and `/game` behave
  the same.
- In the autopilot, a bumped boat bears away sooner: stall speed 2.2 kn (was
  1.5) and no pointing up the last stretch below 2.5 kn (was 1.8). Measured on
  two seed sets: 300 -> 304 and 302 -> 308 of 315, single boats unchanged.

### Options considered
- Flat damping (as before): the deadlocks above.
- Closing-speed damping without the finished-boat rule: nearly the same fleet
  numbers (the autopilot already spreads finish lanes), but a parked boat still
  blocks a human who aims at the same spot; the rule is one line.
- An inelastic exchange of momentum along the normal: more physical (a rammed
  boat would be shoved ahead), but a larger change to the feel of the game than
  this problem needs.
- Per-boat rounding lanes in the autopilot (loop radii 65 / 80 / 95), to turn
  rear-end bumps into side contact: no fleet gain (300 of 315 either way), and
  the tight lane cost 28 s of median in a heavy breeze. Rejected.

### Consequences
- Players feel it: brushing a neighbour no longer slows either boat; a ram
  still does. A finished boat is a ghost for everyone still racing.
- Fleets of 2-8 server bots with the 300 s cut: 96.5% finish (304 of 315),
  median 122 s (was 144). The rest: 8-boat light-wind fleets finishing just past
  300 s, and a few boats left head to wind by a ram near the mark.
- `/game` bots 15 of 15 (14 of 15 with the new autopilot alone, 11 of 15
  before it), median 97 s.

### Verification
`race-course.test.ts`: two boats in light contact keep sailing (flat damping:
0.2 kn), a head-on ram still takes the full slow-down, finished boats take no
part, 8-bot fleets finish 71 of 72 inside 300 s (flat damping: 49); live
`node scripts/test-multiplayer.mjs --full`; `npm run test:physics`.

### References
ADR-0003 (autopilot); `ws-server/server.js` tick loop; `src/app/game/GameClient.tsx`
game loop.

---

## ADR-0005 - Regatta venues are scenery around the race area, not obstacles

**Date:** 2026-10-22
**Status:** accepted

### Context
The owner asked for mountains or islands around the races and the 3D boat
"so racing has a sense of place", based on Göcek and other popular regatta
venues. Land could either frame the race area or become part of the course
(islands to round, shores to avoid). The second changes the physics, the
server tick (generated from the same TS), the bots' routing and every
course; the first changes none of them.

### Decision
- One data source, `src/data/venues/` (Göcek, Split, Masuria, the Solent,
  open sea): coasts along a side of the race area and islands on a compass
  bearing, both placed OUTSIDE the race area. Pure deterministic geometry
  (`geometry.ts`) draws them everywhere: canvas on the website race and the
  multiplayer race, Skia in the native race, low-poly terrain on the 3D horizon.
- No collision and no physics change: on the website and in multiplayer the
  boats are already clamped to the 800 x 1200 area; the native race now keeps
  the boats inside the bay (clamp instead of wrapping across the screen)
  because the shore is drawn at its edges.
- 3D: the land rings the horizon at 150-330 m, world-fixed by compass and
  centred on the boat like the yacht itself (the ocean scrolls), with aerial
  perspective baked into the vertex colours instead of the scene fog.
- The venue is a cosmetic preference (`regatta.venue.v1`), not synced
  between multiplayer players. A separate shore switch (`regatta.shore.v1`,
  owner request 2026-10-22) turns any venue into open sea and keeps the pick.

### Consequences
Islands to round or shores to avoid would need a new ADR: obstacle physics in
`src/lib/race-physics.ts`, the generated ws-server, bot routing and course
design.

### Verification
`src/data/venues/geometry.test.ts`: no land vertex inside the race area, every
terrain face looks up, the 3D shore sits beyond the orbit camera;
`mobile/src/game/race.test.ts`: rivals finish every course inside the bay.

---

## ADR-0006 - The 3D race is a view of the same race, at 0.6 m per race unit

**Date:** 2026-10-22
**Status:** accepted

### Context
The owner asked for a 3D view of the race ("a 3D race view"), next to the
simple and pro modes. A 3D race could run its own engine (real-scale metres,
its own bots) or show the race the canvas already runs. Its own engine would
fork the race rules, the bots, the results and the leaderboard; a view forks
none of them. The app cannot draw three.js natively (see the native 3D
WebView decision in `docs/design/mobile/DECISIONS.md`).

### Decision
- `src/features/race-3d/Race3DView.tsx` reads the refs the canvas race steps
  (`boatsRef`, `courseRef`, `windDirRef` in `src/app/game/GameClient.tsx`).
  The 2D/3D switch only changes what is drawn; the race loop, the keys, the
  steering buttons, the autopilot and the result stay the same. In 3D the
  canvas keeps only the mini-map, on top.
- Scale: 0.6 m per race unit, so two hulls touch at the 22-unit repel distance
  and the race area is 480 x 720 m. The race moves boats 8 units per knot per
  second, about 9.3 times real speed in metres; the wake gets the scaled
  speed so its foam stays on the water. The sail pose comes from each boat's
  own trim (`pose.ts`): to leeward, eased as it bears away, flogging inside 30
  degrees.
- The player stays at the origin and the world moves under it (as in the 3D
  trainer). The shore is the 2D shore raised into terrain (`raceTerrain` in
  `src/data/venues/geometry.ts`), 1.8 times taller than the horizon shore.
- A rival between the camera and the player steps out of the picture: the
  player's boat comes first (owner rule 2026-10-21).
- The app opens the same page online (`/race-3d` -> `/game?view=3d`) with the
  Race hub venue and shore; offline it falls back to the native race.

### Consequences
3D shows nothing the race does not compute: no 3D-only physics, no wave
effect on speed. Multiplayer stays 2D until its client gets the same view.

### Verification
`src/features/race-3d/pose.test.ts` (sails to leeward on both tacks, eased on
the bear-away, the boat where the race has it, the next mark the race counts);
`src/data/venues/geometry.test.ts` (the race shore starts at the 2D waterline,
stays out of the race area, faces up); `e2e/smoke.spec.ts` (3D on, then back
to 2D with the race clock still running).

---

## ADR-0007 - Race difficulty slows the bots, not the force model

**Date:** 2026-10-22
**Status:** accepted

### Context
The game audit (`docs/audits/2026-10-22-game-audit.md`, A1) found that the
difficulty a learner picks changed only the number of rivals. The website
defined `aiSkill` and `aiSpeedMul` per level and the app a `skill` per bot,
but nothing read them, and `stepBoat` accepted a `speedMul` it ignored: "calm
opponents" on Easy sailed exactly like Hard. Difficulty could slow the bots
(a handicap), make them steer or trim worse, or both. Worse steering touches
the autopilot geometry that every course and the server rely on; worse trim
changes the shared force model.

### Decision
- A bot makes a share of the speed the force model gives: `speedMul` in
  `stepBoat` (`src/lib/race-physics.ts`, clamped 0.5 to 1.2) and `skill` in the
  app's `mobile/src/game/ai-boats.ts`. The force model is fed back its own
  speed, so the handicap never compounds; a contact slow-down still carries.
- Website levels keep their designed values: Easy 0.78, Medium 0.92, Hard
  1.02, with a 3% spread between bots. The app keeps its tiers (Easy 0.78 to
  0.86, Medium 0.86 to 0.94, Hard 0.93 to 1.0).
- The player and the multiplayer server pass nothing and sail exactly as before.

### Consequences
On the standard course the autopilot finishes in about 98 s at Easy, 84 s at
Medium and 76 s at Hard. A bot's sails still show full trim at reduced speed;
steering and trim skill stay a later option (it would need its own tests on
every course).

### Verification
`src/lib/race-course.test.ts` "bot difficulty" (Easy clearly behind Medium,
Medium behind Hard, all finish, no handicap equals `speedMul` 1);
`mobile/src/game/race.test.ts` (the slowest hard rival beats the fastest easy
one); `src/lib/race-physics.drift.test.ts` (server physics regenerated).

---

## ADR-0008 - One race, one three.js scene, WebGPU with the WebGL2 fallback

**Date:** 2026-10-24
**Status:** accepted (owner, 2026-10-24)

### Context
The owner saw the app's solo race and called the boat "ugly and not 3D, old;
it should be modern, like a game". The app's main race is a flat Skia
drawing; the 3D race with the real yacht is a separate WebView entry, online
only. The concept `docs/design/game-graphics-concept.md` compared art
directions and engines (native WebGPU in React Native, Filament, expo-gl,
Babylon React Native, Unity as a Library, Godot, PlayCanvas).

### Decision
- One race, rendered by one three.js scene for the website and the app. The
  "map" becomes the same scene with a high tilted camera ("tactical"); the
  view from the stern is a second camera. The Skia race goes once the 3D race
  works offline in the app.
- Default camera, revised 2026-10-31 (owner decision #5 of
  `docs/audits/2026-10-30-game-roadmap.md`, M2-1): the default is the free
  orbit around the yacht, fitted exactly like the trainer, not the tactical
  view this ADR first named. TestFlight feedback TF07
  (`docs/audits/2026-10-28/testflight-feedback-review.md`) came from a race
  seen in the distant view from above: the player missed the wind direction
  and the boat's angle to it and could not find the free rotation known from
  the trainer; the close orbit gives that rotation and shows the sails and the
  boat's angle to the wind.
  Three cameras live in the one scene and a tap on it steps through them:
  around the boat (default) -> behind (a chase camera that follows the
  course and comes back behind the stern 1.5 s after a manual orbit or zoom;
  one cut instead of an eased return under reduced motion) -> above (the
  tactical camera, upwind at the top). The choice is remembered
  (`regatta.race.camera.v1`). Math: `src/features/race-scene/camera.ts`,
  `src/features/race-scene/orbit-camera.ts`.
- The scene renders with `WebGPURenderer` and TSL node materials: WebGPU where
  the browser has it (Safari and WKWebView from iOS 26), WebGL2 otherwise
  (the iOS Simulator, older devices), with the same shaders.
- Art direction: stylized and clean (flat-shaded land, water in a few tones
  that shows the wind, white wakes, one warm palette), tactical lines drawn on
  the water. Not photorealism.
- It starts as a vertical slice beside the current 3D race, switched on by
  `?scene=next` on `/game`, and replaces it only after it is measured on a
  real iPhone.

### Options considered
- Native WebGPU canvas (`react-native-webgpu` 0.19): same TSL scene natively,
  but pre-1.0, a shadow crash on Expo 54 and an unmeasured size cost. Kept as
  a later spike if the WebView falls short.
- Filament: a second scene and shader pipeline. Rejected.
- expo-gl: three r163+ does not render on it. Rejected.
- Babylon React Native: old architecture only. Rejected.
- Unity or Godot: fork the TypeScript physics or bridge it every frame, plus
  a rewrite of UI and languages. Rejected (game audit, section 3).

### Consequences
`onBeforeCompile` and `EffectComposer` do not run under `WebGPURenderer`, so
the race water, sky and effects are written in TSL. The 3D Boat
(`/simulator2`) keeps its WebGL scene until its own lane moves it. Gust
patches on the water wait for the wind field of game audit A2 (its own ADR),
so the slice shows only what the race models: one wind direction and
strength.

### Verification
The slice reports its backend (WebGPU or WebGL2) and frame rate with
`?fps=1`; it must hold 30 FPS or more on the owner's iPhone and render on the
iOS Simulator through the WebGL2 fallback.

### References
`docs/design/game-graphics-concept.md`, `docs/audits/2026-10-22-game-audit.md`,
ADR-0006 (the 3D race is a view of the same race).

---

## ADR-0000 template (for new entries)

```
## ADR-NNNN - Short decision title

**Date:** YYYY-MM-DD
**Status:** proposed | accepted | superseded by ADR-NNNN | rejected

### Context
Why is a decision needed? What's the situation?

### Decision
What did we pick?

### Options considered
List all serious options, why each was accepted or rejected.

### Consequences
What does this commit us to? Positive and negative.

### Verification
How do we know the decision is working?

### References
External links, prior ADRs, MEMORY.md entries.
```


## ADR-0009 - Offline solo Pro controls and educational race assistance

Date: 2026-10-24. Status: accepted by owner request.

The solo race uses the shared force model and the same controls convention as the trainer: sheet tension is 0 eased, 1 sheeted in. The display uses ease and converts with 1 - ease. Simple mode automatically trims sheets; deployment, furling and reefing remain explicit. Pro uses manual sheets, twist and deployment. No VPP constants change.

The solo player's responsive steering assistance is opt-in in the race adapter, 40 degrees per second at speed, with 20 percent low-speed authority. It shortens the control response compared with the legacy 22 degrees per second, and is an input assistance rather than a claim of physical rudder realism. Bots, multiplayer and existing replay consumers retain legacy defaults.

Read-only route guidance proposes a sailing heading and mark approach without steering or advancing gates. Optional educational rules cover a conservative subset of RRS 2025-2028 (10, 11, 12, 14, 29.1, 31 and course completion). Hull circles and limited liability detection cannot replace a real umpire; uncertain situations do not receive time penalties. Contact +5 seconds and mark touch +3 seconds are explicitly custom game-training penalties, not the turns specified in RRS 44. A false start requires returning behind the line.

Source: World Sailing RRS 2025-2028, corrected July 2025, https://media.sailing.org/sailing/wp-content/uploads/2025/07/29083752/2025-2028-RRS-with-Changes-and-Corrections.pdf . Unit tests and numeric probes cover these model contracts.


## ADR-0010 - Foreground simulation time and explicit lifecycle boundaries

Date:2026-10-25. Status:accepted for the next checkpoint after delivered61. Scope:shared fixed clock and its existing hosts; no Golden VPP constants.

### Context

A ready3D scene can render at2-3FPS on software GPUs. The previous clock discarded every interval over250ms, yielding zero simulation ticks forever. Background/pause protection was conflated with foreground frame rate. Main pre-deploy tests exposed0:00 despite a ready yacht; screenshot spacing is supporting evidence, not a direct RAF timing measurement.

### Decision

Keep integration at1/30second. Accept ordinary active foreground gaps up to2seconds with a maximum60steps per advance and only fractional remainder. Drop longer, backward or invalid discontinuities. An explicit synchronize(timestamp,active) anchors ready/pause/visibility/enabled transitions, clears elapsed/remainder and preserves cumulative ticks. Reset is reserved for a new session/race. All existing hosts provide lifecycle boundaries so short hidden intervals without any hidden RAF cannot enter catch-up. The race retains manual resume after hiding. HUD publication reads the end of a catch-up batch. No forced scene-ready,2D test replacement or relaxed clock assertion is permitted.

### Consequences

At2/3FPS simulation time advances correctly, although visual motion is still low frame rate. This does not certify physical FPS/heat or eliminate the need for renderer performance work. Gaps above2seconds remain a bounded discontinuity policy. Old stored timestamps/replay tracks and the physical1/30step remain unchanged.

### Verification

Equal exact trajectories at2/3/5/10/15/30/60/120FPS, jitter/remainder/bounds, hidden/resume without hidden frames, short pause, enabled/ready and stale cleanup, cold shader startup, giant/backward/invalid time. Keep real3D browser clock and named-control assertions. Check installed native background/foreground independently before native62 delivery.

### References

`src/features/sailing-lab/runtime/fixed-clock.ts`, `src/lib/race-clock.test.ts`, `docs/audits/2026-10-25/release62-harness.md`.

## ADR-0011 - Versioned physical solo courses and shared trainer kinematics

Date:2026-10-25. Status:accepted for implementation after ADR-0010. Owner selected physical scale like the trainer, with different short and long courses. Delivered61/tagged37c7079 and legacy records remain immutable.

### Decision

New physical solo races share the trainer motion laws:1kn=0.514444metres/second, helm22degrees/second with the same speed authority/low-speed assist, course assist45degrees/second with the same heading approach. Extract a pure shared kinematics helper while preserving the existing trainer numerically. Golden VPP constants remain unchanged. Coordinates continue using race-world-v1 at0.6metres/unit, so physical displacement is0.8574066666666668units per knot-second. Default no-context race/server functions retain legacy behavior.

Provide three independently defined metric profiles, initially120/300/600metre windward legs, with declared time limits, preview and honest approximate duration. The yacht, equipment, collision envelope and turn law retain the same metric size across distances. Route/gate geometry uses measured clearance and the same physical planner descriptor as the water ribbon. No direct player speed cap or automatic route steering is introduced.

Model/profile/geometry revision identifies PB, results, intents, history, replay, daily/mission conditions and global result classes. Missing metadata means legacy; unknown explicit future metadata yields an unsupported state, never pixel coordinates or a replacement standard course. Preserve old rows/IDs/progress and exact replay positions/timestamps. Never compare old accelerated times to physical course times. Multiplayer remains server-authoritative with unchanged legacy defaults until separately versioned.

Metadata readers and server class partition precede new physical emission. Freeze course/context before countdown. Long duration uses per-profile limits, bounded recorder payloads and immediate durable final player result; remaining-fleet computation must not block the UI or mark normal long-course opponents DNF after15seconds. New daily/mission conditions are explicitly versioned and deterministic across installed/browser/server sources.

### Verification

Trainer numerical parity, real metre/second and turn-radius checks, legacy bot/WS differential, all profiles/winds/start/rounding recoveries and delayed manual heading entries, immutable advice, collision-only movement cannot award gates, bounded long record/replay/API payloads, class-separated PB/global ranking and old-record readability. Follow the ordered62harness and exact native/web release gates before enabling/publishing the new model.

### References

`docs/audits/2026-10-25/release62-harness.md`, `src/features/sailing-lab/runtime/session.ts`, `src/lib/race-physics.ts`, `src/lib/race-native.ts`, `src/lib/race-replay.ts`.

## ADR-0012 - Paired learning visuals and bounded completion stages

Date:2026-10-26. Status: accepted for the completion program; a complete Swift engine migration is not approved by this ADR.

### Context

The owner accepted the independent audit, requested clearer realistic learning illustrations alongside schemes, local training without live weather, a visible free-radio transcript, configurable courses/help/judging and recoverable repository cleanup. The installed65 lesson drill also exposed an unsupported native Skia accessibility setter.

### Decision

- Preserve reviewed schemes and add a named Scheme/Picture choice. Generated images illustrate recognizable shape; they never define rigging, force coefficients or passing truth. Arrows/labels use reviewed coordinates and localization outside the raster. An image view is not learning completion.
- Prioritize full PL/RU/EN acceptance. Keep existing additional locales, stable IDs, saved answers and question truth. Full adaptation of other languages follows separately; Sternik remains Polish.
- Local synthetic wind is the training default. Remove native trainer live-weather acquisition; multiplayer remains the network-dependent game mode.
- Keep native accessibility actions on supported native Views, not on a Skia drawing surface without the corresponding setter. Preserve gesture input and accessible adjustment.
- Treat live multiplayer, replay viewing and a following historical ghost challenge as different activities. A ghost never collides, claims right of way or changes the live player's physics. New comparisons require the same versioned course/model/conditions.
- Visible radio recognition belongs in a finite session transcript. General diagnostics remain content-free, bounded and separate from recognition/answer text. No automatic upload or audio persistence is introduced.
- Continue the ordered program with rollback commits and separate source, installed, TestFlight and website evidence. A native SwiftUI shell can later reuse the same offline3D/content and versioned bridge; another physics/rendering implementation needs its own measured justification and migration decision.

### Verification

Follow `docs/audits/2026-10-26/completion-program.md`. First close the real Lesson1 -> drill -> control -> return path on the exact installed release. For learning visuals verify technical meaning, PL/RU/EN labels, accessibility, offline assets and unchanged assessment. For speech verify real recording lifecycle, cancellation, absent models and separation of transcript from diagnostics. Physical race activation remains governed by ADR-0011 and its consumer gates.


## ADR-0013 - Actual circular travel constraints for physical fleets

Superseded in part by ADR-0015 (sliding contact).

Date:2026-10-27. Status: accepted for implementation in the unwired physical
engine. Full activation remains blocked by the completion harness.

### Decision

Keep the existing canonical hull/mark envelopes and shared force/helm laws.
Recover existing overlap within coupled hull, fixed hardware and water
constraints before travel, with deterministic ID order and a finite projection
budget. The recovery displacement cannot award a start, rounding or finish.
A nonconverging or malformed frame returns null without changing its caller.

Run all proposed linear segments on one normalized30Hz tick. Advance to each
actual swept impact, then stop the involved bodies for the rest of that tick.
Other boats continue and can encounter a newly stopped hull. Tangential and
separating travel remains free. This is a conservative circular contact model,
not a claim of rigid-body yaw, tangential friction or damage simulation.

Preserve ADR-0004's time-based closing-only bump loss, with the same1kn full
share and1.67decay coefficient. Apply it only to actual closing encounters;
resting, separating and wall-only constraints do not add repeated slowing.
No golden sailing-physics constant or legacy/server function changes.

Progress and following recording use the returned recovered-from to actual
impact-truncated endpoint. The current conservative response never bends that
travel into a different direction within a tick, so this remains one actual
straight segment. A future sliding or impulse model needs a piecewise travelled
path before progression/recording can consume it. Intended paths through a
cancelled future encounter are not contacts or completed travel.

Keep initial contacts separate from actual within-step impacts. Export owned,
immutable metric centres/linear velocities at the common impact fraction,
before any simultaneous body is stopped, plus actual normal closing speed.
A later impact observes the earlier stopped hull's zero velocity. Initial
overlap alone has no established impact speed, and truncated endpoint averages
cannot reconstruct that speed. Wall constraints are not hull/mark encounters.
This transient evidence adds no fault decision, penalty, journal or recording.

### Verification

Initial overlap, coupled water/committee recovery, no tunnelling, simultaneous
and later impacts, tangency and escape, unchanged free travel/finished boats,
actual closing loss, deterministic ordering, bounded rejection and no recovery
or obstruction gate credit. Keep the18zero-contact baseline, current game-ID/
difficulty sweep and full unit/source/browser/native gates separate. A failed
expanded bot deadline remains open; it cannot authorize emission or delivery.

### References

`src/lib/race-physical-response.ts`, `src/lib/race-physical-response.test.ts`,
`docs/audits/2026-10-27/physical-response-harness.md`,
`docs/audits/2026-10-26/completion-program.md`.

## ADR-0014 - One boat step for the trainer and the physical race

Date: 2026-10-29. Status: accepted (owner decision 1 in the completion
program: one boat, one force model and one control experience). Supersedes
the part of ADR-0011 where the physical race reused the race force step.

### Context

ADR-0011 shared the heading and metre laws, but the physical race still
called `stepRaceBoatForces`: sheets applied instantly, sails crossed the boat
with no load loss, so a tack cost less in the race than in the trainer. The
same boat behaved differently on two screens.

### Decision

- `src/features/sailing-lab/runtime/boat-step.ts` owns one boat step:
  helm, crew sheet handling (`interpolateControls`), rig transfer and sail
  load (`stepWithRig`), forces and metre travel. The trainer session and the
  player's physical race boat both call it. Golden VPP constants are unchanged.
- The trainer session is a pure refactor onto this step: its pre-extraction
  golden trajectory and full-state digest are byte-identical.
- The physical race boat carries the crew state (`live` sheets, `rig`)
  between steps. Simple mode solves the sheet target every half second as
  before (`raceCrewTrim`); the crew then hauls toward it at trainer rates.
- Helm meaning in the physical race is the shared law: rudder -1..1 turns
  at 22 degrees per second times speed authority, course assist at 45. The
  legacy race keeps its responsive 40 degrees per second (ADR-0009).
- Rudder authority uses the speed the hull actually makes. With no handicap
  that is the model speed; a bot handicap (ADR-0007) scales it.
- Bot crews in the physical fleet keep an instant sail transfer for now
  (`rigTransfer: false`). Giving them the shared crew produced one hull
  contact in 4 of 40 fleet scenarios (a bot tacking under another bot's bow
  in the pre-start, its sails still crossing). Three prediction variants
  moved contacts to other scenarios instead of removing them. Bot avoidance
  needs its own tack-loss model before bots share the crew. Open item,
  addressed by ADR-0015 point 5.
- Records are unaffected: physical emission stays OFF, no physical record
  exists, so `physical-cruiser-v1` keeps its id.

### Verification

`src/lib/race-shared-boat.test.ts`: three inputs (fixed close-hauled helm,
tack under full helm then course assist, bear away with eased sheets) give
the same heading, speed, heel, leeway, held sheets, sail positions and metres
on every tick in the trainer and the race, and a race tack enters the rig
transfer. `session.kinematics.test.ts` keeps the trainer golden. The fleet
suite keeps all 40 zero-contact scenarios.

### References

`src/features/sailing-lab/runtime/boat-step.ts`, `src/lib/race-physical-motion.ts`,
`src/lib/race-shared-boat.test.ts`, ADR-0007, ADR-0009, ADR-0011.

## ADR-0015 - Одиночная гонка в метрах по умолчанию, старая модель для записей, повторов и быстрой онлайн-гонки

Date: 2026-11-01. Status: accepted for implementation (план игры M5, решение 12 раздела 6 `docs/audits/2026-10-30-game-roadmap.md`; владелец: «делай M5 и M6», рекомендации приняты 2026-11-01, можно отменить). Запись метрических результатов и метрическая гонка по умолчанию включаются двумя отдельными переключателями и только после гейтов ниже. Дополняет ADR-0011 и ADR-0014. Заменяет в ADR-0013 правило «после удара тело стоит до конца тика» скольжением (п. 4). Закрывает открытый пункт ADR-0014 о ботах на общем экипаже (п. 5). Константы VPP (`src/lib/sailing-physics/*`, ADR-0001, ADR-0002) не меняются. Номер 0015 корневого `DECISIONS.md` был зарезервирован под это решение (ADR-0019); ADR-0015 в `docs/design/mobile/DECISIONS.md` (шаблон урока) относится к другому журналу.

### Context

- В игре две модели одной лодки. Старая `legacy-race-v1:standard:r1` двигает лодку на 8 единиц за узел в секунду (`src/lib/race-physics.ts:26`) при 0.6 м на единицу, то есть в 9.33 раза быстрее настоящей. На ней сейчас одиночная гонка по умолчанию, рекорды, призраки, медали M4-5 (ревизия порогов 2), классифицированные таблицы Простой и Про (M1-7), миссии, гонка дня и мультиплеер (`ws-server/race-physics.js` генерируется из тех же исходников TS). Метрическая модель `physical-cruiser-v1:short|medium|long:r1` (ADR-0011, ADR-0014) ходит общим шагом лодки с Тренажером: трассы 120 / 300 / 600 м, лимиты 480 / 1200 / 2400 с. Она есть только как проба `/game?race=`, и запись выключена (`PHYSICAL_RACE_EMISSION_ENABLED = false`, `src/lib/race-context.ts:18`).
- Проба «зависает» (разведка M0-13), и причина не в вычислениях. Удар обнуляет обе скорости целиком, касательную тоже (`src/lib/race-physical-response.ts:171`). Бот приводится в мертвую зону ради обхода и меняет курс каждые 0.5 с (`race-physical-bot.ts:203-206, 233`). Правые боты стартуют курсом 315 навстречу игроку (`src/app/game/GameClient.tsx:595`). Флот после финиша игрока не доплывает (`useRaceLoop.ts:362`). HUD показывает скорость модели, а не пройденный путь (`useRaceLoop.ts:320, 657`). Касание не дает ни сигнала, ни звука, ни вибрации (`useRaceLoop.ts:305`). В M0-13 при ветре x1 7 из 18 прогонов с рулем закончились по лимиту времени. Замер 2026-11-01 на копии HEAD e64659ac: игрока вел планировщик бота, который никогда не уступает, 90 прогонов с рулем и автокурсом. Игрок не финишировал в 38 из 90, бот стоял до 2398 с.
- Слой обучения считает в старом масштабе. Судья берет скорость, горизонт 3 с, полосу огибания +70 единиц и порог сближения из старой модели (`src/lib/race-rules.ts:13, 83, 138, 158`). Подсказка маршрута отвергает все три метрические трассы: радиус знака 2.5 единицы меньше 3, лавировка 200 единиц меньше 220 (`src/lib/race-guidance.ts:55, 60`). Сцена умножает скорость следа и пены на 9.33 в любой гонке (`src/features/race-3d/pose.ts:22, 90`, путь через `Race3DView.tsx:85`).
- Тест флота `race-physical-fleet.test.ts` (22 полные гонки: 18 и 4) ходит с ветром `windAt`, а настоящая одиночная гонка с ветром `soloRaceWind` (`useRaceLoop.ts:246`); с этим ветром касания уже бывают. Досчет флота старой гонки тоже использует `windAt` (`src/lib/race-completion.ts:29`).
- У игроков уже есть данные старой модели. Это рекорды, призраки (до 1600 точек, 24 классов, 480 000 символов), медали (до 64 курсов, лишние вытесняются начиная с самых старых, `src/lib/race-medals.ts:81, 131`), повторы `/r/` и нативная история. В приложении эти ряды идут через мост хранилища (`mobile/src/persistence/race-web-storage.ts:11-46`), и установленная сборка проверяет каждый ряд целиком. В `race_results` три вида строк: классифицированные строки старой модели (Простой и Про), неклассифицированные смешанные (одиночные до M1-7, миссии, гонка дня, мультиплеер `ws-server/server.js:369`) и будущие метрические. Старые приложения 1.6.4 и TestFlight 74 читают `/api/leaderboard?difficulty&wind` (`mobile/src/api/leaderboard.ts:42`).

### Decision

1. **Где какая модель.** Свободная одиночная гонка `/game` идет в `physical-cruiser-v1`, то же в приложении, включая гонку урока 8. Трасса выбирается отдельно от уровня: короткая (по умолчанию), средняя или длинная. Уровень по-прежнему означает силу флота (ADR-0007). Ускорения времени нет. Старая модель остается в трех ролях:
   - чтение сохраненных рекордов, призраков, медалей, повторов и нативной истории;
   - мультиплеер, который на всех 7 языках называется «Быстрая онлайн-гонка». Меняется только текст: идентификатор `quick` уже занят повторением за 15 минут (`src/lib/product/catalog.ts:17`);
   - миссии и гонка дня, до отдельного решения. Их цели заданы в секундах старой модели (`src/data/missions.ts`), а классифицированная запись и нативный журнал их не принимают (`src/lib/race-result-eligibility.ts:48`, `mobile/src/persistence/race-native.ts:9`).
   Где играется старая модель, интерфейс помечает ее «классическая».
2. **Один масштаб.** `raceTacticsModel` переезжает из `src/features/race-scene/tactics.ts` в `src/lib/race-scale.ts` и становится единственным источником масштаба для судьи, подсказок, путевой скорости, сторожа, призрака и сцены. Модель задает: метры на единицу, единицы на узел в секунду (8 и 0.857), корпус 13.2 м (одинаковый в обеих), зону знака, границу воды, горизонт судьи (3 с и 8 с), внешний край полосы огибания (70 единиц и `rounding.gateOuterMetres` 26 м) и визуальное ускорение (9.33 и 1). Для старой модели вывод байт в байт прежний.
3. **Класс замораживается с первой записью.** Пока запись выключена, исправления M5 (контакт, боты, старт, лимиты, финиш флота) не меняют `physical-cruiser-v1:*:r1`: записей этого класса ни у кого нет. После включения записи любое изменение, которое меняет время гонки (цена поворота, поле ветра и предстарт из M6), выпускает новую ревизию класса со своими таблицами и порогами. Записи прежней ревизии не пересчитываются и не смешиваются с новыми. Запись без метаданных по-прежнему означает старую модель; неизвестная явная версия дает «не поддерживается».
4. **Контакт скользит.** При сближающемся ударе о корпус или знак каждое тело теряет только свою составляющую скорости в сторону другого. Касательная составляющая остается, толкания нет. У границы воды теряется только составляющая по нормали к стене. Тело, которое за тик ударилось больше трех раз (клин), стоит до конца тика, как раньше. Путь за тик становится ломаной не больше чем из пяти точек. Старт, огибание и финиш засчитываются, только если их пересекает сама ломаная; перемещение восстановления по-прежнему ничего не засчитывает (ADR-0013). Потеря скорости только при сближении не меняется (ADR-0004: полная доля при 1 уз, коэффициент 1.67). По замеру одно только скольжение снижает число гонок без финиша игрока с 38 до 7 из 90.
5. **Боты.** Их параметры это данные класса (`PhysicalCourseDefinition.bots` в `src/lib/race-courses.ts`), а не константы движка.
   - Выход из мертвой зоны. Условие: ход меньше 1 уз при |TWA| меньше 35 град, или касание корпуса при ходе меньше 1.5 уз, держится 1.5 с подряд. Тогда бот уваливается до TWA 75 град в сторону от касающегося корпуса (без касания по знаку TWA, при |TWA| до 2 град по номеру полосы) и держит курс 4 с без пересмотра. Если от корпуса можно уйти только через ветер, бот не поворачивает через ветер на малом ходу, а уваливается, при необходимости через фордевинд, на курс TWA 75, 105 или 150 град любого борта, который больше всего открывает от корпуса без перехода через ветер; если такого курса нет, идет своим галсом (уточнено после ревью шага m5-04). Без чистого кандидата выбор детерминирован, а не «наибольший зазор» между почти равными числами. На малом ходу бот не приводится в мертвую зону ради обхода.
   - Прогноз пути, своего и соседей. Внутри мертвой зоны лодка только катится, ее скорость затухает с постоянной 12 с. Лодку человека бот прогнозирует конусом курсов (текущий курс плюс-минус 30 град) с запасом +2 м и уступает ей, даже когда прав.
   - Общий экипаж. Боты идут через тот же шаг лодки, что игрок и Тренажер (`rigTransfer: true`). Если флоты без касаний не получатся за отведенное время, боты остаются на мгновенном переносе парусов; пункт остается открытым и включение не блокирует.
   - Честный старт. Все лодки идут одним галсом курсом 45 град лесенкой, как в M0-2, в метрах. Разброс скорости ботов задается зерном, которое тесты могут зафиксировать.
   Замер прототипа со скольжением, выходом, общим экипажем и затуханием прогноза 12 с: 1 гонка без финиша игрока из 90 и 0 касаний в 36 флотах ботов. Медиана финиша ботов выросла на 11%.
6. **Лимиты трасс.** С общим экипажем боты в слабом ветре упираются в лимит короткой трассы (475 с при лимите 480). Поэтому до первой записи лимиты становятся 720 / 1500 / 2400 с (короткая / средняя / длинная). Геометрия трасс и класс не меняются: `matchesPhysicalRaceCourse` лимит не сравнивает. Окончательные числа фиксирует тест после шага ботов. Они не превышают 2400 с: повтор вмещает 5000 точек по 0.5 с, а `rawFinishTimeSec` ограничен 3600 с.
7. **Сторож застревания.** Если лодка игрока за 6 с проходит меньше 1 м и при этом касается корпуса или границы воды, игрок получает подсказку на 7 языках «Ты уперся, отверни под ветер», не чаще раза в 30 с. В журнал диагностики пишется событие `race.lifecycle` с действием `stuck`. Автоматического разведения нет: оно двигало бы лодку без команды игрока. HUD метрической гонки показывает путевую скорость.
8. **Флот доплывает.** После финиша игрока оставшиеся боты досчитываются тем же шагом флота и тем же ветром `soloRaceWind`, до своего финиша или до лимита трассы. Досчет идет порциями не дольше 6 мс за кадр, и результат не зависит от размера порций. Время игрока фиксируется на финише и не меняется (ADR-0011). Пока досчет идет, строки ботов помечены «еще на дистанции». Если игрок уходит раньше, оставшимся ботам ставится оценка по их среднему VMG со знаком «~». Места считаются по времени со штрафами.
9. **Судья и подсказки в метрах.** Судья берет масштаб из п. 2. Касания корпусов и знаков в метрической гонке берутся из свидетельств удара шага флота (порог сближения 0.2 уз). Они дают прежние учебные штрафы +5 с и +3 с (ADR-0009), сигнал касания, звук и вибрацию. Подсказку маршрута для метрической трассы строит тот же метрический планировщик, что ведет ботов, на копии лодки игрока. Цели подсказки лежат в воротах, которые засчитывает прогресс. Коридор лавировки имеет полуширину clamp(0.35 x длина отрезка, 40 м, 150 м), и подсказка никогда не указывает в мертвую зону. Подсказка не рулит и не засчитывает ворота (ADR-0009). Первые подсказки M4-7 и проверка пропущенного знака тоже работают в метрах.
10. **Записи несут класс и режим.** Рекорд, призрак, медаль, карточка главного экрана гонки, результат для таблицы, повтор и снимок для приложения пишутся с явными `raceContext` и `mode`; метрическую запись без них отвергают везде. Писать ли запись, решает одна функция `raceRecordsEnabled(context)`: для старой модели всегда, для метрической по флагу. Призрак длинной гонки прореживается по времени до 1600 точек; начало, конец и время огибания сохраняются. Когда ряд призраков переполнен, первыми вытесняются классы, которые текущая сборка больше не играет. Константы хранилища не меняются, потому что их проверяют установленные сборки: 1600 точек, 24 класса, 480 000 символов, 64 курса медалей, 16 000 символов в ряду медалей.
11. **Ничего заработанного не теряется.**
   - Ни одна строка `race_results` не обновляется и не удаляется.
   - Локальные ряды не переписываются при чтении.
   - Запись одного курса никогда не вытесняет заработанную медаль. Если места нет, новая медаль не сохраняется, и экран результата об этом говорит.
   - Ряды, которые пишет новая сборка, читаются валидаторами сборки 74 без потери записей, так что откат TestFlight безопасен.
   - Новый ключ хранилища гонки попадает в белый список моста `RACE_WEB_STORAGE_KEYS` в той же сборке.
12. **Таблица лидеров.**
   - Фильтры: «Трасса» (короткая, средняя, длинная, «Классическая трасса»), режим Простой или Про, уровень, ветер.
   - «Классическая трасса» это прежние классифицированные таблицы старой модели, теперь только для чтения.
   - Неклассифицированные строки до момента переключения уходят в свернутый «Архив: режим не записан» и больше не ранжируются вместе с новыми.
   - Запрос `/api/leaderboard?difficulty&wind` без новых параметров отвечает как раньше: им пользуются старые приложения.
   - Результаты мультиплеера получают отдельный список «Быстрая онлайн-гонка» по полю источника, которое ставит ws-server. Поле только группирует показ и не дает больше доверия, чем сегодняшняя открытая запись.
   - У метрической трассы своя нижняя граница правдоподобного времени, от длины трассы.
13. **Медали.** Метрические классы получают пороги по методу M4-5: медиана пяти разбросов флота, серебро по самому медленному боту в темпе гонки, золото по самому быстрому и только без подсказок маршрута и трима, более сильный флот не легче. Пороги считаются на ботах после п. 4-6, с ветром `soloRaceWind`. Бронза дается за любой финиш до лимита своей трассы. Ревизия порогов 3; строки старого класса не меняются. Миграция никогда не снижает медаль: после ревизии 3 каждая сохраненная запись показывает не меньше, чем до нее. Старые медали не переносятся в метрические записи (времена несравнимы, ADR-0011). Они показываются рядом как «Классическая трасса» того же уровня и ветра, и общий счет медалей на экране складывается из обеих частей, поэтому после переключения не уменьшается.
14. **Сцена в реальной скорости.** Поза, след, пена и брызги берут визуальное ускорение из модели: 1 в метрической гонке, 9.33 в старой и в ее повторах. След метрической гонки задается длиной: жизнь 40 с, шаг 1 м, 110 точек, около 100 м за кормой при 5 уз. Тактическая камера метрической гонки ближе: около 90 м в портрете и 100 м в альбоме вместо 150 и 165 м, если проверка в браузере это подтвердит. Волны остаются в мировом масштабе. Повтор передает сцене класс своей записи; у метрического повтора есть скорость 8x.
15. **Включение двумя переключателями, каждый откатывается сам.**
   - Переключатель A: `PHYSICAL_RACE_EMISSION_ENABLED = true`, гонкой по умолчанию остается старая. Метрические записи пишет только `?race=`.
   - Переключатель B: метрическая гонка по умолчанию (`PHYSICAL_RACE_DEFAULT_PROFILE = "short"`) и момент отсечки архива.
   - Откат любого переключателя не трогает метрические записи; при следующем включении они снова читаются.
   - Сайт и TestFlight выпускаются только с согласия владельца. Офлайн-пакет гонки и нативная оболочка приложения выпускаются вместе, а серверная часть таблицы попадает на прод раньше клиентов.

### Owner decisions (2026-11-01)

Ответы владельца на открытые вопросы плана M5, приняты 2026-11-01, можно отменить:

1. Трасса по умолчанию это существующая короткая (отрезок 120 м) на всех уровнях. Новой геометрии «спринт» нет.
2. Переключатель A (метрические записи) включается в M5 с классом r1. M6 позже выпускает r2 со своими таблицами и порогами; таблицы r1 остаются только для чтения.
3. Миссии и гонка дня до конца M5 остаются на старой модели с пометкой «классическая», со своими таблицами и старыми медалями.
4. Классические медали показываются рядом с метрическими под заголовком «Классическая трасса». Ничего не теряется и не понижается.
5. Таблица онлайн-гонки строится по метке источника `race_source='online'`, которую ставит ws-server. Ни секрета, ни токена.
6. Если флоты ботов на общем экипаже не удается сделать без касаний за разумное время, боты выходят с мгновенным переносом парусов, а пункт остается открытым на M6 (п. 5).
7. Каждый деплой сайта и каждая загрузка в TestFlight только после явного «да» владельца. Поэтому в коде M5 `PHYSICAL_RACE_EMISSION_ENABLED = false` и `PHYSICAL_RACE_DEFAULT_PROFILE = null`, а каждый переключатель включается одной строкой. Переключатель A ждет серверную часть таблицы (шаг M5 m5-08) на проде, переключатель B ждет приемки владельца на iPhone. Состояние переключателей ведет `docs/STATUS.md`.

### Options considered

- Оставить старую модель по умолчанию, а метры пробой: две разные лодки на двух экранах, что противоречит ADR-0014 и решению 12.
- Ускорить время метрической гонки: руль, перенос парусов и цена поворота перестали бы совпадать с Тренажером.
- Привязать длину трассы к уровню: новичок на «Сложном» получил бы гонку на 10 минут, а таблица смешала бы силу флота и длину трассы.
- Полная остановка при контакте плюс одна подсказка: 38 из 90 гонок без финиша.
- Проекция перемещения при покоящемся контакте в начале тика (один отрезок за тик): проще для прогресса, но не измерена и не помогает при ударе внутри тика. Скольжение с ломаной измерено.
- Толкание (обмен импульсом по нормали): ADR-0004 отклонил его как слишком сильное изменение ощущения, а блокировку снимают и без него.
- Только выход бота из мертвой зоны: хуже (44 из 90), бот снова застревает в стоящей лодке.
- Прогноз с быстрым затуханием, 3 с: 8 касаний в 36 флотах.
- Автоматическое разведение лодок: двигает лодку без команды игрока и может засчитать путь.
- Перенос старой медали в метрическую запись как нижней границы: сохраненная медаль постоянна (`src/lib/race-medals.ts:62-65`). Получилось бы метрическое золото без единой метрической гонки, и откат не вернул бы прежнее состояние.
- Удалить или переписать смешанные строки таблицы: необратимо и ломает старые приложения.
- Один переключатель: нет промежуточного состояния, в котором метрические записи уже пишутся, а игроки еще на старой гонке.
- Перевести на метры сейчас же мультиплеер, миссии и гонку дня: это сервер и протокол (около 8 дней, следующий сезон), новые цели миссий и версия условий. Это отдельные решения.

### Consequences

- Гонка становится длиннее. По прототипу игрок проходит короткую трассу примерно за 190 / 274 / 392 с (ветер x1.3 / x1 / x0.65), среднюю за 355-672 с, длинную за 616-1172 с. Время на кнопках трасс берется из измеренной таблицы и показывается со знаком «~».
- Новые таблицы начинаются пустыми. Классическая трасса и архив видны, но свободная гонка их больше не пополняет.
- Боты на общем экипаже медленнее примерно на 11%, поэтому пороги медалей считаются после этого изменения. Пороги взяты от ботов, а не от людей, и после M6 их придется пересмотреть.
- Классические медали и рекорды остаются на своих курсах; миссии и гонка дня продолжают их пополнять.
- Досчет флота и длинная гонка стоят CPU; на iPhone нужен замер `race.perf`.
- JS-бюджет 6.6 МБ не поднимается, хотя модуль метрического флота становится обязательным.
- Приложение получит изменения только с новым офлайн-пакетом гонки и новой сборкой.
- Скольжение (п. 4) сделано шагом m5-03 и замерено 2026-11-01 на гейте полной гонки: игрок без финиша в 4 из 90 ячеек короткой и средней трасс вместо 27, всего красных 25 вместо 30. В 24 из 25 красных ячеек (и во всех 14 красных длинных) стоит бот носом к ветру (средний |TWA| 6-8 град), и на 84-100% тиков его стоянки к нему прижат другой корпус (обычно игрок, который не уступает): каждое сближение снимает с него потерю ADR-0004, хотя сам он в другую лодку не идет. Это и левентик (п. 5), и прижим. Открытый вопрос к ведущему: начислять ли потерю ADR-0004 только телу, чья собственная скорость по нормали направлена в другое тело. Проба на 8 таких ячейках 2026-11-01 (не закоммичена) сделала зелеными 7; без такого решения выход из левентика (шаг 4) один эти ячейки может не закрыть. Сейчас потеря начисляется обоим телам, как в ADR-0004. Потеря ADR-0004 начисляется за каждое сближение и при долгом трении: две лодки, которые 5 с идут курсом 5 град друг в друга, проходят 0.31 свободного пути (до скольжения 0), при 15 град 0.20. Скорость HUD пока считается по хорде тика, не по ломаной. Излом у границы воды из шага лодки доходит до прогресса, если в том же тике лодку не изменило касание; тело, измененное касанием, ведется по хорде, и его излом у границы заменяют изломы касания (до ворот там больше 22 единиц, засчитывание не меняется).
- Боты, старт, лимиты и сторож (п. 5-7) сделаны шагом m5-04 и замерены 2026-11-01. Гейт полной гонки зеленый целиком: 90 из 90 ячеек короткой и средней трасс и 45 из 45 длинной (`RACE_GATE_LONG=1`), список известных провалов пуст; самая долгая стоянка управляемой лодки 0.1 с, самый медленный бот в гейте (ветер x0.65) 456.9 / 811.6 / 1477.8 с при лимитах 720 / 1500 / 2400 с; во флоте из пяти ботов с `soloRaceWind` x0.65 на короткой трассе последний финиширует на 614.3 с (85% лимита), это самый тесный запас. После ревью (выход без поворота через ветер) замер 2026-11-01: в гейте 442.3 / 811.6 / 1489.7 с, пять ботов с `soloRaceWind` x0.65 на короткой 410.3 с, на средней 813.4 с; самый тесный запас теперь у длинной трассы, 62% лимита. 36 полных гонок флотов ботов на общем экипаже без касаний, все финишируют, каждый бот проходит поворот через маневр `tacking` общего экипажа, поэтому общий экипаж оставлен (`rigTransfer: true` для всех) и отката к мгновенному переносу нет. Старт из лесенки: за первые 20 с у пяти лодок ни одного события по правилу 10; со старыми курсами 315 у правых ботов 3 таких события.
- Отступление от п. 5 «без чистого кандидата выбор детерминирован»: увал до TWA 75 как запасной выбор дал касания в 18 из 36 флотов ботов (в том числе с судейским судном) и 77 из 90 зеленых ячеек гейта. Запасным остался «наибольший зазор» (0 из 36, 90 из 90); на малом ходу из кандидатов и так убраны курсы в мертвую зону, остаться там может только курс самого маршрута. Увал до TWA 75 работает только в выходе из левентика и прижима.
- Мутации: затухание прогноза 3 с дает касание в 1 из 36 флотов (прототип мерил 8 из 36 на другой раскладке старта); боты на мгновенном переносе парусов красят проверку маневра `tacking` во всех 18 гонках с `soloRaceWind`. Отключенный выход из левентика матрицу гейта не красит (90 из 90 зеленых), как и мгновенный перенос парусов у ботов (90 из 90): в матрице никто не стоит носом к ветру у неподвижного корпуса. Поэтому после ревью в гейт добавлены 4 ячейки выхода (бот рядом с игроком, который бросил паруса); без выхода две из них красные (82.7 с и 31.9 с стоянки). Сам выход проверяют и его тесты (бот и шаг флота). Без конуса вокруг игрока гейт тоже 90 из 90. Со старым стартом (боты в линию через 18.45 м, правые курсом 315) красных 8 из 90 (стоянка бота). Части п. 5 перекрывают друг друга: гейт держится, если убрать любую одну, кроме честного старта.
- Ревью шага m5-04 (2026-11-01): выход из левентика в первой версии всегда уходил «от корпуса» по галсу, даже через ветер. Для бота, стоящего у игрока, который бросил паруса и не двигается, это давало стоянку дольше 30 с: на 35 раскладках (TWA 0 / 10 / 20 / 30 / 45, игрок через каждые 45 град вокруг бота) худшая стоянка 131.3 с (нос к ветру, игрок за кормой), 40.6 с (TWA 20, игрок с носа), 43.4 с (TWA 30). С уточнением п. 5 (увал без перехода через ветер, иначе свой галс) худшая 19.2 с; без выхода совсем 82.7 с. Четыре такие раскладки стали ячейками гейта полной гонки (`escape cell`): две из них красные без выхода и с первой версией выхода. Бот, прижатый с подветра неподвижным корпусом, теперь стоит не дольше 11 с (было 23 с), с носа 5 с (было 32 с), но скользит вдоль корпуса и отходит на 20 м только примерно через 54 с (было 41 с). Это записанный предел, открыт для M6, контракт про 30 с он не нарушает: контракт меряет стоянку (путевая скорость меньше 0.06 м/с), а не расстояние до корпуса.
- Контракт шага m5-04 в точной форме: в каждой ячейке гейта (90 ячеек короткой и средней трасс, 45 длинной по `RACE_GATE_LONG=1`, 4 ячейки выхода) каждая управляемая лодка финиширует до лимита и ни одна не стоит дольше 30 с; флоты из одних ботов не касаются друг друга. Вне гейта стоянка не доказана, есть только пробы: бот на нулевом ходе (TWA 0 / 20 / 45 / -20) рядом с неподвижным корпусом через каждые 30 град в шаге флота из двух лодок стоит не дольше 16.2 с.
- Остаточный риск: в прототипе лодка, которая давит и не уступает, держала бота до 84 с. Гейт требует не больше 30 с, и переключатель B ждет, пока гейт станет зеленым.
- Флот доплывает (п. 8) сделан шагом m5-05 (`src/lib/race-physical-completion.ts`), 2026-11-01. На финише игрока строки ботов «еще на дистанции», досчет идет по кадрам в финишной паузе, на экране результатов и в повторе, а выход в меню ставит оценку «~». Результат тот же при порциях 1 / 37 / 10000 тиков и совпадает с продолжением живой гонки (тот же шаг флота, ветер, судья) байт в байт; в гейте полной гонки это проверено в 72 из 90 ячеек. Время кадра: тик не прерывается, порция кончается, когда потраченное время плюс самый долгий тик этой порции превысили бы 6 мс; на фальшивых часах кадр не дольше 6 мс, на Mac под нагрузкой (load 19) отдельные кадры до 27 мс из-за вытеснения процесса, не из-за досчета. Замер: тик пяти лодок около 0.08 мс, короткая трасса x0.65 (последний бот через 190 с после игрока) 5711 тиков, около 0.45 с CPU, 70-80 кадров; средняя x0.65 10795 тиков, около 0.9 с. На iPhone не мерено. Находка: старый `resolveFinishedFleet` берет `windAt(time)` с зерном 0, а это `soloRaceWind(time)` бит в бит (100000 проверенных моментов), так что расхождения ветра у старого досчета нет; он не менялся. Отступления: шаг флота передается в досчет параметром (модуль флота грузится лениво и в бандл старой гонки не попадает), `soloRaceWind` переехал в `src/lib/race-solo-wind.ts` (`race-model.ts` реэкспортирует его). Оценка «~» видна только после выхода в меню, пока экран результатов не показывается; в нынешнем интерфейсе ее никто не увидит, она нужна для будущих записей и как запасной путь при отклоненном кадре флота. Правки по ревью (2026-11-01): место игрока на финишном тике окончательно, только если ни один бот на дистанции уже не может прийти раньше по времени со штрафом (`playerPlaceSettled`: бот финиширует позже текущего момента, штраф только растет); иначе локальный разбор, запрос коуча и строка `race.summary` ждут конца досчета, а строка `race.summary` с ботами на дистанции ждет его всегда. Живая гонка и досчет кончаются на одном тике лимита (`physicalRaceTimeUp`). Для шага 11: место и число лодок, которые уходят в запись метрического результата, берутся после досчета (тот же момент, что у разбора), а не из строк финишного тика или строк в момент клика; до включения записи путь закрыт.
- Подсказки в метрах (п. 9) сделаны шагом m5-06 (`src/lib/race-guidance-physical.ts`), 2026-11-02. Подсказка маршрута метрической трассы: планировщик ботов на копии лодки игрока, цели в засчитываемых воротах, коридор лавировки clamp(0.35 x отрезок, 40 м, 150 м) вокруг ворот round-east (42 / 105 / 150 м), выход на лейлайн, только когда ворота лежат на 8 град дальше бейдевинда нового галса (гистерезис и запас на дрейф), курс подсказки не ближе 45 град к ветру (мертвая зона 42 + 3). Замер: лодка на курс-ассистенте по подсказке (раз в 0.5 с) одна на трассе при ветре x0.65 / x1 / x1.3 делает 2 / 2 / 3 поворота на лавировке короткой / средней / длинной (предел 2 / 3 / 4; планировщик ботов так же дает 5 / 10 / 17), проходит все ворота по порядку, держится 106-409 м от западного края воды на длинной; с тремя ботами в 12 ячейках гейта 2 поворота. Числа коридора - геометрическая цель, на людях не проверены. Первые подсказки M4-7 включены в метрической гонке: секунды прежние (обычный метрический поворот не дает подсказку «мертвая зона»), подход к знаку за 4 корпуса (за 3-8 с до зоны; 6 корпусов давали 11-55 с). Проверка пропущенного знака взводится в двух метрических корпусах (44 единицы, было 40 единиц). Толкотня на старте метрической гонки 16 с: столько после сигнала игрок честной лесенки по подсказке в среднем ветре проходит два корпуса (в слабом 25.7 с, в сильном 12.0 с). Замер из плана «пока флот не разойдется на два корпуса» не годится: лесенка стоит на 27.2 м (чуть больше двух корпусов), а ближайшая пара потом идет ближе двух корпусов (15-25 м) все первые 60 с при любом ветре и 2-4 ботах, такое окно растянулось бы на всю лавировку. Поэтому взят путь в два корпуса, а с другой стороны его держит тест: первое сближение флота (уступи дорогу, избегай касания, касание) приходит позже 16 с (x0.65 41 с, x1 27 с, x1.3 с четырьмя ботами 17.7 с), окно не прячет настоящую встречу. Ревью шага 6: линия подсказки к воротам round-east проходила в 8.3 м от центра верхнего знака (касание 8.1 м), игрок по подсказке касался знака на короткой трассе в среднем ветре. Теперь прямая подсказки на лавировке (выход на ворота, а в зоне знака и бейдевинд) обходит знак слева не ближе касания + clearanceBufferMetres + `markPassMetres` (3 м, данные трассы): иначе подсказка уваливается по касательной к этому кругу, а если касательная лежит в бейдевинде, берет другой галс. Замер на 3192 стартах под знаком (короткая, три ветра, 77 точек, 7 курсов, 2 и 5 уз): касаний и неправильных огибаний 0 (при 2 м 1, при 5 м 0, при 0 м 10, без защиты 180 из 636 стартов меньшей сетки); со старта гонки x0.65 / x1 / x1.3 касаний нет, с тремя ботами в 18 ячейках гейта у игрока нет штрафов. Открыто для M6: 15 из 3192 стартов далеко от расчетной линии (почти все x1.3, ворота перебраны на правом галсе) проходят мимо узких ворот (8.1-26 м от знака) и заходят еще раз; проба снять гистерезис лейлайна в зоне знака закрывала их, но добавляла лишние повороты на лавировке (5 вместо 2-3), поэтому не принята. Отступление от правила подсказки старой модели: поправка меньше 5 град поперек фордевинда больше не называется поворотом фордевинд (в браузере было «Приготовься к повороту фордевинд» на 1 град перед финишем).

### Verification

- Гейт полной гонки `src/lib/race-physical-human-fleet.test.ts`. Лодка с вводом человека идет общим шагом: руль, автокурс, бездействие; Простой режим и Про со стартовым тримом. Все уровни, ветра x0.65 / x1 / x1.3, ветер `soloRaceWind`, отсчет 3 с, фиксированные зерна. Короткая и средняя трассы идут в обычном прогоне, длинная по `RACE_GATE_LONG=1`. Тест падает, если игрок или бот не финишировал до лимита или если любая лодка во время гонки стоит (путевая скорость меньше 0.06 м/с) дольше 30 с. Финишировавшая лодка проходит ворота по порядку и не быстрее двух лег на 8 уз. На HEAD e64659ac падающие ячейки помечены как известный провал с записанной причиной; они идут как обычный тест, который требует ту же причину промаха, гонку без отклоненного кадра флота и без зависания, а проходящие проверяются как обычные.
- Флоты ботов: 22 сценария `race-physical-fleet.test.ts` плюс те же сценарии с `soloRaceWind` и общим экипажем. Ноль касаний, все финишируют; мутация «затухание 3 с» дает касания.
- Контакт на трех входах:
   - трение бортами: каждая лодка за 5 с проходит не меньше 90% свободного пути;
   - догон на 1 уз: передняя лодка не ускоряется;
   - лобовой удар: обе лодки стоят, потеря скорости как в ADR-0004.
   Кроме того, ломаная засчитывает ворота только при настоящем пересечении, а в 1000 случайных кадров нет перекрытий.
- Судья, подсказка и сцена: для старой модели вывод совпадает со снимками байт в байт. Для метрической одна и та же встреча в метрах дает те же события, когда каждая модель движет лодки своей скоростью.
- Совместимость:
   - литеральные снимки всех рядов сборки 74 читаются без изменений;
   - новые ряды проходят замороженные валидаторы сборки 74 и мост хранилища;
   - в коде нет ни одного UPDATE или DELETE по `race_results`;
   - старый запрос таблицы отвечает как в снимке;
   - ревизия 3 не снижает медаль ни на одной записи, и заработанная медаль не вытесняется.
- У каждой проверки есть мутационная пара, которая краснеет при откате правки. Затем полный локальный гейт из `AGENTS.md`, e2e настоящего финиша короткой метрической гонки на прод-сборке, браузер на 390 px и на десктопе, офлайн-пакет, симулятор и TestFlight по G1-G5.

### References

ADR-0001, ADR-0002, ADR-0004, ADR-0007, ADR-0009, ADR-0010, ADR-0011, ADR-0013, ADR-0014; `docs/audits/2026-10-30-game-roadmap.md` (M5, решения 8 и 12-16); `docs/audits/2026-10-30/m0-13-metric-race-hang.md`; `docs/audits/2026-10-30/m0-13-tack-cost.md`; `src/lib/race-context.ts`, `src/lib/race-courses.ts`, `src/lib/race-physical-response.ts`, `src/lib/race-physical-bot.ts`, `src/lib/race-physical-fleet.ts`, `src/lib/race-physical-progress.ts`, `src/lib/race-completion.ts`, `src/lib/race-rules.ts`, `src/lib/race-guidance.ts`, `src/features/race-scene/tactics.ts`, `src/features/race-3d/pose.ts`, `src/lib/race-ghost.ts`, `src/lib/race-medals.ts`, `src/data/race-medals.ts`, `src/lib/db.ts`, `mobile/src/persistence/race-web-storage.ts`.

## ADR-0019 - Procedural race sound on the one race AudioContext

Date: 2026-10-31. Status: accepted (game roadmap M3-1, owner decisions 3 and
10 of `docs/audits/2026-10-30-game-roadmap.md` section 6, adopted by
recommendation on 2026-10-31 and reversible). Numbers 0015-0018 are taken or
reserved by other entries.

### Context

M1-5 gave the race short signals (start, tack, mark, finish) on one Web Audio
context in `src/lib/sounds.ts`: created or resumed only inside a user gesture
and only while race sound is on, the "ambient" audio session where the
browser has the Audio Session API, mute suspends the context. M3 wants the
race to sound alive (wind, water, sails, winches, contact). The page runs
under a CSP that allows only our own origin, ships offline inside the iOS app
and keeps a 6.6 MB JS budget. Boat 3D (`/simulator2`) already had a
procedural ambience with its own context and its own off-by-default toggle.

### Decision

- Race sound stays procedural: filtered noise beds and envelopes built in
  code, no audio files. The mapping from the boat to the sound is pure and
  tested (`src/lib/race-soundscape.ts`: apparent wind -> wind bed level and
  brightness, boat speed and heel -> water rush and hull slaps, no-go zone in
  both modes or a luff in Pro -> sail flogging); the runtime
  (`src/lib/race-soundscape-audio.ts`) plays it.
- There is ONE race AudioContext, the one of `src/lib/sounds.ts`, and one
  master gain. The soundscape gets it through `raceAudioOutput()`, which never
  creates or resumes a context, so the gesture rule and the mute rule hold for
  it: a muted player never gets a context.
- The beds are built once per race screen on that context; slaps, flogging,
  winch clicks and the contact thud are envelopes on persistent gains, so an
  update or a race event creates no audio node. Updates are applied at most
  about ten times per second with `setTargetAtTime`, throttled on the page
  clock (the audio clock moves in hardware-buffer steps). Pause, the end of
  the finish hold (results), the replay, mute and a hidden page fade it out
  at once; after half a second of silence the sources are stopped until the
  next live update (no idle rendering on those screens); unmount stops and
  disconnects it. The solo race (`/game`) feeds it from the race loop;
  multiplayer (`/multiplayer`) feeds the same mapping from each HUD frame of
  its own boat (`src/app/multiplayer/useMultiplayerSoundscape.ts`), with heel
  0 and the Simple mode, because the server publishes no heel and trims every
  boat; it is silent once our own boat has finished (the room races on, the server
  freezes a finished boat), on the results, in the lobby and while reconnecting.
- Race sound is on by default at a moderate level (decision 3): the master
  stays 0.5 and the soundscape bus 0.7 under it, below the signals. The
  "ambient" session makes the iPhone silent switch silence it and lets it mix
  with the player's own music.
- No music in the race (decision 10).
- Any future sample is CC0 only, served from our own origin (in the
  repository and in the offline bundle), at most 300 KB for all race samples
  together. The licence and source of each file are written next to it.
- Boat 3D follows the same race sound setting: while race sound is off its
  ambience stays off and builds no context, and a running ambience goes
  silent when race sound goes off. Pressing its Sound button asks for sound,
  so while race sound is off that press turns race sound on as well (the
  button never does nothing); turning the ambience off leaves race sound as
  it is. Each press first saves the race sound in force as an explicit
  choice, so the trainer `sound` preference the screen writes next (which
  `writeControlPrefs` mirrors into the old race key) cannot switch the race
  silent. It reads the setting from `src/lib/race-sound-pref.ts`, which has
  no audio code, so `/simulator2` never installs the race gesture listeners.

### Rejected

- Music in the race: it competes with the signals and the wind, the cue the
  sailor actually needs, and was not asked for.
- Samples from an external CDN or sound library: blocked by the CSP (one
  domain cost an incident already), absent offline, and of unclear licence.
- A second AudioContext for the soundscape: two contexts would split the
  mute, the gesture unlock and the audio session, and iOS limits live
  contexts. Open item: Boat 3D still owns its legacy context
  (`src/features/simulator-3d/audio/useSailAudio.ts`); moving it onto the race
  context belongs to the Boat 3D lane.

### Verification

`src/lib/race-soundscape.test.ts` (three inputs: calm drift, upwind in a
breeze, in irons; monotonic wind and water; silence when paused, muted or
without a reading; luff only in Pro), `src/lib/race-soundscape-audio.test.ts`
(shared context and master, no context for a muted player, beds built once,
no node per update, ten updates per second, silence on pause, mute, hidden
page, dispose), `src/app/game/useRaceLoop.soundscape.test.ts` (the actual
race loop feeds it at the HUD cadence, thud on contact),
`src/app/game/useRaceSoundscape.test.ts` (live only in countdown and race,
off on pause, mute, results, replay, menu; disposed on unmount),
`src/features/simulator-3d/audio/useSailAudio.test.ts` (Boat 3D presses
through the real race and trainer settings). Still owed: hearing it on the
owner's iPhone, normal mode and silent switch (M3 done criterion), FPS on the
phone, multiplayer. Known older gap (M1-5, not changed here): any other
trainer settings write by a player with no race sound choice yet mirrors
`sound: false` into the old race key and so mutes the race.

### References

`src/lib/sounds.ts`, `src/lib/race-sound-pref.ts`, `src/lib/race-soundscape.ts`,
`src/lib/race-soundscape-audio.ts`, `src/app/game/useRaceLoop.ts`,
`src/app/game/useRaceSoundscape.ts`, `src/app/game/GameClient.tsx`, `docs/audits/2026-10-30-game-roadmap.md` (M3),
ADR-0008.

## ADR-0020 - Harbour mode low-speed model for Manoeuvres (pointer)

Date: 2026-11-01. Status: accepted (owner decision 2026-11-01: a Manoeuvres
section on our yacht, with docking). The full text, numbers and verification
live in `docs/design/harbour-manoeuvres-backlog.md` section 7; this entry is
the pointer so the ADR list stays complete.

- The boundary "no rudder dynamics and no yaw" (ADR-0001 "NOT building",
  `AGENTS.md` "Границы продукта") is lifted only for harbour mode: low speed,
  the Manoeuvres section (`/manoeuvres`, `src/features/manoeuvres/`).
- The model is its own pure TS module `src/lib/harbour-physics/` (3 degrees of
  freedom: surge, sway, yaw; engine with prop walk, rudder in the prop wash,
  windage, contacts and mooring lines). It only reads `DEFAULT_BOAT` length,
  displacement and hull drag from `src/lib/sailing-physics/*`; no constant of
  the VPP engine changed.
- Race physics, the Trainer, Basics, Boat 3D and the multiplayer server
  physics are unchanged and never import the harbour model.
- Behaviour tests: `src/lib/harbour-physics/step.test.ts`,
  `src/features/manoeuvres/runner.test.ts`.
