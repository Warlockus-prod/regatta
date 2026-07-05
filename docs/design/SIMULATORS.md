# SIMULATORS.md - the single source of truth

Status: ACTIVE (2026-07-05). This document supersedes the simulator-role
statements in docs/design/simulator-v3/SPEC.md ("V1 and V2 are deleted") and
docs/design/simulator2/ROADMAP.md ("V2 = premium race surface"). Any doc that
contradicts this one is stale; update it or link here.

## The model: TWO simulators + one 3D view, identical on web and iOS

| Tier | Web route | iOS screen | What it is |
|---|---|---|---|
| 1. Basics (Основы) | `/simulator` | `/simulator-basics` (native, offline) | Wind + turns + angle to wind. A boat on a wind rose, the no-go cone, point-of-sail cards. Zero trim complexity. Step 1 for a complete beginner. |
| 2. Trainer (Тренажёр) | `/simulator-v3` | `/simulator` (native, offline) | The full trainer: live VPP physics, manual sail trim, drills, scenarios/missions, coach feedback, live weather wind. Step 2. |
| 3D boat view (Лодка 3D) | `/simulator2` | `/simulator2` (WebView) | NOT a third simulator. The R3F + GLB sloop: orbit 360, live sail morphs, free-trim and sailing modes. The visual layer; long-term it becomes the Trainer's 3D view. |

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

## Physics engines (current state and target)

| Engine | Where | Status |
|---|---|---|
| Golden VPP (`src/lib/sailing-physics`) | web Trainer (V3) | Canonical. 23 unit tests + V3's 33 runtime tests. |
| Native fork (`mobile/src/simulator/physics`) | native Trainer | DIVERGED from golden (91 diff lines in forces.ts, missing current.ts, zero tests). To be replaced by `packages/physics` extraction (ADR-0003 step 5). |
| 3D sail model (`src/features/simulator-3d/physics/sailModel.ts`) | 3D boat view | Kinematic stand-in (scripted polar). Smooth polar + jib coupling fixed 2026-07-05; full adoption of the golden VPP is the planned upgrade. |
| Arcade (`src/lib/race-physics.ts`) | /game, /multiplayer, /r replays | Intentionally simple race model; shared by all three consumers. GameClient still carries an inline duplicate - fold it in when /game is next touched. |
| Basics lookup | web /simulator, app /simulator-basics | Point-of-sail speed-factor lookup, no dynamics - by design for tier 1. |

Target end state: ONE golden engine in `packages/physics` consumed by web
Trainer, native Trainer and the 3D view; the arcade model stays for /game;
Basics stays a lookup.

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
- Web Trainer: 10-step 7-language tour (TourOverlay).
- Web 3D: one-line orbit hint (loading spinner while the GLB streams).
- App hub: STEP 1 / STEP 2 badges encode the learning order.
- App Basics: 3-step first-open overlay (AsyncStorage `regatta.basics.hint.v1`).
- App Trainer: native drills with pass/fail + score.

## Verification gates

- Web: `npx tsc --noEmit`, `npm run lint`, `npm run test:physics` (23),
  `npx vitest run src/features` (33+, now in CI), `npx playwright test`
  (smoke covers /simulator, /simulator-v3, /simulator2 and the embed contract),
  `npm run build` before push.
- Mobile: `npx tsc --noEmit`, `npm run lint`, `npx jest --ci`.
- Live: cold-relaunch the dev-client (stale-bundle trap), screenshot each sim.

## Roadmap after this restructure

1. `packages/physics` extraction (web+native Trainer on one engine, CI guard).
2. 3D view upgrades: self-hosted HDRI (IBL), GPU ocean, animated telltales
   (meshes already in the GLB), sail backlight, wake; DRACO-compress the GLB.
3. Gusts/shifts in the web Trainer (native already has Zmiana/Podmuch).
4. Lesson deep-links (`?drill=`) into Trainer/3D; revive leaderboard loops.
5. Unify drill/scenario catalogs into `src/data/*` for native + web Trainer.
