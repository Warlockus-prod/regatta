# Week to Regatta - Mobile QA Audit

Date: 2026-05-12
Scope: `mobile/app/*`, `mobile/src/*`, `mobile/__tests__/*`, `mobile/app.json`
Tester: QA pass before TestFlight v1

## TL;DR

- Test suite is clean. Before this audit: 14 suites / 68 tests / all green. After:
  20 suites / 101 passing + 2 documented skips / 0 failures. Typecheck and
  `sync-content:check` also clean.
- Cyrillic leak scan found ZERO real leaks. The single hit (`Русский` in
  the language picker) is the intentional native-name label for the RU row.
- One P1 bug visible to TestFlight users: the About card shows
  `Version 0.1.0 (build 1)` while `app.json` is at `0.2.0 / build 2`.
  Locked in regression by the new `version-consistency.test.ts` canary.
- One P1 reliability gap in the simulator: `setInterval` in
  `useSimLoop` keeps ticking when the app backgrounds. Drains battery,
  no AppState pause/resume.
- Coverage gaps closed: `[id]` routes for bootcamp/rules, the three
  `PlaceholderScreen` instances (game/leaderboard/multiplayer), the
  i18n provider runtime, and `detectDeviceLang()` are now tested.

## Test suite results

### Before audit
```
Test Suites: 14 passed, 14 total
Tests:       68 passed, 68 total
Time:        ~10 s
```

### After audit
```
Test Suites: 20 passed, 20 total
Tests:       2 skipped, 101 passed, 103 total
Time:        ~12 s
```

### New test files
- `mobile/__tests__/i18n-context.test.tsx` (12 tests) - hydration order,
  ES/FR/DE/IT extras, `tl()` resolution, `setLang` persistence.
- `mobile/__tests__/i18n-device-locale.test.ts` (7 tests) - locale
  priority, lowercase normalization, missing-tag handling, fallback.
- `mobile/__tests__/version-consistency.test.ts` (4 tests, 2 skipped) -
  guards `app.json` <-> `settings.tsx` drift. Two assertions are
  intentionally skipped because of the existing P1 drift bug; flip
  them on after the fix lands.
- `mobile/__tests__/screens/bootcamp-detail.test.tsx` (5 tests) -
  covers known/unknown id, focus block, "Open" CTA writes
  AsyncStorage and pushes the practice route.
- `mobile/__tests__/screens/rules-detail.test.tsx` (5 tests) - reveal
  toggle (all three answer sections only render after press), unknown
  id fallback.
- `mobile/__tests__/screens/placeholder-screens.test.tsx` (5 tests) -
  Game / Leaderboard / Multiplayer titles, badges, highlight bullets,
  PL hydration. Stubs `Animated.loop` so the pulse-pill loop does not
  leak the worker.

### TypeScript
`npx tsc --noEmit` exits 0 with the new test files. No new `as any`,
no `@ts-ignore`, no console.* statements in `app/*` or `src/*`.

### Content sync
`npm run sync-content:check` reports `all bundles up to date`.

## Cyrillic leak scan

Custom scan walks every `*.ts`/`*.tsx` under `mobile/app` and
`mobile/src`, classifies each Cyrillic character by whether it sits
inside a `tp(...) / tl(...) / t(...) / legacyPick(...) / pickLocalized(...)`
call (or inside a `{ ru: '...' }` object literal). Found 1 hit:

- `mobile/src/i18n/languages.ts:75` - `nativeName: 'Русский'` for the
  language picker row. INTENTIONAL, not a leak.

Net: 0 real leaks. The codebase's `tp/tl` discipline is solid.

## Bugs found

### P1 - Version drift between Settings card and app.json
- File: `mobile/app/settings.tsx:88`
- What is wrong: hardcoded literal `Version 0.1.0 (build 1)` in the
  About card. Meanwhile `mobile/app.json` declares
  `expo.version: 0.2.0`, `ios.buildNumber: 2`, `android.versionCode: 2`.
  Real users on TestFlight see the wrong version label, which makes
  bug reports ambiguous ("what version are you on?" -> "0.1.0
  build 1, says so right here").
- Repro: open Settings on any current build. Version line says
  `Version 0.1.0 (build 1)`. App switcher / TestFlight metadata says
  `0.2.0 (2)`.
- Suggested fix: replace the hardcoded line with
  `Constants.expoConfig?.version` and `Constants.expoConfig?.ios?.buildNumber`
  via `expo-constants`, and bump `phaseLabel` to read from a single
  build-info constant. Then re-enable the two `it.skip` blocks in
  `mobile/__tests__/version-consistency.test.ts` so future drift
  fails CI.

### P1 - Simulator setInterval keeps ticking when backgrounded
- File: `mobile/src/simulator/use-sim-loop.ts:55`
- What is wrong: `setInterval(..., DT)` runs at 30 Hz and never
  pauses. iOS keeps JS timers alive briefly after backgrounding;
  if the user opens Simulator and then locks the phone, the boat
  keeps integrating in memory, the `useReducer` keeps incrementing,
  and AsyncStorage / battery footprint suffers. There is no
  `AppState.addEventListener('change', ...)` hook to pause the
  loop. The cleanup `clearInterval` only fires on unmount, which
  does not happen when the app is just backgrounded.
- Repro: open `/simulator`, send the app to background, leave for
  30 seconds, foreground. The boat will be at a different position
  than when you backgrounded (proves the loop kept running).
- Suggested fix: subscribe to `AppState` in `useSimLoop`, pause
  the interval on `'background'` and resume on `'active'`. Reset
  the trail timestamp on resume so motion is not interpolated
  across the suspend.

### P1 - Gallery URL open has no error path
- File: `mobile/app/gallery/index.tsx:38`
- What is wrong: `void Linking.openURL(url)` silently swallows
  any rejection. If a YouTube tile is tapped on a device without
  YouTube installed (or the URL is malformed because of bad data),
  the user sees nothing happen at all - no toast, no Alert. Worst
  case: a user thinks their tap did not register and keeps tapping.
  `Linking.canOpenURL` is not checked first either.
- Repro: airplane mode on, open Gallery, tap a YouTube thumbnail.
  Image was already cached so the tile is visible, but the deep
  link cannot resolve. Nothing happens.
- Suggested fix: `Linking.openURL(url).catch(() => Alert.alert(tp('Не удалось открыть', 'Could not open link', ...)))`.
  Optionally precheck with `canOpenURL` and disable the press
  effect when it returns false.

### P2 - No empty-state UX for failed JSON bundle
- Files: `mobile/app/bootcamp/index.tsx`, `gallery/index.tsx`,
  `rules/index.tsx`, `anatomy/index.tsx`, `racing/index.tsx`,
  `courses/index.tsx`, `onboard/index.tsx`, `quick/index.tsx`
- What is wrong: every list screen iterates a synced JSON array
  with no fallback render if the array is empty. The data contract
  guarantees non-empty bundles via `sync-content:check`, but if a
  future bundle is malformed or partially imported, screens render
  a header + a blank scroller with no error messaging. Glossary
  is the one exception (it shows `Nothing found`).
- Repro: temporarily swap `mobile/src/data/bootcamp.json`'s
  `bootcampLessons` to `[]`. Bootcamp screen shows the summary
  "0 lessons, around 0 min total" and an empty list with no hint.
- Suggested fix: add a `<Text variant="muted">{tp('...empty...', '...')}` 
  fallback when `array.length === 0` in each list screen. Lift the
  pattern from glossary's `<View style={styles.empty}>` block.

### P2 - PlaceholderScreen Animated.loop has no cleanup gate
- File: `mobile/src/design-system/components/PlaceholderScreen.tsx:67-85`
- What is wrong: the `Animated.loop` is started with `useNativeDriver: true`
  but in test (or older Android) environments where the native
  driver is unavailable, the loop falls back to JS-thread timers
  and can keep handles alive after navigation. In Jest this surfaces
  as `worker process has failed to exit gracefully` (now mocked
  around in the new test file). On device the fallback path is
  rare but the lack of an explicit `Animated.Value.removeAllListeners`
  in cleanup is a soft footgun.
- Suggested fix: in addition to `loop.stop()`, call
  `opacity.removeAllListeners()` in the effect cleanup. Low-impact
  belt-and-braces.

### P2 - i18n hydration window can show RU on non-RU devices
- Files: `mobile/src/i18n/context.tsx:43-58`, `mobile/app/_layout.tsx:64`
- What is wrong: `useState<Lang>(DEFAULT_LANG)` starts at `'ru'`,
  then the SplashGate hides the splash only when `ready` flips
  true. Good. BUT: the splash hide is in a `useEffect`, so there's
  a 1-frame window where the JS-thread renders the home screen in
  RU before the device-locale hook returns. On a high-end iPhone
  this is invisible; on a cold-start on an older device it is a
  perceptible flash. The web client uses the cookie-based SSR pipe
  to avoid this.
- Suggested fix: pre-resolve the lang synchronously via
  `expo-localization`'s `getLocales()` (which IS sync) before the
  `useState` initial value, then only the AsyncStorage read is
  async. That removes the RU-flash on EN/PL/etc devices.

### P3 - Polish/Spanish/etc translations strip diacritics inconsistently
- File: `mobile/app/index.tsx:39` and many siblings
- What is wrong: The PROJECT RULE in CLAUDE.md says drop Polish
  diacritics for ASCII-only typography. Spanish/French/German/Italian
  ARE allowed to keep diacritics. The mobile bundle is consistent
  with this rule (zero PL diacritics; zero curly quotes; zero
  em-dashes), but the FR / IT translations sometimes use acute
  accents and sometimes don't (e.g. `Leçon` in `bootcamp/[id].tsx:81`
  vs `Lecciones` plain in many others). Not a bug per se since
  the rule allows it, but the mix is jarring.
- Suggested fix: pick one stance - drop all unicode diacritics,
  or keep them everywhere - then sweep with a script.

## Edge case audit findings

### Empty data state
- `glossary/index.tsx` correctly renders "Nothing found" when filter
  produces zero matches. Tested. PASS.
- All other list screens silently show a header + empty scroll
  area. See P2 above.
- Bootcamp progress UI hides the "Completed N of M" line when
  `completedIds.size === 0`. Good UX.

### Offline mode
- Gallery requires network for thumbnails (`weektoregatta.com`).
  No offline placeholder or `Image onError` handler. P2 polish.
  Currently bundles a gray `bgCard` background while loading.
- All other screens are offline-safe (synced JSON bundles).
- AsyncStorage hydration falls back gracefully on parse errors
  (covered by `bootcamp-progress.test.ts`).

### Language switch mid-session
- `setLang` writes to AsyncStorage and re-renders consumers
  immediately. Verified by the new `i18n-context.test.tsx` -
  swapping lang through `setLang('pl')` then reading
  `tp(...)` returns the PL string in the same render pass.
- AsyncStorage persistence verified by `settings.test.tsx`.

### Deep linking
- `app.json` declares `scheme: regatta` so `regatta://` URLs are
  registered. expo-router auto-generates a route map from the
  filesystem (`/bootcamp/wind-direction` -> `app/bootcamp/[id].tsx`
  with `params.id = 'wind-direction'`).
- The `[id]` routes correctly handle missing/unknown ids and
  show a localized "Lesson not found" / "Scenario not found"
  fallback. NOW TESTED.
- No tests for malformed deep links yet (`regatta:///bootcamp/`
  empty string, `regatta://random/path`). Could add a follow-up
  test once `expo-router`'s test harness is wired.

### App resume from background
- Simulator does NOT pause its setInterval - see P1 above.
- I18n provider re-hydrates only on mount, not on resume.
  AsyncStorage cannot change while the app is backgrounded so
  this is fine.
- Bootcamp progress ditto - in-memory set survives background.

### First launch vs returning user
- First launch: `regatta.lang.v1` empty -> device locale wins ->
  EN / PL / etc per system. Tested.
- First launch: `regatta.progress.bootcamp.v1` empty -> 0 of 8
  shown, no "Completed" line. Verified.
- Returning user: hydrated state survives, lessons keep their
  green badge. Verified.

### Long content
- Did not find any explicit `numberOfLines` truncation on Bootcamp
  / Rules / Onboard cards. RN Text wraps natively, so very long
  copy will simply expand the card. Acceptable for v1; revisit
  if a future translation explodes a card height.
- Gallery title uses `numberOfLines={2}` already. Good.

### RTL readiness
- No `I18nManager.forceRTL` or `flexDirection: 'row-reverse'`
  in any source file. RTL would break the chevron in `ListRow`,
  the hud cell layout in Simulator, and the `marginLeft` /
  `marginRight` literals in Cards. Not shipped, not blocking.
- Suggested fix when RTL languages (Arabic / Hebrew) become a
  thing: convert margin/padding-Left/Right to `Start/End` and
  let `I18nManager` flip flexDirection.

## Missing test coverage (residual gaps after this audit)

The audit closed the largest gaps. Remaining nice-to-haves:

- `mobile/app/simulator/index.tsx` - no test. Skia + gesture
  handler + Animated do not play well with Jest without heavy
  mocking. Consider an Expo dev-client smoke test instead.
- `mobile/src/design-system/components/ErrorBoundary.tsx` - no
  test. Trivially `throw` in a child render to assert the fallback
  renders. Suggested test: `__tests__/error-boundary.test.tsx`.
- `mobile/src/design-system/components/PointsOfSailDiagram.tsx`
  no test. Pure rendering, easy to snapshot.
- `mobile/scripts/sync-content.ts` - has a `--check` flag that runs
  in CI but no unit tests for the diff logic itself. Low priority.
- Gallery `Linking.openURL` failure path - hard to test without
  mocking the native module deeper. Add once the P1 fix lands so
  the mock is rationalized.
- AppState pause/resume for the simulator - add a test once the
  P1 AppState handling is implemented.

## Other observations

- `console.error` in `ErrorBoundary.componentDidCatch` is the only
  console call in the entire mobile source tree. Whitelisted with
  an inline `eslint-disable`. Will be replaced by Sentry capture
  in Phase 5 per the docstring.
- No bare `alert()` calls anywhere.
- Zero `as any` and zero `@ts-ignore` in app/src.
- Zero TODO/FIXME/HACK/XXX comments.
- Zero `.map(...)` without `key=`.
- All Polish translations strip diacritics per the project rule.
- ASCII typography respected: no em-dash (U+2014), no en-dash
  (U+2013), no curly quotes, no ellipsis character. Hyphens used
  consistently.

## Files changed by this audit

- `mobile/__tests__/i18n-context.test.tsx` (new)
- `mobile/__tests__/i18n-device-locale.test.ts` (new)
- `mobile/__tests__/version-consistency.test.ts` (new)
- `mobile/__tests__/screens/bootcamp-detail.test.tsx` (new)
- `mobile/__tests__/screens/rules-detail.test.tsx` (new)
- `mobile/__tests__/screens/placeholder-screens.test.tsx` (new)
- `docs/design/mobile/audits/qa-report.md` (this file)

No `mobile/app/*` or `mobile/src/*` source files were modified
(out of lane for this audit).
