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
- Autopilot / rudder dynamics / yaw inertia
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
  "map" becomes the same scene with a high tilted camera ("tactical", the
  default); the view from the stern is the second camera. The Skia race goes
  once the 3D race works offline in the app.
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
