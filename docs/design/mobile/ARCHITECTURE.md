# Week to Regatta - Mobile: Architecture & Change Map

Authoritative "how the mobile app is built and where every screen/element lives"
reference. If you only read one mobile doc, read this. Last mapped: 2026-06-21
(branch `app`, app version 1.3.0 / build 19).

---

## 0. READ FIRST - where the code lives (the #1 source of "we fixed it but nothing changed")

This repo holds TWO apps:

| App | Lives in | Branch | Ships via | URL / target |
|---|---|---|---|---|
| **Web** (the website) | `src/` | **`main`** | push to `main` -> GitHub Actions -> VPS Docker | regatta.icoffio.com |
| **Mobile** (iOS "Week to Regatta") | `mobile/` | **`app`** ONLY | LOCAL Xcode archive -> altool -> TestFlight | App Store / TestFlight |

**Critical traps:**

1. **`main` contains a DEAD mobile scaffold.** On `main`, `mobile/app/simulator/index.tsx`
   is a `PlaceholderScreen` ("Skia simulator lands in Phase 2") and `mobile/app.json`
   says version `0.1.0`. The REAL mobile app (v1.2/v1.3, the cockpit, all screens)
   exists **only on the `app` branch**. Editing mobile files while on `main` edits
   throwaway code that never ships.

2. **Before ANY mobile change, verify you are on the real code:**
   ```sh
   git branch --show-current        # must print: app
   grep '"version"' mobile/app.json # must print 1.x.x  (NOT 0.1.0)
   ```
   If it says `0.1.0` / a PlaceholderScreen, you are on the wrong branch. `git checkout app`.

3. **The website's "Points of Sail" (clean sector wheel) is WEB code** (`src/`), a
   different component from the mobile one. Matching the mobile screen to the web
   means changing the MOBILE component, not the web one.

4. **TestFlight builds are local + manual** (see `ship-expo-ios-appstore` skill /
   `V1.1_RELEASE_CHECKLIST.md`): bump `mobile/app.json` version+buildNumber, prebuild,
   pod install, xcodebuild archive, export, `altool --upload-app`. EAS config exists
   but is dormant (no Expo login on the build machine). So a code change is NOT live
   in TestFlight until a new build is archived + uploaded. "I changed the code" != "the
   build changed".

---

## 1. Run / build / release

- **Dev loop:** `cd mobile && npx expo run:ios` (builds the dev client to the iOS
  Simulator and connects Metro). Fast Refresh applies most JS edits live.
- **Release (current, local Xcode):** bump `mobile/app.json` `version` + `ios.buildNumber`
  (+ `android.versionCode`), then prebuild -> pod install (`LANG=en_US.UTF-8`) ->
  xcodebuild archive (Automatic signing + ASC `.p8` key) -> exportArchive ->
  `altool --upload-app`. Then App Store Connect REST scripts in `mobile/scripts/asc-*.mjs`.
- **TestFlight pre-release train = `CFBundleShortVersionString` (= `expo.version`).** A
  version that reaches READY_FOR_SALE CLOSES its train; bump `expo.version` every release
  or `altool` bounces with a hidden `90186` train-closed error.
- **State today:** App Store **v1.2 (build 18) LIVE**; TestFlight **v1.3.0 (build 19)**
  (radar cockpit), not yet submitted for review.

---

## 2. Screen map (route -> file -> what it renders)

All routes under `mobile/app/` (expo-router v6, file-based, single Stack - NO tab bar).
Home (`app/index.tsx`) is a card/list menu that pushes everything else.

| Route | File | What it does | Render tech |
|---|---|---|---|
| `/` | `app/index.tsx` | Home menu: wordmark, daily banner, start cards, live wind, nav rows | plain RN |
| `/simulator` | `app/simulator/index.tsx` | Wind-physics sim: top/side/rear, force vectors, wind compass, drills/missions | **Skia** (top) + **SVG** (side/rear) + `SkiaYacht` |
| `/game` | `app/game/index.tsx` | Solo race vs AI: countdown, marks, finish, result | **Skia** + `SkiaYacht` |
| `/courses` | `app/courses/index.tsx` | **Points of Sail** explorer (see section 5) | `PointsOfSailDiagram` (**Skia** + SVG labels) |
| `/anatomy` | `app/anatomy/index.tsx` | Yacht anatomy: SVG hotspots + part detail | **SVG** |
| `/racing` | `app/racing/index.tsx` | Tactics: right-of-way rules + strategy diagrams | **SVG** (`RacingDiagrams`) |
| `/bootcamp` + `/bootcamp/[id]` | `app/bootcamp/index.tsx`, `[id].tsx` | Curriculum + per-lesson (diagram, quiz) | `LessonDiagram` (**SVG**), `QuizCard` |
| `/rules` + `/rules/[id]` | `app/rules/index.tsx`, `[id].tsx` | Rule scenarios + reveal | `RuleScenarioDiagram` (**SVG**) |
| `/quick` | `app/quick/index.tsx` | 6 quick-refresh tips | plain RN |
| `/glossary` | `app/glossary/index.tsx` | Searchable term glossary | plain RN |
| `/gallery` | `app/gallery/index.tsx` | Photo/video gallery by year | plain RN |
| `/spots` | `app/spots/index.tsx` | Venues + live wind/wave (Open-Meteo) | plain RN |
| `/checklist` | `app/checklist/index.tsx` | Pre-race checklist + progress | plain RN |
| `/onboard` | `app/onboard/index.tsx` | Shipboard culture/commands | plain RN |
| `/coach` | `app/coach/index.tsx` | Post-race AI coach (calls `/api/coach`) | plain RN |
| `/ask` | `app/ask/index.tsx` | Sailing AI chat (calls `/api/ai-chat`) | plain RN |
| `/settings` | `app/settings.tsx` | Language (7) + units + privacy + data | plain RN |
| `/leaderboard` | `app/leaderboard/index.tsx` | Local + global leaderboard | plain RN |
| `/history` | `app/history/index.tsx` | Race history + replay/coach actions | plain RN |
| `/replay/[id]` | `app/replay/[id].tsx` | Race replay scrubber | **Skia** + `SkiaYacht` |
| `/multiplayer` + `host`/`join`/`race/[code]` | `app/multiplayer/*` | MP lobby + local ghost-boat race | **Skia** (race) |

Root layout / providers: `app/_layout.tsx` (ErrorBoundary -> GestureHandler ->
SafeArea -> I18nProvider -> AnalyticsProvider -> SplashGate -> FirstLaunchGate -> Stack).

---

## 3. Design system (`mobile/src/design-system/`)

- **Tokens** (`tokens.ts`): dark-ocean theme - `colors` (`bgPrimary`, `accentCyan`,
  `success`, `warning`, `textPrimary`, surfaces/borders), `spacing` scale, `radii`, glow.
  Mirrors the web's `--accent-cyan` / `--bg-primary` CSS vars.
- **Shared components** (barrel `components/index.ts`): `Screen`, `Text` (6 variants),
  `Card`, `Button`, `Icon` (SVG glyphs), `ListRow`, `EmptyState`, `Skeleton`,
  `PulsePill`, `Wordmark`, `Slider`, `OfflineBanner`, `ErrorBoundary`, `PlaceholderScreen`.
- **Rich/visual components** (each used by one screen family): `SkiaYacht` (Skia yacht
  primitive), `PointsOfSailDiagram` (courses), `LessonDiagram`, `RuleScenarioDiagram`,
  `RacingDiagrams`, `WindNowCard`, `QuizCard`.

Note: some screens define small composites inline (e.g. `FilterChip`, `HudStat`) rather
than in the design system - if you can't find a control in `design-system/`, grep the screen file.

---

## 4. Shared modules + content (`mobile/src/`)

| Dir | Purpose |
|---|---|
| `analytics/` | PostHog (provider, hook, events, config). No-ops when key absent. |
| `api/` | HTTP clients to the **shared web backend** (`regatta.icoffio.com/api/*`): `chat.ts`, `coach.ts`, `daily.ts`, `leaderboard.ts`, `weather.ts`. No separate mobile backend. |
| `simulator/` | Sim runtime: `use-sim-loop.ts` (30Hz), `skia-wind.ts`, `sail-*`, `missions.ts`, `physics/` (ported VPP engine, pure TS). |
| `courses/` | `polar.ts` - polar/VPP curve builder. **Used by the Points-of-Sail diagram.** |
| `game/` | `course.ts` (courses/marks) + `ai-boats.ts` (AI opponents). |
| `data/` | **Content barrel.** JSON twins of the web `src/data/*`, re-exported typed. |
| `i18n/` | `context.tsx` (`useI18n`, 7 langs), `languages.ts` (`legacyPick`), device locale. |
| `persistence/` | AsyncStorage hooks (bootcamp, checklist, race-history, units, ...). |
| `replay/`, `leaderboard/`, `multiplayer/`, `onboarding/` | feature helpers. |

**Content is DUPLICATED, not live-imported:** web `src/data/*.ts` (source of truth) ->
`mobile/scripts/sync-content.ts` -> `mobile/src/data/*.json` -> `mobile/src/data/index.ts`.
CI guard `npm run sync-content:check` fails if stale. (ADR-0003 plans a shared package.)

---

## 5. "Where do I change X?" cookbook

| To change ... | Edit |
|---|---|
| **Points-of-Sail / wind-courses diagram** (the wheel) | `mobile/src/design-system/components/PointsOfSailDiagram.tsx` (the visual) + `mobile/app/courses/index.tsx` (the screen wrapper, readouts, cards) |
| Polar/VPP curve data | `mobile/src/courses/polar.ts` |
| Simulator scene / cockpit | `mobile/app/simulator/index.tsx` + `mobile/src/simulator/*` (helpers) + `SkiaYacht.tsx` |
| The yacht glyph (top-down) | `mobile/src/design-system/components/SkiaYacht.tsx` |
| Race / game | `mobile/app/game/index.tsx` + `mobile/src/game/*` |
| Colors / spacing / theme | `mobile/src/design-system/tokens.ts` |
| Any lesson/rule/racing diagram | the matching `*Diagram.tsx` in `design-system/components/` |
| Text content (lessons, rules, glossary) | web `src/data/*.ts`, then `npm run sync-content` |
| Translations | `mobile/src/i18n/*` (+ `tp()`/`legacyPick` at call sites) |
| AI chat / coach behaviour | WEB `src/app/api/ai-chat/route.ts` + `coach/route.ts` (mobile just calls them) |

---

## 6. Known design issues / web-vs-app parity

- **Points of Sail (courses):** the MOBILE diagram historically drew a **polar
  performance curve** ("whale") + concentric speed rings + a drag-to-steer boat on top
  of the colored sectors, and the screen was built as an interactive polar (heading
  readout, wind-strength selector). The WEB is a **clean static sector wheel** (colored
  point-of-sail sectors, a boat glyph per sector, course names on the rim, degree marks,
  LEWY/PRAWY HALS, tap a sector for detail). Target: mobile should match the web -
  remove the polar curve + speed rings + drag-polar, keep the clean sectors. (Tracked
  here; see `PointsOfSailDiagram.tsx`.)
- Other parity items live in `WEB_VS_APP_PARITY.md` and `SIMULATOR_V3_PARITY.md`.

---

## 7. Verification checklist (before saying a mobile change is done)

1. On branch `app` (`git branch --show-current`).
2. `cd mobile && npx tsc --noEmit` clean; `npm run lint`; `npm test`.
3. Build + run on the iOS Simulator (`npx expo run:ios`) and **screenshot the actual
   screen** - do not trust the code alone. A visual change is only "done" when seen
   on-device.
4. For a release: bump version + buildNumber, archive, upload, confirm the build shows
   in TestFlight (`mobile/scripts/asc-state.mjs` / App Store Connect).
