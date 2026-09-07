# Simulator UX and real multiplayer

## Scope

Trainer: optional guide instead of a mandatory ten-step welcome modal; concise
first action; expandable wind dynamics, compass and sail/course options; larger
segmented controls with pressed state; a single control column on small phones;
bounded desktop/tablet stage height. Existing dark-ocean tokens are retained.
The current PRODUCT.md describes SRC radio specifically, so its calm learning
principles were used without treating it as the sailing simulator specification.

Multiplayer: readiness is enforced by the server, bot roster is visible, host
transfer updates client permissions, replacing a socket cannot disconnect its
replacement, reconnect restores countdown/racing/results, and host can open a
rematch without creating another room. Mission changes reset readiness. Input
clears on disconnect or focus loss; pointer capture prevents stuck touch turns.
Players see names and a server-provided next-waypoint guide. Race integration
uses elapsed tick time capped at 250 ms, rather than slowing down whenever a
server tick is delayed while the race clock continues at wall time.

The native multiplayer entry now opens the same live multiplayer page through
SimWebView, with code forwarding and an offline solo fallback. Old host/join/race
routes redirect there. It no longer sends users into local practice-ghost rooms.
The unused mock module is retained as historical code, not a network implementation.

## Verification

- 312 web tests pass with two workers; the heavily parallel run during concurrent
  Xcode builds had timeouts and is not counted as a pass.
- Mobile check: 112 tests plus lint, types, content sync and offline bundle pass.
- Two isolated browser contexts: create, join, readiness, add bot and shared start pass.
- Real local socket integration: two sailors plus a bot finish legally in
  95.447, 171.394 and 197.840 seconds in the final completed run. Result recovery
  after reconnect and same-room rematch pass. Host transfer and countdown
  reconnect are included. This is not a high-latency or large-scale load certification.
- `npm run test:multiplayer` provides the short lifecycle gate; add `--full` to
  `node scripts/test-multiplayer.mjs` for the complete real-time race.
- Server dependencies are locked, Docker uses npm ci, and the short socket test
  runs in deployment CI.
- First pass browser smoke: 11/13; hidden-compass selector corrected to target
  the Trainer scene. Local AI endpoint test failed separately; unrelated existing
  edits in the AI route are not included in this change.

## Release tracking

Build 38 replaces build 37 in the 1.6.1 submission. The final confirmed state
is recorded below; App Store public availability still depends on Apple approval.


## Final web verification

Source `380a30435902c989604eb663b6e0fec9d116c068` deployed successfully.
[CI run 34157533955](https://github.com/Warlockus-prod/regatta/actions/runs/34157533955):
9 pre-deployment browser tests and all 13 production tests passed, including
readiness and tablet steering in an embedded guest session.
The optional socket `--expiry` test also passes: a disconnected host is removed
after the grace window and the remaining human becomes host.

Release archive 38, fresh IPA export, Apple validation and upload succeeded.
The build is VALID and available to the Self TestFlight group. The Release
Simulator binary was installed on iPhone 17 Pro / iOS 26.5; the live multiplayer
entry rendered correctly in English. [Native evidence](mobile/audits/multiplayer-build38/multiplayer-entry.png).
[Native localization audit](mobile/audits/multiplayer-build38/i18n.md): zero findings.
The two-client browser flow and complete socket race are automated; a manual
full race in WKWebView and physical-device performance are not claimed.


## App Store submission confirmed

At 2026-09-07 22:13 Europe/Warsaw: 1.6.1 (38), VALID, WAITING_FOR_REVIEW,
AFTER_APPROVAL. Build ID: `c76aa877-9e90-4479-8e96-eb3a7e050f10`.
Review submission: `cd721e6d-9cfe-4b59-b354-fdcff9d553b9`, submitted
2026-09-07T20:12:47.074Z. The previous build 37 submission was canceled solely
to replace its binary. Seven release-note locales were updated. Fastlane precheck
and the submission dry-run passed before the actual submission.

The final native check covers the installed release entry and its live web render.
The final production E2E covers two independent browser sessions, including a
tablet-sized embedded guest, readiness, bot roster, shared start and visible turn
controls. This does not claim a manual full race on a physical iPhone.
