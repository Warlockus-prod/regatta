# SIMULATORS.md - the single source of truth

Status: ACTIVE (2026-09-07). The fresh [sailing audit](sailing-simulator-audit-2026-09-07.md)
records physics and visual mismatches plus the next staged quality plan.
Historical roadmap items 1-5 below are shipped;
Build 26 (version 1.4.0) was the historical July baseline. September changes
are recorded in the audit and the build 37 release report.
Remaining known gaps: mobile leaderboard auth (ADR-0006) and monetization
(needs owner accounts: RevenueCat API key + IAP products in ASC - see
docs/design/mobile/APPSTORE_GROWTH.md). This document supersedes the simulator-role
statements in docs/design/simulator-v3/SPEC.md ("V1 and V2 are deleted") and
docs/design/simulator2/ROADMAP.md ("V2 = premium race surface"). Any doc that
contradicts this one is stale; update it or link here.

## The model: TWO simulators + one 3D view, shared web content on iOS

| Tier | Web route | iOS screen | What it is |
|---|---|---|---|
| 1. Basics (Основы) | `/simulator` | `/simulator-v1` (WebView), `/simulator-basics` offline fallback | Wind + turns + angle to wind. A boat on a wind rose, the no-go cone, point-of-sail cards. Conditional speed and automatic trim. Step 1 for a complete beginner. |
| 2. Trainer (Тренажёр) | `/simulator-v3` | `/simulator-v3` (WebView), `/simulator` offline fallback | Approximate force model, manual sail trim, drills, scenarios/missions, coach feedback, live weather wind. Step 2. |
| 3D boat view (Лодка 3D) | `/simulator2` | `/simulator2` (WebView) | NOT a third simulator. The R3F + GLB sloop: orbit 360, anchored parametric sails, free-trim and sailing modes. The visual layer; long-term it becomes the Trainer's 3D view. |

UI naming (all 7 languages): "Основы / Basics / Podstawy", "Тренажёр /
Trainer / Trener", "Лодка 3D / 3D Boat / Lodka 3D". The internal V1/V2/V3
codenames stay in routes and code, but MUST NOT appear in user-facing UI.

History note: "V1" used to name two DIFFERENT products (the static web
points-of-sail page and the full-featured native trainer) - the 2026-07 audit
found this was the single biggest source of confusion. The tier names fix it.

## Decisions log (2026-07-05, user-approved)

1. Two tiers everywhere; the web Basics page stays (NOT redirected to V3).
2. V2 (3D) = showcase/visual layer, not a race surface and not deleted. It is
   the App Store hero and the app's "3D" tab. Physics upgrades happen by
   adopting the golden VPP engine, not by building a second race sim.
3. No Swift rewrite of the mobile app (docs/design/mobile/DECISIONS.md
   ADR-0007): shared TypeScript physics/content is the whole sync strategy.
4. Native 3D (three.js/R3F in RN) is OFF the table until upstream fixes
   expo-gl framebuffer presentation under the New Architecture. V2/V3 reach
   the app via the hardened WebView (mobile/src/simulator/SimWebView.tsx).
5. The old V2 race build (src/features/simulator-v2, SailingScene.tsx,
   2,304 lines), the /simulator-3d-lab route, 4 prototype GLBs and the
   NEXT_PUBLIC_SIM_V2 flag were deleted 2026-07-05 (recoverable at be43938).

## Physics engines (September 2026)

| Engine | Where | Status |
|---|---|---|
| Shared force model (`src/lib/sailing-physics`) | Web Trainer, native Trainer, 3D sailing, race adapters | One approximate model for sail forces, twist, reefing, drag, heel and leeway. Native imports the shared source through an alias; its old physics directory is a shim, not a fork. |
| 3D targets | `/simulator2` | Converged, trimmed polar solutions and cached VMG searches, including running angles. |
| Race adapter (`src/lib/race-physics.ts`) | Web game, multiplayer server and replay | Shared forces, speed-dependent steering, legal start, port rounding and finish gates. The server bundle is generated and checked for freshness. |
| Native race adapter | Mobile game | Shared forces and course progression, with native coordinates, presentation and steering assistance. Player and AI use the same force model. |
| Basics lookup | Web Basics and native fallback | Explicitly conditional point-of-sail speeds, designed for introductory teaching. |

The shared force engine is already in use. This is not a sea-trial-calibrated
VPP: the synthetic boat passport, assisted steering and simplified hydrodynamics
remain documented limitations. See the audit for open calibration work.

## Shared constants and terms (do not fork these)

- No-go half-angle: `NO_GO_HALF_DEG` (42) exported from
  `src/lib/sailing-physics/constants.ts`. Consumers: Basics canvas, V3
  SceneTop, 3D WindDial, mobile Basics (mirrored copy with a comment).
- Speed unit label: "kts" (RU: "уз"). Degrees: the ° symbol, never "deg".
- Dimensionless trim controls (sheets in sail mode, camber/twist/reef): "%".
- Sail-state vocabulary (RU): полощет / тянет / срыв / перетянут. Tour and
  coach strings must use these, not synonyms (хлопает, лопочет...).

## Embed contract (iOS WebView)

The app opens web sims with `?embed=1&lang=<lang>`. Every embedded page MUST:
1. Hide the sim switcher, share buttons and any cross-navigation chrome.
2. Fit 100dvh with NO page scroll: the scene flexes, control panels scroll
   internally (`overflow-y: auto`). WKWebView page scrolling is disabled.
3. Keep working when localStorage flags mark tours as seen (the app pre-sets
   them; see SEEN_FLAGS in mobile/src/simulator/SimWebView.tsx).
Guarded by e2e/smoke.spec.ts ("embed mode hides the sim switcher").

## Onboarding map

- Web Basics: first-visit canvas hints + localized help paragraph.
- Web Trainer: a short inline first action. The 10-step, 7-language guide
  opens only on request through the help button. Wind dynamics, compass and
  sail/course presets expand when needed; the main controls stay visible.
- Web 3D: optional help via the "?" button; no automatic modal tour. Whole-yacht,
  sails and deck camera presets. Primary sheets are always available; wind,
  reef and extra instruments expand on demand. Hold-to-steer supports pointer
  and keyboard input, while arrow keys on sliders remain local to the slider.
- App 3D: same web scene. Native loading waits for `scene-ready`, with a
  30-second watchdog and retry/offline fallback for failed loads.
- Trainer rear/side: orthographic teaching diagrams, separate from the top-view
  angle overlay. Rear shows a transom and signed heel; side shows reefing and
  jib opening. Main/jib colors and compact legends explain overlap.
- App hub: STEP 1 / STEP 2 badges encode the learning order.
- App Basics: 3-step first-open overlay (AsyncStorage `regatta.basics.hint.v1`).
- App Trainer: native drills with pass/fail + score.

## Verification gates

- Web: `npx tsc --noEmit`, `npm run lint`, `npm run test:physics` (45 plus generated-server freshness),
  `npm test -- --run` (312 tests in the September release), `npx playwright test`
  (smoke covers /simulator, /simulator-v3, /simulator2 and the embed contract),
  `npm run build` before push.
- Mobile: `npx tsc --noEmit`, `npm run lint`, `npx jest --ci` (112 tests,
  including complete AI trajectories on four courses and three screen sizes).
  Also run content-sync checks and the localization audit.
- Live: inspect the actual Release build and deployed site, not only a dev client.
  Record screenshots and distinguish automated trajectories from manual race completion.

## Roadmap after this restructure

1. [x] One physics engine (2026-07-05): the native trainer consumes
   src/lib/sailing-physics via the `@regatta/physics` alias (metro
   watchFolders + tsconfig paths + jest mapper); the mobile fork is a shim;
   CI blocks a second copy. See DECISIONS.md ADR-0009.
2. [x] 3D view upgrades (2026-07-05): procedural IBL via drei Environment +
   Lightformers (no external HDR, CSP-safe), GPU ocean (waves moved from a
   5.3k-vertex CPU loop into the vertex shader, generated from the same
   WAVES table the hull rides), sail cloth sheen material, animated
   luff flutter. In September, anchored procedural cloth and moving sheets
   replaced the unanchored GLB sail morphs and floating rigid decorations;
   tightened shadow frustum; wake + bow spray particle system driven by
   telemetry speed (2026-07-05, later pass); desktop-only Bloom + Vignette
   via @react-three/postprocessing (never in the WebView embed).
   GLB compression EVALUATED AND SKIPPED: draco 2.35->1.81 MB, meshopt
   2.35->1.85 MB - morph targets dominate and barely compress; decoder
   runtime + morph risk not worth ~20%.
3. [x] Gusts/shifts in the web Trainer (Steady/Shifts/Gusts wind modes in the
   V3 runtime, deterministic + tested).
4. [x] Leaderboard loop revived on /game (nickname prompt + replay
   ShareBlock). Trainer deep-links live: /simulator-v3?drill=<id> and
   ?scenario=<id> activate the panel (runtime/deep-link.ts, tested), and
   bootcamp lessons 2/3 now point at Basics / the hold-trim drill. Also the
   web yacht anatomy 3D is embedded 1:1 in the app (/anatomy via WebView,
   scroll enabled; native schema kept at /anatomy-offline as the offline
   fallback). Mobile leaderboard auth still waits on ADR-0006.
5. [x] Unified drill/scenario catalog (2026-07-06): `src/data/drills.ts` is
   the single source of truth for all 16 trainer exercises (3 web drills +
   4 web scenarios + 6 native drills + 3 native missions) - stable id, kind,
   platforms, and title/goal complete in all 7 languages. Web V3
   (runtime/scenario-presets.ts) imports it directly and keeps its UiState
   templates + evaluate() logic; mobile gets it as drills.json via
   sync-content.ts (checked in CI by sync-content:check) and
   mobile/src/simulator/missions.ts reads the synced text while keeping
   check()/marks/scoring local, keyed by the same ids. Completeness (7-lang
   non-empty text, unique ids, web id coverage) is guarded by
   src/features/simulator-v3/runtime/trainer-catalog.test.ts.

## September 2026 release

See `3d-release-2026-09-07.md` for implementation, verification, deployment
commits and the historical iOS 1.6.1 (34) TestFlight status.
The current release is documented in `sailing-release37-2026-09-07.md`. The owner-screenshot follow-up
corrects the jib's inclined rotation axis and replaces the Trainer elevations.


## Live multiplayer, build 38

The app multiplayer entry now embeds the same live room and race as the website.
Previous host/join/race routes redirect to this entry and forward room codes.
Network failure offers retry and offline solo racing. See
[UX and multiplayer delivery](ux-multiplayer-2026-09-07.md) for verification and
release status. The old local ghost-room implementation is no longer the entry flow.
