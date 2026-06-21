# Sprint 6 - Dev A audit: SkiaYacht primitive

Lane: Mobile / Dev-A. Branch `app`. Build 7 shipped the slider trim panel +
Free/Drill/Mission + sail feedback; this sprint promotes the inline boat
sprite into a reusable Skia primitive whose sails curve and flutter from
trim + apparent-wind angle.

## Files changed

- NEW `mobile/src/simulator/sail-geometry.ts`
  - Pure-math helpers, no React/Skia. Returns boom angle, sail bulge
    ratio, luff flag. Easy to unit-test from QA lane.
- NEW `mobile/src/design-system/components/SkiaYacht.tsx`
  - Layered yacht primitive. One Group rotates the whole boat by
    `headingRad`; sails rotate INSIDE the group from `awaDeg`.
- `mobile/src/design-system/components/index.ts`
  - Barrel export added: `SkiaYacht`, `SkiaYachtProps`.
- `mobile/app/simulator/index.tsx`
  - Dropped inline path builders (`buildHullPath`, `buildDeckPath`,
    `buildCabinPath`, `buildMainSailPath`, `buildJibPath`,
    `buildSpinnakerPath`, `buildBoomPath`), their per-frame angle math,
    and the unused `DEG_TO_RAD`. Replaced the inline boat Group with one
    `<SkiaYacht>` call.

The trim panel, mode pill, mission HUD, sail-feedback badges, drill bar,
wake, no-go cone, apparent-wind arrow, compass and HUD cells are all
unchanged - only the boat sprite was swapped.

## SkiaYacht layer hierarchy

Single rotating Group, drawn bottom-up so the hull sits on top of the
shadow and the sails sit on top of the hull (top-down look).

```
<Group translate=(centerX, centerY) rotate=headingRad>
|
+- Circle hull-shadow        (rgba black @ 0.32 alpha, heel-offset X)
|
+- if sailSet == spinnaker
|    +- Path spinnaker-fill   (cyan @ 0.55 alpha, fwd of bow)
|    +- Path spinnaker-stroke (cyan-bright @ 0.85 alpha)
|
+- if sailSet == mainJib
|    +- Path jib-fill         (white @ 0.92 or 0.65 if luffing)
|    +- Path jib-stroke       (cyan @ 0.7 alpha)
|
+- if sailSet != spinnaker
|    +- Path main-fill        (white @ 0.92 or 0.62 if luffing)
|    +- Path main-stroke      (cyan @ 0.7 alpha)
|    +- Path boom-line        (white-line, stroke, scales with length)
|
+- Path hull-fill             (warm white #f7f9fb)
+- Path hull-outline          (cyan @ 0.30 alpha)
+- Path deck-fill             (deep-slate @ 0.78 alpha)
+- Path cabin-fill            (cyan @ 0.20 alpha)
+- Circle mast-dot            (cyan brand)
+- if AWA in no-go            (Circle danger-ring around mast)
</Group>
```

The hull, deck and cabin are cubic-bezier silhouettes anchored to
`HULL_LAYOUT` constants (mast at -0.16 of length, bow at -0.86, etc),
so the proportions scale with the `length` prop without distortion.

## Sail-geometry rules (sail-geometry.ts)

All angles below in degrees unless stated. The local frame is
boat-pointing-UP. AWA sign convention: positive = wind on starboard.

| Constant                       | Value | Why                            |
| ------------------------------ | ----- | ------------------------------ |
| NO_GO_AWA_DEG                  | 28    | Matches sail-feedback no-go    |
| BOOM_MIN_DEG                   | 8     | Centerline gap (legacy boat)   |
| BOOM_MAX_DEG                   | 78    | Cap; runs past beam reach      |
| BOOM_OFFSET_FROM_AWA_DEG       | 30    | Sail flies 30 deg inside wind  |
| UPWIND_OPT_SHEET               | 0.85  | Hard sheeted close-hauled      |
| REACH_OPT_SHEET                | 0.55  | Beam reach optimum             |
| RUN_OPT_SHEET                  | 0.25  | Eased on a run                 |

`boomAngleRad(awaDeg, sheet)`:
- sign = sign(awaDeg).
- |AWA| < NO_GO -> sign * 8 deg (boat is in no-go, sail snaps in).
- else blended = BOOM_MIN + (max(BOOM_MIN, |AWA|-30) - BOOM_MIN) * (1 - sheet).
  - sheet 1.0 -> boom ~8 deg (close to centerline).
  - sheet 0.0 -> boom ~|AWA|-30 (eased out to the apparent wind minus 30).
- clamp(blended, BOOM_MIN, BOOM_MAX).

`sailCurveRatio(awaDeg, sheet)`:
- |AWA| < NO_GO -> 0 (luffing, drawn flat with wavy edge instead).
- else tent function: 1 at sheet == optimum, falls linearly to 0 at
  |sheet - opt| == 0.45.
- On a run (|AWA| > 150) the result is biased by 0.7 because spinnaker
  takes over the curvature story.

`isLuffing(awaDeg, sheet)`:
- |AWA| < NO_GO -> true (no-go zone).
- |AWA| < 60 and sheet > opt + 0.18 -> true (pinched, leading-edge curl).
- 60 <= |AWA| <= 150 and sheet < opt - 0.30 -> true (sail collapses).
- Otherwise false; the component also OR's in caller-supplied `luffMain`
  / `luffJib` from the sail-feedback derivation, so the sprite always
  agrees with the badge that the user sees.

The luff flutter is a sin wave perpendicular to the luff line, sampled
in 5 segments. The clock comes from `sim.tickN` (no internal raf when
the parent drives), so the flutter stays in sync with the 30 Hz sim.

```
sheet 1.0      sheet 0.5          sheet 0.0
                                       
   |\\            |  \\\\              |       ___
   | \\           |     \\\\           |    ___---
   |  \\          |       \\\\         |  --
   |  /           |  curve  \\\\       |        eased
   | /                       \\        |        out, AWA-30
                                                
```

## Wiring into the simulator

- `awaDeg` flows from `sim.boatExt.awaDeg` (engine diagnostic).
- `mainSheet` / `jibSheet` flow from `sim.controls.*Sheet` (already
  user-driven via the sliders in auto-OFF, or auto-trimmed in auto-ON).
- `sailSet` flows from `sim.boatExt.sailSet` (engine picker:
  mainOnly < 35 TWA, mainJib 35..130, spinnaker > 130).
- `luffMain` / `luffJib` come from `sim.sailFeedback.{main,jib} === 'luff'`
  (the badges and the sprite agree).
- `tickN` is passed through so the flutter clock is driven by the sim
  loop, not a free raf.

## Polar diagram (PointsOfSailDiagram) - DEFERRED

I evaluated swapping the orbiting boat triangle for `<SkiaYacht size=18>`
but decided to leave the polar as-is. The polar boat is an abstract
marker that orbits the polar rim at the speed predicted for the current
heading-to-wind. It does not have AWA, sail sheet, or a sail set; if I
gave SkiaYacht a synthetic AWA (= -heading) the sails would chase the
orbit, and at small marker sizes (~14 px) the curve + flutter become
visually noisy. The current cyan triangle reads as a marker, not a
boat-sim sprite. Recommendation:

- Sprint 7 designer call: do we want the polar marker to look like a
  yacht (matches simulator) or stay as a heading triangle (cleaner)? If
  the former, SkiaYacht can be reused with `awaDeg = 0`, `sailSet =
  'mainOnly'`, `mainSheet = 0.85`, `length = 16` and the sails just
  stand straight up - good iconography for "where on the polar".

## Follow-ups for QA + Designer

- QA: add unit tests for `sail-geometry.ts`:
  - `boomAngleRad(0, 1)` => +/- ~8 deg (centerline).
  - `boomAngleRad(50, 0)` => |result| ~ 20 deg (50 - 30).
  - `boomAngleRad(20, 0.5)` => +/- 8 deg (no-go snap).
  - `sailCurveRatio(45, 0.85)` => ~1.0 (upwind sheet at upwind AWA).
  - `sailCurveRatio(45, 0.10)` => ~0 (over-eased).
  - `isLuffing(20, 0.5)` => true (no-go), `isLuffing(80, 0.55)` => false.
- QA: snapshot the simulator screen on `iPhone 15 Pro` and `iPhone SE`
  (different `boatLength` because `sceneW < 360 -> length=30`) and
  confirm the sails do not clip the canvas border on the smaller frame.
- Designer: review the warm-white hull / cyan-30%-stroke pairing. The
  spec called for a subtle brand glow; right now it is a single-stroke
  outline. If a soft outer halo is wanted, add a Skia BlurMask layer in
  a follow-up - we did not introduce new deps this sprint.
- Designer: spinnaker is symmetric, drawn forward of the bow. On the
  legacy boat it was tinted green; current uses brand cyan at 0.55. If
  the designer prefers the green spinnaker, swap `SPINNAKER` /
  `SPINNAKER_OUTLINE` constants.
- Mobile lane / Dev-A next sprint: the heel-offset shadow is on
  `centerY + L * 0.18` regardless of heel direction. Lateral heel-side
  bias (shadow drifts leeward) would need an `awaDeg`-driven sign and a
  small ease curve. Saved for a polish pass.

## Verification

```
cd mobile && npx tsc --noEmit         -> clean
cd mobile && npm test -- --silent     -> 20 suites / 103 tests, all green
```

No new dependencies. ASCII typography only in code + this audit. The
trim panel, sliders, mode pill, mission HUD, drill bar, sail-feedback
badges and wake/no-go/apparent-arrow overlays were not touched.
