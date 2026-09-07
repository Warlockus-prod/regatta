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

Build 38 is being prepared to replace build 37 in the pending 1.6.1 release.
Deployment, final browser verification and App Store state will be recorded here
once confirmed. Existing App Store review is not claimed to contain these changes.
