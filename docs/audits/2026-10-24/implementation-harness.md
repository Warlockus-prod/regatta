# Regatta 1.7.0 completion harness

Owner authorization: 2026-10-24. App first, complete the audited scope in reversible stages. Selected visual direction: concepts/01-ocean-cockpit.png. This document is the implementation and release checklist; audit.md remains the evidence baseline.

## Baseline and protected work

- origin/main afe567c4597f40cf2888ffd266f1c40db86125c8.
- App branch codex/app-1.7.0-completion, site branch codex/site-1.7.0-sync.
- Root checkout /Users/Andrey/App/all/regatta is historical and dirty. Preserve all source and worktrees until replacements pass verification.
- Public App Store 1.6.4, TestFlight 1.7.0 build 58 at audit time. Next build 59; verify live status before upload/submission.
- Existing web deployment PR79, PR80 blocked by total JS budget. Resolve measured payload rather than silently raise its limit.

## Reopened acceptance, 2026-10-25

Owner feedback showed that source checks and delivery60 had been mistaken for product completion in several areas. The snapshot audit is `docs/audits/2026-10-25/plan-recheck.md`; current fixes and acceptance are `docs/audits/2026-10-25/corrections.md`. The historical checkpoints below stay as delivery/source evidence. Gates4-8 are reopened for candidate61 until its exact final sources/packages and UI are checked again. Gate9 has never been complete. TestFlight60 remains genuinely delivered. Final61 from37c7079 is also delivered: independent GET2026-10-25 15:35:51UTC confirms VALID, exactSelf IN_BETA_TESTING and8notes. Full65 acceptance remains qualified in docs/audits/2026-10-25/acceptance61.md.

## Ordered gates

1. [x] Inventory branches, releases, controls, radio, languages and layouts; record current evidence.
2. [x] Create separate app/site release worktrees from the same main; preserve original work.
3. [x] Shared race model: manual Pro trim, sail deployment, responsive steering assistance, route guidance, educational rules and declared custom penalties. Unit and deterministic integration tests.
4. [ ] One locally bundled 3D solo race, trainer controls, durable native history/replay/local coach, no network dependency. Retain readability of old race records.
5. [ ] Cockpit: protected scene area, shared wheels or sliders, reserved side/bottom utilities, stable focus, guidance and settings, selected ocean direction.
6. [ ] Radio: localized theory, tests, lessons and situations in seven languages; guided learning and free exploration; pinned device; sternik remains Polish. No hidden language fallback claimed complete.
7. [ ] Regenerate offline assets from final shared sources; check provenance, byte budgets, offline routing and persistence.
8. [ ] Web and mobile typecheck, relevant unit suites, lint, content/dash/map/generated checks, production build and bundle budget.
9. [ ] Visual and interaction review: small phone, landscape, desktop, all seven languages, manual sheets, sails, rules, finish, history, replay and radio learning. Verify local navigation with networking disabled.
10. [ ] Synchronize website branch with tested shared implementation, run its gates, deploy through hardened CI and check production.
11. [ ] Native public release remains open. Internal TestFlight subgate is complete:1.7.0(60) VALID and IN_BETA_TESTING in Self,8notes locales verified. Public privacy/store screenshots/App Review still require their own gates.
12. [ ] Reconcile documentation and branch state. Remove only superseded clean artifacts with preserved rollback commits; preserve historic user progress and dirty work.

## Working evidence

Each stage records its commit, commands, results and unresolved limits here. A passing local build is not a publication. A generated illustration is visual direction, not a measured runtime screenshot. Racing rules are an educational subset; time penalties are explicitly game training substitutions, not official RRS penalties.

- Baseline: audit.md and related domain reports, screenshots and verified font metadata copied into this branch.
- Model: 79 focused physics, autopilot, rules and guidance tests passed; TypeScript passed before UI integration. Responsive steering is opt-in for the local player, core VPP constants and server defaults preserved.

- Presentation checkpoint: 100 focused tests in 12 suites, TypeScript and targeted ESLint passed. Trainer auxiliary panels now use reserved controls space; race guidance is a water ribbon, without the retired floating arrow/no-go overlay. Runtime visual review remains open.

- Native/cockpit source checkpoint: 24 focused native tests in six suites passed, web boundary/daily/catalog/control tests passed, TypeScript and targeted lint passed before the next environment integration. No generated offline artifact has been declared final.
- Native startup always selects bundled solo content; finished snapshots are validated and acknowledged only after storage succeeds. Retry keeps failed-save data in memory. Old pixel recordings remain readable; new recordings use real world course geometry and the shared 3D replay.
- Live ASC preflight confirms build 58 VALID and IN_BETA_TESTING in Self, public 1.6.4 READY_FOR_SALE and 1.7.0 PREPARE_FOR_SUBMISSION. Use next build 59 or higher and attach explicitly to Self. Fastlane read-only gate and public privacy prechecks passed.

- Shared environment source checkpoint: both trainer and race use one SailingEnvironment and renderer factory. Trainer close-up cameras/OrbitControls/airflow remain. Optional old desktop Bloom/Vignette is replaced with common light, local reflections and AgX tone mapping. 40 relevant tests and TypeScript/lint passed; real WebView smoke remains required.
- Pro starts with a suitable initial trim rather than motionless, fully eased sails. Switching Simple to Pro captures the current automatic trim; subsequent sheet changes are manual. Shared per-sail diagnosis can be switched off independently of route advice.

- Native local speech/history checkpoint: all 358 Jest tests in 55 suites, native TypeScript and lint passed. SRC bridge lifetime, permission hydration, cancellation, local-only recognition and typed fallback are covered in unit tests; a new binary and actual device/model behavior are still open. Mounted history refreshes only after durable writes and the best time includes enabled training penalties.

- Online/solo integrity checkpoint: 38 focused tests across six suites passed, TypeScript and production Next build passed. Static JS total is 6.30 MB under the unchanged 6.5 MB budget, largest chunk 0.93 MB. Standard WebSocket lifecycle and an additional real two-human/bot adapter socket probe passed. UI review at 320x568 and 844x390 confirmed protected scene geometry and wheel labels; screenshots are in verification/.
- Independent review removed live mode switching that could recategorize an auto-trim finish as Pro. Mission time objectives now include accumulated optional penalties. Linked mission conditions and bare daily links use shared deterministic settings. Fixed clock drops discontinuities over 250ms; sustained below 4 FPS cannot provide real-time play and needs performance diagnosis, not physics tuning.

- Shared replay checkpoint: 28 replay/API tests passed, plus real POST/SQLite/GET roundtrip. CUA reached exact 89.0333333333333 finish, showed the stored lowered/furled sails in 3D and the 94.0-second result including a 5-second training penalty. Legacy world recordings remain readable without a DB migration.
- Control review additionally fixed absolute course sliders in solo/online, keyboard sheets outside the wheel tab, desktop duplicate sliders and persisted-hint hydration after wheels became the default. Live language changes label the player in the active language.
- Native 59 preparation: live ASC still reports 58 as latest VALID. Prebuild59 and CocoaPods succeeded. Generated UIScene, seven localized purpose strings, six privacy types and both speech module/patched sources passed read-only verification. Simulator compilation is in progress; this is not an upload or completed G2.

- Rollback checkpoints: native local speech/history d40aa78; shared controls, clock, online presentation and 3D replay 1ec7199. Latest full source production build passes at 6.35 MB total static JS, within the unchanged 6.5 MB budget. Privacy copy checks passed27 tests in four native suites and generated native59 values match source.

- Radio source checkpoint: seven catalogs contain 3727 resources each with zero missing/extra entries. Independent placeholder and English option integrity review passed. 247 radio tests and production build pass; static JS is 6.38 MB within 6.5 MB. CUA confirmed all seven home/theory/test locales, a German free-practice scenario and local typed Position 100% plus LiveDialogue progression. Native runtime and final rebuilt binary remain open.

- Local course checkpoint: Polish Sternik package 2.45 MiB, five original routes, local typed oral content checking and no microphone/network dependency. Ten builder/model/bridge tests pass; CUA exercised practice feedback, typed oral 75% with the missing item explained and exam startup. Native same-origin migration still needs the real upgrade gate. Source reviews fixed post-ready render recovery and authoritative SRC storage/clear semantics.
- Release Simulator 59 compiled and launched on a new iOS27 QA device. Its real 3D scene worked; runtime exposed a generic nav-hiding selector and missing fullscreen safe areas, corrected in source with regression coverage. Final rebuilt binary verification remains open.

- Final source package checkpoint: sailing 8aa38486d53e (6424283 bytes), radio ddb19eb33592 (6190132 bytes), Sternik c05376f4c523 (2.45 MiB). All exact source checks passed. Basics and Anatomy use original shared pages with local yacht/posters/fonts. A real finish now resolves the former 15-second fleet window immediately and retains immutable native saves by race ID; 52 focused web and 20 native tests passed. Shared World course rendering has two asynchronous geometry regressions plus eight pose tests passing.

- Final local source gate d4ca86f: 963 web tests in 99 files and complete mobile check with 395 Jest tests in 65 suites pass. Web/native TypeScript, web lint (0 errors, 17 existing warnings), native lint, all content/package twins, generated physics, project map and typography pass. Seven deployment boundary tests and real WebSocket lifecycle pass. Production build is 6.38 MB total static JS under the unchanged 6.5 MB cap. The native i18n scanner has 14 reviewed findings: Polish-only Sternik copy, proper names and a regex false positive; see verification/native-i18n-triage.md.
- Release metadata checkpoint: 1.7.0 notes in eight store locales and review instructions describe the completed installed packages and device speech/typed limits. 35 metadata checks pass. Signing identity/profile and public privacy labels pass read-only preflight. Public privacy page must update through the website release before App Review; no upload or submission has occurred.

- G2 actual upgrade: Release59 8b8efb0 launched on iOS26.5 over verified public48 with no uninstall; all five native storage values are byte-identical, Home displays 1/8 complete. Opening installed Sternik exposed SDK54 File.text requesting write access on a read-only bundle. Local read-capable fallback plus failure-stage diagnostics are covered by 13 targeted tests/3 suites and TS/lint; rebuilt installed course/migration verification remains required. On iOS27 the actual 3D race now has visible utility tabs, safe Menu/Pause buttons and working reserved Sails panel.

- Actual installed Sternik after SDK reader fix opens locally on iOS26.5; its imported legacy course-progress string is byte-identical to the old WebKit fixture. Native exam runtime exposed unsupported native-stack beforeRemove prevention; usePreventRemove plus seven targeted host tests now covers Stay/Exit/re-arming, awaiting rebuilt UIKit inspection. Shared trim copy now describes deployed sails accurately in seven languages; sailing package e77321424fe9 (6424390 bytes).
- Remote CI on 976178b passes complete mobile checks but found a case-sensitive documentation path hidden by macOS: root audit.md resolved AUDIT.md locally. The completion-map link now uses its full repository-relative audit path. Nine release-tool tests protect selected App Store screenshot replacements and are part of mobile check. No upload/deletion/review action has been executed.

- Exact f6bcc29 CI: all six checks pass, 964 web tests in 99 files and 399 native tests in 65 suites, plus nine release-tool tests. The final source production build passes. UIKit inspection confirms Stay retains the exam, but repeated native Back becomes inert; the final explicit exam exit button asks before navigation and disables swipe-back. Eight host tests, TypeScript and scoped lint pass; final rebuilt interaction remains pending.

- Final native G2 d30020a: installed over public48 on iOS26.5, local Sternik opens, Stay retains its exam, repeated exit prompts and confirmed exit restores Home/navigation. Final iOS27 phone launch and iPad27 Home/English/Pro cockpit/side utilities/pause pass. A complete manually steered native finish and physical speech model behavior are still open runtime limits.
- Build59 archive28/28 and exportedIPA26/26 independent checks pass, including exact source assets and distribution signing. Apple validate and upload both succeeded without errors, delivery e58fe614-d6a1-47be-a4ad-5c612c18871b. Subsequent Apple import failed90683 for a missing Photos purpose; build59 is unavailable and must not be attached. No App Store submission or website deployment has occurred.

- Final iPad review found that the fullscreen solo menu had no visible route back to the app. Candidate60 adds a native-only, seven-language 44px return link through the existing validated navigation bridge. Build59 was uploaded but is not distributed in Self. New sailing package31a44552e444 is 6424843 bytes; 972 web tests in 100 files, complete native400/65 and the production bundle budget pass. Final60 binary and delivery remain pending.

- Apple processing correction: build59 import failed90683 although validate/upload succeeded. ExpoFileSystem links unused Photos handlers; candidate60 adds honest base/seven-language descriptions without requesting photo access. Extend independent generated/archive/IPA checks before rebuilding. Root-only CI navigation tests now use the complete root tsconfig string; isolated failure reproduction and all972 web tests pass.

- Final TestFlight60 delivery: source8e39721, all six CI checks green (web972/100, native402/65); generated15/15, archive30/30 and exportedIPA28/28 pass. Clean iOS27 phone, upgraded26.5 with seven exact preserved values, installed Sternik and iPad menu-return/navigation pass. Apple validation/upload/import succeeded; delivery/build9c235e79-aa4e-4be7-8b0e-6d8352a4d0af is VALID and IN_BETA_TESTING in exact Self at18:50UTC. Eight beta-build notes locales verified before attachment. Details: `docs/design/mobile/testflight60-2026-10-24.md`. Physical tester installation, physical speech/model behavior and full manually steered native finish are not asserted. Website/App Review and remaining broad cleanup are open.

- Reopened61 second source checkpoint: shared feasible advisory stadium with independent tack/recovery memory, free trim3D default, reserved compact camera presets and SRC chapter/hash Back.1055web/118files and435native/68suites,9release tools, types/lint/generated/content/map/dash pass; productionJS6.48/6.5MB. Browser320/390/844landscape checked. Manual nativeSimple finish1:18.3 with durable-save confirmation, History/replay/coach/restart navigation now observed; physicaldevice/Pro/fullmatrix/delivery remain separate. See current corrections for exact package and screenshot provenance.

- Final61 delivery source37c7079: generated18/18,archive33/33,IPA35/35; AppleVALID and exactSelf IN_BETA_TESTING with8notes verified15:35:51UTC. Main89dffdc website pre-deploy gate blocked changes:2stale assertions and low foregroundFPS clock. Owner selected physical scale like trainer plus short/long courses for62. Gates9-12 stay open for their remaining scope; delivery is not fullproduct acceptance.


## Urgent62 checkpoint,2026-10-25

Owner TestFlight feedback reopened SRC startup: the retired language key from48/49 makes60/61 native readers reject otherwise legitimate snapshots. Exact actual48->61 failure/retry ->62 working instrument, saved guide/relaunch and a separate8-value upgrade are now accepted in the bounded Release matrix.62 frome3d70a1/tag testflight-1.7.0-62 is VALID/IN_BETA_TESTING in exact Self, independently GET-verified17:09:17UTC with8notes. Current full65 statuses: `docs/audits/2026-10-25/acceptance62.md`; ordered hotfix proof: `docs/audits/2026-10-25/release62-harness.md`. This closes that startup defect and clock/lifecycle checkpoint, not all original phases. Physical courses/map/wind/geographic routes, remaining layout/content/device matrix and public App Review remain open. Site CI/runtime sync and full publication gates are separate; do not delete old source/progress during cleanup.
