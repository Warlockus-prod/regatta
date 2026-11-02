# Web vs Mobile App - parity map

Last updated: 2026-06-03. App version 1.1 (build 17). Historical comparison of
how the app differed from the site at build 17.

Partial refresh 2026-10-19: the race and multiplayer rows below and the "Race
layer" section were corrected; the rest of the page still describes build 17.

2026-11-02: the plan sections (v1.1 shipped list, v1.2 in progress, "Roadmap -
what is worth doing next") were removed. Every item there shipped or was
superseded (AI rivals, global leaderboard, simulator re-skin, real multiplayer
through `SimWebView`, mobile ADR-0011). Open work and its order live only in
`docs/BACKLOG.md`.

## Summary

The mobile app ("Week to Regatta") is at full CONTENT parity with the web and
is richer in several places. It runs the SAME VPP sailing-physics engine as the
web V2/V3 simulators (a verbatim port), and the 7-language content is
auto-synced from the web data with a CI parity guard, so item counts match
exactly. The real differences are concentrated in three places:

1. The race game: AI rivals exist now (since v1.2), but the native race moves
   boats with its own integrator and has no collisions (see "Race layer").
2. The simulator's visual polish (the engine is identical; the canvas is flatter
   than the web V3 look).
3. Networked social features (2026-10-19: multiplayer is the live web room in a
   WebView; the leaderboard row below still describes build 17).

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
| Game / race | 2-4 AI opponents + easy/medium/hard, sound, minimap, mission presets | 2-4 AI rivals on the shared VPP + autopilot, easy/medium/hard, haptics, course lengths; own integrator without collisions (see "Race layer") | POLISH (no collisions) |
| Post-race AI coach | yes (/api/coach) | yes (/api/coach), fed richer real-physics samples | OK |
| AI assistant ("ask anything") | FeedbackWidget chat (/api/ai-chat) | dedicated Ask screen (/api/ai-chat), added this update | OK |
| Multiplayer | live server-authoritative room over WebSocket | the same live web room in a WebView (`SimWebView` -> `/multiplayer`); the old local ghost-bot mock was deleted 2026-10-19 | OK |
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

## Race layer: what is shared and what is native (2026-10-19)

- Shared with the web: the VPP (`@regatta/physics`), the race autopilot
  (`raceAutopilotTurn`) and the mark-rounding logic. `mobile/src/game/race.test.ts`
  gates them.
- Native only (`mobile/src/game/ai-boats.ts` and the player loop in
  `mobile/src/simulator/use-sim-loop.ts`): position integration at 6 px per
  knot (`KN_TO_PX_PER_S` in `mobile/src/game/units.ts`; the web race uses 8
  world units per knot-second), soft-wrap at the playfield edges instead of the
  web's clamp, and no boat-to-boat collisions (the web repels boats closer than
  `MIN_BOAT_SEPARATION`).
- App race results never mix with the web boards. Whether the app race should
  get collisions is a mobile product decision; do not refactor
  `src/lib/race-physics.ts` for it.

## Kept finding: native 3D

The 2026-06-04 native 3D anatomy beta showed that `expo-three` draws nothing
under the React Native New Architecture. The app's 3D surfaces therefore use
the shared web tier in a WebView (mobile ADR-0011); the 2D anatomy stays the
native version.
