# Sprint 5 Dev-A status (Simulator V2)

Lane: Mobile, Dev-A. Branch: `app`. Date: 2026-05-12.

Goal of the sprint per PM brief: take the Skia simulator from "manual
trim with +/- buttons" to "Simulator V2": slider trims, three modes
(Free / Drill / Mission), three sample missions and three drills, and
visible per-tick sail feedback (LUFF / STALL / OVERTRIM / GOOD).

---

## Files changed

Created:

```
mobile/src/design-system/components/Slider.tsx     (Pan-driven slider)
mobile/src/simulator/missions.ts                   (drill + mission specs)
mobile/src/simulator/sail-feedback.ts              (sail-state derivation)
```

Edited:

```
mobile/src/design-system/components/index.ts       (+ Slider export)
mobile/src/simulator/use-sim-loop.ts               (mode + drill + mission state, sail feedback)
mobile/app/simulator/index.tsx                     (mode bar, mission HUD, sliders, sail badges, mission marks)
```

No edits to other lanes (`mobile/app/bootcamp/*`, `mobile/app/index.tsx`,
or any other route). No new dependencies.

---

## Mode / drill / mission UX

Top of the screen now has a 3-pill switcher: `Free | Drill | Mission`.
Switching mode resets the boat, controls, drill timer and mission
progress. The old top-right `RESET` button stays and routes through the
same reset path.

- **Free** = the v0.6 sandbox unchanged: wind compass, boat steer, manual
  trim, no scoring. The fixed yellow "course" placeholder dots and the
  green course-line are only drawn in Free mode now (they were
  decorative; Mission mode draws real marks instead).
- **Drill** = single-objective exercise. Live progress bar + a counter
  string ("TWA held: 22 / 30 sec"). The objective predicate runs once
  per tick (30 Hz); the timer advances only on ticks where the predicate
  is true, so the player has to actually hold the condition. Drills are:
  - `twa45`: hold |TWA| in [40, 50] for 30 s.
  - `noGo`:  keep |TWA| >= 30 for 60 s.
  - `reach90`: hold |TWA| in [80, 100] AND trimScore >= 70 for 30 s.
  Drills end at "done" with a small panel and a "Try again" button.
  The user can swap drill from a chip strip below the canvas.
- **Mission** = course race. Marks are stored as fractions of the
  canvas bounds so they scale with the device. Capture radius = 30-36
  px. Marks render on the Skia canvas: cyan = next, green = cleared,
  amber = upcoming. A live elapsed timer + distance-to-next-mark show in
  the mission HUD. On finish: a result panel with elapsed + 0-100 score
  (`scoreMission`) and "Try again" / "Next mission" buttons.
  Missions:
  - `windwardReturn`: start at the bottom, windward mark, finish back at
    the bottom. Par 90 s.
  - `beamRun`: traverse the channel once. Par 60 s.
  - `tackTwice`: port mark, starboard mark, top mark. Par 110 s.

All mode / drill / mission UI strings cover RU / EN / PL plus ES / FR /
DE / IT via `tp(..., extras)`. ASCII-only typography; no curly quotes,
no em-dash.

---

## Sail-feedback rules

Pure derivation in `mobile/src/simulator/sail-feedback.ts`, called once
per tick from `use-sim-loop.ts` after the engine tick. Per sail (MAIN /
JIB) the badge state is derived from the existing physics diagnostics
without re-running aero math:

| State    | Predicate                                              | Color           |
|----------|--------------------------------------------------------|-----------------|
| LUFF     | `abs(AWA) < 28 deg`                                    | `colors.danger` (red)    |
| STALL    | not LUFF AND `result.diag.{main,jib}Stalled === true`  | `colors.warning` (amber) |
| OVERTRIM | not LUFF/STALL AND `abs(TWA) in [60, 150]` AND `sheet - optimalSheetFor(twa) > 0.18` | `#f5e26b` (yellow) |
| GOOD     | otherwise                                              | `colors.accentCyan`      |

Where `optimalSheetFor(twa)` mirrors the auto-trim curve in `use-sim-
loop.ts` so the user is rewarded for converging to the same envelope
the auto-trim sailor would pick: 0.85 upwind, 0.55 reach, 0.30 broad,
0.15 run.

Spinnaker special-case: when `sailSet === 'spinnaker'` (|TWA| > 130)
we collapse both badges to LUFF / GOOD only, because the manual-trim
sliders (MAIN/JIB sheet) do not drive the spinnaker model in the
engine, so STALL / OVERTRIM signals would be misleading.

UI: each badge is a 56x18 pill with a 6px dot, positioned absolutely
over the canvas to the left (MAIN) and right (JIB) of the boat. Badges
fade in/out over 200 ms via `Animated.timing` on `opacity`. They are
hidden completely under spinnaker mode for now.

---

## Slider design

Vertical sliders, 22px track + 18px knob with a cyan glow. Picked
vertical because the in-domain mental model is "sheet": pulling the
sheet IN (top of the slider) sheets the sail in. Horizontal would have
worked too but felt arbitrary, and the four sliders side-by-side
(MAIN / JIB / TWIST / REEF) read as a row of mixing-console faders,
which suits the trim-panel role. Each slider:

- Pan gesture drives the value (`runOnJS(true)`, `minDistance(0)` so a
  tap counts).
- Light haptic on touch start.
- Light tick whenever the snapped step index (default 10%) changes.
- Knob has `shadowColor: accentCyan, shadowOpacity: 0.6, shadowRadius: 6`
  on iOS; falls back to elevation 4 on Android.

The AUTO toggle stays a button (matches existing UX). Touching any
slider implicitly leaves AUTO mode (existing `setMainSheet` semantics).

---

## Verification

```
cd mobile && npx tsc --noEmit
```

clean (no output). 

```
cd mobile && npm test -- --silent
```

101 passed / 103, 2 pre-existing failures in lanes I do not own:
- `__tests__/screens/glossary.test.tsx`: looks for "Nothing found" but
  the route now emits "No matches" (Dev-B/Dev-C copy update).
- `__tests__/screens/bootcamp.test.tsx`: looks for `bootcampLessons[0]
  .emoji` but the bootcamp route replaced emoji with `<Icon>` per the
  Sprint 4 designer audit (Dev-B).

Both failures reproduce on the working tree before any of my edits and
do not touch simulator / design-system code I added. Flagged for the
QA / Dev-B sweep.

`npm test -- --testPathPattern simulator` is 16/16 green; the existing
`simulator-tick.test.ts` did not need to change because my edits
preserved `tick.ts` / `types.ts` interface shapes verbatim.

---

## Performance notes

- Tick loop stays at 30 Hz (`setInterval(..., 1000 / 30)`).
- Per tick I add: one `deriveSailFeedback` call (a handful of compares
  and one `optimalSheetFor`); in drill mode one `drill.check(...)` (one
  abs + compare); in mission mode one Euclidean distance + branch on
  capture. Total well under a microsecond on-device.
- Sail-feedback animation runs through `Animated` with `useNativeDriver`,
  not the JS thread.
- Mission marks rendered as Skia `Circle` primitives (2 per mark), not
  `Path`s.

---

## Follow-ups for QA

1. **Window resize / rotation**: mission marks freeze to the bounds
   captured at mount because `buildMissionProgress(...)` is called once
   per `setMissionId`. If a user rotates the device mid-mission, marks
   render at stale coordinates. Acceptable for v1 (portrait-only app
   per `app.json`); add a bounds-watcher in v1.1 if landscape ever
   ships.
2. **Sliders + AUTO trim**: dragging any slider flips AUTO off (this is
   the existing `setMainSheet` etc. behavior). When the user later toggles
   AUTO back ON the auto-curves write back into the slider state on the
   next tick. The UI tracks the new value cleanly but the slider knob
   may visibly jump - by design.
3. **Mission scoring**: linear fall-off `100 - 1.2 * over_par_seconds`,
   floor 40. Tune once playtested - too generous on the easy
   `windwardReturn`, possibly harsh on `tackTwice` for new players.
4. **Wind-on-wing in missions**: downwind missions currently spawn the
   sail-feedback collapse; deliberate, but may confuse a teaching session
   without copy. Consider a "downwind run" hint card later.
5. **Drill predicate slack**: TWA windows are tight (10 deg). The `noGo`
   drill is the most punishing on a fluky helm. We could ramp difficulty
   per drill in a future pass.
6. **Result panel a11y**: result buttons are `Pressable` with `Text`
   children, no `accessibilityLabel`. Picked up by VoiceOver but the
   "Try again" string is recorded twice on the drill panel. Add labels
   in v1.1.
7. **Spinnaker manual trim**: the engine has no spinnaker-specific
   manual control; on a deep run the sliders affect the (hidden) main +
   jib geometry but not the spinnaker forces. PM may want to add a
   "spinnaker" sheet slider in V3, gated to `|TWA| > 130`.

---

## Glossary diff for designers

- "GOOD" badge color = `colors.accentCyan` (#00d4ff) - same as TRIM
  HUD when trimScore >= 78.
- "OVERTRIM" badge uses a custom `#f5e26b` because both `colors.warning`
  (amber) and `colors.danger` (red) were taken by STALL / LUFF and we
  need three discrete colors at a glance. If brand prefers, tokenize as
  `colors.caution` in a follow-up.
- Mission mark sizes: cleared = 7-8 px filled, ring = 30-36 px stroke.
  Tuned for one-tap-of-a-thumb on a 6.7" device but should be re-checked
  on a 4.7" SE.

End of report.
