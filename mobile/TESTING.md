# Testing the Week to Regatta mobile app

Three paths, quickest to most production-faithful. Pick by what you want
to verify.

---

## Path 1: Expo Go (fastest, content only)

For checking content screens, navigation, i18n, design polish, and the
13 routes that do not depend on native modules. Free, no setup, runs
anywhere Expo Go is installed.

```bash
cd mobile
npx expo start
```

Press `i` to open in iOS Simulator (Xcode required) or scan the QR code
with the **Expo Go** app on your iPhone.

**What works in Expo Go:**

- Home (Week to Regatta brand stack), Settings (7-language picker)
- Bootcamp (8 lessons + detail + progress checkmark + completion counter)
- Quick refresh (6 quick tips)
- Rules (8 scenarios + reveal-style detail)
- Glossary (51 terms, search across 7 languages)
- Onboard (8 sections, items + warnings)
- Anatomy (17 yacht parts)
- Courses (5 points of sail with color accent + meta)
- Racing (rules sorted by priority + strategies)
- Gallery (39 items, online thumbnails)

**What does NOT work in Expo Go:**

- `/simulator` route - it imports `@shopify/react-native-skia`, which
  is not bundled in stock Expo Go. You will see a red bridge error
  if you tap into Simulator.

If you do not need the simulator, Path 1 is the loop you want for the
fastest iteration.

---

## Path 2: Local dev build (full app, iOS Simulator or physical device)

Builds a custom dev client locally, including Skia and any other native
modules. **Requires** Xcode + Command Line Tools and CocoaPods.

```bash
cd mobile
npx expo run:ios
```

Under the hood this runs `expo prebuild` (generates the native `ios/`
directory), installs CocoaPods, builds via Xcode, installs on the
default simulator, and launches.

**For a physical device:**

```bash
npx expo run:ios --device
```

Pick your connected iPhone from the list. First run: open
`ios/Regatta.xcworkspace` in Xcode, go to Signing & Capabilities,
sign with your free personal Apple ID. App is valid for 7 days
without a paid developer account; tap into it once a week to refresh,
or move to Path 3.

**For Xcode-direct (open-and-run):**

```bash
npx expo prebuild --platform ios
open ios/Regatta.xcworkspace
```

Run with Cmd+R from Xcode. Useful if you want to attach the Xcode
debugger or profile with Instruments.

**Cleaning up after Path 2:**

`expo prebuild` writes `ios/` and `android/` directories. They are
gitignored (per Expo defaults) so they do not pollute commits, but
they take a few hundred MB on disk. Safe to delete and regenerate
any time:

```bash
rm -rf ios android
```

---

## Path 3: TestFlight (closest to App Store reality)

Builds in EAS Cloud, signs with the Apple Developer certificate,
uploads to TestFlight. Internal testers install via the TestFlight
app on their iPhones. **Requires** an Apple Developer Program seat
($99 / year) and an Expo account.

### One-time setup

1. **Register bundle ID** in Apple Developer:
   - https://developer.apple.com/account/resources/identifiers
   - "+" > App IDs > Continue > App > Bundle ID
     `com.icoffio.regatta` (or whatever you change `app.json`
     `ios.bundleIdentifier` to). Description: "Week to Regatta".
2. **Register app** in App Store Connect:
   - https://appstoreconnect.apple.com/apps
   - "+" > New App. Pick the bundle ID from step 1.
   - Name: "Week to Regatta". Primary language: English (or Russian).
3. **Log in to EAS:**
   ```bash
   cd mobile
   npx eas-cli login
   ```
   Use the same Expo account you used for previous projects (the AI
   Wardrobe one).

### Each release

```bash
cd mobile
npx eas-cli build --profile preview --platform ios
```

Interactive on first run: asks for Apple ID, 2FA, app-specific password
(or accepts session via Sign in with Apple), generates a provisioning
profile, then builds in the cloud (~10-20 minutes). Result is an `.ipa`
attached to the EAS build page.

```bash
npx eas-cli submit --platform ios --latest
```

Sends the latest build to TestFlight. Apple processes (~15-30 min,
sometimes longer the first time). Internal testers get a push from
the TestFlight app when the build is available.

For production App Store submission later, swap `--profile preview`
for `--profile production`. The production profile has
`autoIncrement: true` so each build gets a fresh build number.

---

## Recommended day-to-day

| Goal | Path | Loop time |
|---|---|---|
| Reviewing content / i18n / design | 1. Expo Go | instant reload |
| Coding features that touch Skia / native | 2. `expo run:ios` | 30-60 sec rebuild |
| Stakeholder demo / on-device feel | 3. TestFlight | 30-60 min release cycle |

For premium UX validation, do one TestFlight per major feature batch.
Real-device feel and App Review surface issues that simulators miss
(haptics weight, system fonts, real network latency, App Store icon /
splash polish).

---

## Smoke checklist after any rebuild

1. **Boot:** dark-ocean background, "Week to" / "Regatta" wordmark.
2. **Settings:** swap to PL > go back to Home > brand text + tagline
   localized. Swap to EN. Swap to RU.
3. **Bootcamp:** open lesson 1, hit "Open" CTA, you land on the
   matching practice route. Back to Bootcamp index, lesson 1 has the
   green "OK" badge and the counter shows "Completed 1 of 8".
4. **Glossary:** type a few letters in Russian, list filters in
   real-time. Counter updates.
5. **Rules:** open any scenario, "Show answer" reveals three more
   sections.
6. **Simulator (Path 2 / 3 only):** Skia canvas renders three colored
   circles plus a tiny boat path. Confirms Skia toolchain works.
7. **Gallery:** thumbnails from `weektoregatta.com` load (needs
   network). Tap a YouTube tile to confirm it opens YouTube.
