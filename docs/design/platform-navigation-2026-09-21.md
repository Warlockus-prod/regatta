# Menu and platform-specific design

Status: local implementation, 2026-09-21. Not a VPS2 deployment or App Store release.

## Design decision

One brand and learning system, two presentations. Share content, progress contracts, catalog,
translations and simulation mechanics. Do not force the website and native app to share screen
markup or navigation geometry. Preserve dark-ocean tokens and the existing light reading theme.

Impeccable and Redesign informed the flat list hierarchy, restrained decoration, clear labels
and accessible controls. This is an information-architecture correction, not a complete visual
redesign of every existing screen.

| Area | Website | Native app |
| --- | --- | --- |
| Main navigation | Four links and a labelled Menu button in the header | Five bottom tabs including Menu |
| Full catalog | Addressable searchable page, two columns on desktop | Compact searchable one-column list |
| Small screens | Responsive header and one-column catalog | Safe-area-aware bottom controls; tabs hide for keyboard |
| Focused activities | Existing simulator layout | Header Menu entry when tabs are hidden and native header is present |
| Appearance | Theme shortcut in Menu, also in wide-screen headers outside Menu | Existing native design system and settings |
| Long-term lesson layout | Reading beside a large relevant diagram where space permits | One task per view, control near the thumb, explanation on demand |

## Implemented

- Global Library entry replaced with Menu in all seven locales. Reference taxonomy remains
  internal, and reference pages select Menu as their parent destination.
- Legacy `/library` routes continue to work and lead to `/menu` on both platforms.
- All public catalog destinations appear exactly once in the menu for their platform.
  Administrative routes and contextual question/detail routes are not global catalog items.
- Web support and privacy links included. Native support and privacy remain in Settings.
- Search, clear, empty result state, current navigation state and 44px targets covered by tests.
- Duplicate native header Menu button removed where the bottom Menu tab is already visible.
- Narrow website keeps the labelled Menu button; appearance control remains accessible in Menu.
- Web and native menu components are distinct and use the same catalog grouping contract.
- Offline sailing artifact regenerated after the latest UI changes.

## Follow-up implementation: Home and reading layout

- Home now resumes the last learning direction, including sailing, sail handling, radio and motorboat courses.
- Introductory and sail-handling lessons resume using validated IDs and existing progress. Completed
  lessons lead to the next available lesson, or to review when all are recorded.
- Radio and motorboat courses reopen their course home. No conversation, question position or exam
  percentage is invented. A local versioned bookmark is separate from existing progress storage.
- Desktop Home separates the current lesson from three alternative courses. Native Home is compact
  and avoids repeating Practice/Race navigation already present in the bottom bar.
- Native Home refreshes on focus; web refreshes on mount, window focus and storage changes.
- Loading, failed reads, retry, malformed legacy records and completed-course review are handled.
- Desktop sail lessons now put diagrams beside the explanations, with sequential mobile layout.
- Metro includes the shared data directory so the continuation model is bundled in Release builds.
- Follow-up tests: 436 root tests, 144 native tests, root/native TypeScript, targeted web/native lint,
  production build, 19 selected browser scenarios and offline/content freshness checks passed.
- Browser walkthrough also verified last-lesson continuation after reload and seven-language Home
  layouts at 320, 390 and 1280px. This remains local work, not a production release.
- Final iOS Simulator Release build passed after the Metro watch-root adjustment. Installed on
  iPhone 16 Simulator and verified Home -> sail course -> mainsheet lesson -> Home. Continuation
  selected that exact lesson while theory remained 0/7. No Metro server was needed at runtime.
- Follow-up visual evidence: `output/playwright/home-learning-web.png`,
  `output/playwright/home-resume-phone.png`, `output/playwright/lesson-web-reading.png`,
  `output/playwright/home-native-learning.png`.

## Further design work

1. Validate the new Home and course distinction with learners before extending the same changes to every exam screen.
2. Lesson screens: retain Understand / Check / Try; the desktop diagram/text layout is implemented for sail lessons.
3. Trainer: prioritize boat and active line control; reveal advanced controls contextually.
4. Use authored diagrams to explain load paths and sail response, not decorative illustrations.
5. Review native landscape/tablet and large text on devices before calling the design complete.

Avoid a fourth simulator, a second set of course data, or a promotional card wall in the app.
Native and web-specific UI files add some maintenance, but prevent browser compromises from
dictating the app's interaction model. Shared catalog tests reduce route drift.

## Verification

- Root unit tests: 427 passed in 47 files.
- Native tests: 142 passed in 29 suites; native lint and TypeScript passed.
- Targeted web lint and production Next.js build passed.
- Browser menu checks passed at 320, 390 and 1280px, with all seven locales, search,
  current state, legacy redirect and theme switching.
- Final production-build browser run: 19/19 selected navigation, lesson, equipment and 3D checks passed.
- iOS Simulator Release build passed; not a signed App Store archive.
- Installed that Release build on iPhone 16 Simulator, searched for radio, opened the stored
  radio course and returned through the bottom Menu tab. No Metro server was required.
- Offline sailing asset: 3.32 MiB, fingerprint `8a7bc0ad1ae6`; freshness check passed.
- Full historical integration suite is not claimed green: local multiplayer proxy and AI
  provider credentials remain separate unresolved environment checks documented in the sailing report.

Local preview: `http://localhost:3118/menu`.

Visual evidence: `output/playwright/menu-web-desktop-ru.png`,
`output/playwright/menu-web-phone-ru.png`, `output/playwright/menu-native-iphone.png`.
