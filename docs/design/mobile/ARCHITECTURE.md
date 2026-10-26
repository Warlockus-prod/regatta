# Week to Regatta - Mobile: Architecture & Change Map

Authoritative "how the mobile app is built and where every screen/element lives"
reference. Current mobile learning slice: 2026-10-15, `codex/learning-modules`.
Actual distribution state belongs to `BUILDS.md`.

## 0. READ FIRST - where the code lives

| App | Lives in | Release branch | Ships via | URL / target |
|---|---|---|---|---|
| Web | `src/` | `main` | GitHub Actions -> VPS Docker | weektoregatta.com |
| Mobile | `mobile/` | `main` | Local Xcode archive -> App Store Connect | App Store / TestFlight |

The branches were consolidated on 2026-06-21. The old `app` branch is historical
and is no longer the release source. Do not switch to it for mobile changes.
For the mobile-first 1.7.0 TestFlight iteration, build from the reviewed
`codex/learning-modules` commit. Website adaptation and deployment follow later.
See `BUILDS.md` for the release journal.

**Shared 3D module:** `/simulator2` renders the React Three Fiber scene from
`src/features/simulator-3d`. Native `mobile/app/simulator2.tsx` hosts the same
production route via `SimWebView`. A website deployment updates the scene for
installed apps; native loading/error handling requires an app binary update.
`scene-ready` means the yacht asset is mounted, not merely that HTML loaded.
`scene-error`, HTTP errors and content-process termination show native retry.
3D requires internet; the offline fallback remains available.

**Since 1.6.2 (build 43):** the app bundles Trainer and 3D in
`assets/sailing-offline.html`; both native routes load that asset through
`SimWebView`. A web deployment does not update this bundled version. Language
and drill parameters are injected; the shared source is checked by the offline
build script. The paragraph above describes builds before 1.6.2.

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
- **App Store review prompt:** `mobile/src/review/review-prompt.ts` (expo-store-review)
  asks for a rating after 3 wins, at most once per 120 days. A win is the first
  passed bootcamp quiz of a lesson (not "Open"), a saved sail theory check, a
  passed mock exam, or a race podium that is not last place (`isReviewPodium`).
  The call sites sit next to the matching analytics events.
- **Languages shown by iOS and the App Store** come from `CFBundleLocalizations` in
  `mobile/app.json`; without it the store page lists "English" only. Per-language
  permission texts (the microphone prompt, which names both the SRC radio
  simulator and the sternik oral exam practice) live in `mobile/locales/<lang>.json`
  (Expo `locales`). Both take effect with the next build.
- **Privacy manifest** lives at `expo.ios.privacyManifests` in `mobile/app.json`,
  the only place Expo's PrivacyInfo step reads it (until build 48 it sat in the
  expo-build-properties options, which ignore it, so the shipped
  `PrivacyInfo.xcprivacy` declared no collected data). Guarded by
  `mobile/__tests__/app-config.test.ts`.
- **Analytics consent** (`mobile/src/persistence/analytics-consent.ts`) is shared
  by every mounted hook. The WebView hosts (`SectionWebView`, `SimWebView`,
  `OfflineRadioCourse`) mount only after the choice is read, inject the
  no-analytics flag (`window.__REGATTA_NO_ANALYTICS__` plus sessionStorage
  `regatta.noanalytics.v1`) when it is off, and key the WebView on it. "Clear all
  data" keeps this row. PostHog runs with `disableGeoip: true`.
- **Trainer controls** (`mobile/src/persistence/controls.ts`, key
  `regatta.controls.v1`, the same record as the website's
  `src/features/trainer-controls/prefs.ts`): sliders or wheels and the click
  sound, set in Settings > Trainers. `SimWebView` injects the record as
  `window.__REGATTA_CONTROLS__` before the page runs (it does not wait for the
  read: a later value is injected live) and stores what the page posts back as
  `{"type":"controls-prefs"}`. No vibration (owner decision 2026-10-19). Tests:
  `mobile/__tests__/controls-prefs.test.ts`, `mobile/__tests__/sim-webview.test.tsx`.
- **Radio work screen** (owner 2026-10-24): the SRC simulator, the controls
  lessons and the live conversation open a fixed work screen with the radio
  pinned and the task panel scrolling under it
  (`src/app/radio/symulator/RadioWorkspace.tsx`, the same code in the offline
  bundle and in `?embed=1`). While it is open the page posts
  `{"type":"radio-workspace","open":true}` and `OfflineRadioCourse` hides the
  stack header and the tab bar (`hideMainNavigation` in `mobile/src/navigation/visibility.ts`) (the page's own bar has the exit; the swipe back still leaves the
  course), giving the 44pt back to the task panel; `open:false`, a mode switch, a
  reload or a load error bring the header back.
- **Radio trainer language** (owner 2026-10-24): the trainer runs in all seven
  languages. `OfflineRadioCourse` injects `window.__REGATTA_APP_LANG__` (the
  app language) into the offline bundle and opens the online pages with
  `?lang=<app language>`; the bundle's i18n shim
  (`mobile/scripts/offline-radio/i18n.tsx`) knows all seven, and
  `SternikLangScope` keeps everything except `/radio/symulator` in PL / RU. The
  course bar offers the app language next to PL and RU; an explicit choice is
  stored in `regatta.radio.offline.lang.v2` (the old v1 key was written
  automatically and is no longer read).
- **Wheels in the native trainer** (`app/simulator/index.tsx`, the Practice
  fallback): with `mode === 'wheels'` the mainsheet and jib sheet sliders give
  way to `mobile/src/simulator/WheelDeck.tsx`, the twin of the web's
  `WheelDeck` (helm big in the middle, jib sheet left and mainsheet right or
  swapped by the record's `jibSheetSide`, tap a sheet to bring it to the
  middle, back after 4 s). Pan from react-native-gesture-handler, angle around
  the center, 22% hub dead zone. The numbers are the web's
  `src/features/trainer-controls/mapping.ts`, imported through
  `mobile/src/simulator/wheel-controls.ts` (metro watches that folder): one helm
  turn = 90 degrees of course through `setTargetHeading`, one sheet turn = 25%,
  clockwise sheets in; the native sheet value (1 = sheeted in) is converted to
  the shared ease there and nowhere else. Each wheel is VoiceOver adjustable
  (helm 5 degrees, sheet 5% per step), at least 64 pt, and the swap does not
  animate under Reduce Motion. Clicks: `mobile/src/simulator/wheel-sound.ts`
  plays four WAVs (`mobile/assets/sounds/wheel-*.wav`, rendered from the web's
  WebAudio blips by `mobile/scripts/build-wheel-clicks.mjs`) through
  `expo-audio`, only when `sound` is on, mixing with other apps and silent with
  the ring switch off; no Haptics calls from the wheels. `expo-audio` is a
  native module (no config plugin: playback needs no permission), so it ships
  with the next build. Tests: `mobile/__tests__/wheel-controls.test.ts`,
  `mobile/__tests__/wheel-deck.test.tsx`, `mobile/__tests__/screens/simulator.test.tsx`.
- **Orientation**: `app.json` allows every orientation and the
  `expo-screen-orientation` plugin starts the app locked to portrait
  (`initialOrientation: PORTRAIT_UP`); `mobile/src/simulator/orientation.ts`
  unlocks only while a trainer WebView (`tier` set) is focused, and the tier
  switcher hides when the phone is turned. Native module: needs a new build.
- **iOS 27 needs the UIScene life cycle.** Apps linked against the iOS 27 SDK
  (Xcode 27) close at launch on iOS 27 without it, which is what happened to 1.6.2.
  `mobile/plugins/with-uiscene.js` adds it at prebuild: single-scene manifest in
  Info.plist, a generated `SceneDelegate.swift` that owns the window, starts React
  Native in it and routes `regatta://` links and user activities through the
  AppDelegate (so Expo linking sees cold-start links), an AppDelegate without a
  window, and a Podfile step that raises pod targets below iOS 15.1 (Xcode 27
  rejects them). The plugin throws if the Expo AppDelegate template changes.
  Remove it when moving to Expo SDK 57.0.23+ (`ios.enableSceneSupport`) or 58
  (default). Gate G2 now includes a clean-install launch on the newest iOS.
- **Current state:** the top row of `BUILDS.md` and the release sections of
  `CHANGELOG.md` (not repeated here, it goes stale).

---

## 2. Screen map (route -> file -> what it renders)

All routes under `mobile/app/` use expo-router v6 and a Stack wrapped by
`AppNavigation`, with five product destinations. The bar hides for instruments.

| Route | File | What it does | Render tech |
|---|---|---|---|
| `/` | `app/index.tsx` | Home menu: wordmark, daily banner, start cards, live wind, nav rows | plain RN |
| `/simulator` | `app/simulator/index.tsx` | Wind-physics sim: top/side/rear, force vectors, wind compass, drills/missions | **Skia** (top) + **SVG** (side/rear) + `SkiaYacht` |
| `/game` | `app/game/index.tsx` | Solo race vs AI: countdown, marks, finish, result | **Skia** + `SkiaYacht` |
| `/courses` | `app/courses/index.tsx` | **Points of Sail** explorer (see section 5) | `PointsOfSailDiagram` (**Skia** + SVG labels) |
| `/anatomy` | `app/anatomy/index.tsx` | Yacht anatomy: SVG hotspots + part detail | **SVG** |
| `/racing` | `app/racing/index.tsx` | Tactics: right-of-way rules + strategy diagrams | **SVG** (`RacingDiagrams`) |
| `/bootcamp` + `/bootcamp/[id]` | `app/bootcamp/index.tsx`, `[id].tsx` | 8 lessons in 3 modules; goal, understand / check / practice, saved place | `FoundationScene` / wind pilot (**SVG**), `QuizCard` |
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
| `/replay/[id]` | `app/replay/[id].tsx` | World records use bundled3D; historical pixel records keep their scrubber; unavailable world data shows Back | **Bundled3D** / legacy **Skia** |
| `/multiplayer` + `host`/`join`/`race/[code]` | `app/multiplayer/*` | Live web room (`/multiplayer`, shared with the site) in `SimWebView`; `host`/`join`/`race/[code]` redirect to it | WebView |
| `/race-3d` | `app/race-3d/index.tsx` | The solo race seen from the boat: web `/game?view=3d` in `SimWebView` (online), with the Race hub venue and shore written into the page's localStorage (`localStorage` prop); offline falls back to the native `/game` | WebView |

Root layout / providers: `app/_layout.tsx` (ErrorBoundary -> GestureHandler ->
SafeArea -> I18nProvider -> AnalyticsProvider -> SplashGate -> FirstLaunchGate -> Stack).

---

## 3. Design system (`mobile/src/design-system/`)

- **Tokens** (`tokens.ts`): two palettes with the same keys. `lightColors` is the v3
  "paper" look (paper `#f7f5f0`, ink `#123247`, action blue `#006ea6`, teal
  confirmation `#006d70`, sand chips `#e9ddc7`) and is the app default `colors`.
  `darkColors` is the dark-ocean palette of builds up to 1.6.3. Key names are roles:
  `accentCyan` means "action colour" (blue on paper, cyan on dark). Also `spacing`,
  `radii` (`control` 14, `card` 20, `photo` 24, `sheet` 28), `shadow`/`darkShadow`,
  `glow`/`darkGlow`. The web keeps its own palette (the site is not on v3 yet).
- **Navigation:** five equal tabs from `navigation/tabs.ts`; the fifth is Menu (title,
  search, then the whole catalog; "My progress" is a collapsed row after the catalog). No Menu button in headers: where the tab bar is
  hidden (instrument screens) the explicit way out is a chevron-only Back.
- **Large text:** tab labels stay on one line (shrink to fit, growth capped at 1.3x),
  Back is chevron-only on every screen, the Home photo title grows at most 1.4x, and
  from a font scale of 1.6 the decorative thumbnails (Home card and paths, course path
  icon tiles) are not drawn so titles get the full width.
- **Surfaces** (`surface.tsx`): instrument screens (native simulators, race, replay,
  offline anatomy, every `SimWebView` page) wrap their content in `<DarkSurface>` and
  import `darkColors as colors`; `Text`, `Button`, `Card`, `ListRow`, `Screen`,
  `EmptyState`, `WindNowCard` follow the surface via `bySurface()`. `darkStackOptions`
  gives those screens a dark header and light status bar icons.
- **Status bar:** the app is scene-based (`plugins/with-uiscene.js`), and iOS ignores the
  UIApplication status bar API there, so `UIViewControllerBasedStatusBarAppearance` is on
  and each screen sets `statusBarStyle` through its stack options (root default `dark`;
  Home switches between `light` over the photo and `dark` over paper). Content never
  scrolls under the clock: screens with a header are cleared by it, the tab hubs
  (`navigation/ProductHub.tsx`: Menu, Learn, Practice, Race) keep `Screen`'s top inset
  as a fixed paper strip outside the scroll view, and Home fades in its own paper strip
  once the sheet reaches the top.
- **Shared components** (barrel `components/index.ts`): `Screen`, `Text` (7 variants, incl. `eyebrow`),
  `Card`, `Button`, `Icon` (SVG glyphs), `ListRow`, `EmptyState`, `Skeleton`,
  `PulsePill`, `Wordmark`, `Slider`, `OfflineBanner`, `ErrorBoundary`, `PlaceholderScreen`.
- **Rich/visual components** (each used by one screen family): `SkiaYacht` (Skia yacht
  primitive), `PointsOfSailDiagram` (courses), `LessonDiagram`, `RuleScenarioDiagram`,
  `RacingDiagrams`, `WindNowCard`, `QuizCard`, `PhotoAnnotation` (image with numbered
  details, list and closeup) and `DiagramStates` (one drawing, named states, key, limit),
  the last two for the lesson template in `src/lessons`.

Note: some screens define small composites inline (e.g. `FilterChip`, `HudStat`) rather
than in the design system - if you can't find a control in `design-system/`, grep the screen file.

---

## 4. Shared modules + content (`mobile/src/`)

| Dir | Purpose |
|---|---|
| `analytics/` | PostHog (provider, hook, events, config). No-ops when key absent. |
| `api/` | HTTP clients to the **shared web backend** (`weektoregatta.com/api/*`): `chat.ts`, `coach.ts`, `daily.ts`, `leaderboard.ts`, `weather.ts`. No separate mobile backend. |
| `simulator/` | Sim runtime: `use-sim-loop.ts` (30Hz), `skia-wind.ts`, `sail-*`, `missions.ts`, `physics/` (shim to the golden VPP engine), wheel mode `WheelDeck.tsx` + `wheel-controls.ts` + `wheel-sound.ts`. |
| `courses/` | `polar.ts` - polar/VPP curve builder. **Used by the Points-of-Sail diagram.** |
| `game/` | `course.ts` (courses/marks) + `ai-boats.ts` (AI opponents) + `progression.ts` (mark rounding) + `units.ts` (`KN_TO_PX_PER_S`, the one knots-to-pixels scale shared with `simulator/use-sim-loop.ts`). |
| `game/VenueLand.tsx`, `game/VenuePicker.tsx`, `game/copy.ts`, `persistence/venue.ts` | Race setup in the Race hub and its effect on the race (ADR-0005 in the root `DECISIONS.md`): race mode `regatta.race.mode.v1` (simple: auto trim; pro: the learner trims the mainsheet and the jib sheet under the course with the sliders or the wheels of Settings > Trainers, and sees the sail state), the shore switch `regatta.shore.v1` and the venue `regatta.venue.v1`; the shore of the venue drawn around the race bay in Skia. Steering is "point where to go": the heading runs from the boat to the finger. With a shore the race keeps the player and the rivals inside the bay (`water` rect in `use-sim-loop.ts` and `ai-boats.ts`) instead of wrapping across the screen. |
| `data/` | **Content barrel.** JSON twins of the web `src/data/*`, re-exported typed. |
| `i18n/` | `context.tsx` (`useI18n`, 7 langs), `languages.ts` (`legacyPick`), device locale. |
| `persistence/` | AsyncStorage hooks (bootcamp, checklist, race-history, units, `analytics-consent.ts`, ...). |
| `review/` | `review-prompt.ts`: App Store rating prompt after real wins (see section 1). |
| `home/` | v3 Home and Menu progress: `copy.ts` (app-only strings, 7 languages, "N of TOTAL" / "Label: N" counts), `continue.ts` (`resolveContinue`: which course and lesson the Continue card offers, from the bookmark), `PhotoCard.tsx` (photo with a live label on a fade), `useLearningSnapshot.ts` (re-reads bootcamp evidence, sail course, bookmark and race history on every focus). Photos: `assets/design/*.jpg`, resized from the site gallery (`public/gallery/regatta-2025`, `regatta-2026`). |
| `bootcamp/learning-guide.ts`, `FoundationScene.tsx` | Three module groups, eight goals, seven new three-state diagrams and localized explanations. The first lesson keeps the wind pilot. Turn lessons use concrete practice tasks. |
| `bootcamp/lesson-position.ts`, `ReturnToLesson.tsx` | Persist step and diagram separately from grades; validate `fromLesson`; native header returns to the same lesson from practice. |
| `bootcamp/status.ts` | Lesson state from evidence: `passed` needs a passed quiz (>= 70%) or, for a lesson without a quiz, an explicit done mark; the legacy "completed" key means viewed. `nextBootcampLesson`, `passedLessonIds`. |
| `persistence/learning-bookmark.ts` | `regatta.learning.bookmark.v1`: last course (bootcamp, sails, radio, motor) and lesson, written on focus by the course screens, plus `positions` (last lesson per course), so an overview visit keeps the unfinished lesson and IDs never cross courses; unknown IDs degrade to the course. |
| `persistence/serial.ts` | One queue for the learning-progress keys: reads and read-merge-writes run in order, so an early write cannot replace stored history and a screen re-reading on focus sees writes queued before it. Bootcamp, quiz and bookmark IO go through it. |
| `navigation/tabs.ts` | Native tab model over the shared catalog: Home, Learn, Practice, Race, Menu (`/menu`); `tabForPath` puts reference pages under Menu. `/library` redirects to `/menu`. |
| `courses/tones.ts` | Paper tones for the points-of-sail wheel and course cards (the shared data keeps its web colours). |
| `sailing/` | `SailingCourseScreen.tsx`: четыре раскрываемых модуля с графикой, цели всех 13 уроков и шаги understand / check / try. `lesson-position.ts` последовательно сохраняет шаг и вариант схемы через AsyncStorage. `LineBench.tsx` использует общую механику стенда; `SavePractice.tsx` сохраняет только завершенный результат. `checkpoint-storage.ts` обслуживает два фиксированных назначения WebView: снимок тренажера и результаты упражнений с объединением записей. Теория хранится отдельно; просмотр и переходы не дают оценку. Возврат из практики: параметр lesson с проверкой по каталогу и native-кнопка в SimWebView. |
| `lessons/` | v3 lesson template (ADR-0015), two original pilots plus seven foundation diagrams (ADR-0018): `pilots.ts` (which lessons use it, goal / situation / explanation / mistake copy in 7 languages, shared template words), `LessonBlocks.tsx` (intro, annotated image, drawing, "How it works" row, explanation, mistake), `graphics/drawings.ts` (TS port of the Codex kit's `drawings.js` for the two pilots plus seven foundation lessons; original pilot exports are byte-checked against the kit exports in `__tests__/fixtures/codex-graphics`; the one change is the wind-direction boom on the leeward side), `graphics/layout.ts` (contain rectangle, markers in percent of the full image, closeup window), `graphics/scenes.ts` (state names, notes, spoken descriptions, key and limit per drawing), `graphics/photos.ts` (annotated images with the kit's points). Images: `assets/lessons/` with `SOURCES.md` (provenance, AI or not, what the image cannot be used for). |
| `courses/tack.ts` | `tackForHeading`: the tack from the heading measured clockwise from where the wind comes from. With the wind from the top the left half of the wheel is starboard tack and the right half port; head to wind and dead downwind return null (there the mainsail side decides). The wheel's captions take their halves from it; `__tests__/points-of-sail-tack.test.tsx` checks it against vector geometry. |
| `test-utils.tsx`, `test-settle.ts` | Test helpers, not app code: `renderWithProviders` (safe area + i18n) and `settleProgress` (waits inside act until the progress queue and its state updates have landed). |
| `replay/`, `leaderboard/`, `onboarding/` | feature helpers. (The old `multiplayer/` mock client, room codes and `persistence/recent-rooms.ts` were removed 2026-10-19: multiplayer is the live web room.) |

**Content is DUPLICATED, not live-imported:** web `src/data/*.ts` (source of truth) ->
`mobile/scripts/sync-content.ts` -> `mobile/src/data/*.json` -> `mobile/src/data/index.ts`.
CI guard `npm run sync-content:check` fails if stale. (ADR-0003 plans a shared package.)

---

## 5. "Where do I change X?" cookbook

| To change ... | Edit |
|---|---|
| **Points-of-Sail / wind-courses diagram** (the wheel) | `mobile/src/design-system/components/PointsOfSailDiagram.tsx` (the visual) + `mobile/app/courses/index.tsx` (the screen wrapper, readouts, cards, and the tacking and jibing procedures from the synced `maneuvers`) |
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
- **Solo race (`/game`):** the shared VPP, autopilot and mark rounding drive the
  rivals, but position integration is native: 6 px per knot (`game/units.ts`),
  soft-wrap at the edges, no boat-to-boat collisions. Collision parity is a
  product decision, not a refactor of `race-physics`. Details in
  `WEB_VS_APP_PARITY.md`.
- Other parity items live in `WEB_VS_APP_PARITY.md` and `SIMULATOR_V3_PARITY.md`.

---

## 7. Verification checklist (before saying a mobile change is done)

1. On a branch cut from `main` (the old `app` branch is historical, see section 0).
2. `cd mobile && npx tsc --noEmit` clean; `npm run lint`; `npm test`.
3. Build + run on the iOS Simulator (`npx expo run:ios`) and **screenshot the actual
   screen** - do not trust the code alone. A visual change is only "done" when seen
   on-device.
4. For a release: bump version + buildNumber, archive, upload, confirm the build shows
   in TestFlight (`mobile/scripts/asc-state.mjs` / App Store Connect).

## 2026-10-25 native correction flow

- `mobile/src/navigation/ActivityBack.tsx` provides a labelled44px exit with a contextual hub when no native history exists. `mobile/src/navigation/sailing-entry.ts` accepts only installed trainer/lesson routes and bounded query parameters.
- `mobile/src/simulator/SimWebView.tsx` shows the dark native header while loading or failed, owns a validated return to the lesson, and permits scrolling in reserved content panels. Canvas and wheels own their own pointer gestures.
- `mobile/src/course/OfflineRadioCourse.tsx` boots explicit free practice or course intent. Shared route/exit contract: `src/lib/radio-navigation.ts`. Practice first item goes directly to the radio; Learn continues the course with view=course.
- `mobile/app/multiplayer/index.tsx` is the actual combined lobby/race surface; its native frame is dark and the five main tabs do not consume cockpit space.
- `mobile/app/simulator/index.tsx` retains the simplified recovery trainer with overlays moved to a reserved scrollable dock. Wheels do not acquire a second rudder; core physics is unchanged.
- Pure foundation sources are canonical in `src/data/bootcamp-quiz.ts`, `src/data/foundation-guide.ts` and `src/lib/learning/foundation-drawings.ts`. The old mobile modules re-export them; mobile-only practice routes remain native.
- Focused contracts: `mobile/__tests__/activity-back.test.tsx`, `mobile/__tests__/sailing-navigation.test.ts`, `mobile/__tests__/radio-course-host.test.tsx`. Installed UI evidence remains separate in `docs/audits/2026-10-25/corrections.md`.

## Versioned replay entry before physical emission

- `mobile/src/replay/entry.ts` classifies absent records, historical pixel rows,
  validated world snapshots and unsupported/corrupt world payloads. A rejected
  webRace never enters the pixel renderer. Existing history is never rewritten.
- `mobile/__tests__/replay-entry.test.tsx` covers27 classifier/route cases,
  all3 physical profiles, unchanged storage bytes, actual Back/history fallback,
  asynchronous ID changes and read failure.
- `mobile/src/replay/ReplayUnavailable.tsx` owns the common saved-race notice
  for replay and Coach, with five text resources in all seven languages and a
  real native Back/history fallback.
- `mobile/__tests__/coach-entry.test.tsx` covers22 cases: known world records
  use local analysis, unsupported/corrupt world data never reaches pixel course
  lookup or the remote Coach, and late requests cannot overwrite a new race.

The replay and Coach notice has RU/EN/PL/ES/FR/DE/IT adaptations. The existing Button
provides a48px minimum. This is source/test evidence; installed native acceptance
and playable physical races remain separate. saveNativeRace explicitly refuses
new physical emission until result classes and the engine are ready.

## Prepared native race classification, before physical activation

`mobile/src/persistence/race-record-presentation.ts` projects historical pixel/world, explicit registered and unavailable records separately. `race-native.ts` prepares raw finish plus penalty without changing saved provenance; null remains absent authority through the actual shared bridge. The physical writer remains OFF. `race-history.ts` journals actual reads and awaited serial clear without private IDs or trajectories. `mobile/__tests__/race-record-presentation.test.ts` and `mobile/__tests__/race-history-diagnostics.test.tsx` cover these boundaries. Actual History/Leaderboard UI and native PB finish acknowledgement remain pending in `docs/audits/2026-10-26/physical-consumers-harness.md`.
