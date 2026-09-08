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

Design rules: [DESIGN.md](../../DESIGN.md). Native visual evidence: [home](mobile/audits/navigation-build41/home-en.png). Release evidence will be recorded below after deployment and Apple processing.
