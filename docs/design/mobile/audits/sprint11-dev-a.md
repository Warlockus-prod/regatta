# Sprint 11 - Dev-A status: Wire `useUnits()` into HUDs

Date: 2026-05-13
Branch: `app`
Lane: Mobile (Dev-A of three parallel devs)

## Goal

Sprint 10 (Dev-C) shipped `useUnits()` plus `formatSpeed`,
`formatWindSpeed`, `formatDistance`, `knotsToBeaufort`,
`speedUnitLabel`, `windSpeedUnitLabel`, `distanceUnitLabel` in
`mobile/src/persistence/units.ts`. Settings exposes the toggles, but
every consumer screen still hardcoded `kt`. Sprint 11 wires the
preference end-to-end so a user who picks m/s on Settings actually
sees m/s in the simulator HUD, the game HUD, and any wind label they
hit while sailing.

## Coverage matrix

| Route                                     | What was hardcoded as `kt`              | Now reads                                          |
|-------------------------------------------|-----------------------------------------|----------------------------------------------------|
| `mobile/app/simulator/index.tsx` (HUD)    | `speedKn` value, `SPEED/УЗЛЫ` cell label | `formatSpeed(boatSpeedKn, units.speed)` + `speedUnitLabel(units.speed).toUpperCase()` |
| `mobile/app/simulator/index.tsx` (compass)| `${windKts} kt` cycle button label       | `formatWindSpeed(trueWindSpeedKts, units.windSpeed)` + `windSpeedUnitLabel` (no suffix when Beaufort) |
| `mobile/app/simulator/index.tsx` (VMG)    | `${vmgKn}` next to TWA / AWA             | `${formatSpeed(vmgKn, units.speed)} ${speedUnitLabel(units.speed)}` |
| `mobile/app/simulator/index.tsx` (Side / Rear scenes) | `${labels.trueWind} ${windKts} kt` SVG overlay | New `windDisplayLabel` prop carries the formatted string |
| `mobile/app/game/index.tsx` (HUD)         | `${speedKn}` value, `SPEED/УЗЛЫ` cell    | `formatSpeed(...)` + `speedUnitLabel(...).toUpperCase()` |
| `mobile/app/replay/[id].tsx`              | -                                       | (no boat-speed or wind-speed labels rendered; HUD is time + score + 1x/2x/4x playback rate. Verified: `summary.totalSec`, `formatTime`, scrubber `clockSec`, no kt anywhere.) |
| `mobile/app/multiplayer/race/[code].tsx`  | -                                       | (no speed labels; HUD shows place / dist-to-mark in canvas px / time. Distance stays as a unitless integer, see follow-ups.) |
| `mobile/app/coach/index.tsx`              | -                                       | (no kt usage; race summary shows score / mistake timing in seconds, not speeds. AI coach payload still ships `samples[].speed` in knots to the server, untouched.) |
| `mobile/app/history/index.tsx`            | -                                       | (race time only as `formatTime` mm:ss; no distance / speed in row.) |

## Behavioural details

### Beaufort fallback

`formatWindSpeed(kt, 'beaufort')` returns `F0..F12` via the
`knotsToBeaufort` lookup. The simulator wires this in two places:

- **Wind compass cycle button** (`mobile/app/simulator/index.tsx`):
  when `units.windSpeed === 'beaufort'`, the displayed string is
  `windDisplay` only (no trailing `Bft` suffix) - the `F` prefix is
  enough and avoids the redundant "F4 Bft" reading.
- **Side / Rear SVG scenes**: the `windDisplayLabel` prop the parent
  passes is the full formatted string; the SVG just renders it.

The cycle button still toggles the engine's wind speed through the
6/10/14/20 kt preset list (untouched, the kit-cycling helper sits in
`useSimLoop`). The user just sees a different display string for the
same engine value.

### Useful precision

- Speed (`formatSpeed`): 1 decimal for `kt` and `mps`. Beaufort is not
  a valid speed unit so this code path never hits the integer case.
- Wind speed (`formatWindSpeed`): 1 decimal for `kt` and `mps`, no
  decimal for Beaufort (`F4`). Matches the existing `Math.round`-style
  display the sim used for windKts before this sprint.
- VMG: same `formatSpeed` digits; we add the unit suffix because VMG
  sits next to TWA / AWA, both angles, so an unlabeled number could be
  mistaken for degrees.

### What was deliberately NOT changed

- The simulator's wind compass kt-label cycle button still toggles
  preset wind speeds (6 / 10 / 14 / 20 knots) per the spec. Only the
  displayed label re-renders per `units.windSpeed`.
- The internal physics (VPP engine in `mobile/src/simulator/physics`)
  and `BoatStateExt` keep using knots - they are the canonical
  engine-space speeds. Conversion only happens at the leaf render.
- AI coach payload (`POST /api/coach`) still ships `samples[].speed`
  in knots. The server prompt is in knots; the unit toggle is purely
  user-facing.
- The race-history record stores `windSpeedKn` in knots; the unit
  toggle does not affect persistence shape (good, otherwise we would
  break replays saved before the toggle existed).
- `formatTime` for race timer + replay clock + history rows is
  intentionally untouched - the spec calls for mm:ss regardless of
  units, and the helper has no units knob.

### Unused `windKts` cleanup in `RearScene`

After replacing the windText computation, RearScene's `windKts: number`
prop became dead. Lint flagged it. I removed the prop entirely from
both the component signature and the call site since it was only used
for the user-facing label. SideProfileScene still takes `windKts`
because it drives a wave-amplitude calculation; the new
`windDisplayLabel` prop is additive there.

## Follow-ups for QA

1. **`distance to next mark` in multiplayer is still in canvas pixels.**
   The HUD cell `DIST` shows `Math.round(me.distanceToTargetPx)` -
   that is canvas px, not nautical miles. There is no canvas-px-to-nm
   scale published yet (the simulator courses are pure visual layouts),
   so `formatDistance` was not wired here. If product wants a real-nm
   readout the playfield needs a scale factor (see `findCourse` in
   `mobile/src/game/course.ts` - marks are fractional `fx/fy`).
2. **Settings toggle has no live preview.** The Settings screen is
   owned by another lane (Shared); a one-tap cycle of the Speed pill
   already updates the in-memory unit + persists. Verify that backing
   out of Settings into the simulator the HUD re-renders with the new
   unit. Expected: re-mount triggers the hydration `useEffect` and the
   HUD reads the new value on first paint.
3. **Beaufort precision in low wind.** `knotsToBeaufort(0.5)` returns
   F0 (calm). Make sure the wind compass is readable when the user
   picks Beaufort and the wind preset is 6 kt -> "F2".
4. **Accessibility label** on the wind cycle button now reads
   `Wind: 6.0 kt, 045°` / `Wind: 3.1 m/s, 045°` / `Wind: F2, 045°`.
   The hint string is unchanged.
5. **Dev-B's leaderboard parallel.** During a fresh `npm run check`
   one transient run flagged a `placeholder-screens.test.tsx` failure
   waiting on `^Leaderboard` while AsyncStorage was still hydrating.
   Re-running greens it; this is a Dev-B race condition, not in scope
   here.
6. **VMG unit suffix.** I added a trailing `kt` / `m/s` to the VMG
   readout because it sits next to TWA / AWA in the same row. If
   product wants to keep the readout dense (no suffix), drop it from
   `vmgDisplay` - it is a one-line change.

## Files touched

- `mobile/app/simulator/index.tsx` - add `useUnits` import + hook
  call, replace static `speedLabel`, derive `speedDisplay` /
  `vmgDisplay` / `windDisplay`, swap `windKts` cycle button text for
  the formatted display, update SideProfileScene + RearScene to take
  `windDisplayLabel` instead of inlining `${windKts} kt`, drop
  RearScene's now-dead `windKts` prop.
- `mobile/app/game/index.tsx` - add `useUnits` import + hook call,
  derive `speedDisplay`, replace static `speedLabel` with the
  current-unit upper-case word, swap the HUD speed cell value to
  `speedDisplay`.
- `docs/design/mobile/audits/sprint11-dev-a.md` (new, this file).

## Verification

`cd mobile && npm run check` - 20 suites / 102 tests green (Dev-B
added 2 leaderboard tests this sprint, hence 102 vs the brief's "100").

`grep -rE '\$\{[^}]+\} kt\b' mobile/app` returns only comment lines;
no user-facing `${something} kt` template literal remains in the HUD
files Dev-A owns.
