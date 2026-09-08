# Product navigation and home redesign, 2026-09-08

## Problem and changes

The previous home mixed marketing, learning, simulators, weather and tools. Native repeated several entries in a long scroll and had no persistent navigation. Web's large More menu hid whole exam courses, and exact-path highlighting lost context on nested pages.

The new shell uses Home, Learn, Practice, Race and Library across both platforms. Home starts or resumes a real unfinished lesson instead of guessing its index from the completed count. The web welcome modal no longer interrupts first arrival. Practice explains the three simulator types in order; native explicitly labels the internet requirement and preserves the simplified offline trainer. Race groups solo, multiplayer, results and native race history/daily entry. Learn separates sailing from Polish exam preparation. Library offers a searchable catalog, including all former home/menu destinations.

Visual updates retain ocean colors and the existing typefaces. One primary filled action, restrained surfaces, flat divided catalogs, larger touch targets and visible selected/focus states replace competing colorful cards. Desktop Learn shows sailing and exam groups side by side. A second row keeps all five web sections visible on phones. Native has a safe-area-aware bottom bar, hidden during immersive activities. Web activity heights and sticky exam panels use the measured navigation height.

## Verification

- Shared catalog checks real web/native entry files, nested route selection, Polish accents, Cyrillic search, empty results and platform-only routes.
- Native home tests cover first lesson, nonsequential saved progress and persisted Polish language. Navigation checks cover activity hiding and deep-link selection.
- Browser inspection: desktop home/learning, 390px home/search, 320px French and all seven language navigation variants without horizontal overflow. Search "радио" reaches the SRC course; unmatched queries have a clear recovery action.
- Build 41 Release installed on the dedicated iPhone 17 Pro Simulator. Home and bottom navigation inspected. Practice -> 3D -> back restores the selected Practice section; the 3D loader completes without the main tab bar. Native catalog search "radio" filters to the SRC course.
- Preserved existing native language/progress storage, lesson routes, game routes and fallback screens. Offline radio bundle regenerated because shared CSS changed.

## Scope and follow-up

This is a completed global shell/home/hub redesign, not a claim that every deep learning, exam or simulator control screen has been redesigned. Existing learning and racing functionality remains. Further work should focus on one end-to-end flow at a time: first lesson completion, first trim exercise, first multiplayer race. Measure whether users reach and complete each activity before adding more homepage content. No new analytics collection was introduced.

Design rules: [DESIGN.md](../../DESIGN.md). Native visual evidence: [home](mobile/audits/navigation-build41/home-en.png). Release evidence is recorded below.

## Delivery evidence

- Website code: `c6ad1d9`. [Deployment and post-deploy E2E](https://github.com/Warlockus-prod/regatta/actions/runs/34222778734) completed successfully. The production home was opened and inspected after deployment.
- A full lesson-entry check exposed stale course-footer state. It now refreshes on navigation and when advancing to another lesson on the same page. The assistant trigger follows the course footer height. The new E2E checks direct home -> lesson -> visible course controls, and library search -> radio -> selected Learn section.
- Final native source: `9455e10`, version 1.6.1 (42). This includes the localized Home title used by the back button. Build 41 was an intermediate verification build; 42 is the release candidate.
- Native gate: offline bundle consistency, content sync, lint, TypeScript, 24 suites / 114 tests passed. Xcode Release archive and export succeeded; Apple validation and upload succeeded. Delivery UUID: `294aa96d-05a2-49af-94c7-7255c7087dcf`.
- Exact build 42 installed and launched on iPhone 17 Pro Max Simulator. Settings shows 1.6.1 (42) and the Home back label. [English home](mobile/audits/navigation-build42/home-iphone-en.png) and [Russian home](mobile/audits/navigation-build42/home-iphone-ru.png) were visually inspected. The iPad home was inspected on build 41; build 42 changes only its hidden stack title.
- No physical iPhone installation or Android device verification is claimed.

- Build 42 is VALID and attached to the internal TestFlight Self group, verified through the ASC API. Build UUID: `294aa96d-05a2-49af-94c7-7255c7087dcf`.
- Version 1.6.1 now references build 42. Review submission `1f95c4ce-efc4-4fbb-b3d1-4347f373cb5c` is WAITING_FOR_REVIEW, submitted 2026-09-08 at 12:14 UTC. Release mode: AFTER_APPROVAL. The prior build-40 review was canceled to replace it with this tested build.
- Updated release notes in all seven locales, corrected stale review instructions, and replaced only the home screenshot in each English iPhone/iPad set. Both new images are COMPLETE and first in their existing five-image sets. Other gallery images were preserved. Original home images were backed up before replacement. [Apple screenshot requirements](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) were checked for the captured sizes.
- Fastlane metadata precheck completed successfully after the metadata and screenshot updates. No App Store approval or public availability of build 42 is claimed yet.
