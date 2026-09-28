# Mobile build journal

Every iOS build: number, version (train), source commit, whether it was ATTACHED
to a TestFlight beta group, and what changed. Attaching is the step that was
silently missing (builds 14-19 uploaded but were never distributed, so the phone
stayed on 0.13.0). A build is NOT shipped until attached + visible to a tester.

| Build | Version | Commit | Attached (TestFlight) | What changed |
|---|---|---|---|---|
| 46 | 1.7.0 | `c3772a4` (branch `design/v3`, merge `c374db2`) | Self (attached 2026-09-29) | Build 45 plus the work that lay uncommitted in the main checkout since 2026-09-21 (ADR-0016): sail lesson 13 "Winch and clutch" with the offline line bench, lesson steps understand / check / on the boat, the outline grouped by module with lesson terms, the Trainer's session sections and trim assessment (offline Trainer bundle rebuilt). The v3 shell, bookmark and pilots kept. 218 mobile and 456 web tests. Release Simulator app of the same commit on iPhone 17 Pro Max iOS 27.0: outline, lesson 13 with the bench, pilot in step 1, Trainer. Update 1.6.2 -> 45 -> 46 on iOS 26.5 kept every stored progress key; Home shows "Theory checked: 1 of 13". Validation and upload passed, VALID, IN_BETA_TESTING. Not submitted to App Review. |
| 45 | 1.7.0 | `8a0b673` (branch `design/v3`, not merged) | Self (attached 2026-09-28) | First build of the v3 app: light paper design with dark instrument screens, the Menu tab, Home continuing the last course, lessons passed only on evidence (ADR-0014), the round 3 fixes (tack captions on the points-of-sail wheel, fixed status bar strip on the tab hubs) and the lesson template with Codex graphics on two lessons, `wind-direction` and `rig-basics` (ADR-0015). Archived with Xcode 27.0 (SDK 24A430) with the UIScene plugin. Release Simulator app of the same commit checked on iPhone 17 Pro Max iOS 27.0 (RU, EN), iPhone SE iOS 26.5 (RU, EN, DE at accessibility size L) and iPad (A16) iOS 18.5 (PL, clean install). Update over 1.6.2 (build 43) on iOS 26.5: every stored progress key kept, Home continues the last lesson, a passed quiz counts. 215 mobile tests. Apple validation and upload passed, VALID, internal state IN_BETA_TESTING. Not submitted to App Review. |
| 44 | 1.6.3 | `09889d8` (branch `hotfix/1.6.3-ios27` from `b5580aa`; web `8da49ab`) | Self (attached 2026-09-28) | iOS 27 launch fix, content identical to 1.6.2. UIScene life cycle through `mobile/plugins/with-uiscene.js`: scene manifest, SceneDelegate that starts React Native in the scene window and routes `regatta://` links through the AppDelegate, pod targets raised to iOS 15.1 for Xcode 27. Archived with Xcode 27.0 (SDK 24A430). Release Simulator, iPhone 17 Pro Max on iOS 27.0 and 26.5: clean install, launch, navigation, offline Trainer, cold and warm `regatta://` links. Apple validation/upload, VALID processing and metadata precheck passed; review notes explain the fix. Submitted 2026-09-28, WAITING_FOR_REVIEW with automatic release after approval. |
| 43 | 1.6.2 | `b5580aa` (web `972df53`) | Self (verified 2026-09-17) | Six shared lessons with interactive diagrams, Menu access, shared session and rig controls, bundled offline Trainer and 3D Boat, one manual checkpoint. 132 mobile tests, iPhone/iPad Release Simulator visual checks, archive/export and Apple validation passed. VALID and WAITING_FOR_REVIEW, automatic release after approval. Website deployed to VPS2; all 16 production browser tests passed. See [release report](../sailing-release43-2026-09-17.md). |
| 42 | 1.6.1 | `9455e10` (web `c6ad1d9`) | Self (verified 2026-09-08) | Five shared product sections, shorter home with a start/resume action, searchable catalog, grouped sailing/exam courses and persistent native navigation that hides during activities. Localized Home back label. 114 mobile tests and full website deployment checks passed; iPhone/iPad Simulator visual checks recorded. Apple validation/upload and metadata precheck passed. Updated home screenshots and review notes. Replaces build 40 in App Review, WAITING_FOR_REVIEW with automatic release after approval. Build 41 was an intermediate verification build. See [navigation audit](../navigation-redesign-2026-09-08.md). |
| 40 | 1.6.1 | `585acef` (web follow-up `43a7ca7`) | Self (verified 2026-09-08) | Real Blender yacht source and export, shared anatomy model and 17 anchors, seven-language teaching corrections, full-height jib furling pressure fix. Basics wake and label fixes published on the website. 112 mobile tests passed; exact Release Simulator home/anatomy/three simulator entries checked. Archive, IPA validation, metadata precheck passed. Replaces 39 in App Review, WAITING_FOR_REVIEW with automatic release after approval. See [Blender audit](../blender-sailing-update-2026-09-08.md). |
| 39 | 1.6.1 | `eb8e141` | Self (verified 2026-09-07) | SRC radio corrections: MOB MAYDAY, voice without DSC ACK, stricter distress position grading, balanced mock exam and clearer phone navigation. Refreshed embedded offline course verified inside the archive. 156 radio/voice and 112 mobile tests passed. Release Simulator course entry visually checked; Apple validation and metadata precheck passed. Replaces build 38 in App Review, WAITING_FOR_REVIEW with automatic release after approval. See [radio audit](../radio-course-audit-2026-09-07.md). |
| 34 | 1.6.1 | `639eb17` | Self (verified 2026-09-07) | Shared 3D module redesign; native loader waits for scene readiness and retries on failures. Refreshed offline radio asset. Xcode archive/export, Apple validation/upload and VALID processing passed; 99 Jest tests, TypeScript and mobile lint passed. Simulator Release installed and launched; native visual inspection awaits macOS permissions. App Store version prepared, not submitted for review. |
| 21 | 1.3.0 | `d569d4d` | Self (attached 2026-06-21) | Content-parity ports + polish, closing the 2026-06 audit (all 37 findings fixed across b20+b21). racing Key Concepts + 4 SVG diagrams; courses theory + EN anchors; rules es/fr/de/it + official/federation links; onboard sections (+ web `src/data/onboard.ts` es/fr/de/it backfill so sync-content guard is green); glossary anchors; quick header/minutes/footer; checklist summary; game watch-replay; replay markers/CTA/share-link; simulator Skia a11y + overtrim token; leaderboard tp(); bootcamp/home polish; game ellipsis -> ASCII. Each screen verified by an adversarial parity/typography/7-lang reviewer. Gate green: sync-content + lint + tsc + 108/108 jest. |
| 20 | 1.3.0 | `5ce2561` | Self (attached 2026-06-21) | Audit fixes: courses clean wheel from canonical data; tappable quick lessons; support email -> gtframe.io; 1-liner i18n/typography (ellipsis, IT apostrophe, leaderboard tenths, check icon); 44pt touch targets; working clipboard (expo-clipboard); home -> /checklist link. |
| 19 | 1.3.0 | `9e3da40` | Self (attached 2026-06-21, retroactively) | Radar cockpit (force vectors, sectors, readout). Was never attached on upload - the distribution bug. |
| 18 | 1.2.0 | v1.2 | NOT attached | AI opponents, animated sim + wind rose, global leaderboard, PostHog. Never reached testers (attach gap). |
| <= 13 | <= 0.13.0 | - | Self | Last builds the phone actually saw before the gap. |

## Incident: 1.6.2 does not launch on iOS 27 (found 2026-09-27)

Build 43 (1.6.2, on sale since September) was archived on 2026-09-17 two hours
after the Mac updated Xcode 26.6 to Xcode 27.0, so it is linked against the iOS
27 SDK (`sdkBuild` 24A430 in App Store Connect; build 42 was 23F81a, iOS 26.5).
iOS 27 refuses to launch apps built with that SDK unless they use the UIScene
life cycle, and Expo SDK 54 generates an AppDelegate-only app. The system log
says: "Application failed to launch: UIScene life cycle is required for apps
built with this SDK". The app closes immediately on every iPhone with iOS 27
and works on iOS 26 and older. Reproduced with a Release simulator build of
`b5580aa`: fresh install on iPhone 17 Pro Max iOS 27.0 closes at once, iOS 26.5
opens Home. Fix options: archive with Xcode 26.x (iOS 26 SDK), or adopt UIScene
(Expo SDK 57.0.23+ with `expo-build-properties` `ios.enableSceneSupport`, default
from SDK 58). Xcode 27 must not archive this app until UIScene is adopted.

**Resolved 2026-09-28 in 1.6.3 (build 44).** UIScene is adopted through the
local config plugin `mobile/plugins/with-uiscene.js` (reasoning in `DECISIONS.md`
ADR-0012). The same Release build opens on iOS 27.0 and 26.5, and a cold
`regatta://` link opens its screen, not Home: the first attempt landed on Home
because expo-linking reads the launch URL only from the AppDelegate open-URL
call, so the SceneDelegate now forwards the URL there before React Native
starts. With the plugin in place Xcode 27 archives are safe again. Build 44 is
also in the TestFlight group Self.

## Online 3D update (2026-09-08)

Build 42 now loads web source `cb187ba` for its online 3D scene: automatic
main/jib transfer during tacks and gybes, corrected sail-side and heel signs,
unloading tied to physical drive, visible airflow and a permanent wind readout.
This is a deployed WebView update, not a new native build. The 114 mobile tests
and native checks pass; the updated scene was visually verified in iPhone
17 Pro Max Simulator. See [sail-transfer verification](../sail-transfer-2026-09-08.md)
for evidence and the native gesture-testing limitation.

## Branch consolidation (2026-06-21)
`main` and `app` are unified at one commit (`609b911`). Before this, `main`
carried the correct web (OpenAI -> GPT-5 + security fixes) but a DEAD mobile
scaffold, while `app` carried the real mobile app but stale web. The merge put
both correct halves on `main` and fast-forwarded `app` to match, so there is now
a single source of truth and no version drift. Build 20's binary was archived
from `5ce2561` (on `app` pre-merge); that exact mobile tree is now also on
`main`. Keep both branches in lockstep going forward.

## Release rule
After every `altool --upload-app` and once the build is `VALID`:
```
node scripts/asc-attach-build.mjs <buildNumber>
```
See `COMPLETION_STANDARD.md` section 3. The internal "Self" group has
`hasAccessToAllBuilds=false` and that flag can't be toggled via the API, so each
build must be attached explicitly.
