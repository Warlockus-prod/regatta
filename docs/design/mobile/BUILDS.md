# Mobile build journal

Every iOS build: number, version (train), source commit, whether it was ATTACHED
to a TestFlight beta group, and what changed. Attaching is the step that was
silently missing (builds 14-19 uploaded but were never distributed, so the phone
stayed on 0.13.0). A build is NOT shipped until attached + visible to a tester.

| Build | Version | Commit | Attached (TestFlight) | What changed |
|---|---|---|---|---|
| 42 | 1.6.1 | `9455e10` (web `c6ad1d9`) | Self (verified 2026-09-08) | Five shared product sections, shorter home with a start/resume action, searchable catalog, grouped sailing/exam courses and persistent native navigation that hides during activities. Localized Home back label. 114 mobile tests and full website deployment checks passed; iPhone/iPad Simulator visual checks recorded. Apple validation/upload and metadata precheck passed. Updated home screenshots and review notes. Replaces build 40 in App Review, WAITING_FOR_REVIEW with automatic release after approval. Build 41 was an intermediate verification build. See [navigation audit](../navigation-redesign-2026-09-08.md). |
| 40 | 1.6.1 | `585acef` (web follow-up `43a7ca7`) | Self (verified 2026-09-08) | Real Blender yacht source and export, shared anatomy model and 17 anchors, seven-language teaching corrections, full-height jib furling pressure fix. Basics wake and label fixes published on the website. 112 mobile tests passed; exact Release Simulator home/anatomy/three simulator entries checked. Archive, IPA validation, metadata precheck passed. Replaces 39 in App Review, WAITING_FOR_REVIEW with automatic release after approval. See [Blender audit](../blender-sailing-update-2026-09-08.md). |
| 39 | 1.6.1 | `eb8e141` | Self (verified 2026-09-07) | SRC radio corrections: MOB MAYDAY, voice without DSC ACK, stricter distress position grading, balanced mock exam and clearer phone navigation. Refreshed embedded offline course verified inside the archive. 156 radio/voice and 112 mobile tests passed. Release Simulator course entry visually checked; Apple validation and metadata precheck passed. Replaces build 38 in App Review, WAITING_FOR_REVIEW with automatic release after approval. See [radio audit](../radio-course-audit-2026-09-07.md). |
| 34 | 1.6.1 | `639eb17` | Self (verified 2026-09-07) | Shared 3D module redesign; native loader waits for scene readiness and retries on failures. Refreshed offline radio asset. Xcode archive/export, Apple validation/upload and VALID processing passed; 99 Jest tests, TypeScript and mobile lint passed. Simulator Release installed and launched; native visual inspection awaits macOS permissions. App Store version prepared, not submitted for review. |
| 21 | 1.3.0 | `d569d4d` | Self (attached 2026-06-21) | Content-parity ports + polish, closing the 2026-06 audit (all 37 findings fixed across b20+b21). racing Key Concepts + 4 SVG diagrams; courses theory + EN anchors; rules es/fr/de/it + official/federation links; onboard sections (+ web `src/data/onboard.ts` es/fr/de/it backfill so sync-content guard is green); glossary anchors; quick header/minutes/footer; checklist summary; game watch-replay; replay markers/CTA/share-link; simulator Skia a11y + overtrim token; leaderboard tp(); bootcamp/home polish; game ellipsis -> ASCII. Each screen verified by an adversarial parity/typography/7-lang reviewer. Gate green: sync-content + lint + tsc + 108/108 jest. |
| 20 | 1.3.0 | `5ce2561` | Self (attached 2026-06-21) | Audit fixes: courses clean wheel from canonical data; tappable quick lessons; support email -> gtframe.io; 1-liner i18n/typography (ellipsis, IT apostrophe, leaderboard tenths, check icon); 44pt touch targets; working clipboard (expo-clipboard); home -> /checklist link. |
| 19 | 1.3.0 | `9e3da40` | Self (attached 2026-06-21, retroactively) | Radar cockpit (force vectors, sectors, readout). Was never attached on upload - the distribution bug. |
| 18 | 1.2.0 | v1.2 | NOT attached | AI opponents, animated sim + wind rose, global leaderboard, PostHog. Never reached testers (attach gap). |
| <= 13 | <= 0.13.0 | - | Self | Last builds the phone actually saw before the gap. |

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
