# Sprint 9 Dev-B audit: SkiaYacht visual-physics + LessonDiagram polish

Date: 2026-05-13
Branch: `app`
Lane: Mobile / Dev-B

This sprint closes the loop opened by Sprint 8 Dev-B: the sail-geometry
helpers (`twistOffsetReefedRad`, `reefedAreaScale`, `heelAngleDeg`,
`leewayAngleDeg`) are now consumed by SkiaYacht so twist / reef / heel /
leeway are visible in the top-down sprite. Part B lifts the 8 lesson
diagrams from "schematic" to "feels designed" via gradients,
drop-shadow strokes, and a subtle pulse on the rotating arrows.

## Files touched (and only these)

- `mobile/src/design-system/components/SkiaYacht.tsx` - consume Sprint 8
  sail-geometry helpers; new optional props `heelDeg`, `showLeewayGhost`,
  `leewayDeg`; cloth wave on the leech when powered up; reef now scales
  geometry, not just opacity.
- `mobile/src/design-system/components/LessonDiagram.tsx` - radial
  background gradient, 2-stop sail / arrow gradients, ShadowedLine
  helper, opacity pulse on rotating elements, tighter labels,
  standardised viewBox.
- NEW: `mobile/src/simulator/sail-cloth.ts` - small pure helpers
  (`shouldRenderClothWave`, `clothWaveDisplacement`, `SAIL_CLOTH_TUNING`)
  for the cloth wave so the renderer stays declarative.
- NEW: `docs/design/mobile/audits/sprint9-dev-b.md` (this file).

The simulator screen (`mobile/app/simulator/index.tsx`) is owned by Dev-A
this sprint - SkiaYacht's new props default to no-op so the existing
v8 call site keeps working unchanged. Game / coach screens, sim loop,
missions, sail-geometry, tests, ASC metadata, and any web file were left
untouched.

## Part A: SkiaYacht new prop contract

```ts
export interface SkiaYachtProps {
  // ... existing v8 props unchanged ...
  /** Heel angle in degrees (signed). Default 0 = no shear. */
  heelDeg?: number;
  /** Render a faint dashed ghost line astern, rotated by leeway. */
  showLeewayGhost?: boolean;
  /** Leeway angle in degrees (signed). Only used when ghost is on. */
  leewayDeg?: number;
}
```

All three are optional with sensible defaults so existing call sites
keep their v8 look. Internally the values are clamped against
`VISUAL_TUNING.HEEL_VISUAL_CLAMP_DEG` (25 deg) and
`VISUAL_TUNING.LEEWAY_VISUAL_CLAMP_DEG` (10 deg) so engine spikes do
not flip the sprite.

### Twist visualisation

The mainsail HEAD now sits at `mainBoomRad + twistOffsetReefedRad(twist,
mainSheet, reef)` instead of being locked to the boom angle. Same trick
for the jib leech via `jibTwistRad`. When twist is below the
visibility threshold (0.05) or reef is past 0.5, the helper returns 0,
which means the head stays glued to the boom and the user sees the
classic "flat sail" silhouette. Tunables live in `sail-geometry.ts`
under `VISUAL_TUNING`.

### Reef shrink (geometry, not opacity)

The mast is fixed; the sail HEIGHT is now `reefedAreaScale(reef)`
times the unreefed value (linear ramp 1.0 -> 0.4). The boom length
also shrinks by the same factor so the sail keeps its aspect ratio
and the user sees less area, not just a transparent sail. The mast
itself sticks out above the reefed sail head, which is the visual
cue rigging instructors use ("can you see your mast above the sail?
Yeah, that's a deep reef").

### Cloth wave thresholds

Defined in `sail-cloth.ts#SAIL_CLOTH_TUNING`:

| key                          | value | meaning                                     |
|------------------------------|-------|---------------------------------------------|
| `POWERED_UP_AWA_MIN_DEG`     | 35    | below this AWA the leading edge shakes anyway, no need for a wave |
| `POWERED_UP_AWA_MAX_DEG`     | 120   | above this AWA the spinnaker / running setup takes over |
| `CLOTH_WAVE_REEF_CUTOFF`     | 0.6   | a deep-reefed sail is too short / stiff to ripple |
| `CLOTH_WAVE_AMPLITUDE_FRAC`  | 0.018 | wave amplitude as fraction of leech length |
| `CLOTH_WAVE_WAVELENGTHS`     | 2     | full wavelengths along the leech            |
| `CLOTH_WAVE_RATE`            | 0.5   | half the luff-flutter clock rate (relaxed) |

`shouldRenderClothWave({luffing, reef, awaDeg})` returns false in any
of: luffing, reef >= cutoff, |AWA| outside the powered-up window.
`buildSailPath` switches from the default quadratic leech to a
6-segment polyline with the sin-wave displacement when the clock is
non-zero. The displacement decays at both ends (sin(t * pi)) so the
head and clew stay attached to the boom / mast.

The jib wave runs at the same rate but offset by 0.7 radians so the
two sails do not visually beat in lockstep.

### Heel shear formula

```ts
const heelClamped = clamp(heelDeg, -25, 25); // VISUAL_TUNING.HEEL_VISUAL_CLAMP_DEG
const heelRad = heelClamped * Math.PI / 180;
// Inner Group transform: [{ rotate: heelRad }]
```

The boat group is wrapped in an inner `<Group transform=[{rotate: heelRad}]>`
which sits INSIDE the outer heading-rotated group. So the boat first
heels in its local frame, then the whole assembly rotates to the
current heading. The leeway ghost (drawn in heading-frame, NOT
heel-frame) is rendered BEFORE the inner group opens, so a heeled boat
still leaves a leeway trail aligned with its heading minus leeway.

### Leeway ghost in top view

Opt-in via `showLeewayGhost={true}` + a non-trivial `leewayDeg` value.
When |leeway| <= 1 deg the line is hidden (visual noise). The line
starts at the stern (HULL_LAYOUT.sternY * 0.6) and extends behind the
boat by `L * (1.2 + |leewayDeg| * 0.06)` px, rotated by the leeway
angle from the heading. Stroke is `colors.warning` at 50% opacity,
dashed via stroke cap (the line is intentionally short so dashing
would be busy at this scale).

## Part B: LessonDiagram lift

Standardised on `viewBox="0 0 200 140"` (preserves the 1.43 aspect
the screen layout already expects). All 8 diagrams share the same
radial gradient background:

```svg
<RadialGradient id="diagBg" cx="50%" cy="50%" r="65%" fx="50%" fy="40%">
  <Stop offset="0"   stopColor={accentCyan} stopOpacity={0.10} />
  <Stop offset="0.7" stopColor={bgCard}     stopOpacity={0.85} />
  <Stop offset="1"   stopColor={bgPrimary}  stopOpacity={1} />
</RadialGradient>
```

The cyan glow centred slightly above middle gives every diagram the
same "page-light shines on the canvas" base.

### Per-diagram lift (before / after)

| diagram             | gradients added                          | shadow lines | pulse target           | label tweaks                  |
|---------------------|------------------------------------------|--------------|------------------------|-------------------------------|
| `wind-direction`    | `windArrowGrad` (cyan -> dim)            | -            | TWD arrow + arrowhead  | compass labels 9 -> 8 px      |
| `points-of-sail`    | `noGoGrad`, `reachGrad` (radial)         | -            | TWD arrow              | sector labels 7 -> 6 px       |
| `how-sail-works`    | `sailGrad` (cyan -> deep), `liftGrad`    | sail body, lift arrow | -            | flow / AWA labels 9/8 -> 8/7  |
| `tacking`           | -                                        | route polyline | -                    | side labels 8 -> 7            |
| `jibing`            | -                                        | route polyline | -                    | side labels 8 -> 7            |
| `vmg-beating`       | `vmgArrowGrad` (success gradient)        | route, VMG  | VMG arrow              | -                             |
| `simple-rules`      | -                                        | converging arc | -                    | rule labels 8 -> 7            |
| `mini-race`         | `markGrad` (radial warning)              | route polyline | windward mark          | mark labels 8 -> 7            |

Where a diagram had no element worth pulsing (tacking, jibing,
simple-rules), the lift is purely the background + ShadowedLine on the
key route or arc. The `Boat` helper now also renders a soft cyan halo
under the hull for depth; this is in every diagram automatically.

### Drop-shadow strategy

`react-native-svg` ships `<FeDropShadow>` but it is not consistently
rendered across iOS / Android. Instead a `ShadowedLine` helper
draws the same path twice: once with a wider stroke at low alpha
(the "shadow"), once with the primary stroke on top. Cheap, works
everywhere, reads as depth. The Boat halo uses the same trick at
the path level.

### Pulse animation

`usePulse(min)` returns an `Animated.Value` oscillating between 1.0
and `min` on a 1500 ms loop (750 ms each direction, ease-in-out
quad). The native driver is enabled for opacity, which keeps the
animation off the JS thread. Used on:

- `wind-direction`: TWD arrow line + arrowhead
- `points-of-sail`: TWD arrow line + arrowhead
- `vmg-beating`: VMG arrow + arrowhead
- `mini-race`: windward mark

The amplitude is small (0.55-0.70) so the pulse reads as "alive" not
"flashing for attention".

### Dispatcher API unchanged

`<LessonDiagram lessonId={...} />` still returns the diagram for that
id. No new props, no breaking changes for the bootcamp screen.

## Verification

```
cd mobile && npm run check
- sync-content:check ok
- lint: 0 warnings, 0 errors
- typecheck: 0 errors
- jest: 19 of 20 suites pass (102 of 104 tests). The 20th suite
  (placeholder-screens) fails on Dev-A's new <Game/> screen which
  now embeds <SkiaYacht/>; the Skia mock in jest does not implement
  Path.cubicTo, so any test that renders SkiaYacht via Game errors
  before reaching my code. Verified by stashing my files: the
  placeholder-screens failure persists, so it is purely Dev-A's.
  The bootcamp-detail suite (which renders LessonDiagram) passes
  with my polish in place.
```

The pre-existing tests for bootcamp / anatomy / etc. all pass with my
LessonDiagram and SkiaYacht changes in place.

## Follow-ups for Designer

1. **Cloth wave amplitude** is currently 1.8% of leech length. If
   this reads as too subtle on a 36 px boat, bump
   `CLOTH_WAVE_AMPLITUDE_FRAC` in `sail-cloth.ts`. 0.024 is a
   noticeable jump; do not exceed 0.04 or the leech starts to look
   like a flag.
2. **Reef ramp** is linear 1.0 -> 0.4. If a deep reef should look
   even smaller (an actual storm jib visually disappears), drop
   `REEF_AREA_AT_FULL` in `sail-geometry.ts`. The 0.4 floor was
   picked to keep the sprite legible.
3. **Heel transform** is a flat Z-rotation, no shear / squash. A
   real top-down view of a heeled boat would foreshorten the hull
   along the heel axis. Skia's `[{skewX: x}]` could approximate
   this; left as a follow-up because the side / rear views already
   carry most of the heel reading.
4. **Lesson diagram aspect** is 200x140 (1.43:1). If we ever switch
   to a square frame on tablet, all 8 will need a re-pass to stop
   leaving white space.
5. **Pulse rate** is 1500 ms per cycle. If multiple pulse animations
   land on the same screen at once they may visually beat. Consider
   adding an optional `phase` parameter to `usePulse` so a screen
   can stagger them.

## Follow-ups for Dev-A

1. **Pass `heelDeg`** from `sim.boatExt.heelDeg` into the top-down
   `<SkiaYacht>` at `app/simulator/index.tsx:1046`. The clamp lives
   in SkiaYacht so passing the raw engine value is fine.
2. **Pass `leewayDeg` + `showLeewayGhost`** in the same call site if
   we want the top view to match the side / rear views. The Sprint 8
   audit (Dev-B) hooked leeway into the side / rear SVG; the top
   view stayed plain. Wiring is one line:
   ```tsx
   <SkiaYacht
     ...
     heelDeg={sim.boatExt.heelDeg}
     showLeewayGhost
     leewayDeg={sim.boatExt.leewayDeg}
   />
   ```
3. **Game screen** (`app/game/index.tsx:666`) embeds SkiaYacht too.
   Same opportunity to thread heelDeg / leewayDeg there. Note: the
   placeholder-screens test breaks the moment SkiaYacht is rendered
   under jest because `Skia.Path.Make().cubicTo` is not mocked.
   Either:
   - mock SkiaYacht in `placeholder-screens.test.tsx` (add
     `jest.mock('../../src/design-system/components', () => ({...,
     SkiaYacht: () => null }))`), OR
   - extend `mobile/jest.setup.js` to provide a Path stub with
     `cubicTo`, `moveTo`, `lineTo`, `quadTo`, `close`. The latter
     also benefits any future Skia-using component.
   Dev-B did NOT touch tests this sprint per scope.

## Notes for the next planner

- `sail-cloth.ts` is the natural seam if we ever want a per-tick
  cloth physics simulation (e.g. ripple speed scales with TWS).
  Right now it is pure trig + thresholds.
- `VISUAL_TUNING` (sail-geometry) and `SAIL_CLOTH_TUNING` (sail-cloth)
  share the same intent (visual constants behind helpers). If we
  extract a shared `@regatta/sailing` package per ADR-0003, both
  records are drop-in candidates.
- The `usePulse` hook in LessonDiagram is small enough to inline,
  but if the same pattern appears on more screens consider lifting
  it into `mobile/src/design-system/hooks/usePulse.ts`. Keep the
  native driver flag - opacity is one of the few props the native
  driver supports and it matters for a 1500 ms loop running every
  time the bootcamp detail page is open.
