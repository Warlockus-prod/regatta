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
