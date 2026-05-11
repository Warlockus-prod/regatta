# Mobile app roadmap

Status: living document. Current as of 2026-05-12.

**Where we are right now (2026-05-12):**
**Phase 1 (content shell) shipped** as v0.2.0 / build 2, live in
TestFlight Internal. Phase-2 simulator preview is in the same build
with stub physics. The next milestone is **v0.3.0 sprint** (two-week,
three parallel devs) covering Bootcamp Day-N arc + Home Continue,
Pre-race Checklist, Settings privacy + first-launch language nudge.
Plan + acceptance criteria + coordination matrix in
[`audits/sprint2-pm.md`](./audits/sprint2-pm.md). Dev / QA / PM audit
reports for v0.2.0 are in [`audits/`](./audits/).

This is the execution plan for the iOS-first React Native + Expo build of **Week to Regatta** (codename / slug `regatta`). Based on:

- ADR-0001 (stack: RN + Expo, accepted)
- ADR-0002 (repo layout: monorepo with `mobile/`, accepted)
- ADR-0005 (v1 scope: full parity with web, accepted)

For decisions and trade-offs, see [DECISIONS.md](./DECISIONS.md). This file is about sequencing and execution.

## 0. Current state

Phase 0 (foundations) done. **Phase 1 (content shell) fully shipped as
v0.2.0 / build 2** to TestFlight Internal on 2026-05-12. **Phase 2
simulator preview** is live with stub physics, gestures, trail, and
haptics. Real Phase 2 (full VPP, missions, replays) waits on ADR-0003
acceptance and the Shared-lane workspace extraction.

**Next milestone: v0.3.0 sprint** (two weeks, three parallel devs):
Bootcamp Day-N arc + Home Continue, Pre-race Checklist, Settings
privacy + first-launch language nudge. Spec, acceptance criteria, and
coordination matrix in [`audits/sprint2-pm.md`](./audits/sprint2-pm.md).

- **Stack runtime:** Expo SDK 54, React Native 0.81.5, React 19.1,
  TypeScript strict, New Architecture (Fabric + TurboModules) on.
- **Routing:** expo-router with 16 routes. **Real content** in 14
  (Home, Settings, Bootcamp index + lesson detail, Quick, Glossary
  with search, Rules index + reveal-style detail, Onboard, Anatomy,
  Courses with polar diagram, Racing, Gallery online-first, Simulator
  preview). **Placeholders** in 3 awaiting later phases: Game (Phase 2),
  Multiplayer (Phase 4), Leaderboard (Phase 3).
- **Design system:** tokens mirror `:root` vars from `src/app/globals.css`.
  Eight components in `mobile/src/design-system/components/`: Screen,
  Text (6 variants), Card, Button (3 variants), ListRow, PlaceholderScreen,
  ErrorBoundary, PointsOfSailDiagram (SVG polar wedges).
- **i18n:** 7 languages live. `Lang`, `LocalizedText`, `LegacyLocalized<>`,
  `pickLocalized`, `legacyPick`, `legacyPickArray` ported from web. The
  `I18nProvider` resolves AsyncStorage > device locale (`expo-localization`)
  > `'ru'`. `tp(ru, en, pl, extras?)` and `tl({ ru, en, pl, ... })` match
  web semantics; existing call patterns are copy-paste compatible.
- **Content sync (bridging per ADR-0003):**
  `mobile/scripts/sync-content.ts` reads `src/data/*.ts` (web source of
  truth, all `import type` so type-only stripping works) and writes JSON
  twins to `mobile/src/data/*.json` via Node `--experimental-strip-types`.
  `npm run sync-content` rebuilds. `npm run sync-content:check` is the
  parity guard for mobile CI. Self-removes once Shared lane extracts to
  `packages/content`.
- **Typed barrel:** `mobile/src/data/index.ts` exports
  `bootcampLessons` / `quickRefreshLessons` / `BOOTCAMP_TOTAL_MINUTES` /
  `onboardSections` / `ruleScenarios` / `glossaryTerms` /
  `glossaryCategories` / `pointsOfSail` / `racingRules` /
  `racingStrategies` / `anatomyParts` / `galleryItems` with matching
  `LegacyLocalized<>` types from `mobile/src/data/types.ts`. Tacks /
  maneuvers / missions present in JSON, typed when those screens land.
- **Simulator preview:** `mobile/src/simulator/{types,tick,use-sim-loop}.ts`.
  Stub physics (heading + speed integration, no VPP yet) at 30 Hz, Skia
  rendering with boat sprite + wind arrow + 60-point wake (wrap-aware).
  Pan gesture sets target heading from touch position. Reset button.
  `expo-haptics` light impact on pan begin, medium on reset. Phase 2
  proper swaps the stub for the shared physics package without changing
  the rendering or HUD layer.
- **App config:** `name = "Week to Regatta"`, `slug = "regatta"`, bundle
  `com.icoffio.regatta`, scheme `regatta`, `userInterfaceStyle = "dark"`.
  Plugins: `expo-router`, `expo-localization`. EAS profiles set:
  `development` / `preview` / `production`.
- **Splash:** `expo-splash-screen` integrated. `preventAutoHideAsync` at
  module load; `SplashGate` inside `I18nProvider` calls `hideAsync` once
  `useI18n().ready` flips true. No language flash on first paint.
- **Error handling:** root `ErrorBoundary` catches uncaught render errors
  and renders a brand-styled fallback. In `__DEV__` the error message
  surfaces for triage; in prod the user sees a generic recovery hint.
- **Brand assets:** `mobile/assets/brand/{icon.svg, wordmark.svg, README.md}`.
  README documents `rsvg-convert` / ImageMagick / online conversion to
  the PNG formats Expo needs. Existing `app.json` PNGs stay as the
  current bundled icons until conversion runs.
- **Tests:** `jest-expo` + `@testing-library/react-native`. **68 tests
  across 14 suites**, all green:
  - Logic: i18n helpers (15), bootcamp progress hook (9), simulator
    tick (16).
  - Screens: Home (3), Settings (3), Bootcamp (4), Quick (2), Rules (2),
    Onboard (2), Anatomy (2), Courses (2), Racing (2), Gallery (3),
    Glossary (3).
  - Mocks: `expo-router`, `expo-localization`, AsyncStorage. Render
    helper at `mobile/src/test-utils.tsx`.
- **Single-command health check:** `npm run check` from `mobile/`
  runs `sync-content:check` + `tsc --noEmit` + `jest`. Green today.
- **ADRs:** 0001 (RN+Expo), 0002 (monorepo), 0005 (full parity) accepted.
  0003 (shared-package extraction) and 0004 (offline strategy) proposed.
  ADR-0003 needs Shared-lane review before workspace extraction proceeds.
- **TESTING.md:** three paths (Expo Go / `expo run:ios` / TestFlight)
  with one-time setup, each-release commands, and a 7-step smoke
  checklist.

## 1. Guiding principles

These trump any tactical choice below if conflicts arise:

1. **Premium UX over broad surface.** Each shipped milestone must feel native and finished, even if the next milestone is missing. We descope rather than ship broken.
2. **One source of truth per asset.** Content and physics live in web today; mobile reads them via shared package once consumption proves real (ADR-0003). Until then, cross-checked copies with CI guards. Never silent divergence.
3. **Offline first for everything that does not need a server.** Content, solo simulator, replays, settings. Online only for multiplayer, AI coach, leaderboard submit, cloud sync.
4. **TypeScript end to end.** Strict mode, no `any` in production paths, schemas typed at the API boundary.
5. **Match web's mental model where it helps.** File-based routing (expo-router mirrors Next.js App Router), `tl()` / `legacyPick()` exactly as on web, dark-ocean palette unchanged.
6. **Each milestone is App-Store-submittable.** No "we will fix it before launch" debt that crosses milestones.

## 2. Architecture

### 2.1 Directory layout (target)

```
mobile/
├── app/                       # expo-router file-based routes
│   ├── _layout.tsx            # root: I18nProvider, gesture root, splash gating
│   ├── index.tsx              # Home
│   ├── bootcamp/[id].tsx      # Bootcamp lesson detail
│   ├── rules/[id].tsx
│   ├── anatomy/index.tsx
│   ├── onboard/[id].tsx
│   ├── glossary/index.tsx
│   ├── courses/index.tsx
│   ├── simulator/index.tsx    # solo simulator
│   ├── multiplayer/...
│   ├── leaderboard/index.tsx
│   ├── replay/[code].tsx
│   ├── settings/index.tsx
│   └── auth/...               # added in Phase 3
├── src/
│   ├── design-system/
│   │   ├── tokens.ts          # colors, radii, spacing (DONE)
│   │   ├── typography.ts      # text style presets
│   │   ├── motion.ts          # durations, easing
│   │   ├── components/        # Button, Card, Badge, Input, Sheet, Header
│   │   └── icons.ts           # icon helpers
│   ├── i18n/
│   │   ├── languages.ts       # Lang, LocalizedText, LegacyLocalized, pickLocalized, legacyPick (port)
│   │   ├── context.tsx        # I18nProvider, useI18n with t/tp/tl
│   │   └── device-locale.ts   # expo-localization wrapper -> Lang
│   ├── data/                  # content JSON, mirrored from src/data/* per ADR-0003
│   │   ├── bootcamp.json
│   │   ├── rules.json
│   │   ├── ...
│   │   └── version.ts         # checksum + source-commit ref for CI parity check
│   ├── physics/               # mirrored from src/lib/sailing-physics/* per ADR-0003
│   ├── simulator/             # Skia scene, HUD, gestures (Phase 2)
│   ├── multiplayer/           # WS client (Phase 4)
│   ├── api/                   # /api/* typed clients (Phase 3)
│   ├── persistence/           # AsyncStorage / SecureStore / SQLite wrappers
│   └── lib/                   # pure utilities, no React
├── assets/                    # icons, splash, fonts, sounds
├── e2e/                       # maestro flows (Phase 1+)
├── app.json                   # Expo config
├── package.json
└── tsconfig.json
```

### 2.2 Stack of choices

| Concern | Choice | Why |
|---|---|---|
| Routing | expo-router | File-based, matches Next.js mental model, type-safe links, deep linking out of the box |
| State (UI / nav) | React Context + hooks | Default. Add Zustand only if a feature actually needs cross-tree state |
| State (server) | @tanstack/react-query | Cache, retry, refetch on focus. Critical once Phase 3 lands |
| Persistence (key-value) | AsyncStorage | Default for settings, language, progress |
| Persistence (secrets) | expo-secure-store | Tokens after Phase 3 auth lands |
| Persistence (structured) | expo-sqlite | Replays, missions if size grows. Not needed until Phase 2-3 |
| Localization | expo-localization | Device locale -> Lang resolver |
| Animations | react-native-reanimated v3 | Worklets, 60 FPS, no JS-thread blocking |
| Gestures | react-native-gesture-handler | Peer of reanimated; required for native-feel touch |
| Canvas / 2D | @shopify/react-native-skia | 60 FPS, Skia-backed, integrates with reanimated worklets (Phase 2) |
| Linear gradients | expo-linear-gradient | Ocean background |
| Haptics | expo-haptics | Selection / impact feedback |
| Auth (Phase 3) | expo-apple-authentication + email magic-link | App Review requires Sign in with Apple if any auth |
| Crash reporting | sentry-expo (or @sentry/react-native) | Phase 5 |
| Tracking transparency | expo-tracking-transparency | Phase 5; required for analytics on iOS 14.5+ |
| Test runner | jest-expo | Expo's blessed Jest preset |
| Component tests | @testing-library/react-native | Standard |
| E2E | maestro | YAML flows, less ceremony than Detox |
| Build / submit | EAS Build + EAS Submit | Standard for managed Expo |
| OTA updates | EAS Update | For Phase 5 polish iterations between binary releases |

### 2.3 Anti-patterns explicitly avoided

- **Third-party UI kits** (react-native-paper, NativeBase, Tamagui, etc.). The dark-ocean brand is custom; a kit would fight us and add weight.
- **Redux / RTK.** Overkill for this app shape. Context + Query covers what we need.
- **Bridging the existing Next.js client via WebView.** Already rejected in ADR-0001.
- **Hand-rolled WebSocket reconnection logic before Phase 4.** Use battle-tested patterns when we get there.
- **Premature shared-package extraction.** ADR-0003 triggers it when the second consumer (mobile) actually exists; not before.

## 3. Sequence of work

Each phase is shippable on its own as a TestFlight build. App Store submission target is end of Phase 1 (early closed-beta) and end of Phase 5 (public release).

### Phase 0: Foundations (1-2 weeks)

Goal: scaffolding ready for screen development. No user-facing screens yet.

Tasks:

1. Install Phase 0 dependencies:
   ```
   npx expo install expo-router expo-localization \
       @react-native-async-storage/async-storage \
       react-native-safe-area-context react-native-screens \
       expo-linear-gradient expo-haptics \
       react-native-reanimated react-native-gesture-handler
   ```
2. Migrate entry to expo-router:
   - `package.json` `"main": "expo-router/entry"`.
   - Create `app/_layout.tsx` (root provider stack), `app/index.tsx` (placeholder Home).
   - Delete `App.tsx`, `index.ts`.
3. i18n foundation in `mobile/src/i18n/`:
   - Port `languages.ts` verbatim (drop `pickLangFromAccept`, `pickLangFromNavigator` since RN has no `navigator`).
   - Add `device-locale.ts`: `expo-localization` -> `Lang`.
   - `context.tsx`: `I18nProvider`, `useI18n`, `t / tp / tl`. Persistence via AsyncStorage. Priority: AsyncStorage > device locale > `'ru'`.
4. Design system foundation in `mobile/src/design-system/`:
   - `typography.ts` (text style presets, SF Pro on iOS).
   - `motion.ts` (durations, easing curves).
   - `components/`: `Screen`, `Card`, `Button`, `Text`, `Header`. These four cover ~80% of Phase 1 screens.
5. EAS pipeline:
   - `eas.json` with `development`, `preview`, `production` profiles.
   - First TestFlight build to verify the pipeline (no real screens yet).
6. CI hooks (Shared lane work, coordinate via Shared chat):
   - `paths:` filter on existing web workflows to skip on `mobile/**` only PRs.
   - New mobile workflow: `npx tsc --noEmit` + `jest` on every PR.

Exit criteria:

- `npx expo start` boots in iOS simulator, dark-ocean Home placeholder visible, language picker works, AsyncStorage persists across reload.
- TestFlight build delivered to internal testers.

### Phase 1: Content shell (4-6 weeks) - SHIPPED v0.2.0 / build 2

Status: **shipped 2026-05-12 to TestFlight Internal.** Next iteration
inside Phase 1 polish is the v0.3.0 sprint - see
[`audits/sprint2-pm.md`](./audits/sprint2-pm.md).

Goal: every reference screen working, offline, in 7 languages, with local progress. Submittable to App Store as a focused educational app if the rest slips.

Required ADRs:

- **ADR-0003: shared-package extraction plan.** Triggers when mobile actually wants to import `src/data/*`. Coordinated with Shared lane. Likely outcome: pnpm/npm workspace move of `src/data/*` -> `packages/content/*`, both web and mobile import. Until extraction lands, mobile uses a content sync script (`scripts/sync-content-to-mobile.mjs`) with a CI guard that fails the build if `mobile/src/data/*.json` is stale relative to `src/data/*.ts`.
- **ADR-0004: offline strategy.** Per-screen online/offline matrix. Content + progress are 100% offline. Settings, glossary search, missions list are 100% offline. Only AI coach, multiplayer, leaderboard submit are online.

Tasks:

1. Content layer:
   - Sync script that converts `src/data/*.ts` to JSON bundles in `mobile/src/data/`.
   - Type-only re-export of `LegacyLocalized<>` from web; consumers use `legacyPick()`.
   - Version stamp + CI parity check.
2. Screens (in priority order, each shippable):
   - Home (3 primary cards: Bootcamp / Quick / Rules + secondary tools list).
   - Bootcamp index + lesson detail (8 lessons, ~5 min each).
   - Quick refresh (6 lessons).
   - Rules (8 scenario cards).
   - Anatomy (interactive yacht diagram - port SVG via react-native-svg).
   - Onboard (shipboard culture + commands).
   - Glossary (51 terms, search, filter chips).
   - Courses (points-of-sail diagram).
   - Racing (tactical diagrams).
   - Gallery (media references).
   - Settings (language, about, version).
3. Local progress persistence:
   - `mobile/src/persistence/progress.ts`: bootcamp completion, checklist state, glossary favorites.
   - Schema versioned (`v1`), migration helpers ready for v2.
4. Onboarding:
   - Mirror web's `OnboardingTour` minus desktop-specific affordances. Port in 7 languages.
5. Navigation chrome:
   - Bottom tab bar (Home / Bootcamp / Sim placeholder / Glossary / Settings).
   - Header back-arrow, page titles.
6. Component tests:
   - Smoke render every screen under each language (paramaterized test).
7. Maestro flows:
   - Complete bootcamp lesson 1 in EN, switch to PL, verify localized.
   - Search glossary, tap a term, return.

Exit criteria:

- All reference screens render in 7 languages with no Cyrillic-leak (mirror `scripts/cyrillic-scan.mjs` logic for mobile).
- Offline mode: airplane-mode bootcamp + glossary + rules works.
- TestFlight build hits 60 FPS during list scrolling on iPhone 13 (Instruments capture).
- App Review-ready: privacy manifest, ATT prompt, age rating, localized App Store metadata in all 7 languages drafted.

Risk markers:

- SVG diagrams (anatomy, courses, racing): if `react-native-svg` ports cleanly, fine. If they need re-authoring as Skia or as static PDFs, that pushes Phase 1 by 1-2 weeks.
- Search performance on glossary (51 terms × 7 langs): trivial. Don't pre-optimize.

### Phase 2: Solo simulator (2-3 months)

Goal: 2D top-down simulator at 60 FPS with the same physics behavior as `simulator-v3`. Missions, drills, local replay save / load.

Required ADRs:

- ADR-0003 must be accepted and `packages/physics` extracted. Mobile imports the same TS module the web uses. Golden tests run on both consumers in CI.

Tasks:

1. Physics integration:
   - Add `packages/physics` dep to `mobile/package.json`.
   - Run physics tests in mobile CI (regression catch on RN runtime quirks).
2. Simulator core:
   - `src/simulator/scene/`: Skia surface, boat sprite, wind arrows, trail, mission targets.
   - `src/simulator/runtime/`: fixed-timestep loop (1/30 sim, 1/60 render interpolation). Mirror `step-runtime.ts` from `src/features/simulator-v3/runtime/`.
   - Sim state managed via reanimated shared values, physics tick on a worklet to avoid blocking JS.
3. HUD overlay (SwiftUI-style: SwiftUI is React-native here, so just RN views over the SkiaCanvas via ZStack-equivalent):
   - TWA / TWS / boat speed / heel readouts.
   - Sheet sliders (main / jib).
   - Twist + reef toggles.
   - Mode bar (port `simulator-v3` mode bar: free / scenarios / drills).
4. Gestures:
   - Pan for helm (heading target).
   - Sliders for sheets.
   - Haptics on boundaries (max trim, stall onset).
   - Two-finger zoom on the scene (optional).
5. Missions and scenarios:
   - Port `src/data/missions.ts` content (already JSON via Phase 1 sync).
   - Mission picker UI.
   - Win / lose detection on no-go, max-tacks, finish-under-sec constraints.
6. Local replay:
   - Capture sim-stream as a compact binary (varint or msgpack) into SQLite.
   - Replay viewer reuses simulator scene with ghost mode.
7. Performance:
   - Instrument with Hermes profile + Skia frame timing. Stay above 55 FPS sustained on iPhone 13.
   - Memory budget: <150 MB resident during a 5-minute session.

Exit criteria:

- Simulator passes all `simulator-v3` behavioral contracts in physics fixtures (golden tests). 0 deviation.
- Mission flow tested via Maestro.
- 60 FPS on iPhone 13, 55+ on iPhone SE (3rd gen).
- TestFlight build + recorded gameplay clip available for App Store preview.

Risk markers:

- Reanimated worklet + Skia interaction sometimes has subtle timing bugs at 60 Hz. Budget 1 week buffer.
- If Skia FPS falls short, fallback per ADR-0001: native module (SpriteKit / Metal) for the scene. Adds ~2-3 weeks.

### Phase 3: Online layer (2-3 months)

Goal: cross-device sync, leaderboard, AI coach, daily challenges. Online features that justify an account.

Required ADRs:

- **ADR-0006: auth model.** Sign in with Apple (primary) + email magic-link (secondary). Tokens in expo-secure-store. Backend changes coordinated with Shared lane: real `users` table, JWT or session with hard-to-guess token, replace cookie-based session ID for the new path while keeping it for legacy web users until web migrates.
- Web migration of auth happens in the Shared lane in parallel. ADR-0006 owns the joint design.

Tasks:

1. Auth UX:
   - Sign in with Apple button (required by App Review for any optional account flow).
   - Email magic-link form.
   - Session refresh.
   - Sign out.
2. API client:
   - `src/api/`: typed wrappers around `/api/*`. Use Zod or TS-only schemas for now.
   - @tanstack/react-query setup with 5-min stale time defaults.
3. Cloud sync:
   - Progress (bootcamp, checklist, glossary favorites) syncs on login + on change.
   - Settings sync (language, accessibility prefs).
   - Replay uploads opt-in.
4. Leaderboard:
   - Read-only browser of `/api/leaderboard` filtered by mission / wind / difficulty.
   - Submit on solo race finish.
5. AI coach:
   - Submit race log to `/api/coach`, render markdown response.
   - Rate-limit UI (`30/hour user`, `300/hour global` already enforced server-side; show friendly message on 429).
6. Daily challenges:
   - `/api/daily` poll, banner on Home.
7. Replay sharing:
   - 4-char code generation, share sheet integration.

Exit criteria:

- Sign in with Apple works on a real device. Tokens persist across uninstall via Keychain (per Apple guideline).
- Web user logs in on iOS, sees their bootcamp progress.
- AI coach response renders in <5 sec for a 60 sec race log.
- All API errors handled gracefully (offline banner, retry, rate-limit message).

Risk markers:

- Auth migration on web side. Coordinate early with Shared lane to avoid blocking. Budget 4 weeks of Shared lane time.
- App Review on AI features: have a clear "this is AI-generated" disclosure + opt-in. Reviewers reject silent LLM features.

### Phase 4: Multiplayer (1-2 months)

Goal: head-to-head WebSocket racing matching the web `/multiplayer` route.

Tasks:

1. WS client:
   - `src/multiplayer/socket.ts`: native WebSocket, exponential backoff reconnect, room rejoin on resume.
   - Mirror `ws-server/server.js` protocol exactly.
2. Lobby UI:
   - Create / join with 4-char code.
   - Player list, ready states, host controls.
   - Invite share-sheet (deep link to mobile app + web fallback).
3. In-race:
   - Reuse Phase 2 simulator scene with peers' boats overlaid.
   - HUD with peer positions + relative scores.
4. Disconnect / reconnect handling:
   - Visible state (reconnecting...).
   - Snapshot replay on rejoin.
5. End-of-race summary:
   - Final positions, replay save offer, leaderboard submit (auto if cloud sync on).

Exit criteria:

- 10-player session stable for 15 minutes on Wi-Fi.
- Cellular 4G drop-and-rejoin under 10 sec recovery.
- No render-thread stalls > 50 ms during peer updates.

Risk markers:

- Mid-race reconnect is the hardest part. Budget 2 weeks dedicated to it.

### Phase 5: Polish + App Store (2-4 weeks)

Goal: public launch on App Store.

Tasks:

1. Privacy manifest (iOS 17+ requirement for SDKs that read protected APIs).
2. App Tracking Transparency prompt (analytics).
3. Localized App Store metadata in 7 languages: name, subtitle, description, keywords, screenshots.
4. Screenshots in 7 languages × 3 device classes (6.7" iPhone, 6.1" iPhone, iPad 12.9").
5. Age rating: 4+ (educational, no objectionable content).
6. Crash + error reporting: Sentry-Expo wired.
7. In-app review prompt (after 3 successful sessions).
8. App Store Connect: privacy disclosures, third-party SDK list, AI coach disclosure.
9. EAS Update channel setup for OTA fixes between binary releases.
10. Final external beta (TestFlight 100-tester pool) for 1-2 weeks.
11. Submission.

Exit criteria:

- App Store submission accepted on first or second review pass.
- Public release.
- Crash-free session rate > 99% on first 1000 sessions.

## 4. Cross-cutting concerns

### 4.1 Coordination with Shared lane

Mobile lane requires Shared lane work at three points:

| When | What | ADR |
|---|---|---|
| Phase 0 end | `paths:` filter on web CI workflows + new mobile CI workflow | none, infra |
| Phase 1 mid | Content sync script + parity-check CI step in repo root | ADR-0003 prep |
| Phase 1 end | Workspace move of `src/data/*` to `packages/content/*` | ADR-0003 |
| Phase 2 start | Workspace move of `src/lib/sailing-physics/*` to `packages/physics/*` | ADR-0003 (continuation) |
| Phase 3 start | Real auth model on backend (`users` table, token-based session) | ADR-0006 |

Communication pattern: post the ask in the Shared chat with a link to the relevant ADR, wait for ack, then proceed.

### 4.2 Performance budgets

| Metric | Target | Phase enforced |
|---|---|---|
| Cold start to interactive | < 2 s on iPhone 13 | Phase 1 |
| Screen transition | < 100 ms | Phase 1 |
| Scrolling list FPS | 60 sustained | Phase 1 |
| Simulator FPS | 60 (55 floor) | Phase 2 |
| Bundle size (universal binary) | < 50 MB | Phase 5 |
| Memory (sim 5-min session) | < 150 MB | Phase 2 |
| Sentry crash-free session rate | > 99% | Phase 5 |

### 4.3 Testing strategy

- **Unit (jest-expo).** Pure logic only: i18n helpers, persistence, physics-bridging utilities. Fast. Run on every PR.
- **Component (@testing-library/react-native).** Critical screens render in all 7 langs without throwing. Snapshot tests only for stable surfaces.
- **Golden-fixture (physics).** Runs same fixtures as web's `simulate.test.ts`. 0 deviation tolerated.
- **E2E (maestro).** Three flows in v1: bootcamp lesson, glossary search, settings language switch. Add solo race + multiplayer rooms in Phase 2 / Phase 4.
- **Manual on real devices.** iPhone SE (3rd gen) low end, iPhone 13 mid, iPhone 15 Pro high. Plus iPad mini / iPad Pro for tablet pass.

### 4.4 Telemetry

Mirror web's `/api/log` event schema. Send: `app.start`, `screen.view`, `lesson.complete`, `race.finish`, `coach.requested`, `js.uncaught`, `js.rejection`. Include device model, app version, language, country (server-side `cf-ipcountry` etc per CLAUDE.md).

No personally identifiable info. ATT-respecting.

### 4.5 i18n discipline

Same rules as web (per CLAUDE.md `## Typography` + `## i18n`):

- No em-dashes / en-dashes. ASCII hyphens only.
- Polish strings without diacritics.
- Spanish / French / German / Italian: diacritics OK, no fancy punctuation.
- Source language is RU. New strings always start in RU and travel through `scripts/translate-data-flat.mjs` for the other six.
- Pre-commit hook (Shared lane) runs `cyrillic-scan.mjs` on `src/data/*.ts`; mobile sync inherits that guarantee.

### 4.6 Accessibility

iOS minimum bar from day 1:

- VoiceOver labels on every interactive element.
- Dynamic Type support up to AX2.
- Reduce Motion respected (mirror web's `prefers-reduced-motion: reduce` on the simulator wave animations).
- Color contrast >= AA on dark-ocean palette (already validated on web).
- Hit targets >= 44 pt.

## 5. ADR roadmap

Order in which the remaining ADRs should be written and accepted. Sequence is dictated by what each one unblocks.

| # | Title | Triggers when | Unblocks |
|---|---|---|---|
| 0003 | Shared-package extraction plan | Phase 1 mid (sync script in place) | Workspace move of content + physics; consistent CI |
| 0004 | Offline strategy (per-screen matrix) | Phase 1 start | Content shell architecture; degradation policy |
| 0006 | Auth / accounts (Sign in with Apple, email magic-link, backend migration) | Phase 3 start | Cloud sync, leaderboard submit, replay upload |
| 0007 | Telemetry policy | Phase 1 end | Privacy manifest text, ATT copy |
| 0008 | App Store metadata workflow | Phase 5 start | Submission + ongoing OTA story |

ADR-0003 is the most important and should be drafted in the first week of Phase 1.

## 6. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Skia FPS short of 60 in real-world conditions | medium | high (Phase 2) | Early benchmark on iPhone SE in Phase 0; keep native-module fallback warm per ADR-0001 |
| Auth migration breaks existing web sessions | medium | high (Phase 3) | Dual-cookie window during migration; explicit Shared lane coordination |
| Content sync drift (web edits without regenerating mobile JSON) | high | medium | CI parity check on every PR; mobile build fails if stale |
| Reanimated v3 + Skia regressions on Expo SDK upgrade | medium | medium | Pin SDK 54 through v1; upgrade only after launch on the same Expo cycle that ships matching versions |
| App Review rejects AI coach for vague disclosure | medium | medium | Clear in-app banner: "Generated by an AI model based on your race log"; opt-in toggle; documented in App Store Privacy |
| Multiplayer reconnect on cellular flap | high | medium | Dedicated 2-week stabilization sprint at Phase 4 end; chaos test with Network Link Conditioner |
| Localization debt: ES / FR / DE / IT lag behind RU/EN/PL | medium | low | `LegacyLocalized<>` falls back to EN; users see EN, not broken UI; prioritize as runs through `translate-data-flat.mjs` |
| Scope creep beyond ADR-0005 (parity) | high | high | Discipline rule: every "while we are here, let us also..." gets a ticket and a Phase number, not a code change |

## 7. Definition of done for v1

- All 18 web user-facing routes have iOS equivalents (admin `/stats` excluded).
- 7 languages localized; `cyrillic-scan` clean; `translate-data-flat` covers ES / FR / DE / IT for any new content.
- Solo simulator passes physics golden fixtures with 0 deviation.
- Multiplayer 10-player session stable for 30 minutes on Wi-Fi.
- AI coach response < 5 sec for 60 sec race log.
- Sentry crash-free session rate > 99% over the first 1000 sessions.
- App Store: live in US + EU + RU markets.
- TestFlight beta running for next-version OTA path via EAS Update.
- All ADRs (0001 through 0008) accepted.
- Web app at full feature parity (all features the iOS app has, web has equivalents that consume the same backend).

## 8. What is NOT in v1

Keep this list as a pressure release. If asked "should we add X?" during execution, the answer is "after v1, document in v2 backlog".

- 3D simulator
- Watch app
- Mac Catalyst
- Widgets / Live Activities
- Custom mission editor
- Social graph (friends, follow)
- Push notifications
- iPad-first layouts (ship sane defaults; iPad-optimized in v2)
- Apple TV
- Android (per ADR-0001, deferred but near-free when ready)
