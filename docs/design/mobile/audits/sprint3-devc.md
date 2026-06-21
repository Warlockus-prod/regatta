# Sprint 3 - Dev-C status note

Lane: Mobile. Scope: replace the flat-list Anatomy screen with an interactive
yacht poster + hotspots + bottom-sheet navigation across the 17 anatomy parts.

## Files changed

- `mobile/app/anatomy/index.tsx` (full rewrite, was a flat ScrollView of Cards)
- `mobile/src/anatomy/yacht-svg.ts` (new: SVG path bank for the yacht poster)
- `mobile/src/anatomy/hotspots.ts` (new: id -> { x, y } hotspot map in viewbox units)

No other files touched. Imports in `app/anatomy/index.tsx` deliberately
target the per-component files (`Card`, `Screen`, `Text`) rather than the
design-system barrel `components/index.ts`. The barrel currently re-exports
`PointsOfSailDiagram`, which on `main` pulls in `@shopify/react-native-skia`;
that triggers a "Native Skia Module failed to correctly install JSI Bindings"
error inside the Jest environment for any suite that touches the barrel.
Sidestepping the barrel keeps the anatomy test suite green without needing
to fix Dev-B's Skia setup.

## Yacht-SVG drawing approach

`yacht-svg.ts` holds an array of `YachtPath` records, each with:

- `id` (stable, debug-only)
- `d` (SVG path string)
- `kind` (`hull | sail | rig | foil | water`) - used by the screen to pick
  stroke width and a faint fill (sails get a translucent white fill, foils
  a faint cyan fill, hull / rig stay outline-only)

The drawing is rendered into a fixed `1000 x 500` viewbox so it lines up
1:1 with the `side.x / side.y` coordinates that already live in
`mobile/src/data/anatomy.json`. The screen scales the viewbox to fit the
device width and applies the same scale to the hotspot map - no separate
projection math, just `(x * sx, y * sy)`.

Maintenance: shape edits happen by tweaking the `d` strings in
`YACHT_PATHS`. Keep the viewbox at 1000x500 (or update both
`YACHT_VIEWBOX` AND `hotspots.ts` together). The drawing is intentionally
abstract - bezier-smoothed hull, straight-line rig, two triangular sails -
and reads as a yacht silhouette at a glance, not a photoreal rendering.
A subtle radial cyan glow is layered behind the lines via an `<RadialGradient>`
defined in the same `<Svg>`.

## Hotspot map

`hotspots.ts` exports `HOTSPOTS: Record<string, { x, y }>`. One entry per
anatomy id; coords are in the same 1000x500 viewbox as the yacht drawing.
Tuned by eye to land on the rendered shape:

- `bow` (195, 252) - just inside the leading edge of the deck
- `stern` (820, 258) - aft cap of the deck line
- `mast` (420, 130) - mid-mast
- `boom` (510, 240) - mid-boom, just above the cockpit
- `mainsail` (480, 175) - inside the main triangle
- `jib` (320, 200) - inside the jib triangle
- `shrouds` (380, 178) - port shroud, mid-span
- `forestay` (305, 145) - mid-forestay
- `mainsheet` (660, 240) - cockpit, between boom-end and stern
- `jib-sheet` (540, 244) - winch run, port-side
- `winch` (580, 232) - on the rendered winch circle
- `cleat` (760, 240) - on the stern deck
- `rudder` (818, 405) - centered on the rudder blade below the waterline
- `keel` (488, 415) - centered on the keel bulb
- `fender` (615, 290) - hanging on the freeboard
- `wheel` (716, 232) - on top of the wheel circle
- `cockpit` (700, 230) - between wheel and pulpit

If the boat shape moves, retune the affected entries; nothing else needs
changing. Type guard: a part missing from `HOTSPOTS` is filtered out of the
poster (no crash) but still appears in the chip list below.

## Interaction design

- The poster sits at the top, full-screen-width, fixed aspect ratio.
- Each hotspot is a 36x36 `Pressable` (centered on the coord, hitSlop 14)
  containing an inline `<Svg>` with three layers:
  - pulse: animated radius 10 -> 16, opacity 0.55 -> 0.05 (only when idle)
  - ring: 8pt cyan stroke (active state grows to 11pt + filled cyan)
  - dot: 3pt cyan dot (active state swaps to a 5pt navy dot inside the ring)
- The pulse loop uses `Animated` with `useNativeDriver: false` (interpolating
  SVG numeric props, not transforms). Single `Animated.Value` shared across
  all idle hotspots so animation cost is constant regardless of count.
- Below the poster: section header (caps), then a wrap-row of 17 chips
  (pill-shaped, dark card background, cyan border + tinted bg when active).
  Tapping a chip selects the same `activeId` -> the matching hotspot
  highlights AND the bottom sheet opens.
- Bottom sheet: plain RN `<Modal animationType="slide" transparent>`. Sheet
  shows the badge "PART", title in cyan, alt-name (always EN, mirrors the
  web pattern), description, and an accent-tinted `Card` with the
  "On board" usage block. Below the body: prev / next arrow buttons, plus
  a swipe hint line.
- Gestures: `PanResponder` on the sheet content. Vertical drag down > 80px
  closes; horizontal swipe > 60px (and dominant over vertical) advances
  prev / next. Horizontal nav wraps around the array.
- Tap the backdrop closes the sheet. Tapping a chip while the sheet is open
  swaps the active part in place (the modal stays mounted).

## i18n + typography

- All chrome strings (header, intro hint, "All parts", "On board",
  "Part" badge, "Close", swipe hint) go through `tp()` with the
  ES/FR/DE/IT extras object. No new strings ship without all 7 langs.
- Anatomy data still flows through `legacyPick(part, 'name' | 'desc' |
  'useOnBoard', lang)`. No data duplication.
- Strict ASCII typography: no em-dash, no en-dash, no fancy quotes. Verified
  with a Unicode scan over the three new / changed files.

## Verification

- `cd mobile && npx tsc --noEmit` -> clean, no output.
- `cd mobile && npm test -- --silent` -> 62 / 62 tests pass. The original
  `__tests__/screens/anatomy.test.tsx` still passes (parts count + first
  part name in EN both still render in the new screen).
- 13 unrelated suites fail at module-load with "Native Skia Module failed
  to correctly install JSI Bindings" - all of them transitively pull in
  `src/design-system/components/index.ts` which re-exports `PointsOfSailDiagram`
  (Dev-B's Skia migration). Pre-existing on `main`, not caused by this work.
  My screen avoids the failure by importing `Card / Screen / Text` directly
  instead of through the barrel.

## Follow-ups for QA

- Visually confirm hotspot positions on a real device at common widths
  (iPhone SE 320, iPhone 15 393, iPhone 15 Plus 430, iPad portrait 768).
  The poster scales linearly so positions should hold; if any one hotspot
  drifts out of its target shape, retune `HOTSPOTS[id]` only.
- Confirm haptics aren't expected on hotspot tap. The original spec didn't
  call for them; can be added with a single `Haptics.selectionAsync()` in
  the press handler if desired.
- Confirm the bottom sheet scrolls properly for long descriptions in DE / IT.
  Ranges look fine for the existing copy but the inner ScrollView has
  `maxHeight: '88%'` so text always reaches the nav row.
- Confirm with PM whether the "Bavaria 46" mentions baked into the
  data file `descRu / descEn / etc.` should stay - upstream commit
  `aaedea0 chore(anatomy): drop the 'Bavaria 46' brand mentions` was on
  the web data, the mobile JSON copy still references the brand. Out of
  scope for this PR (data sync task, not screen task).
- Skia barrel issue (Dev-B) blocks 13 unrelated test suites; needs a Jest
  mock for `@shopify/react-native-skia` or for `PointsOfSailDiagram` to
  unblock the placeholder / settings / courses / etc. suites.
