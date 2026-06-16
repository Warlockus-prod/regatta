# Release engineering and Apple workflow - Week to Regatta (mobile)

Snapshot: 2026-05-31. App `com.icoffio.regatta`, ASC app id `6768134329`,
Apple team `547PA2PLLB`, Expo SDK 54, RN 0.81, expo-router 6, New Arch on.

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
  reports (stack traces, device/OS, optionally breadcrumbs) off device. If you
  add it you MUST:
    - flip the ASC App Privacy answer from "Data Not Collected" to
      "Data Collected -> Diagnostics / Crash Data" (not linked, not tracking),
    - update PRIVACY_POLICY.md and the live /privacy page,
    - add the Sentry domain to the privacy manifest if needed.
  If you want to keep the clean "Data Not Collected" label, skip Sentry and rely
  on Apple's Xcode Organizer crash logs (no SDK, no disclosure) - lower fidelity
  but zero privacy cost.

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
- iOS privacy manifest in app.json (required-reason APIs declared).
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
- App Privacy ("Data Not Collected") and Age Rating (4+) are app-level and
  persist across versions; you only revisit them if data practices change.
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
