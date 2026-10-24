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
