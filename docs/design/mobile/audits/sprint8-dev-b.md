# Sprint 8 Dev-B audit: wind drills + sail visual-physics math

Date: 2026-05-13
Branch: `app`
Lane: Mobile / Dev-B

This sprint adds the two pieces called out by the expert audit as the
biggest gaps after Sprint 7: drills that teach the user to react to
shift / gust / no-go (priority #2), and a richer visual-physics surface
for SkiaYacht to consume next round (priority #3, math only - render
lives in Dev-A's lane).

## Files touched (and only these)

- `mobile/src/simulator/sail-geometry.ts` - Sprint 8 visual-physics
  exports (twist offset, reefed area, heel/leeway clamps).
- `mobile/src/simulator/missions.ts` - new types
  (`DrillGoal`, `DrillSetupContext`, `DrillSetupResult`,
  `DrillWindMode`, extended `DrillContext`) and 3 new drills.
- `mobile/src/simulator/use-sim-loop.ts` - drill setup hook,
  per-drill wind-mode schedule, score computation per
  `DrillGoal.kind`, drill `score` and `windMode` exposed via
  `DrillProgress`.
- `mobile/app/simulator/index.tsx` - wires the new drills into the
  picker (auto-grows from 3 to 6), auto-pins the wind-mode pill from
  the active drill, threads `leewayDeg` into the side / rear scenes,
  draws leeway arrow + heel readout in side and rear views, adds a
  RU/EN/PL/ES/FR/DE/IT `leeway` label.
- NEW: `docs/design/mobile/audits/sprint8-dev-b.md` (this file).

No other route, settings, bootcamp, web, or test fixture was touched.
SkiaYacht.tsx was deliberately left alone (Dev-A's lane).

## Part A: 3 new drills

| id              | wind mode | objective                                                                                                | scoring                                                                                |
|-----------------|-----------|----------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| `shiftReact`    | shift     | Wind makes 6 step shifts of 15 / 30 / 45 deg around the start dir, every 10 sec for 60 sec total. Hold TWA in 40-50 deg on whichever tack. | `time-in-range`: `score = round(secsInWindow / 60 * 100)`. `done` at 60 sec elapsed.   |
| `gustTrim`      | gust      | 8-sec cycle: 5 sec base wind, 3 sec gust at base + 6 kt. Auto-trim is forced OFF at drill start. Keep `trimScore >= 75` for 60 sec. | `trim-hold`: `score = round(secsAbove75 / 60 * 100)`. `done` at 60 sec elapsed.        |
| `noGoRecovery` | steady    | Bow forced into the wind on drill start (`heading := windDir`). Steer out and accelerate to `>= 4 kt` within 30 sec. | `recover-speed`: `score = round((30 - elapsedAtSuccess) / 30 * 100)`, 0 on timeout. `done` on success or timeout. |

Each drill has localised name + hint via `tp(ru, en, pl, {es,fr,de,it})`,
all ASCII per project rule. The 3 existing drills (`twa45`, `noGo`,
`reach90`) are unchanged and continue to use the legacy
`time-in-range`-shaped scoring path.

The wind regime auto-pin works through a one-way handshake: the loop
exposes `drill.windMode` on its return value, the screen watches it in
a `useEffect`, captures the current wind dir / speed as the new
"baseline" and flips the screen-level `windMapMode` pill. The
screen-level `useEffect` that drives the cosmetic shift / gust pattern
in free-mode bails out when `drill?.windMode` is set, because the
loop-side scheduler is already driving the wind for the drill.

The `noGoRecovery` setup uses the new `setup` callback to push the
initial heading into `screenStateRef.current.heading` AND
`controls.targetHeading`, so the boat does not immediately steer out
on its own.

`gustTrim` setup returns `disableAutoTrim: true` which the loop
applies to `controlsRef.current.autoTrim`. The user can re-enable
auto-trim mid-drill if they really want, but the trim-hold timer will
stop ticking as soon as the trim score falls below 75, which is the
intended consequence.

## Part B: sail-geometry visual-physics math

All exports are PURE (no React, no Skia, no globals). They are intended
to be consumed by SkiaYacht in the next Dev-A round; for now they are
also consumed by the simulator screen for the side / rear leeway arrow.

```ts
// twist offset of the sail HEAD relative to the BOOM (signed radians).
// Visible only when twist > 0.05; zero when reefed past 0.5.
twistOffsetRad(twist: number, sheet: number): number;
twistOffsetReefedRad(twist: number, sheet: number, reef: number): number;

// Sail-area scale 1.0 .. 0.4 as reef goes 0 .. 1 (linear ramp).
reefedAreaScale(reef: number): number;

// Visual-clamped degrees (pure delegation to clamp()).
heelAngleDeg(boatExt: { heelDeg: number }): number;     // [-25, 25]
leewayAngleDeg(boatExt: { leewayDeg: number }): number; // [-10, 10]

// Tunables exported for SkiaYacht / tests.
VISUAL_TUNING = {
  TWIST_HEAD_OFFSET_MAX_DEG: 22,
  TWIST_VISIBLE_THRESHOLD: 0.05,
  TWIST_REEF_CUTOFF: 0.5,
  REEF_AREA_AT_FULL: 0.4,
  HEEL_VISUAL_CLAMP_DEG: 25,
  LEEWAY_VISUAL_CLAMP_DEG: 10,
}
```

`twistOffsetRad` is sign-agnostic: callers add the value to the boom
angle (which already carries the sign of AWA) so the head opens in the
same direction the boom is swung. The `sheet` argument is currently
unused but kept in the signature so we can re-introduce sheet-driven
twist asymmetry later (a hard-sheeted sail twists less for a given
twist control).

The reef ramp is linear because the user-facing reef slider step is
0.25 (4 detents). A linear ramp matches the user's mental model
"more reef = less sail" without requiring extra easing.

## Part C: side / rear view overlays

Top view is unchanged (Dev-A's lane).

**Side view** now shows:

- A bottom-strip readout `HEEL X deg  REEF Y%  TWIST Z%` (the heel
  number was already there from Sprint 7; no change needed).
- A leeway arrow below the hull, rendered only when
  `Math.abs(leewayAngleDeg) > 1`. The arrow length scales with the
  angle (~2 px per deg) and is colored `colors.warning`. A short
  vertical reference tick anchors the boat centerline so the user
  can see "boat heading" vs "actual track".

**Rear view** now shows:

- A bottom-strip readout split into two lines: `AWA X deg  HEEL Y deg`
  on the upper line, `SIDE FORCE  TRIM Z` on the lower. This makes
  HEEL more visible than the previous single-line layout.
- A leeway arrow below the side-force arrow at `baseY + 92`, length
  `38 + |leewayDeg| * 3` px, colored `colors.danger`. The label
  flips left / right depending on the sign of `leewayDeg` so it does
  not overlap the arrow.

Both arrows respect the `leewayAngleDeg` clamp from sail-geometry, so
the visual cap is +/- 10 deg even if the engine ever returned a
larger leeway value.

## Follow-ups for Dev-A (consume in next round)

1. **Twist:** SkiaYacht currently treats the sail as a single curve
   bounded by boom angle + sail-curve ratio. To make twist visible,
   read `twistOffsetReefedRad(twist, mainSheet, reef)` and use it as
   the rotation of the head control point relative to the boom. Same
   API for the jib leech if you want a matching effect.
2. **Reef:** SkiaYacht's main sail height is currently a static
   fraction of `length`. Multiply the height (and the boom anchor
   offset) by `reefedAreaScale(reef)` so a deep reef visibly shrinks
   the sprite. The mast itself does not move; only the cloth.
3. **Heel:** The top view is still flat. If you want a hint of heel,
   apply a tiny shear / squash transform on the X axis using
   `heelAngleDeg(boatExt) / HEEL_VISUAL_CLAMP_DEG`. Optional - the
   side / rear views already show heel.
4. **Leeway:** The top view does not yet show the actual-track
   indicator; the side / rear views do. If you want symmetry, draw a
   short ghost wake in the top view rotated by `leewayAngleDeg` from
   the heading, hidden when |leeway| < 1 deg.

These four hooks let you do the visible-twist / visible-reef pass
without touching the simulator screen or the loop again.

## Follow-ups for QA

- **shiftReact:** confirm 6 wind-direction step changes happen at
  10 sec intervals during the 60-sec drill. Score should reach close
  to 100 if the user tacks promptly on each shift; ~50 if they only
  follow half of them.
- **gustTrim:** confirm that toggling auto-trim back ON mid-drill
  freezes the score (because trim score will spike, then collapse on
  the next gust). Auto-trim should also flip back OFF on each
  `setMode('drill')` if `gustTrim` is the active drill.
- **noGoRecovery:** confirm bow points exactly at the current wind
  source on start. Reset (via the global RESET button) should re-arm
  the no-go starting heading. If the user never reaches 4 kt within
  30 sec, the drill ends with score 0 and `done = true`.
- **wind-mode pill** auto-flips to `shift` / `gust` / `steady` when
  the active drill demands it. Manually picking a wind mode while a
  drill is active is now a no-op for that drill's tick (the loop
  owns the schedule).
- **side / rear view:** leeway arrow appears and grows as the user
  pinches into a tight close-hauled. Disappears when |leeway| < 1
  deg. Heel number visible in both side and rear bottom strips.

## Verification

`cd mobile && npm run check` -> green
- sync-content: ok
- lint: 0 warnings
- typecheck: 0 errors
- jest: 20 suites / 104 tests passed

The pre-existing `act(...)` warnings in jest output come from the
SailBadge / Animated.Circle interactions in `screens/*.test.tsx` and
are unchanged from Sprint 7.

## Notes for the next planner

- `DrillContext` now optionally carries `windDirRad`, `windSpeedKn`,
  and `windDirAtStartRad`. New drills can use these to write smarter
  `check()` predicates (e.g. "TWA within 5 deg of optimal on
  whichever tack the latest shift dropped you into"). The current
  `shiftReact.check` is conservative - just `|TWA| in [40, 50]` -
  because the geometry of the drill already guarantees the user must
  re-tack to stay in the window when the shift crosses head-to-wind.
- `DrillGoalKind` is open-ended: adding a new kind is a matter of
  switch-extending the score block in `use-sim-loop.ts`. The shape
  was kept narrow on purpose so each kind has obvious semantics.
- `VISUAL_TUNING` and `SAIL_TUNING` (Sprint 6) live side by side in
  `sail-geometry.ts`. If we ever extract a shared sailing package
  (per ADR-0003), these two records are the natural seam.
