# TestFlight: fastest path from current state to your iPhone

Target: get this app installed on your phone via TestFlight Internal
Testing as fast as possible. No App Store Review, no public release,
just you (and up to 100 invited testers) running real production-shaped
builds.

Time estimate: ~60-90 minutes the first time, mostly waiting on EAS
build (10-20 min) and Apple processing (5-15 min).

Reads alongside [`mobile/TESTING.md`](./TESTING.md) (which covers
Expo Go and `expo run:ios` paths) and
[`docs/design/mobile/API_CONTRACT.md`](../docs/design/mobile/API_CONTRACT.md).

## What's already done (in this repo)

- `app.json`: bundle ID `com.icoffio.regatta`, display name "Week to
  Regatta", dark theme, splash, scheme, plugins (expo-router,
  expo-localization, expo-build-properties with iOS privacy manifest).
- `eas.json`: `preview` profile set to `distribution: internal` with
  `autoIncrement: true` (build number bumps automatically each upload).
- Brand PNG icons: `assets/icon.png` (1024), `assets/adaptive-icon.png`,
  `assets/splash-icon.png` (600), `assets/favicon.png`.
- Privacy manifest: declares `NSPrivacyTracking: false`, no data
  collected, only the standard RN-bundle API access reasons.
- `expo-doctor`: 17/17 green. `npm run check`: 68/68 green.

## Step A: Apple Developer Portal (5-10 min, browser)

You already have an active Free Apps Agreement. Now register the
Bundle ID.

1. Open https://developer.apple.com/account.
2. Sidebar → Certificates, Identifiers & Profiles → Identifiers.
3. Top right → blue plus → App IDs → Continue → App → Continue.
4. **Description**: "Week to Regatta".
   **Bundle ID**: explicit → `com.icoffio.regatta`.
5. Capabilities: leave defaults for v0.1 (no Push, no Sign in with
   Apple yet; those land in Phase 3 with ADR-0006). Continue → Register.

That's it. Provisioning profiles are created automatically by EAS.

## Step B: App Store Connect (10-15 min, browser)

Create the shell app record so EAS Submit has somewhere to upload.

1. Open https://appstoreconnect.apple.com.
2. Apps → blue plus → New App.
3. Fields:
   - **Platforms**: iOS.
   - **Name**: "Week to Regatta" (this becomes the App Store display
     name; max 30 chars; "Week to Regatta" is 15).
   - **Primary Language**: Russian (or English; the marketing
     metadata defaults to this locale).
   - **Bundle ID**: pick `com.icoffio.regatta` from the dropdown.
   - **SKU**: `week-to-regatta-ios-001` (anything unique, internal).
   - **User Access**: Full Access.
4. Create.

You will see the app record in My Apps. For TestFlight Internal you
do not need to fill App Information / Pricing / App Privacy yet --
those are required for App Store submission later.

After the app is created, copy the **Apple ID** (a numeric ID like
`6470000000`) from App Information → General Information. You will
plug it into the eas.json `submit.preview.ascAppId` field for
non-interactive submits, or just answer the prompt at submit time.

## Step C: Connect your machine to EAS (5 min, terminal)

```bash
cd /Users/Andrey/App/all/regatta/mobile

# Login to your Expo account (use the same one as AI wardrobe if it
# still exists; otherwise sign up at expo.dev). This is the account
# that owns the EAS project on Expo's side, NOT your Apple ID.
npx eas-cli login

# First-time project init: links this directory to an EAS project.
# Pick "create a new project" when prompted; the name does not have
# to match anything Apple-side.
npx eas-cli init

# Tell EAS your Apple Developer credentials so it can request a
# distribution certificate + provisioning profile. EAS will store the
# certificate centrally on your Expo account; you do not need a Mac
# Keychain dance.
npx eas-cli credentials
# Pick: iOS -> preview profile -> "Set up a build credential".
# It will prompt for your Apple ID + 2FA + an app-specific password
# OR a session-based login. Pick the session option to skip
# app-specific passwords.
```

## Step D: Build for TestFlight (~10-20 min wait, terminal)

```bash
cd /Users/Andrey/App/all/regatta/mobile
npx eas-cli build --profile preview --platform ios
```

Flow:

1. EAS detects unsynced bundle ID and runs prebuild on the server.
2. Uploads sources to EAS Build (the binary is built on Expo's macOS
   workers, not your machine).
3. Runs `pod install`, signs the build with the distribution
   certificate from Step C, archives the `.ipa`.
4. Prints a URL like `https://expo.dev/accounts/<you>/projects/regatta/builds/<id>`.

Watch the URL for status. Successful build ends in `finished` and
hands you a downloadable `.ipa` link.

## Step E: Submit to TestFlight (~5 min, terminal)

```bash
npx eas-cli submit --platform ios --latest
```

Flow:

1. Takes the build from Step D (`--latest` picks the most recent
   successful build).
2. Uploads it to App Store Connect via Apple's upload path.
3. ASC begins "Processing" the build (5-15 min, you can poll).

If `submit.preview.ascAppId` is unset in `eas.json`, EAS prompts for
the Apple ID and ASC app ID. Use the values from Step B.

Watch processing in ASC:
- My Apps -> Week to Regatta -> TestFlight tab.
- Build appears in "Processing" first. Wait until it flips to
  "Ready to Test" or shows a "Missing Compliance" / "Missing Export
  Compliance" prompt.

### Export Compliance (one-time, ~30 sec)

Apple asks every new build whether it uses encryption. For
TestFlight you can answer once and reuse. In ASC, click the build,
select **Does Your App Use Encryption?** -> "No" (we do not use
custom encryption; only HTTPS to the existing API, which Apple
accepts as exempt). Save.

### Internal Testing (~2 min)

1. TestFlight tab -> Internal Testing -> blue plus next to "Add Group".
2. Group name: "Self". Create.
3. Add yourself as a tester (your Apple ID email).
4. Select the build from Step D in the build picker -> Save.

Internal testers receive an email + push notification within seconds.
**No beta review** is required for internal testers (max 100). You
can install immediately.

## Step F: Install on your iPhone (~3 min)

1. Install **TestFlight** from the App Store on your iPhone.
2. Open the invite email or push notification on the same Apple ID
   you added in Step E.
3. Tap "Accept" -> "Install" in TestFlight.
4. Launch Week to Regatta.

Run the **smoke checklist** from [`mobile/TESTING.md`](./TESTING.md):
1. Splash shows dark-ocean -> brand wordmark on Home.
2. Switch language in Settings; Home re-renders in the new locale.
3. Bootcamp -> open lesson 1 -> Open CTA -> Simulator placeholder.
4. Back to Home -> Glossary -> search "wind" or "ветер".
5. Simulator -> drag on canvas -> boat turns + trail draws + haptic.
6. Reset on Simulator -> boat returns to center, trail clears.
7. Airplane mode -> reopen app -> all content screens still work.

Report what does and does not feel right. From here we iterate.

## Iterating after the first build

```bash
# 1. Make a change to code.
# 2. Rebuild + resubmit:
cd /Users/Andrey/App/all/regatta/mobile
npx eas-cli build --profile preview --platform ios
npx eas-cli submit --platform ios --latest
# 3. Wait for build + processing (~15-25 min total).
# 4. New version appears in TestFlight on your iPhone automatically.
```

`autoIncrement: true` on the preview profile means the build number
ticks up every upload, so Apple never rejects "duplicate build".

For CSS-level / JS-only changes (no native module additions), **EAS
Update** ships the JS bundle over-the-air without a new build. Skip
for now; we will wire it up in Phase 5 polish.

## What's NOT in this runbook (intentionally)

- **App Store Submission.** Full review needs metadata in 7 langs,
  screenshots per device class, privacy policy URL, age rating,
  DSA compliance to clear, and the missing-features cleanup of
  Multiplayer / Leaderboard / Game from Home. That is a separate
  runbook for when you decide to go public.
- **External Testing.** You can invite up to 10,000 external testers,
  but they need a (light) beta review pass first. Internal testing
  is enough to test the app yourself on your iPhone.
- **Production EAS profile.** That uses `auto-submit` to the App
  Store. Will land in the public-release runbook.

## Troubleshooting

**`eas build` fails with "code signing" errors.**
Re-run `npx eas-cli credentials` and pick "Reset" for the iOS
distribution certificate.

**ASC says "Missing Compliance" after Processing.**
Click the build -> Export Compliance -> "Does Your App Use
Encryption?" -> "No". (We use HTTPS only; Apple treats that as exempt.)

**Build is stuck at "In queue" for > 15 min.**
Free Expo tier has a queue. Check
https://status.expo.dev/. If the queue is hot, the build will run when
a worker frees up. Paid Expo plan ($19/mo) gives priority.

**TestFlight invite email never arrives.**
Check spam, then verify the email matches an Apple ID that you control.
You can also use a TestFlight redeem code from ASC -> TestFlight ->
your Internal Testing group -> Public Link (toggle on).
