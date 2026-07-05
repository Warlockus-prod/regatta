# Simulator V3 spec - cockpit layout with layered overlays

**Status:** cockpit-layout reference; the supersession clause below is
RESOLVED OTHERWISE - see docs/design/SIMULATORS.md (2026-07-05). Decision:
two-tier model. /simulator stays as the "Basics" tier, /simulator2 stays as
the "3D boat view"; V3 is the "Trainer" tier. Nothing is deleted.
**Note:** this file remains the cockpit-layout and interaction reference.
For the current V3 rebuild plan, product map, and delivery phases, see
`PIPELINE.md` in the same folder.
**Supersedes (historical, not executed):** the original proposal to delete
V1 and V2 once V3 wins.

---

## Why V3 (what V1 and V2 both got wrong)

1. **Controls below scene = scroll kills learning loop.** User moves slider,
   scrolls up to see effect, tries to remember what changed, scrolls back
   to adjust. We break attention on every tweak.
2. **Heel via slight tilt in top view is invisible.** Heel is a rotational
   phenomenon around the longitudinal axis. A rear-view is the only way
   to make it "click" that heel = rig tilting = losing wind.
3. **Flat lookup-sectors.** No visualization of where the sail CAN go, where
   the wind comes from, what the optimum looks like - just the current
   position with no context.
4. **Small boat.** User's eye goes to the large card borders, not the boat.

---

## V3 target behaviors

A user in V3 should, within 30 seconds of opening the page:

1. See the boat big and centered, understand which way is bow.
2. See the wind direction (arrow + shaded sector of origin).
3. Identify the two sails and see they're distinct.
4. Reach for a control without scrolling.
5. Move a slider, watch the boat react immediately in the same viewport.
6. Understand heel by switching to rear view.

---

## Layout

### Mobile-first (375-430 px viewport)

```
+-----------------------------------------------------+
| top bar: "Simulator V3" + help + back-to-V1 link    |
+-----------------------------------------------------+
|                                                     |
|   [Wind pod ]              [Main pod  ]             |
|   angle TWA              main angle                 |
|   wind kts               reef 0/1/2                 |
|                                                     |
|                 B I G   B O A T                     |
|                 (top view, 50-55% of screen)        |
|                 layered overlays                    |
|                                                     |
|   [Mode pod ]              [Jib pod   ]             |
|   top / rear             jib angle                  |
|   both / main / jib      jib furl %                 |
|                                                     |
+-----------------------------------------------------+
|  [Speed]  [Heel]  [AWA]  [Trim score]    <- chips   |
+-----------------------------------------------------+
|  "Main is overtrimmed - ease until it stops         |
|  stalling."            <- single-line commentary    |
+-----------------------------------------------------+
```

The four control pods are placed at the four corners of the scene
container. On mobile, they overlap the scene edges with `position:
absolute` over the boat canvas - this is the "cockpit" effect (controls
stay around the boat without pushing it off-screen).

Pod widths: ~42% each on mobile. Scene is `100vh - (nav + top bar +
chips + commentary)` with `aspect-ratio: auto` so it fills what's left.

### Desktop (>= 1024 px)

Same cockpit pattern but bigger:

```
+----------+  +------------------------+  +----------+
|          |  |                        |  |          |
| WIND POD |  |                        |  | MAIN POD |
|          |  |                        |  |          |
+----------+  |      B I G   B O A T   |  +----------+
              |     (top view, 60%     |
              |      of screen height) |
+----------+  |                        |  +----------+
|          |  |                        |  |          |
| MODE POD |  |                        |  | JIB  POD |
|          |  |                        |  |          |
+----------+  +------------------------+  +----------+
                [Speed | Heel | AWA | Trim]
                    <commentary line>
```

Pods on desktop are separate cards outside the scene, in a CSS grid:
`grid-template-columns: 220px 1fr 220px` on the pod rows, with the
scene spanning two rows in the middle column.

---

## Scene overlays (layered in Z-order, bottom to top)

1. **Water background.** Dark radial gradient, subtle wave line animation
   (already have `.sim-waves`, promote it here).
2. **Compass ring.** Light circle at 50% of scene radius. N/E/S/W tiny
   markers. Non-decorative - it tells the user the viewport is true north.
3. **No-go cone.** 60 deg wedge centered on wind-from direction, red-tinted,
   dashed edge. Labeled "no-go" inside.
4. **Wind sector.** 120 deg wedge behind the wind-from arrow, faint cyan.
   "Wind comes from this arc" reading.
5. **Main working sector.** Semi-transparent green wedge behind the mast,
   spanning from centerline to `mainMaxOff` on the current leeward side.
   "Your main can swing here" reading.
6. **Jib working sector.** Semi-transparent yellow wedge forward of the
   mast, from `jibMinOff` to `jibMaxOff` on leeward side.
7. **Ghost optimal overlay.** Dashed green silhouette of main and jib at
   their computed optimal angles. Toggleable.
8. **The boat.** Bigger than V1/V2 (roughly 2.5x hull length). Clear bow
   marker. Hull shadow below. Wake trail behind.
9. **Current sails.** Solid white, rotating live with slider drag.
10. **Vectors overlay (top-right corner of scene).** True wind arrow (cyan,
    big), apparent wind arrow (light cyan, smaller), both with labels.
11. **Force vectors on the boat.** Drive forward (green), side to leeward
    (amber). Magnitude scales with actual force.

### Rear-view mode (alternate Scene)

When user toggles Mode -> Rear:

- Same dark water backdrop + animated waves
- Large horizon line
- Boat drawn rear-on: transom below, mast tilted by actual heel angle
- Main sail full, curved, showing visible sail area (shrinks with reef)
- Jib visible behind main if raised
- Heel angle numeric overlay: "18 deg heel"
- Subtle "+" marks if water is tipping toward rail
- Same Wind pod, Main pod, Jib pod, but Mode pod switches active pill to
  REAR

Rear view shares state, no recompute - it's a different drawing of the
same `BoatState` + `TickDiagnostics`.

---

## Control pods

Each pod is a small glass card (`rgba(8, 24, 48, 0.65)`, blurred bg).

### Wind pod (top-left)

- Label: "WIND" (uppercase 10px muted)
- Slider: TWA, 30 - 180 deg, step 1, shows current value as big mono
- Slider: wind speed, 4 - 25 kts, step 1, shows current value
- Micro label: "starboard tack" / "port tack" (auto from TWA sign)

### Main pod (top-right)

- Label: "MAIN"
- Slider: sheet angle, 0 - mainMaxOff, step 1
- Segmented: reef Full / R1 / R2
- Tiny status line: "ATTACHED" | "STALLED" (from diag.mainStalled)

### Jib pod (bottom-right)

- Label: "JIB"
- Slider: sheet angle, jibMinOff - jibMaxOff, step 1
- Slider: furl percentage, 0 - 100%, step 5
- Tiny status line: "ATTACHED" | "STALLED"

### Mode pod (bottom-left)

- Label: "VIEW"
- Segmented: TOP / REAR
- Segmented: BOTH / MAIN only / JIB only (sails raised)
- Toggle: "Show optimal ghost" checkbox

### Metrics chip row (below scene)

Four chips in one horizontal row, always visible without scrolling:

- **SPEED** big value + unit (kts)
- **HEEL** big value + unit (deg)
- **AWA** big value + unit (deg)
- **TRIM** percent color-coded (green > 80, cyan > 55, else amber)

Height: ~56px on mobile, ~72px on desktop. Big monospace numbers.

### Commentary line (below chips)

Single line with at most one short sentence. Rotates through top feedback
item. Examples:

- "Main is overtrimmed - ease a bit."
- "Slot is healthy, both sails pulling together."
- "Heel over 25 deg - consider a reef."
- "Apparent wind is well forward - you're heading up nicely."

No bullet list. One line at a time. When a new diagnostic becomes the
top priority (heaviest weighted), the line fades to the new text over
250 ms.

---

## Interactions and feedback

- **All sliders update state instantly** on change. No "apply" button.
  The `useMemo` sim already recomputes on every input change.
- **Every slider drag triggers a soft haptic** on mobile (vibrate API,
  1-3 ms) - optional, guarded by capability check.
- **Sail rotation animates** via `transition: transform 120ms ease-out`
  on the SVG `<g>` element that wraps each sail. When slider jumps by 10
  deg, the visual eases in - feels responsive but smooth.
- **Heel relaxation already has 2s tau in the engine.** Rear-view sail
  tilt uses `state.heel` directly so it interpolates via the same
  relaxation.
- **Commentary change fade**: `opacity` transition 250 ms when the top
  item index changes.

No step buttons. No "+/-1" or "+/-5". Sliders only for continuous values;
segmented toggles for enumerable values.

---

## What we keep from V1/V2

- Physics engine (`src/lib/sailing-physics/*`) - unchanged.
- Helper components where still relevant:
  - `TopScene` becomes `SceneTop` (minor tweaks for bigger boat + layered
    overlays)
  - `SideScene` becomes `SceneRear` (more significant rework, true
    rear-on view with mast tilt)
- Color tokens (`--accent-cyan`, `--success`, `--warning`, etc.)

---

## What we cut from V1/V2

- V1's card-stack layout with trim panel below hero - out.
- V2's floating glass overlays over scene + sticky strip below - the
  overlay idea stays, but controls move into pods at corners, not
  bottom strip.
- "Delta vs optimal" chip grid - too much numeric noise, keep only 4
  core metrics + a single optimal ghost overlay.
- Multiple commentary bullets - reduce to one line.

---

## State model

No engine changes. V3 uses the existing `tick` pipeline. Only UI state
differs. V3 state shape:

```ts
interface V3State {
  // User inputs (same as V1/V2)
  twa: number;
  tack: 'starboard' | 'port';
  windSpeed: number;
  mainAngle: number;
  jibAngle: number;
  jibFurlPct: number;
  reefLevel: 0 | 1 | 2;

  // V3 additions
  view: 'top' | 'rear';
  sailsRaised: 'both' | 'main' | 'jib';
  showOptimal: boolean;
}
```

`sailsRaised` is new - when the user picks "main only" the jib area is
set to ~0 effective (the engine just reads `jibFurl = 1`); when "jib
only", main area is 0 (reef = 1 effectively, but semantically separate).
We do NOT add a new Controls field in the engine - we pass the current
Controls with the appropriate area-zeroed values.

---

## Route + migration

- New route: `/simulator-v3` (under test)
- V1 at `/simulator` gets a banner: "V3 preview available -> /simulator-v3"
- V2 at `/simulator2` same banner
- Once V3 is validated (user tests on mobile + desktop, feels right),
  **/simulator3 moves to /simulator**, V1 goes to `/simulator-legacy`
  (kept for one release, then deleted), V2 deleted immediately.

---

## Verification checklist (D1 per PATTERNS.md)

V3 ships only when:

- [ ] Build passes (`npx next build` clean).
- [ ] Tests pass (`npm run test:physics` 8/8).
- [ ] Em-dash sweep clean.
- [ ] Playwright smoke on /simulator-v3:
  - Open on mobile viewport (375x667) and desktop (1440x900)
  - Verify all 4 pods visible without scrolling to the scene
  - Move each slider, verify boat visibly reacts within 200 ms
  - Toggle Top / Rear, verify scene swaps cleanly
  - Toggle Both / Main / Jib, verify sails appear/disappear correctly
- [ ] MEMORY.md entry: what V3 specifically improved vs V1/V2.
