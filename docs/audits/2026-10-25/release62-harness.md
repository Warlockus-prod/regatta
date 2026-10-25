# Release62: ordered implementation and acceptance

Owner decision2026-10-25: physical scale/turn like the shared trainer, with short and long courses. Three initial distances:120/300/600m windward legs. Build61 is already delivered in Self and tagged testflight-1.7.0-61 at37c7079. Its packages, records and proof are immutable. This checklist extends the current65-item acceptance; it does not close the remaining content/device/public-release matrix.

1. [ ] Separate rollback checkpoint: foreground clock at2/3FPS, lifecycle resynchronization and accessible names for actual race sliders. Preserve real3D scene-ready/clock assertions. Synchronize this small fix plus corrected stale E2E expectations into SITE PR82 and complete its hardened pre-deploy/production gates.
2. [ ] ADR-0011 shared kinematics and metric profile/context registry, with trainer parity and unchanged legacy/WS no-argument behavior. Do not enable new solo defaults yet.
3. [ ] Metadata compatibility before emission: native history/ack/replay/coach, shared replay/API, PB/resume/query, unsupported future records, old fixtures and storage bytes. Server classes partition physical results before any new publication.
4. [ ] Opt-in physical adapter, metric progression/collision/rules and bot/advisory paths for all three profiles. Real time and boat dimensions do not change with course length. Verify full profiles/wind/recovery/input-cadence matrix.
5. [ ] Durable finish, bounded long recordings and responsive remaining-fleet results. Per-profile timeout/par/daily/mission revisions replace unqualified300s/90s assumptions. Preserve legacy progress/results, freeze context before countdown and retain exact final samples.
6. [ ] Seven-language selector/preview/briefing/controls/results/history, native entry, profile-preserving Again and lesson returns. Shared free/daily/mission contexts agree across offline/web/server; multiplayer stays authoritative legacy.
7. [ ] Final source freeze, all packages/provenance/content/size/map/dash/types/lint/tests/build/CI. Actual installed short and long journeys, manual Pro, settings and background/foreground, history/replay/coach/Again, upgrade and device/layout checks. Bump native build62, generate/archive/export/IPA independent exact-source checks, Apple validation/processing/8notes/exactSelf delivery, then record proof. Physical limitations stay explicit; no premature full-product claim.

Root owns maps/CHANGELOG/ADR, packages, commits, native version/archive and ASC. Source lanes agree signatures before parallel edits. Every completed phase has a rollback commit and a current evidence line below. Separate app/site branches share source but may publish at different times. Preserve the historical dirty root and real progress.

## Evidence

- Baseline37/native61: `docs/design/mobile/testflight61-2026-10-25.md`; current65 statuses: `docs/audits/2026-10-25/acceptance61.md`.
- Stage0 source is being checked; no62 archive or delivery has been created. SITE publication remains stopped before images by the failed pre-deploy gate. PR82 only corrects two stale test expectations until the source fix is added.

- Stage0 source freeze:1075web tests/121files PASS,34focused clock/lifecycle/session/race/startup checks, webTS/scopedlint pass. All3 clockhosts explicitly synchronize lifecycle; HUD reads finalbatch. Independent review found no lifecycle blocker. Asset/build/mobile/actual3D/SITE acceptance are still being completed; SI profiles are not enabled.

- Stage0 local acceptance: sailing7d263e22c6b2/195sources fresh; complete mobile435/68+9release tools, productionbuild and unchangedJS6.48/6.5MB pass. Real CUA Pro3D scene became ready and clock reached29.6s; pause retained that value while changing settings/sheets, resume showed29.8 then45.2s. Named Course/main/jib sliders are found in actual rendered UI; keyboardQ changes main35%->30%. Screenshot `docs/audits/2026-10-25/checks/27-stage0-clock-named-controls.png`. This is normal-renderer UI proof;2/3FPS equality is covered by deterministic fixed-clock/session/race tests, not a physical performance claim. SITE exact-head pre-deploy remains required.
