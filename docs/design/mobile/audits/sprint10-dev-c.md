# Sprint 10 Dev-C: onboarding tour, Settings extensions, i18n audit

Date: 2026-05-13
Branch: `app`
Lane: Mobile / Dev-C of three parallel devs

## TL;DR

Three quality gaps from the PM + expert audit are closed:

1. The first-launch language nudge is now a 3-screen tour (language ->
   welcome -> "where to start") with a tri-state resume flag so an
   interruption mid-tour picks back up correctly.
2. Settings grew two new sections - **Units** (speed / wind speed /
   distance with tap-to-cycle and long-press picker) and **Data** (race
   history export + clear, bootcamp / checklist progress reset, and a
   destructive "clear all data" with two-step confirm).
3. New `mobile/scripts/i18n-audit.mjs` walks the codebase and reports
   cyrillic leaks, `tp()` arity violations, missing ES/FR/DE/IT extras,
   and hardcoded JSX text. After the inline fix pass it now reports
   **0 findings** across 47 source files.

The 3 existing Settings test assertions (renders 7 langs, About card
with brand+version, persists language pick) still pass. `npx tsc
--noEmit` and `npx eslint .` are green.

The single test-suite failure (`placeholder-screens.test.tsx`,
Multiplayer placeholder copy) was pre-existing before this sprint -
caused by Dev-A/B's in-flight Multiplayer screen redesign and out of
my scope to fix (`__tests__/*` is hands-off for me).

## Part A: Onboarding tour

### Flow

```
+-----------+        +---------+        +--------+
| Language  |  Next  | Welcome |  Next  | Start  |
| (Screen 1)| -----> |(Screen 2)| -----> | (3)   |
+-----------+        +---------+        +--------+
                                            |
                            +---------------+----------------+
                            v               v                v
                        Bootcamp        Simulator         Skip -> Home
```

Common chrome on every step:
- Top-left: progress dots `o o o` (active dot is filled cyan).
- Top-right: `Skip` button (always exits to Home / current route).
- Mid: full-screen content for the step, slide-in from the right with
  cross-fade (250 ms, JS-driver Animated to avoid worklet first-frame
  races on cold launch).

### Screen 1 - Language

Same content as the existing v1 picker (7 enabled languages, native
name + EN name, OK badge for the selected row, Continue button at
bottom). What changed:

- Tap on a card no longer immediately closes the modal. The user must
  tap Continue.
- Continue persists `regatta.firstLaunch.v1='in-tour'` and slides
  forward to Screen 2.
- If the device locale already matches an enabled language we skip
  Screen 1 entirely and start at Screen 2 (preserving the v1 zero-tap
  behaviour for the common case).

### Screen 2 - Welcome / value prop

- Hero: title `Welcome - your race-ready week` (7 langs).
- Subtitle: one-line value prop.
- Three feature cards:
  - **Bootcamp** (icon `cap`): "8 lessons across 7 days, from wind to
    rules."
  - **Simulator** (icon `simulator`): "Feel for sail and tactics,
    without leaving the dock."
  - **Pre-race checklist** (icon `check`): "So you forget nothing on
    race morning."
- Footer: `Back` (secondary) / `Next` (primary).

`Back` always returns to Language even if Language was auto-skipped -
a deliberate courtesy so the user can change their language pick
without leaving onboarding.

### Screen 3 - Where to start

- Title: `Where would you like to start?`
- Subtitle: "You can switch later - everything is available from Home."
- Two big tinted cyan cards:
  - `Day 1 - I am new to sailing` -> routes to `/bootcamp`
  - `I have basics, take me to the simulator` -> routes to `/simulator`
- Footer: `Back` / `Go to Home` (ghost - Skip = Home).

Picking either card marks `firstLaunch=done`, dismisses the modal, then
defers `router.push(target)` to next tick so the modal teardown does
not race the route push.

### Persistence: `regatta.firstLaunch.v1`

Tri-state in `mobile/src/persistence/firstLaunch.ts`:

| Value      | Meaning                                                |
| ---------- | ------------------------------------------------------ |
| _absent_   | pristine first launch - show full tour                 |
| `in-tour`  | language picked, app killed mid-tour - resume Screen 2 |
| `done`     | tour finished (any exit path)                          |

The hook still exposes the original `done: boolean` shape for backward
compat, plus a new `stage: 'pending' | 'in-tour' | 'done'` for callers
that need it. `markInTour()` and `markDone()` are both idempotent
fire-and-forget writes.

A pre-existing `'done'` value from sprint 1 is honoured (skip the
tour) so users who already onboarded under v1 don't see the new tour
on first relaunch after the update.

## Part B: Settings - Units section (NEW)

Lives between Language and About. Three rows:

| Row        | Default | Options                          |
| ---------- | ------- | -------------------------------- |
| Speed      | knots   | knots / m/s                      |
| Wind speed | knots   | knots / m/s / Beaufort           |
| Distance   | nm      | nautical miles / kilometres      |

UX:
- Each row is a Card showing the row label, a one-line hint (e.g.
  "Knots, m/s, or Beaufort."), and a small cyan pill on the right with
  the current value abbreviation (`kt` / `m/s` / `Bft` / `nm` / `km`).
- **Tap** anywhere on the row cycles to the next value (knots ->
  m/s -> back to knots; etc).
- **Long-press** opens a system Alert with the full-name options as
  individual buttons - the discoverable path for users who don't want
  to cycle.

Persistence: `mobile/src/persistence/units.ts`, key
`regatta.units.v1`. Returns `{units, setSpeedUnit, setWindSpeedUnit,
setDistanceUnit, cycleSpeed, cycleWindSpeed, cycleDistance}`.

### Format helpers (colocated)

The unit-aware formatters live in the same module so consumers don't
have to think about conversion math:

```ts
formatSpeed(kt, units.speed)            // '5.2' or '2.7'
speedUnitLabel(units.speed)             // 'kt' or 'm/s'

formatWindSpeed(kt, units.windSpeed)    // '12.0' / '6.2' / 'F4'
windSpeedUnitLabel(units.windSpeed)     // 'kt' / 'm/s' / 'Bft'

formatDistance(nm, units.distance)      // '2.34' or '4.33'
distanceUnitLabel(units.distance)       // 'nm' or 'km'

knotsToBeaufort(kt)                     // 0..12
```

Conversion factors: `1 kt = 0.5144444 m/s`, `1 nm = 1.852 km`,
WMO Beaufort scale upper-bounds in knots.

### Follow-up for Dev-A / Dev-B

The simulator / game / coach screens currently hardcode "kt" labels
(simulator HUD, race results, coach payload). My change exposes the
hook + formatters but does NOT touch those files - they are owned by
the other devs. Recommended migration plan:

1. Dev-A on game HUD: import `useUnits` once near the top, replace
   each `${kts} kt` with `${formatSpeed(kts, units.speed)} ${speedUnitLabel(units.speed)}`.
   Same for `windKts` -> `formatWindSpeed`.
2. Dev-A on `/race-result` panel: `formatDistance` for the course
   length display.
3. Dev-B on the AI coach payload: include the user's unit preference
   as metadata so the coach text speaks in the user's units.

None of these are blocking for this sprint - the persistence is in
place, consumers can migrate incrementally.

## Part C: Settings - Data section (NEW)

Lives below Privacy. Four cards, top-down:

### Race history

- Subtitle: `N races saved` (live from `useRaceHistory()`).
- Buttons row: **Export** (secondary) / **Clear** (ghost, danger).
- **Export** builds a JSON payload `{schemaVersion, exportedAt, app,
  version, races}` and shares via React Native `Share.share()`. iOS
  shows the system share sheet (AirDrop / Mail / Files / Notes /
  third-party apps); Android shows the equivalent share intent. If
  there are zero saved races a polite Alert explains nothing to
  export instead.
- **Clear** opens a single-step confirm Alert before wiping
  `regatta.race-history.v1`. Disabled when count is 0.

### Bootcamp progress

- Subtitle: `X of 8 lessons complete` (live from `useBootcampProgress`).
- **Reset progress** ghost button - Alert confirm, then removes
  `regatta.progress.bootcamp.v1` + `.lastViewed.v1`. Disabled when 0.

### Checklist progress

- Subtitle: `Y of 81 items checked` (live from `useChecklistProgress`).
- **Reset** ghost button - Alert confirm, then calls the existing
  `reset()` from the hook. Disabled when 0.

### Clear all data

- Red-bordered Card at the bottom of the section.
- TWO-step confirm:
  1. Alert "Clear all data?" with body listing what will be erased.
     Buttons: Cancel / Continue.
  2. Alert "This cannot be undone" with body 'Tap "Delete all" to
     confirm.' Buttons: Cancel / Delete all (destructive).
- On final confirm, walks `AsyncStorage.getAllKeys()`, filters every
  key that starts with `regatta.`, calls `multiRemove`. Best-effort;
  individual failures are silently ignored. After completion shows a
  "Done" Alert.

Implementation notes:
- The bootcamp reset directly removes the storage rows because
  `useBootcampProgress` does not expose a reset method (the existing
  hook only adds, never removes). Refactoring that hook is out of
  scope for Dev-C; recommend Shared lane add a `reset()` to it
  alongside the bootcamp screen's own Reset UI when that lands.
- All confirm Alerts use `style: 'destructive'` on the danger button
  so iOS renders it in red.

## Part D: i18n audit script

`mobile/scripts/i18n-audit.mjs` is a Node ESM script. Runs in ~1s.

### Categories

| Kind | Severity | Description |
| ---- | -------- | ----------- |
| `cyrillic-leak` | **P0** | Cyrillic literal NOT inside a `tp()` / `tl()` / `legacyPick()` call. Always a hard regression. |
| `non-english-leak` | P0/P1 | PL/ES/FR/DE/IT accented literal outside a translation call. Excludes URLs and email addresses. |
| `tp-arity` | **P1** | `tp(...)` invoked with < 3 args (missing PL even though it's required by signature). |
| `tp-no-extras` | P3 | `tp(ru, en, pl)` without the `{es, fr, de, it}` overlay. ES/FR/DE/IT fall back to EN; correct but inconsistent. |
| `hardcoded-jsx` | P2 | 3+ word English string in a JSX text node, not wrapped in a function call. Heuristic - some false positives. |

### False-positive filters

Three patterns are accepted as legitimate translation locations and
are NOT flagged:

1. `tp('ru', 'en', 'pl')` first arg (the canonical RU source).
2. `LegacyLocalized<>` flat-shape fields:
   `titleRu: 'Парусная яхта'`, `bodyEn: 'Lorem'`, etc.
3. Lookup-table form: a string literal whose nearest enclosing brace
   key is a Lang code (`ru: { title: '...' }`).
4. Template literals whose every Cyrillic substring is itself wrapped
   in `tp(...)` (e.g. `accessibilityLabel`).
5. Brand-stable `tp('Bootcamp', 'Bootcamp', 'Bootcamp')` where all 3
   args are the same string literal.

### Report

Two outputs per run:

- `docs/design/mobile/audits/sprint10-i18n-audit.md` - full markdown
  report with summary table + per-file findings table.
- Console summary line + per-category breakdown, ending with the
  report path.

The script always exits 0 - it is informational, not a blocker. CI
should diff the report against a known-baseline report if it wants to
fail on regressions.

### Run

```sh
cd mobile && node scripts/i18n-audit.mjs
```

## Part E: i18n leak fixes

### Before

86 findings across 46 files (initial heuristic, before false-positive
filters were tuned).

After tightening the heuristics to drop:

- TS arrow-function fragments matching the `>...<` pattern,
- `=>` chunks,
- generic-type bodies (`useState<X>`),
- statement noise (`;`, `}`, `=`),
- LegacyLocalized<> field values,
- nested lang-table values (`ru: { title: '...' }`),
- Cyrillic substrings inside `tp(...)` interpolations,
- and brand-stable `tp(x, x, x)` cases,

the baseline drops to **34 real findings**:
- 5 cyrillic-leak (3 in simulator template literals - false positive
  caught later, 2 in anatomy data)
- 27 tp-no-extras (mostly RuleScenarioDiagram + RacingDiagrams)
- 2 hardcoded-jsx in ErrorBoundary (above the I18nProvider)

### Fixes inline

| File | Findings | Fix |
| ---- | -------- | --- |
| `src/design-system/components/RuleScenarioDiagram.tsx` | 19 tp-no-extras | Added ES/FR/DE/IT extras to every label. |
| `src/design-system/components/RacingDiagrams.tsx` | 6 tp-no-extras | Same. |
| `src/design-system/components/ErrorBoundary.tsx` | 2 hardcoded-jsx | Added a 7-lang `FALLBACK_COPY` lookup table; the boundary lives above I18nProvider so it cannot use `useI18n`. Resolves the device locale at render time. |

### After

**0 findings**. The script exits clean across all 47 source files.

### Files NOT fixed (out of scope)

| File | Findings | Owner | Notes |
| ---- | -------- | ----- | ----- |
| `mobile/app/simulator/index.tsx` | 3 cyrillic in template literals | Dev-A/B | False positive - cyrillic IS inside `tp(...)` interpolations; the audit's template-literal filter handles these (now 0 in the final run). |
| `mobile/app/anatomy/index.tsx` | 2 cyrillic | Shared content | `titleRu` / `titleEn` flat-shape fields - NOT a leak, the audit's `LegacyLocalized<>` filter handles these (now 0 in the final run). |
| `mobile/app/bootcamp/index.tsx` | 1 tp-no-extras | Shared content | Brand-stable `tp('Bootcamp','Bootcamp','Bootcamp')` - audit's brand filter handles it. |
| `mobile/app/settings.tsx` (line 89) | 1 tp-no-extras | Mine | `tp('Phase 1 - Content shell', ...)` - intentional dev placeholder; audit's brand filter recognises identical args. |

## Verification

Required gates:

- `cd mobile && node scripts/i18n-audit.mjs` -> 0 findings, report
  written.
- `cd mobile && npx tsc --noEmit` -> clean.
- `cd mobile && npx eslint .` -> clean.
- `cd mobile && npm run sync-content:check` -> all bundles up to date.
- `cd mobile && npx jest __tests__/screens/settings.test.tsx` -> 3/3
  green (the original sprint-1 assertions still hold).

Test suite: 19 of 20 suites pass (100 of 102 tests). The one failing
suite, `__tests__/screens/placeholder-screens.test.tsx`, expects a
Polish "Wyscigi" string on the Multiplayer placeholder. Dev-A/B
redesigned that screen mid-sprint and the test now sees the new copy.
This is NOT a regression from my work - I do not own
`mobile/app/multiplayer/*` and I do not own `__tests__/*`. Confirmed
by `git stash && jest && git stash pop`: my changes alone do not
break any test that was green before.

## Follow-ups for other lanes

### Dev-A (game / coach / replay)

1. Adopt `useUnits()` + `formatSpeed/windSpeed/distance` in:
   - `mobile/app/game/index.tsx` HUD (`5.2 kt`, `15 kt wind`, etc).
   - `mobile/app/replay/[id].tsx` time/distance readouts.
   - The race-result panel (course length).
2. Pass the unit preferences into the AI coach payload so generated
   text uses the user's units.

### Dev-B (multiplayer)

1. Either fix the Multiplayer screen copy to match the existing
   placeholder test, OR update the test alongside the screen rewrite
   (the test lives in `__tests__/screens/placeholder-screens.test.tsx`,
   line 61 - the assertion is `getByText(/Wyscigi/)`).
2. Adopt `useUnits()` in the multiplayer race screen the same way
   Dev-A does for game.

### Shared lane

1. Add a `reset()` to `useBootcampProgress` so the bootcamp Reset
   button does not have to remove storage rows directly.
2. Consider running `node mobile/scripts/i18n-audit.mjs` in CI as a
   non-blocking informational job; baseline diff would catch new
   leaks.
3. The audit script could later be extended to scan web `src/app/**`
   too - the patterns it recognises (`tp`, `tl`, `legacyPick`,
   `LegacyLocalized<>`, lang-table objects) are identical between
   web and mobile.

## QA notes

Things to verify on a physical device build:

1. Fresh install: tour appears, Screens 1->2->3 navigate correctly,
   each route choice on Screen 3 lands you on the right screen.
2. Force-quit mid-tour at Screen 2: relaunch resumes at Screen 2
   (not at Screen 1).
3. After tour completes: relaunches go straight to Home, no tour.
4. Settings -> Units: tap Speed three times, observe `kt -> m/s ->
   kt` cycle. Long-press opens a 3-button alert. Reopen Settings
   from Home: the chip still shows the chosen unit.
5. Settings -> Data -> Race history Export: the iOS share sheet
   opens with a JSON payload containing all races. Try a save and
   re-export to verify the count grows.
6. Settings -> Data -> Clear all data: tap, get first Alert "Clear
   all data?", tap Continue, get second Alert "This cannot be
   undone", tap Delete all, observe Done Alert. Reopen the app:
   language picker re-appears (the wipe took out the
   `regatta.firstLaunch.v1` flag too) - this is the desired
   behaviour for "clear all".
7. Switch language to PL / ES / FR / DE / IT. Re-open Settings, the
   Units row labels and chip names update; the Data row labels too;
   the destructive Alerts read in the chosen language.
