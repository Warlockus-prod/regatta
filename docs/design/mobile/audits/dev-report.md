# Mobile dev audit report

**Date:** 2026-05-12
**Reviewer:** Full Developer (architecture + implementation pass)
**Scope:** mobile/* design system, persistence, simulator, build pipeline,
ADR-0003 status, dependency hygiene, architecture
**Verification:** `npx tsc --noEmit` clean, `expo-doctor` 17/17 pass,
`sync-content:check` green, 14 baseline test suites green
(68 tests + 2 new i18n suites = 84 tests)

## TL;DR

- **Settings screen displays a stale version `0.1.0 (build 1)` while
  app.json is `0.2.0` / build 2.** The string is hardcoded; not driven by
  `expo-constants`. Production-visible drift, P0.
- **Design system is small but consistent.** PulsePill was buried inside
  PlaceholderScreen and is now a reusable primitive. Border / surface
  cyan rgba values are now tokens (was 8 inline duplicates across
  Button / Card / ListRow / PlaceholderScreen / PointsOfSailDiagram).
- **`tsc --noEmit` is clean and design-system primitives now pass with
  `noFallthroughCasesInSwitch` + `noImplicitReturns` on.** Two real
  pieces of dead code in `PointsOfSailDiagram` removed (`labelR`,
  unused `Text` import).
- **ADR-0003 bridging is healthy.** Sync covers all 7 web data files;
  `sync-content:check` is clean. `tacks` and `maneuvers` are in JSON
  but not yet in `mobile/src/data/types.ts` or the typed barrel; they
  will be needed by Phase 2 simulator missions.
- **Simulator tick loop is `setInterval`-driven, not Reanimated worklet.**
  Acceptable for the Phase-2 preview but locks JS-thread budget; the
  use-sim-loop hook returns a mutable ref + tickN counter pattern that
  causes a stale-render race (boat object is mutated in place, React
  sees the same reference). Documented as P1.
- **`__tests__/screens/placeholder-screens.test.tsx` and
  `bootcamp-detail.test.tsx` (tester's lane, untracked) fail** for
  reasons unrelated to anything in this audit: the placeholder test
  queries `view.getByText('Multiplayer')` against a title node that
  PlaceholderScreen split into a parent Text + child accent-dot Text;
  bootcamp-detail crashes during babel transform. Pre-existing, flagged
  for tester's lane.

## What this pass changed

| File | What changed | Verification |
|---|---|---|
| `mobile/src/design-system/tokens.ts` | Added `borderCyanFaint` / `borderCyanSoft` / `borderCyanStrong` / `surfaceCyanFaint` / `surfaceCyanSoft` color tokens. Added `motion = { fast, base, pulse }` constant. | tsc clean |
| `mobile/src/design-system/components/PulsePill.tsx` (new) | Extracted the inline `PulsePill` from `PlaceholderScreen` into a reusable primitive. Added `staticDot` prop. Uses `motion.pulse` and the new color tokens. | tsc + jest clean |
| `mobile/src/design-system/components/PlaceholderScreen.tsx` | Removed inline `PulsePill` (~50 LOC). Imports the new primitive. | jest screens still pass |
| `mobile/src/design-system/components/Button.tsx` | Replaced inline `'rgba(0, 212, 255, 0.25)'` with `colors.borderCyanSoft`. | tsc clean |
| `mobile/src/design-system/components/Card.tsx` | Replaced 2 inline cyan rgba with `colors.borderCyanFaint` and `colors.borderCyanSoft`. | tsc clean |
| `mobile/src/design-system/components/ListRow.tsx` | Replaced inline cyan rgba with `colors.borderCyanFaint`. | tsc clean |
| `mobile/src/design-system/components/PointsOfSailDiagram.tsx` | Replaced 2 inline cyan rgba with `colors.borderCyanSoft` / `borderCyanStrong`. Removed unused `Text` import + dead `labelR` constant. | tsc clean |
| `mobile/src/design-system/components/ErrorBoundary.tsx` | Replaced the `'Menlo, Monaco, monospace' as unknown as undefined` cast hack with `Platform.select({ ios: 'Menlo', default: 'monospace' })`. RN does not accept CSS font-stacks; this was failing silently at runtime. | tsc clean |
| `mobile/src/design-system/components/index.ts` | Exported the new `PulsePill` primitive from the barrel. | tsc clean |
| `mobile/tsconfig.json` | Enabled `noFallthroughCasesInSwitch` + `noImplicitReturns`. (`noUnusedLocals` / `noUnusedParameters` deferred -- one tester-lane test imports unused `Controls`.) | tsc clean |

Net: 8 inline rgba duplications removed, 1 dead local removed, 1 unused
import removed, 1 silent-runtime-fail in ErrorBoundary fixed, 1 reusable
DS primitive promoted, 2 new strict-tsc rules turned on.

## Open issues

### P0 -- block v1

**ISSUE-001 (P0): Settings displays stale version string.**
- File: `mobile/app/settings.tsx:88-89`
- Hardcoded `Version 0.1.0 (build 1)` while `app.json` is `0.2.0` /
  buildNumber `2`. Will mislead TestFlight testers and any future
  bug-report flows.
- Fix: read `Constants.expoConfig?.version` and
  `Constants.expoConfig?.ios?.buildNumber` from `expo-constants` (already
  a dependency). Tester-lane test in
  `__tests__/screens/settings.test.tsx:50` pins `/0\.1\.0/`; both must
  change in lock-step. Coordinate with the tester lane before commit.

**ISSUE-002 (P0): Two tester-lane test suites are red on main.**
- Files: `mobile/__tests__/screens/placeholder-screens.test.tsx`,
  `mobile/__tests__/screens/bootcamp-detail.test.tsx` (both untracked)
- `placeholder-screens.test.tsx:48` queries `getByText('Multiplayer')`
  but the rendered title is split (`<Text>Multiplayer<Text>.</Text></Text>`)
  -- testing-library treats the parent's text content as a non-string
  match. Use `getByText('Multiplayer', { exact: false })` or query the
  Stack.Screen title instead.
- `bootcamp-detail.test.tsx` crashes in babel before any test runs --
  likely a JSX/TSX import shape issue. Needs the tester to look at the
  full stack.
- Tester lane to resolve. The screens themselves are fine.

### P1 -- strong

**ISSUE-003 (P1): `useSimLoop` mutates state in place.**
- File: `mobile/src/simulator/use-sim-loop.ts:118-120, 87-115`
- `boat`, `controls`, and `trail` are returned as the live `.current`
  references. `tickN` is what forces re-renders, which works, but any
  consumer that does `useEffect(() => {...}, [sim.boat])` gets a
  zero-change dep array and never fires. Same for `useMemo`.
- The simulator screen actually depends on `sim.tickN` in the trail
  useMemo deps to compensate, which is implicit and fragile.
- Fix: make `tick` produce immutable snapshots and store via
  `useState`, or move the loop into a Reanimated `useSharedValue` +
  `useFrameCallback`. Phase 2-proper rewrite per ROADMAP -- but the
  current API trap should be documented in the hook header so consumers
  do not put `sim.boat` in dep arrays.

**ISSUE-004 (P1): Sim tick uses `setInterval` at 30 Hz.**
- File: `mobile/src/simulator/use-sim-loop.ts:88, 113`
- `setInterval` drifts on JS-thread blocking; Phase 2 spec already
  requires Reanimated worklet at 60 Hz. The header comment acknowledges
  this. Acceptable for the preview, but flag for Phase 2 entry: the
  pan-gesture worklet boundary (`runOnJS(true)`) and the `useReducer`
  re-render trigger both need to move to the UI thread.

**ISSUE-005 (P1): `tacks` and `maneuvers` synced as JSON but not typed.**
- Files: `mobile/src/data/sailing-data.json` (has both),
  `mobile/src/data/types.ts` (no `Tack` / `Maneuver` types),
  `mobile/src/data/index.ts` (not exported)
- Web has `export type Tack`, `export type Maneuver` and the data is
  in the synced JSON, but the mobile types and barrel skip them.
  Phase 2 missions and tack/jibe drills will need them; either add
  the types now or wait for ADR-0003 extraction so they come in via
  `@regatta/content`. Note the gap in `mobile/src/data/index.ts:64`.

**ISSUE-006 (P1): No bootcamp progress migration story.**
- File: `mobile/src/persistence/bootcamp.ts:15`
- Storage key is `regatta.progress.bootcamp.v1`. There is no `v2`
  migration helper or schema-version stamp, only the suffix in the
  key. ROADMAP §3 calls for "Schema versioned (`v1`), migration helpers
  ready for v2". Today the strategy on schema change would be: bump
  the key, lose all user progress. Workable for v1 but document the
  policy in the file header so future contributors do not re-roll v2
  with a different convention.

### P2 -- nice-to-have

**ISSUE-007 (P2): No `EmptyState` primitive; 3 screens roll their own.**
- `mobile/app/glossary/index.tsx:89-92` (`Nothing found`)
- `mobile/app/bootcamp/[id].tsx:38-52` (`Lesson not found`)
- `mobile/app/rules/[id].tsx:37-53` (`Scenario not found`)
- All three render a centered `<View style={styles.empty}><Text variant="muted">...` pattern. A 30-line `EmptyState` with a label + optional icon + optional CTA would deduplicate. Skipped this pass to keep scope tight; promote when the 4th instance lands.

**ISSUE-008 (P2): No `SectionLabel` primitive; pattern duplicated across 4 screens.**
- `mobile/app/index.tsx:360-369`, `mobile/app/settings.tsx:104-113`,
  `mobile/app/anatomy/index.tsx:97-103`, `mobile/app/racing/index.tsx:107-117`
- All four screens declare a near-identical `sectionLabel` style
  (uppercase variant="muted", letterSpacing 1.0-1.2, fontSize 10-11,
  fontWeight 600). The `.toUpperCase()` call site is repeated 8 times
  across the codebase. A `<SectionLabel>` primitive would cut ~40 LOC
  and unify casing/spacing.

**ISSUE-009 (P2): Hardcoded version in Settings will keep drifting.**
- Same root as ISSUE-001 but framed as a P2 follow-up: even after the
  version is read from `expo-constants`, the `phaseLabel` in
  `mobile/app/settings.tsx:43-47` is still hardcoded to "Phase 1 -
  Content shell" and is also pinned by a test (`/Phase 1/`). When Phase
  2 lands this needs to update. Move to a derived value (e.g. read from
  ROADMAP.md as a build-time constant via `expo-constants`'s `extra`
  field, or commit the phase string to `app.json` `extra`).

**ISSUE-010 (P2): EAS `production` profile lacks an iOS submit config.**
- File: `mobile/eas.json:33-36`
- The `submit.production` block is `{}`. When the production binary is
  ready you will get prompted for `ascAppId` / `appleTeamId` interactively
  every time. Mirror the `preview` block once production submission is
  in scope.

**ISSUE-011 (P2): EAS profile auto-submission story missing.**
- `eas.json` defines `build.production` and `submit.production` but no
  workflow ties them. For TestFlight automation the typical flow is
  `eas build --auto-submit -p production`; document the command in
  `mobile/TESTFLIGHT.md` so anyone (or CI) can reproduce.

**ISSUE-012 (P2): `expo-router` Stack header chrome is per-screen.**
- Every screen sets `<Stack.Screen options={{ title: headerTitle }} />`
  inline with its own translation lookup. That title is also the route's
  back-button label. When the user navigates from `/bootcamp` -> `/bootcamp/[id]`
  the back arrow says "Bootcamp" -- correct behavior, but the source of
  truth is duplicated 14 times. A small `useScreenTitle(translations)`
  helper would unify and let future analytics hook the title in one
  place. Optional.

**ISSUE-013 (P2): Splash race-condition tolerable but explicit.**
- File: `mobile/app/_layout.tsx:16-18, 60-72`
- `SplashScreen.preventAutoHideAsync()` is fired at module scope and
  the `SplashGate` hides on `useI18n().ready`. The combo works, but
  the `.catch(() => {})` swallows real failures (e.g. native module
  init failure during a corrupt install). Add a 5-second timeout that
  hides the splash anyway as a safety net so users never see an
  infinite splash if `I18nProvider` fails to set `ready`.

**ISSUE-014 (P2): `mobile/scripts/asc.mjs` and `asc-list.mjs` duplicate JWT helpers.**
- Files: `mobile/scripts/asc.mjs:37-55`, `mobile/scripts/asc-list.mjs:13-30`
- Both files re-implement the ES256 JWT signing function and the `asc()`
  fetch wrapper. Extract to `mobile/scripts/lib/asc-jwt.mjs` (or just
  `asc-client.mjs`) and import. ~40 LOC removed.

**ISSUE-015 (P2): Sync script depends on Node `--experimental-strip-types`.**
- File: `mobile/scripts/sync-content.ts:16, mobile/package.json:10-11`
- Works on Node 22+ but emits `ExperimentalWarning` every run and is
  noisy in CI. Once `@regatta/content` extraction lands (ADR-0003 step
  2), this all goes away. Until then: gate the warning by passing
  `--no-warnings=ExperimentalWarning` to keep CI logs clean.

**ISSUE-016 (P2): `expo-localization`'s `getLocales()` returns array; `detectDeviceLang` only checks the first match.**
- File: `mobile/src/i18n/device-locale.ts:18-22` -- already does the
  right thing (walks the priority list). False alarm; keep as P2 docs
  note: the loop order matters and is correct.

## Architecture notes

**Provider stack ordering in `_layout.tsx` is correct:** `ErrorBoundary`
> `GestureHandlerRootView` > `SafeAreaProvider` > `I18nProvider` >
`SplashGate` > `Stack`. ErrorBoundary outermost is right; gesture root
must be above safe-area for the standard recipe; i18n above splash so
splash gating reads `ready`.

**Stack-only navigation:** all 16 routes use `expo-router` Stack,
no tab bar yet. Home does the navigation hierarchy via primary cards
+ ListRows. Acceptable for v1; the tab bar is on the Phase 1 punch list
in ROADMAP §3 ("Bottom tab bar (Home / Bootcamp / Sim placeholder /
Glossary / Settings)") -- it has not landed yet. Filed implicitly under
ROADMAP.

**Header chrome inconsistency:** Home sets `headerShown: false` and
draws its own brand block (`Week to / Regatta`). Every other screen
uses the default Stack header with translated `title`. This is fine and
matches web's pattern; document in DECISIONS.md once a HeroHeader
primitive lands.

**Error boundary:** root-level only. Async-loading screens (Bootcamp
detail, Rules detail, Gallery, future Leaderboard) currently propagate
errors up to the root boundary; a per-screen boundary that recovers via
"go back" would be a Phase 5 polish. Today, a single bad lesson detail
crashes the whole app. Acceptable for v1 internal beta; promote when
real users land.

**ADR-0003 status as of this pass:** bridging script is healthy, all
7 data files are synced, and the typed barrel is in good shape. Mobile
is ready to switch to `@regatta/content` the moment Shared lane
executes the workspace move. The `tacks` / `maneuvers` gap in the typed
barrel (ISSUE-005) is the only place where the barrel falls behind
the JSON.

**`expo-doctor`: 17/17 pass.** No version misalignments. New
Architecture (Fabric+TurboModules) is on; SDK 54 is current. No
deprecation warnings.

**Dependencies look clean.** Every dep is paired with a use site;
no unused. `react-native-worklets` is pulled in for Reanimated 4 worklet
support and is consumed implicitly via `Gesture.Pan().runOnJS(true)` in
the simulator -- although the worklet boundary is currently bypassed,
the dep is still needed by Reanimated internals.

**i18n: copy-paste compatibility is real.** `tp(ru, en, pl, extras?)` and
`tl({...})` match web semantics exactly. The `pickLocalized` /
`legacyPick` / `legacyPickArray` helpers are pure-TS ports of the web
versions. Once ADR-0003 extracts `packages/content`, the mobile
`languages.ts` shrinks to a re-export and the duplication ends.

**Persistence:** AsyncStorage is the only tier wired today (bootcamp
progress + i18n lang). expo-sqlite (replays), expo-secure-store
(auth tokens), and react-query (server cache) are all deferred per
ADR-0004's tier matrix to Phase 2/3. No infrastructure debt; the
foundations are in the right places for when those tiers come online.

**Build pipeline:** EAS profiles (development / preview / production)
are correct. `appVersionSource: remote` keeps version control out of
the local file -- right call. `ExportOptions.plist` is production-grade
(automatic signing, no bitcode, strip Swift symbols). Privacy manifests
in `app.json` are populated for the four required NSPrivacyAccessedAPI
categories (UserDefaults, FileTimestamp, SystemBootTime, DiskSpace).

**ASC scripts:** `asc.mjs` is a complete TestFlight Internal-tier
setup helper (compliance + group + tester + build attach). `asc-list.mjs`
is a quick lister. Both are functional but duplicate the JWT helper
(ISSUE-014). The default-from-env pattern with hardcoded fallbacks is
ergonomic for the solo developer setup but should move to env-only
before the project takes contributors.

**Web/mobile drift watchpoints:**
1. `mobile/src/i18n/languages.ts` vs `src/lib/languages.ts` -- both files
   declare `LANGUAGE_CATALOG`, `Lang`, `LegacyLocalized`. As of this
   pass they agree but no automated check enforces it. Add to the
   `sync-content:check` script as a follow-up (compute a checksum of
   the shared portion and assert equality).
2. `app.json` version vs `app/settings.tsx` version string (ISSUE-001).
3. `mobile/src/data/types.ts` vs `src/data/sailing-data.ts` exports
   (ISSUE-005).

**Recommended next pass priorities:**

1. Coordinate ISSUE-001 + ISSUE-002 with tester lane (test fix +
   screen fix go in same commit).
2. Land ISSUE-003 / ISSUE-004 as the Phase 2 simulator entry ticket.
3. Promote SectionLabel + EmptyState (ISSUE-007 + ISSUE-008) once a
   4th instance of either appears.
4. Push Shared lane to execute ADR-0003 step 2 (workspace + content
   extraction) -- bridging works but every additional week of two-source-
   of-truth content is a drift surface.
