# Historical cross-platform proposal

Updated 2026-10-25. The original proposal below is retained as history. Its unchecked boxes are not the active backlog and must not trigger a workspace, R3F-native, Skia or react-native-svg rewrite.

Current work is governed by [the completion harness](../../audits/2026-10-24/implementation-harness.md), [the selected design direction](../../audits/2026-10-24/design-proposal.md) and [the follow-up baseline recheck](../../audits/2026-10-25/plan-recheck.md). The recheck is frozen baseline evidence; new source and installed-device proof are recorded separately by the harness.

## Accepted architecture and current source

| Historical proposal | Accepted replacement | Evidence boundary |
| --- | --- | --- |
| Physics duplicated, create packages/sailing-physics and workspaces | ADR-0009 in DECISIONS.md in this folder uses @regatta/physics to consume canonical src/lib/sailing-physics. The former native copy is a compatibility shim. | Do not create a second physics engine or merge constants as a visual task. |
| Port the 3D renderer to R3F-native/expo-gl | ADR-0011 chose shared web-tier delivery through SimWebView. Installed sailing-offline.html now includes the shared race, 3D trainer, trim trainer, Basics and Anatomy source with local boat/fonts/assets. | Offline builders and source tests verify packaging; an installed binary must still prove loading, touch, camera and navigation. |
| Rewrite trim SVG scenes/pods in React Native | Compile the same existing web trim runtime and views into the local sailing package. | Keep native fallback screens for actual failure/deep links; do not advertise them as the normal offline path. |
| Decide whether Basics stays web only | Native /simulator-v1 opens the same bundled /simulator source. Anatomy uses the same local package. | Route and shared-asset presence alone do not prove the whole user flow. |
| Single switcher named V1/V2/V3 | Shared product catalog and native/web hubs use meaningful user labels. V names remain internal. | Every entry, Back, exit-to-hub and deep-link fallback needs explicit flow acceptance. |
| Content packages extraction | Shared pure content under src/data and src/lib; native compatibility exports preserve existing paths. Foundation quiz/guide/drawings moved without changing original answers or rendered geometry. | No web runtime imports from mobile implementation modules or Expo configuration. Native-only practice routes stay native. |
| State/account synchronization | Progress and race history remain local per device with approved native storage bridges. Preserve legacy records and first-use WebKit migration; a durable native acknowledgement establishes snapshot ownership. | Opening a lesson or exercise is not theory or practical evidence. Cross-device accounts/sync remain a separate unapproved scope. |

Native SRC installs its seven-language course, original exam bank and local radio practice. Exact protocol phrases and English language-exercise options remain protected. Device TTS and strict on-device recognition use typed fallback if a model is unavailable. Native Sternik theory, test, exam and typed oral practice are installed in Polish only. Multiplayer needs a network; website-only voice/AI capabilities have their own availability and privacy rules.

The active visual direction is the first Ocean Cockpit concept: readable values, a protected boat/radio rectangle and reserved bottom/side controls. The owner reopened theme coherence on27October: a light shell must not force an unrelated dark trainer. Current day-surface source, remaining native splash/mode/installed gates and the full feedback reconciliation live in `docs/audits/2026-10-28/completion-status.md`. Dark radio hardware/LCD is a separate object layer. Source Sans3 is locally bundled for web/native; the old Geist/system-only instruction is superseded. See root DESIGN.md for typography and semantic tokens.

## Verification status

Build60 delivery is historical evidence for the 24 October candidate, not proof that the 25 October source corrections are already released or that the owner accepted them. The current corrections address direct radio entry, camera orbit, activity Back/exit, protected fallback controls and honest website foundation progress. Source tests can close their own contracts; installed-device and browser acceptance remain explicit harness gates until their actual evidence is recorded. Do not mark the old checklist complete merely because a unit suite is green.

## Original proposal, superseded

### Original goal: three simulators on web and app

Goal: the three web simulators (V1 2D, V2 3D, V3 trim trainer) run inside the
iOS app, behaving the same, with one source of truth so web and app never
drift. Then a final independent audit (tech + UI/UX + app) and an App Store
growth plan (see APPSTORE_GROWTH.md).

This was the original proposed checklist. Its boxes are historical, not current tasks. "Owner: me"
= code I write and verify here (tsc/lint/tests/web build). "Owner: device" =
needs the Mac (Expo/Xcode build, TestFlight, on-device QA).

---

## 0. Current state (grounded)

- Web (Next.js, React DOM): V1 `/simulator` (2D canvas), V2 `/simulator2` (new
  Three.js / R3F module `src/features/simulator-3d`, standalone), V3
  `/simulator-v3` (SVG trim trainer).
- App (Expo / React Native): one Skia simulator (`mobile/app/simulator`,
  `mobile/src/simulator/*`), deps `@shopify/react-native-skia` +
  `react-native-svg`. NO `three` / `@react-three/fiber` / `expo-gl`.
- Physics is DUPLICATED: web `src/lib/sailing-physics/*` and mobile
  `mobile/src/simulator/physics/*` are verbatim copies (drift risk).
- Content/i18n already auto-synced with a CI parity guard. API is shared.
- No monorepo / workspaces.

Hard truth: web is React DOM, app is React Native. Components are not portable
verbatim; we share LOGIC and re-express the VIEW per platform. R3F is the
exception: the same JSX runs on web and native (via expo-gl).

---

## Phase 0 - Foundation: kill duplication (single source of truth)

The keystone of "synchronized". Owner: me (verify with web build + physics tests).

- [ ] 0.1 Add workspaces to the repo root `package.json` (`packages/*`, `mobile`).
- [ ] 0.2 Create `packages/sailing-physics` with the canonical VPP engine
  (the union of web `src/lib/sailing-physics` and our V2 `sailModel`), typed,
  zero platform deps (no three, no react).
- [ ] 0.3 Point web at the package: re-export `src/lib/sailing-physics` from
  `@regatta/sailing-physics` (keep the old import path working). Web `tsc` +
  `npm run build` pass; `npm run test:physics` 16/16 green.
- [ ] 0.4 Point mobile at the package: replace `mobile/src/simulator/physics/*`
  with `@regatta/sailing-physics`. Owner: device (verify mobile typecheck/build).
- [ ] 0.5 CI parity guard extended: a test that fails if any physics lives
  outside the package (no second copy can reappear).
- Acceptance: one physics package; web build + physics tests green; mobile
  imports it; deleting the mobile copy does not change results.

---

## Phase 1 - V2 (3D) in the app via R3F-native (highest value, most portable)

Owner: me (code) + device (build/run).

- [ ] 1.1 Add to `mobile`: `three`, `@react-three/fiber`, `@react-three/drei`,
  `expo-gl`, `expo-asset`, `expo-three` (or drei/native).
- [ ] 1.2 Extract our `src/features/simulator-3d` into `packages/sim-3d`
  (it is already standalone R3F: `Simulator3D`, `RegattaScene`, `Yacht`,
  `Ocean`, physics, audio). Web imports the package.
- [ ] 1.3 Native shims: `expo-gl` Canvas wrapper; `@react-three/drei/native`
  for OrbitControls/Sky; bundle `regatta_sloop.glb` as an expo-asset and feed
  its resolved URI to `useGLTF`; WebAudio -> `expo-av` for the sail audio (or
  no-op on native first).
- [ ] 1.4 App screen `mobile/app/simulator2/index.tsx` mounting the shared
  `<Simulator3D>` with RN-friendly controls (touch sliders / gestures).
- [ ] 1.5 Verify GLB loads, sails morph, boat heels/rides swell, 60fps target
  on a mid device; degrade quality on low tier. Owner: device.
- Acceptance: the same 3D sloop + trim + living ocean runs in the app from the
  shared code; web V2 unchanged.

---

## Phase 2 - V3 (trim trainer) in the app via react-native-svg

Owner: me (code) + device (build/run).

- [ ] 2.1 Extract V3 runtime (`src/features/simulator-v3/runtime/*`) into
  `packages/sim-core` (pure logic) so web + app share it.
- [ ] 2.2 Port the SVG scenes (`SceneSide/Rear/Top`) from web `<svg>` to
  `react-native-svg` (mechanical: svg->Svg, path->Path; same geometry math).
- [ ] 2.3 Port the V3 pods/HUD to RN components; wire to the shared runtime.
- [ ] 2.4 App screen `mobile/app/simulator-v3/index.tsx`.
- Acceptance: V3 trim trainer (side/rear/top, telltales, trim feedback) matches
  the web behavior in the app, same runtime.

---

## Phase 3 - V1 (2D canvas): decide, do not blindly duplicate

Owner: me (decision + code) + device.

- [ ] 3.1 Decision (recommend): keep V1 web-only as legacy; map the app's
  EXISTING Skia sim as the app's "V1-equivalent" entry, OR
- [ ] 3.2 (if true parity wanted) port V1's `drawHull`/canvas drawing to Skia.
- Acceptance: a clear V1 story on mobile (reuse Skia sim or explicit port), no
  dead duplicate.

---

## Phase 4 - Sync hardening

Owner: me + device.

- [ ] 4.1 Content/i18n: already synced; fold into `packages/content`, keep the
  CI parity guard.
- [ ] 4.2 A single "version switcher" UX (V1/V2/V3) on BOTH web and app from
  shared config.
- [ ] 4.3 (optional) Cross-device USER state sync (progress, settings, race
  history): needs accounts + a sync API. Scope separately; today it is
  per-device (localStorage / AsyncStorage).
- Acceptance: no manual copy steps; one change updates both platforms.

---

## Phase 5 - Testing (the "tested and works" bar)

Owner: me (automated) + device (manual QA).

- [ ] 5.1 Unit tests for `packages/sailing-physics` (port the 16 physics tests)
  and `packages/sim-core`.
- [ ] 5.2 Web: `tsc` clean, `eslint` clean, `npm run build` passes,
  `npx playwright test` green, cyrillic scan 0 leaks.
- [ ] 5.3 Mobile: `cd mobile && npm run check` (sync-content + lint + tsc +
  jest) green. Owner: me for code; device for the build.
- [ ] 5.4 Device QA checklist (per simulator: loads, controls respond, physics
  correct, 60fps, no crash, all 7 languages). Owner: device.
- Acceptance: every box green; a written QA pass on a real device.

---

## Phase 6 - Final independent audit (tech + UI/UX + app)

Owner: me (multi-agent review), then fix loop.

- [ ] 6.1 Technical audit: every changed/new file (web + packages + mobile) for
  correctness, perf, security, dead code, type safety.
- [ ] 6.2 UI/UX audit: web + app simulators (hierarchy, a11y, responsive,
  i18n, touch ergonomics, instrument clarity).
- [ ] 6.3 App audit: navigation, parity vs web, App Store readiness.
- [ ] 6.4 Fix everything the audit finds; re-run Phase 5; loop until clean.
- Acceptance: a written audit report with all findings resolved.

---

## Phase 7 - App Store positioning, growth, monetization

See APPSTORE_GROWTH.md. Owner: me (strategy + metadata/code), device (submit).

- [ ] 7.1 Positioning + ASO (name, subtitle, keywords, screenshots, preview).
- [ ] 7.2 Monetization model (free + Pro, what is paid, price, paywall).
- [ ] 7.3 Growth loops (referrals, daily challenge, shareable race cards).
- [ ] 7.4 Analytics + funnels to optimize (already have custom + GA4).
- Acceptance: a decision-ready growth/monetization plan + the metadata/code to
  ship it.

---

## Definition of done

All boxes [x]; web + mobile builds green; physics single-sourced; 3 simulators
present on both platforms (V1 per the Phase 3 decision); a device QA pass; the
audit report findings all resolved; the App Store growth plan delivered.

## Risks / honest notes

- The monorepo refactor touches many import sites; do it behind compat
  re-exports and verify the web build at each step.
- Mobile build/run verification needs the Mac (Expo/Xcode). I deliver code +
  QA checklist; the device pass is yours.
- R3F-native is the realistic path for V2; drei has a `/native` entry but some
  helpers differ - expect shims.
- Full pixel-identical V1 on mobile is low value; prefer reusing the Skia sim.
