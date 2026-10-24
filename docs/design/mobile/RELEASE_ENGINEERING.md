# Release engineering and Apple workflow - Week to Regatta (mobile)

Operational snapshot verified 2026-10-24: public App Store 1.6.4 (48),
TestFlight 1.7.0 (58), group Self. Candidate 1.7.0 (59) is undergoing local
release verification; no archive, upload, VALID processing or Self delivery is
claimed until the actual result is recorded in `BUILDS.md`.

Historical release submission verified 2026-09-17: website `972df53`, native source
`b5580aa`, app 1.6.2 (43). Build 43 is VALID, attached to TestFlight Self and
WAITING_FOR_REVIEW in App Store Connect, with automatic release after approval.
The public App Store version checked before submission was 1.6.1 READY_FOR_SALE.
See the [release report](../sailing-release43-2026-09-17.md) for exact checks,
scope, source hashes and delivery evidence. The complete sailing-lab plan is
not finished; this update ships six lessons and the working offline simulator.

Local Xcode archive/export and `altool` remain the working release path.
EAS Update is unconfigured (`updates.url` and `extra.eas.projectId` absent).
Starting with build 43, Trainer and 3D Boat are bundled offline and require a
new binary for updates. Candidate build59 also bundles the 3D solo race,
Basics and anatomy, the complete seven-language SRC course and the Polish
Sternik theory/tests/exams/typed practice. SRC recognition requires an installed
compatible local English model, with a clearly labelled typed fallback.
Sternik typed practice requests no microphone. History, coaching, checkpoint
logic and native navigation also ship with the binary. Multiplayer and optional
Ask, weather and external gallery/video requests remain online. Website and
older-app voice modes remain separate from the new local SRC recognizer.

Historical setup notes below (snapshot 2026-05-31). App `com.icoffio.regatta`, ASC app id `6768134329`,
Apple team `547PA2PLLB`, Expo SDK 54, RN 0.81, expo-router 6, New Arch on.

The EAS/OTA instructions below describe a future setup, not the active release
pipeline. Do not claim an OTA deployment while updates remain disabled.

This doc covers (1) the EAS Update / OTA setup, (2) a command cheat-sheet for
this project, (3) what else is worth connecting, and (4) Apple workflow notes.

ASCII only (the repo pre-commit hook blocks em/en-dash).

---

## 1. EAS Update (over-the-air JS updates)

### What was wired in this pass
- `expo-updates ~29.0.18` installed (`npx expo install expo-updates`).
- `app.json` -> `runtimeVersion: { "policy": "fingerprint" }`.
  Fingerprint means an OTA update only lands on a build whose native layer
  matches the update. This prevents shipping JS that is incompatible with the
  installed binary (the safest policy on SDK 52+).

### One step left (needs YOUR Expo/EAS login - account specific)
The update server URL and `projectId` come from your EAS account, so this must
run under your login (I cannot enter your credentials):

```sh
cd mobile
npx eas-cli login                # your Expo account
npx eas-cli update:configure     # injects updates.url + extra.eas.projectId into app.json
```

After that, app.json will contain:
```json
"updates": { "url": "https://u.expo.dev/<your-project-id>" },
"extra":   { "eas": { "projectId": "<your-project-id>" } }
```

### IMPORTANT: OTA starts from the NEXT build
Build 13 / v1.0 (currently in App Review) was built WITHOUT expo-updates, so it
cannot receive OTA. OTA only works for builds that include expo-updates, i.e.
the next build (v1.1). So the rollout is:

1. `eas update:configure` (above)
2. `eas build` a new binary (v1.1) that now embeds expo-updates
3. submit v1.1 to the App Store (normal review)
4. from then on, JS-only fixes ship via `eas update` (no review)

### OTA vs native rebuild - the rule
- JS only (UI, logic, content, the leaderboard fix): `eas update` -> instant,
  no rebuild, no Apple review. Users get it on next app launch.
- Native (icon, SDK bump, new native module, permission, supportsTablet,
  app.json native fields): full `eas build` + `eas submit` + Apple review.

Apple allows OTA for bug fixes and content; it must not change the app's core
purpose or add features that should have been reviewed.

---

## 2. Command cheat-sheet (this project)

```sh
cd mobile

# --- New store version (native or first OTA-capable build) ---
npx eas-cli build  --platform ios --profile production      # build (buildNumber auto-increments)
npx eas-cli submit --platform ios --profile production      # upload to App Store Connect + TestFlight
# then in ASC: new version "1.x" -> attach build -> What's New -> Submit for Review

# --- JS-only fix to users already on the store (after eas update:configure) ---
npx eas-cli update --channel production --message "fix: leaderboard 400"

# --- Internal test build (simulator / TestFlight) ---
npx eas-cli build --platform ios --profile preview

# --- Push localized store metadata via ASC API (existing script) ---
node scripts/asc-metadata.mjs            # dry-run: add --dry-run

# --- Health / hygiene ---
npx expo-doctor
npx expo install --check                 # align dependency patch versions
```

eas.json already maps build profiles to EAS Update channels
(`development` / `preview` / `production`) and carries `ascAppId` +
`appleTeamId`, so submits are non-interactive.

Review status without opening ASC (ASC API key already on this machine):
```sh
node scripts/asc-state.mjs               # prints e.g. "1.0 WAITING_FOR_REVIEW"
```
(see scripts/asc-metadata.mjs for the same JWT auth; the poller is a thin copy.)

---

## 3. What else is worth connecting (prioritized)

### High value
- Crash + error reporting. Without it you are blind to production crashes.
  Option: `@sentry/react-native` (Expo config plugin).
  CAVEAT: this is the one that touches your privacy story. Sentry sends crash
  reports (stack traces, device/OS, optionally breadcrumbs) off device. The
  App Privacy label must already say "Data Collected" (PostHog: Usage Data /
  Product Interaction and Diagnostics / Other Diagnostic Data, Analytics, not
  linked, not tracking). If you add Sentry you MUST:
    - add "Diagnostics / Crash Data" (not linked, not tracking) to the ASC
      App Privacy answers and `NSPrivacyCollectedDataTypeCrashData` to the
      privacy manifest,
    - update PRIVACY_POLICY.md and the live /privacy page,
    - add the Sentry domain to the privacy manifest if needed.
  Without an SDK, Apple's Xcode Organizer crash logs remain the no-disclosure
  option - lower fidelity but no extra privacy cost.

- CI/CD for mobile. You already run GitHub Actions for the web deploy. Add a
  workflow that runs `eas build`/`eas submit` on a git tag (e.g. `mobile-v*`),
  using `EXPO_TOKEN` as a repo secret. Removes the "build from my laptop" step
  and makes releases reproducible.

- In-app review prompt. `expo-store-review` (`StoreReview.requestReview()`)
  after a positive moment (e.g. finishing a race with a personal best). Cheap,
  raises store rating. Native module -> ships in a build, not OTA.

### Medium value
- Phased release (App Store, updates only). When submitting a v1.x UPDATE you
  can enable "Phased Release for Automatic Updates": Apple rolls it out to a
  growing % over 7 days and you can pause it if crashes spike. Not available for
  the very first version (1.0).
- Push notifications. `expo-notifications` + an APNs key for retention
  (daily-challenge reminders). Needs a privacy update (push token) and an
  opt-in prompt. Only if you actually have something to notify about.

### Already in place (good, keep)
- App Store Connect API automation: `scripts/asc*.mjs` (metadata, screenshots,
  TestFlight invites) with a `.p8` key in `~/.appstoreconnect/private_keys`.
- iOS privacy manifest in app.json under `expo.ios.privacyManifests`
  (required-reason APIs and NSPrivacyCollectedDataTypes: ProductInteraction
  and OtherDiagnosticData, Analytics, not linked, not tracking). Until 1.6.4
  (build 48) the object sat in the expo-build-properties plugin options, which
  ignore it, so every shipped PrivacyInfo.xcprivacy had an empty
  NSPrivacyCollectedDataTypes; the move ships with the next build. Check the
  resolved config before a build: `npx expo config --json` must show
  `ios.privacyManifests.NSPrivacyCollectedDataTypes`.
- Export compliance: `ITSAppUsesNonExemptEncryption=false` (no per-submit prompt).
- TestFlight external invite script (`scripts/asc-invite-external.mjs`).
- Screenshot pipeline (`scripts/asc-screenshots.mjs`) + the captured v1.0 sets
  now in `asc-metadata/screenshots/iphone-6.9/en` and `ipad-13/en`.

---

## 4. Apple workflow notes

- Review time: usually 24-48h for a first version, often faster for updates.
- Re-review is triggered by: a new build, or metadata changes that require
  review. Pure OTA `eas update` payloads do NOT go through review.
- Build numbers must strictly increase across uploads. `autoIncrement: true`
  (+ `appVersionSource: remote`) in eas.json handles this on EAS builds.
- App Privacy ("Data Collected": Product Interaction and Other Diagnostic
  Data, Analytics, not linked, not tracking) and Age Rating (4+) are
  app-level and persist across versions. The label must change whenever data
  practices change; the release gate G4b in RELEASE_CHECKLIST.md compares it
  with the privacy manifest and the policy before every submission. The audit
  of 2026-10-18 found the live label still saying "Data Not Collected" while
  PostHog ran by default; correcting it in ASC is an owner step.
- iPad screenshots are required while `ios.supportsTablet: true`. If you ever
  want to drop iPad support to skip them, that is a native change (new build).

---

## 5. Open hygiene items
- `expo-doctor` 16/17: patch drift on `expo` (54.0.34 -> 54.0.35),
  `expo-localization`, `expo-router`. Fix with `npx expo install --check`
  before the next build. Pre-existing, low risk.
- Leaderboard 400 on mobile (`src/api/coach.ts`): mobile `fetch` sends no
  `regatta_sid` cookie, so `/api/race-result` 400s and scores never post. For
  v1.1: either suppress the "offline" toast on status 400, or implement a real
  auth/device-id model (ADR-0006). This is the first natural OTA candidate.
