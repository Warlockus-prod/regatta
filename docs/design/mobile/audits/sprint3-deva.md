# Sprint 3 - Dev-A: real VPP physics + interactive wind in the simulator

Status: implementation complete, typecheck clean, all 101 simulator-relevant
unit tests green. The one failing Jest suite (`app/courses/*`) is a pre-existing
reanimated-in-jest module-resolution issue owned by Dev-B; not introduced by
this work.

## Files changed / added

NEW (under `mobile/src/simulator/physics/`, ports of web golden engine):
- `mobile/src/simulator/physics/aero.ts`
- `mobile/src/simulator/physics/balance.ts`
- `mobile/src/simulator/physics/boat.ts`
- `mobile/src/simulator/physics/forces.ts`
- `mobile/src/simulator/physics/index.ts`
- `mobile/src/simulator/physics/simulate.ts`
- `mobile/src/simulator/physics/types.ts`
- `mobile/src/simulator/physics/wind.ts`

NEW Skia helpers:
- `mobile/src/simulator/skia-wind.ts` (arrow grid + path builders for the
  wind layer, no-go triangle, AW arrow at the bow, compass dial arrow)

REWRITTEN:
- `mobile/src/simulator/use-sim-loop.ts` (drives the engine at 30 Hz; keeps
  the legacy public surface so callers do not break, adds `boatExt`, `wind`,
  `setWindDir`, `cycleWindSpeed`, `setWindSpeed`)
- `mobile/src/simulator/types.ts` (kept legacy `BoatState` / `Controls` /
  `SimParams` so the existing jest stub-tick suite still compiles; added
  `WindState`, `BoatStateExt`, `SailSet`)
- `mobile/app/simulator/index.tsx` (wires the wind compass gesture, the
  ambient arrow grid, no-go overlay, AW arrow at bow, kt-cycle button,
  4-cell HUD: HEADING / SPEED kt / TWA / AWA)

UNCHANGED (intentionally - keeps the legacy jest test green):
- `mobile/src/simulator/tick.ts` (still the screen-space stub used by
  `__tests__/simulator-tick.test.ts`. Not consumed by the new loop. A future
  cleanup can fold it into the legacy-surface tests once QA is ready.)

## Physics port - what changed vs the web original

Pure copies (verbatim, only header comment touched):
- `aero.ts`, `balance.ts`, `boat.ts`, `forces.ts`, `simulate.ts`, `types.ts`,
  `wind.ts`, `index.ts`.

Adaptations:
- None at the math layer. The web modules have no React / no DOM imports
  and dropped in cleanly under the mobile `tsconfig` (strict on, both build
  with no errors).
- The `index.ts` re-export surface mirrors the web one so a future
  `@regatta/physics` workspace package per ADR-0003 can swap in by changing
  one import path.
- Test files (`*.test.ts`, `*.fuzz.test.ts`) intentionally NOT copied. QA
  lane owns those if/when we re-verify on mobile.

## Wind UX flow

1. Top-right of the canvas: a circular compass dial with a cyan arrow that
   points in the wind FROM-direction. Drag inside the dial to rotate the
   wind, snapped to nearest 15 deg.
2. Below the dial: a dark pill button showing `<N> kt` and the current
   `TWD <deg>°`. Tap cycles wind speed through `6 -> 10 -> 14 -> 20 -> 6`.
3. Across the playfield: a sparse 56 px grid of small cyan arrows all
   pointing in the wind FLOW direction (FROM + 180), rendered as one
   batched path at ~32% opacity. They re-render whenever wind direction
   changes; no per-tick animation in this pass (kept perf-safe; QA can
   profile and add a phase-driven opacity pulse later).
4. Anchored at the boat: a translucent red triangle, opening 45 deg either
   side of the apparent wind FROM-direction, length 90 px. Updates every
   tick because AWA depends on boat motion.
5. At the boat's bow: a short cyan arrow showing the apparent-wind
   FROM-direction. Length 22 px so it stays close to the hull.
6. Pan-to-steer is unchanged from Sprint 2; the wind-compass region is
   excluded from the steer gesture so the two coexist (composed via
   `Gesture.Simultaneous(windDrag, steer)` plus an in-band hit-test).

## Speed / heading / wind coupling

- The hook keeps two parallel state worlds: a screen-space `BoatState`
  (canvas px, radians, CW from north) for Skia transforms, and a
  compass-degrees / knots `BoatState` from the engine.
- Each tick: heading rotates in screen-space toward the user's pan target
  (clamped to ~40 deg/s); the new heading is fed to the engine in compass
  degrees; the engine returns boat speed in knots; that knots value is
  scaled to canvas px/s for position integration.
- Auto-trim: until the trim panel lands in Sprint 4, `autoTrimFor(twa)`
  picks reasonable sheets/twist so the engine produces the right shape:
  hard sheeted upwind (mainSheet 0.85), eased on a reach (0.55), wing-on-
  wing past 150 deg (`jibSide = -1`, sheets at 0.15). The engine still
  applies the no-go zone luffing automatically; the boat decelerates to
  near-zero speed inside ~45 deg of TWD without any extra gating in the
  loop.
- Spinnaker / main+jib / main-only is auto-picked by `pickSailSet(|TWA|)`
  and exposed as `boatExt.sailSet` for the future trim UI. No render
  consumer in this sprint.

## New tp() strings + langs

Added to `mobile/app/simulator/index.tsx`. All 7 langs covered (ru / en /
pl + es / fr / de / it via the 4th-arg overlay).

- title: Симулятор / Simulator / Symulator + Simulador, Simulateur, Simulator, Simulatore
- previewBadge: "Тяни чтобы рулить" / "Drag to steer" / "Przeciagnij by sterowac" + ES/FR/DE/IT
- previewNote (long instruction string): RU / EN / PL + ES / FR / DE / IT
- headingLabel: КУРС / HEADING / KURS + RUMBO, CAP, KURS, ROTTA
- speedLabel: УЗЛЫ / SPEED / WEZLY + NUDOS, NOEUDS, KNOTEN, NODI
- twaLabel / awaLabel / twdLabel: kept as plain ASCII shorthand `TWA` /
  `AWA` / `TWD` per the spec - no localization needed, accepted in all
  langs.
- RESET button retained from Sprint 2.

ASCII-only typography verified: no em-dash, no en-dash, no curly quotes
in any of the new strings or comments. PL / ES / FR / DE / IT diacritics
dropped in PL per project rules; kept in others where they carry meaning.

## Known follow-ups for QA

- Determinism / golden-fixture parity with web: would be good to copy a
  small `__tests__/simulator-physics.test.ts` from the web suite that
  asserts e.g. "after 30 s on TWA=90, TWS=12, settle in [5.5, 6.5] kn".
  Not done here per scope.
- Performance: the wind-arrow path is a single Skia path with ~30 small
  segments redrawn each render. Not animated yet; if QA wants a breathing
  effect, we have the `phase` field on each `WindArrowSlot` for an opacity
  modulation in a follow-up.
- Stub tick: `mobile/src/simulator/tick.ts` is still imported only by
  `__tests__/simulator-tick.test.ts`. Once QA refactors that test to use
  the real engine, `tick.ts` and the stub `BoatState` / `Controls` /
  `SimParams` types can be deleted.
- The wind-drag gesture uses a screen-space hit test against the dial; it
  intentionally short-circuits when the touch is outside the dial so the
  `Gesture.Simultaneous` composition does not fight the steer pan. If the
  user drags from inside the dial to outside, the wind keeps tracking
  (current behaviour). QA may want to clamp on `onChange` outside-radius.
- KN_TO_PX_PER_S = 6 is a UX tuning constant (a 6 kn cruiser crosses the
  320 px playfield in ~10 s). Easy to expose in settings later.

## Verification

```
cd mobile && npx tsc --noEmit          # exit 0
cd mobile && npm test -- --silent      # 101/101 tests pass; only failing
                                       # suite is the pre-existing
                                       # reanimated-in-jest issue in
                                       # app/courses/* (Dev-B)
```
