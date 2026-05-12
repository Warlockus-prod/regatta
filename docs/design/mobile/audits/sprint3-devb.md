# Sprint 3, Dev-B status: interactive Skia polar diagram on Courses

Scope: replace the static SVG polar with a Skia-rendered, drag-to-steer
polar curve on the Courses screen. Wind speed selector at the screen
level (6 / 10 / 14 / 20 kt). Boat indicator snaps to the polar curve at
the dragged angle, animates back on release, and tapping a point-of-sail
card snaps the boat to that course. Live numeric readout (heading deg,
boat speed kt, point-of-sail name, wind kt) below the diagram.

## Files created

- `mobile/src/courses/polar.ts` (147 lines) - polar curve helpers.
  - `getPolar(tws)` returns `{ tws, samples }` sampled every 2 deg from
    twa=0..180. Memoised per wind speed.
  - `speedAtAngle(curve, twa)` linear interp for the boat-indicator
    radius. `pointOfSailAt(twa)` resolves to one of the 5 ids in
    `sailing-data.json`. `midAngleFor(id)` for card-tap snap.
  - Defensive load of `mobile/src/simulator/physics`. If Dev-A's port
    lands, we run `settle()` per angle for 25 s with fixed-optimal sheet
    settings. If not, we use a deterministic approximation (see below).
    `POLAR_SOURCE` is exported so QA can see which path is live.
- `mobile/jest.setup.js` (90 lines) - Skia + reanimated + gesture-handler
  + expo-haptics jest mocks. Required because pulling Skia into the
  design-system barrel meant ALL screen tests started exploding with
  "Native Skia Module failed to install JSI Bindings". Wired via
  `jest.setupFiles` in `package.json`. Mocks render Skia primitives as
  `<View>` so tests still see the layout.
- `docs/design/mobile/audits/sprint3-devb.md` (this file).

## Files modified

- `mobile/src/design-system/components/PointsOfSailDiagram.tsx`
  (full rewrite, ~310 lines). Skia `<Canvas>` with:
    1. Five sector tints (no-go red, beat orange, reach cyan, broad-reach
       cyan, run success), mirrored port + starboard. Active sector is
       boosted by ~1.6x alpha so the live point of sail glows.
    2. Outer ring + 3 concentric rings + 12 tick marks (every 30 deg,
       cardinal ticks longer).
    3. Closed polar path (radial r = knots / peak * outerR), 2 pt accent
       cyan stroke + 6 pt translucent halo for the glow.
    4. Top wind arrow + "WIND" label (localized).
    5. Cardinal letters (N / E / S / W) and degree numbers (every 30
       deg) rendered via a separate `react-native-svg` overlay because
       Skia text needs a fontMgr / typeface plumb that adds boilerplate
       and JSI deps in jest. SVG text matches the dark-ocean palette.
    6. Boat icon (Skia triangle) at the polar radius for the current
       heading; rotated to face along the radial.
  - Pan gesture (`react-native-gesture-handler`, runOnJS to keep the
    React state authoritative) reports `onHeadingChange(deg, commit)`.
    Drag = `commit:false`, release = `commit:true` snapped to nearest
    5 deg with a Light haptic.
- `mobile/app/courses/index.tsx` (~390 lines, was 160).
  - Owns `windSpeed` (chip stepper, 6/10/14/20) and `heading` state.
  - rAF-based ease-out tween (~200 ms) on snap and on card tap. Picks
    the shortest arc so 350 -> 10 deg sweeps right, not the long way.
  - Live readout row: "Heading 045 °", "Boat speed 5.2 kt", "Wind 10 kt"
    in cards with cyan accent text.
  - Active point-of-sail name + colored dot below the readout.
  - Drag-hint copy in 7 langs.
  - Card list now in `<Pressable>` wrappers; tap = haptic + animate to
    that point of sail's mid angle. Active card gets a subtle cyan
    outline.
- `mobile/package.json` - added `setupFiles: ["<rootDir>/jest.setup.js"]`
  to the inline jest config.

## Polar approximation strategy

`POLAR_SOURCE` resolves at module load. Today on `main` the value is
`"approx"` because `mobile/src/simulator/physics/` does not yet exist
(Dev-A is in flight on the port).

Approximation (deterministic, calibrated against the `pointsOfSail`
`speedFactor` values):

- 0..30 deg: 0 kt (no-go, "in irons").
- 30..90 deg: smoothly ramps from 0.55 * peak to peak using a half-cosine
  shoulder. Models how a boat accelerates from close-hauled to beam reach.
- 90..130 deg: ~0.93..1.0 of peak (broad-reach plateau).
- 130..180 deg: drops to ~0.55 of peak via half-cosine ease (no
  spinnaker assumption matches our default boat).
- Peak knots = `min(8.4, 0.55 * tws + 1.2)`. The 8.4 cap is the rough
  hull-speed for the 40 ft cruiser in `DEFAULT_BOAT`.

When Dev-A's `mobile/src/simulator/physics/index.ts` lands and exports
`{ settle, getBoatParams, createInitialState }`, the dynamic require
will pick it up and `POLAR_SOURCE` flips to `"engine"` automatically.
Sheet trim is fixed at the close-hauled-friendly preset (0.4 main / 0.25
jib / mild twist). TODO in the file points to that integration.

## Interaction design

- **Drag**: any pan inside the canvas updates heading on each frame. The
  boat icon and the active sector tint follow finger immediately. The
  active card in the list outlines as the drag crosses its angle range.
- **Release**: snap to nearest 5 deg + Light haptic + 200 ms ease-out
  tween from the current heading to the snapped target.
- **Card tap**: Selection haptic + ease-out tween to the mid angle of
  that point of sail. Demonstrates the bidirectional binding between
  cards and diagram.
- **Wind chips**: tap re-memoises the polar curve. The boat speed
  readout updates within the same frame because `speedAtAngle` runs on
  the new curve.
- **Cardinal letters** stay English (N/E/S/W) per the spec; degree
  numbers around the rim are language-neutral. All other UI strings go
  through `tp()` with EN / RU / PL / ES / FR / DE / IT.

## Verification

- `cd mobile && npx tsc --noEmit` clean.
- `cd mobile && npm test --silent` -> 20 / 20 suites, 103 / 103 tests.
  Existing courses test (which counts EN labels) still green; I named
  the new readout "Boat speed" rather than reusing "Speed" to avoid
  colliding with the per-card meta label that the test asserts on.
- ASCII typography scan over the three new files: clean (no em-dash,
  en-dash, curly quotes, ellipsis).
- No new dependencies. Reanimated import was reverted in favor of a
  plain rAF tween because the Skia canvas re-renders cheaply on each
  state update; bringing reanimated into the loop would have added
  shared-value-to-state syncing complexity for no visual benefit.

## Follow-ups for QA

- Verify pan gesture works on a physical device (the simulator handles
  pan but multitouch / scroll-vs-pan races sometimes differ on iOS hw).
- Confirm the polar curve looks right when wind speed changes mid-drag.
- Check that `Canvas` does not bleed past its parent on small screens.
  `size = 300` default + `paddingHorizontal: spacing.lg` should keep it
  inside an iPhone SE viewport.
- Confirm tap-to-snap card animation feels tactile and not janky on
  older devices (rAF tween, 200 ms, ease-out cubic).
- 7-lang spot check: drag-hint, wind-speed chip label, readout cells,
  boat-speed label all carry RU / EN / PL / ES / FR / DE / IT.

## Follow-ups for Dev-A integration

- When `mobile/src/simulator/physics/index.ts` lands with the same
  public API as `src/lib/sailing-physics`, the dynamic `require` in
  `polar.ts` picks it up. Swap to a static import + delete the
  fallback in the same PR.
- Confirm the `Controls` shape my `engineSpeedAt` builds matches what
  Dev-A exports (mainSheet/jibSheet/mainTwist/jibTwist/reef/jibFurl/
  jibSide). If the controls type drifts, polar.ts is the only place to
  update.
- Consider exposing `getBoatPolar(tws)` from the physics package so we
  do not run `settle()` 91 times per wind-speed change in the future.
  For now memoisation per `tws` keeps it acceptable (4 wind options =
  364 settle runs total at app warm-up).

## Lines of code

- New: 147 (polar.ts) + 90 (jest.setup.js) + audit
- Rewritten: 310 (PointsOfSailDiagram.tsx)
- Modified: 230 net additions in courses/index.tsx
