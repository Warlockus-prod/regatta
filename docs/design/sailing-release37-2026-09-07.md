# Sailing release: 1.6.1 (37)

Status at 2026-09-07 20:05 Europe/Warsaw: website deployed; iOS submitted
and WAITING_FOR_REVIEW. Apple approval remains external. This is a completed
release submission, not a claim that the public App Store already serves 1.6.1.

## Delivery

- Source: `40c4f993302e528b87dad2e33306fcc10c0442ee`.
- Website: https://weektoregatta.com. GitHub Actions run
  [34149397762](https://github.com/Warlockus-prod/regatta/actions/runs/34149397762)
  succeeded, including VPS deployment and all 13 production E2E tests.
- iOS: 1.6.1 (37), build ID `a9bc48bf-be4d-4b73-97c5-5491a227a510`, VALID,
  export compliance `usesNonExemptEncryption=false`. Added to Self TestFlight.
- App Store version ID: `5ccecd54-f10b-4342-b156-995a4dd2dd33`.
- Review submission: `3eb019c5-4e55-4223-abcc-e97269f30fd8`, submitted
  2026-09-07T18:04:38.289Z, WAITING_FOR_REVIEW.
- Release mode: AFTER_APPROVAL. Seven localized release notes updated.
- Competition declaration corrected from NONE to FREQUENT_OR_INTENSE.
  ASC reported TWELVE_PLUS for the editable app information, previously FOUR_PLUS.
  Primary screenshot sets contain five completed iPhone and five iPad images;
  other locales use the primary-language fallback.

## Changes

The three learning surfaces remain Basics, Trainer and 3D Boat. Basics explains
its conditional speeds; the other sailing modes use the shared approximate
force model. Main and jib areas are 45 and 30 square metres. Sectional twist,
reefing and furling agree with the rendered sail geometry. Target speeds and
VMG come from converged trimmed polar solutions rather than short transients.

The yacht asset was refined in Blender, with editable source and reproducible
export in the repository. Runtime sails retain procedural deformation and
anchored attachment points. True-wind streaks and a compass wind readout make
the scene easier to interpret. Trainer rear and side views use explicit teaching
projections; responsive scene sizing, controls and telemetry were adjusted.

Web and native races share force calculations and legal course progression.
Player and AI do not receive different force multipliers. Start crossing,
port rounding and finish crossing replace touch-only progress. Native races
show the next target and leave turning room around the mark.

Mobile content synchronization and Metro shared-source visibility were fixed.
The release localization audit reports zero findings. Home wind digits and
course-diagram labels no longer clip. Slot-interaction and spinnaker explanations
were revised in seven languages.

## Verification and evidence

- 312 web unit tests; TypeScript and production build passed.
- 45 physics tests and the generated race-server freshness guard passed.
- 9 pre-deployment and 13 production browser E2E tests passed in the final CI run.
- Mobile check passed: offline radio bundle, content synchronization, lint,
  TypeScript, 112 tests in 23 suites. Jest also reported a worker teardown warning;
  test assertions passed, but this is not a clean open-handle diagnostic.
- 108 polar cases converge and hold speed; 12 complete native AI trajectories
  cover four courses at three field sizes. Illegal mark touches are rejected.
- Final signed device archive and Release Simulator build succeeded. Fresh IPA
  export passed Apple validation and upload without errors.
- Final iPhone 17 Pro / iOS 26.5 Simulator UI inspected: home, courses, embedded
  Basics, Trainer and 3D. Native race render and motion were inspected before the
  last home/course copy-only rebuild; its screenshot is labelled accordingly.
- Additional iPad Pro 13-inch (M5), iOS 26.5 check: fresh installation,
  onboarding skip, home navigation, Trainer and 3D scene loaded in Polish.
  [iPad 3D evidence](mobile/audits/sails-build37/ipad-boat3d.png),
  [iPad Trainer evidence](mobile/audits/sails-build37/ipad-trainer.png).
- Final visual evidence: [home](mobile/audits/sails-build37/home.png),
  [courses](mobile/audits/sails-build37/courses.png),
  [Trainer](mobile/audits/sails-build37/trainer.png),
  [3D boat](mobile/audits/sails-build37/boat3d.png),
  [native race before final copy fixes](mobile/audits/sails-build37/native-race-pre-final-copy.png).
- Localization evidence: [release 37 audit](mobile/audits/release37-i18n.md).

## Limits and next quality threshold

This release does not certify a naval-engineering or competition-grade model.
The synthetic yacht still needs calibration against measured polars. Steering,
contacts, waves and hydrodynamics include deliberate simplifications. A manual
race finish, physical-device thermal/FPS testing, multiplayer load testing,
VoiceOver review and independent sailing-instructor validation are not claimed.
Some legacy reference descriptions still overgeneralize sail roles and fastest
courses; a full editorial pass remains useful despite the corrected slot paragraph.
Compact Trainer buttons may abbreviate long translations on phone widths.
The portrait iPad Trainer keeps all controls visible, but its tall scene has
excess vertical empty space; tablet composition can be improved further.

The next meaningful threshold is measured handling and performance, then deeper
race rules and human playtesting. More visual detail alone will not establish
physical accuracy. See [the audit](sailing-simulator-audit-2026-09-07.md) for the
remaining issue list and [the architecture](SIMULATORS.md) for the shared model.
