# Regatta 1.7.0 completion harness

Owner authorization: 2026-10-24. App first, complete the audited scope in reversible stages. Selected visual direction: concepts/01-ocean-cockpit.png. This document is the implementation and release checklist; audit.md remains the evidence baseline.

## Baseline and protected work

- origin/main afe567c4597f40cf2888ffd266f1c40db86125c8.
- App branch codex/app-1.7.0-completion, site branch codex/site-1.7.0-sync.
- Root checkout /Users/Andrey/App/all/regatta is historical and dirty. Preserve all source and worktrees until replacements pass verification.
- Public App Store 1.6.4, TestFlight 1.7.0 build 58 at audit time. Next build 59; verify live status before upload/submission.
- Existing web deployment PR79, PR80 blocked by total JS budget. Resolve measured payload rather than silently raise its limit.

## Ordered gates

1. [x] Inventory branches, releases, controls, radio, languages and layouts; record current evidence.
2. [x] Create separate app/site release worktrees from the same main; preserve original work.
3. [ ] Shared race model: manual Pro trim, sail deployment, responsive steering assistance, route guidance, educational rules and declared custom penalties. Unit and deterministic integration tests.
4. [ ] One locally bundled 3D solo race, trainer controls, durable native history/replay/local coach, no network dependency. Retain readability of old race records.
5. [ ] Cockpit: protected scene area, shared wheels or sliders, reserved side/bottom utilities, stable focus, guidance and settings, selected ocean direction.
6. [ ] Radio: localized theory, tests, lessons and situations in seven languages; guided learning and free exploration; pinned device; sternik remains Polish. No hidden language fallback claimed complete.
7. [ ] Regenerate offline assets from final shared sources; check provenance, byte budgets, offline routing and persistence.
8. [ ] Web and mobile typecheck, relevant unit suites, lint, content/dash/map/generated checks, production build and bundle budget.
9. [ ] Visual and interaction review: small phone, landscape, desktop, all seven languages, manual sheets, sails, rules, finish, history, replay and radio learning. Verify local navigation with networking disabled.
10. [ ] Synchronize website branch with tested shared implementation, run its gates, deploy through hardened CI and check production.
11. [ ] Native release gate, build 59 or next unused number, install/smoke, upload, verify processing and TestFlight distribution. Update 1.7.0 release metadata and submit after actual gates pass.
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
