# Web vs Mobile App - parity map and roadmap

Last updated: 2026-06-03. App version 1.1 (build 17). Source of truth for "how
the app differs from the site" and "what is worth doing next".

## Summary

The mobile app ("Week to Regatta") is at full CONTENT parity with the web and
is richer in several places. It runs the SAME VPP sailing-physics engine as the
web V2/V3 simulators (a verbatim port), and the 7-language content is
auto-synced from the web data with a CI parity guard, so item counts match
exactly. The real differences are concentrated in three places:

1. The race game has no AI opponents yet (web has 2-4).
2. The simulator's visual polish (the engine is identical; the canvas is flatter
   than the web V3 look).
3. Networked social features (multiplayer is a local mock, leaderboard shows
   only on-device personal bests).

Legend: OK = parity, APP+ = app is ahead, POLISH = works but less polished,
GAP = notable missing capability.

## Comparison table

| Area | Web | App | Verdict |
|---|---|---|---|
| Bootcamp (8 lessons) | lesson list links out to other routes | dedicated lesson pages + per-lesson diagram + micro-quiz with pass/fail + drill CTA | APP+ |
| Quick refresh (6 tips) | tips link into deeper content | static cards (no deep link yet) | POLISH |
| Onboard (8 sections) | collapsible accordion | always-open list | OK |
| Anatomy (17 parts) | interactive 3D GLB model + 2 photo posters | 2D top-down SVG, same 17 tappable hotspots + posters | POLISH (2D vs 3D) |
| Glossary (51 terms) | search + 7 category chips | search + 7 category chips (added this update) | OK |
| Courses / points of sail (5) | clickable wind-rose | interactive polar (drag boat, wind chips, haptics) | OK |
| Racing (tactics + diagrams) | SVG course + strategy diagrams | native SVG diagrams, same content | OK |
| Checklist (8 sections) | static reference page | interactive checkboxes + progress + persistence | APP+ |
| Rules of the road | RRS + COLREGS sections, intros, official source links | same: RRS/COLREGS sections + intros + IMO/national links (added this update) | OK |
| Physics engine | VPP (used by V2/V3) | same VPP, verbatim port | OK |
| Simulator | V3 look: animated water, wake particles, full chrome | V2-class look: waves + compass + wind-maps present, flatter canvas | POLISH |
| Game / race | 2-4 AI opponents + easy/medium/hard, sound, minimap, mission presets | solo time-trial vs the clock, haptics, course lengths | GAP (AI opponents) |
| Post-race AI coach | yes (/api/coach) | yes (/api/coach), fed richer real-physics samples | OK |
| AI assistant ("ask anything") | FeedbackWidget chat (/api/ai-chat) | dedicated Ask screen (/api/ai-chat), added this update | OK |
| Multiplayer | real networked play (/api/player polling) | local mock: races vs deterministic ghost bots seeded by room code | GAP (stub backend) |
| Leaderboard | global board (/api/leaderboard) | on-device personal bests only (already POSTs scores to global) | POLISH (local-only) |
| Live wind / weather | /api/weather snapshots | same, WindNowCard + spots | OK |
| Spots / venues | 6 venues + chart + weather | same 6 venues + OpenSeaMap + weather | OK |
| Race history + replay | none | persisted races + replay + coach link | APP+ |
| Daily challenge | none | home banner -> daily game course (moved below the learning path this update) | APP+ |
| Settings | implicit (localStorage) | language, units, data export/wipe with confirm | APP+ |
| Privacy policy | /privacy page | embedded in Settings (full text) | OK |
| i18n (7 languages) | ru/en/pl native + es/fr/de/it | full 7-language; checklist + onboard es/fr/de/it backfilled this update | OK |
| Admin /stats | password-gated web tool | correctly absent (admin only) | OK (by design) |
| simulator2 / v3 / 3d-lab | experimental web sims | absent (app has its own sim) | OK (by design) |

Nothing on the web is entirely missing from the app. The app additionally ships
features the web does not have (history, replay, dedicated coach screen, daily
challenge, settings/data tools).

## What shipped in this update (v1.1, build 17)

- App name unified to "Week to Regatta" in all 7 App Store locales and on the
  home screen.
- New app icon (bolder boat, thicker strokes, cleaner water).
- Ask: a new AI assistant screen (chat over /api/ai-chat, 7 languages).
- Rules redesigned: split into RRS and COLREGS standards with explainers and
  links to the official source texts (IMO / national).
- Gallery redesigned: videos in their own section, year shown once per section
  header instead of a badge on every photo.
- Glossary: category filter chips.
- Full es/fr/de/it translations for the checklist and onboard content
  (previously fell back to English on ~8-9 rows each).
- Daily challenge moved below the primary learning cards on the home.
- Leaderboard save no longer shows a false "offline" alert.
- App Store description cleaned to plain text with native diacritics restored
  for es/fr/de/it.

## v1.2 - in progress (ships after v1.1 clears Apple review)

v1.1 (build 17) is in review, so v1.2 cannot be submitted yet - it accumulates
on the `app` branch. The following were implemented AND verified live in the iOS
Simulator (iPhone 16 Pro Max) via `expo run:ios` + deep links + screenshots:

- DONE [P0] **AI opponents in the race.** 2-4 kinematic rivals (count + skill
  from the course difficulty) beat upwind to the windward mark, tack, round it,
  and finish; rendered as distinct colored hulls; the player's finish position
  ("N / total") is computed and shown + sent to the leaderboard. Plus a fix so
  the player starts close-hauled (52 deg off the wind) with way on instead of
  sitting head-to-wind in irons. Files: `src/game/ai-boats.ts`, `app/game/index.tsx`.
- DONE [P1] **Simulator re-skin.** The flat playfield gained a radial water-depth
  gradient (lighter near the boat, darker at the edges) + stronger wave texture,
  closing the "looks old" gap. File: `app/simulator/index.tsx`.
- DONE [P1] **Global leaderboard.** A Personal / Global tab over the local PBs;
  Global reads `/api/leaderboard` by difficulty + wind, renders real rows, deep
  links via `?tab=global`, with loading / empty / error states. The app already
  submitted scores; now it shows the board. Files: `app/leaderboard/index.tsx`,
  `src/api/leaderboard.ts`.
- Also already in v1.2: glossary category chips, full es/fr/de/it for checklist +
  onboard (see below). tsc clean, 108/108 tests green.
- IN PROGRESS [P1] **Product analytics (PostHog).** In-app analytics the app
  lacked - screen views + app lifecycle via autocapture (touch autocapture OFF
  for privacy) plus custom funnel events (`race_started`, `race_finished`,
  `coach_requested`, `ask_submitted`). Every event is stamped with `app_language`
  + `app_version`. New module `src/analytics/*` (config / context / provider /
  use-analytics / events), mounted in `app/_layout.tsx` inside I18nProvider and
  above the navigator. The project key is a PUBLIC value read from
  `expo.extra.posthogKey` (app.json) or `EXPO_PUBLIC_POSTHOG_KEY`; with no key
  analytics stays OFF and the app is unchanged. tsc + lint clean, 108/108 tests
  still green. Pending: the user's free PostHog account + `phc_` project key,
  one native rebuild (adds `posthog-react-native` + `expo-application` /
  `expo-device` / `expo-file-system` pods), and an App Store privacy-questionnaire
  update (Analytics: Product Interaction, not linked to identity, not for tracking;
  `NSPrivacyTracking` stays false).

DEFERRED to a focused next chunk (kept out of the working build on purpose):
- [P1] Real multiplayer - needs the web `/api/multiplayer` contract and 2-client
  testing (cannot be verified in a single simulator).
- [P2] 3D anatomy - explored as a beta on 2026-06-04, then reverted to keep v1.2
  clean. Findings (head start for the focused chunk):
  - The scary part is DE-RISKED: `npx expo install expo-gl three expo-three --
    -- --legacy-peer-deps` bypasses the chronic npm ERESOLVE, and the native
    build COMPILES + LINKS fine (expo-gl pod, Build Succeeded). The npm conflict
    does NOT break the build.
  - Blocker: the `expo-three` Renderer draws nothing under the New Architecture
    (GLView clears to its color but no geometry appears - tested three 0.184 AND
    its peer 0.166, MeshStandard AND MeshBasic, so it is the GL-renderer bridge,
    not materials/lighting). expo-three is community-maintained and lags.
  - Robust path for next time: use `@react-three/fiber/native` (actively
    maintained, owns the expo-gl context + render loop) instead of expo-three.
    A procedural boat (no GLB needed) is enough for a first 3D view; only add the
    web's GLB + 17 hotspots once the renderer shows a scene.
  - The 2D anatomy (17 tappable hotspots) remains the shipping version and is
    fully functional.

## Roadmap - what is worth doing next

Ordered by value. Effort: S < 2h, M < 1 day, L > 1 day.

| # | Item | Priority | Effort | Notes / risk |
|---|---|---|---|---|
| 1 | AI opponents in the race | P0 | L | Biggest gameplay gap. Add 2-4 boats driven by the existing VPP engine + a skill/speed multiplier; add easy/medium/hard. Needs on-device tuning. |
| 2 | Simulator visual re-skin | P1 | M | Animated water gradient, wake particles, richer compass ring on the existing 3039-line Skia canvas. Engine unchanged. Needs on-device iteration (cannot be verified blind). |
| 3 | Leaderboard global tab | P1 | S | Add a "Global" tab that GETs /api/leaderboard (by difficulty+wind or mission). The app already submits scores; it just does not display the global board. Keep local PBs as the offline fallback. |
| 4 | Real multiplayer | P1 | M | Replace the ghost-bot mock with the real backend. Depends on the web /api/multiplayer (Shared lane) - confirm the contract before building. |
| 5 | Difficulty tiers + sound + minimap (game) | P2 | S-M | Match the web game's polish once AI opponents land. |
| 6 | Quick-refresh deep links | P2 | S | Make each of the 6 quick tips route to the matching bootcamp lesson / drill. |
| 7 | Glossary/onboard polish | P2 | S | Optional onboard accordion; quick tips linking. |
| 8 | 3D anatomy | P2 | L | Port a lightweight 3D viewer (expo-gl/three + GLB). Adds NATIVE dependencies - high risk against the known npm peer-dep conflict; the 2D version is a fully functional fallback. Consider keeping 2D. |

### Cross-cutting notes

- Items 1 and 2 need on-device iteration (visual/gameplay tuning) and should not
  be implemented blind.
- Item 8 needs new native dependencies and a config-plugin prebuild; given the
  chronic npm ERESOLVE conflict in this project, treat it as high-risk and
  schedule it on its own.
- Item 4 needs web-side API work (Shared lane) - do not duplicate a backend in
  the app (ADR-0001: the app consumes the existing web API).
