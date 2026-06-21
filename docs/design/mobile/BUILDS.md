# Mobile build journal

Every iOS build: number, version (train), source commit, whether it was ATTACHED
to a TestFlight beta group, and what changed. Attaching is the step that was
silently missing (builds 14-19 uploaded but were never distributed, so the phone
stayed on 0.13.0). A build is NOT shipped until attached + visible to a tester.

| Build | Version | Commit | Attached (TestFlight) | What changed |
|---|---|---|---|---|
| 20 | 1.3.0 | `5ce2561` | pending (this build) | Audit fixes: courses clean wheel from canonical data; tappable quick lessons; support email -> gtframe.io; 1-liner i18n/typography (ellipsis, IT apostrophe, leaderboard tenths, check icon); 44pt touch targets; working clipboard (expo-clipboard); home -> /checklist link. |
| 19 | 1.3.0 | `9e3da40` | Self (attached 2026-06-21, retroactively) | Radar cockpit (force vectors, sectors, readout). Was never attached on upload - the distribution bug. |
| 18 | 1.2.0 | v1.2 | NOT attached | AI opponents, animated sim + wind rose, global leaderboard, PostHog. Never reached testers (attach gap). |
| <= 13 | <= 0.13.0 | - | Self | Last builds the phone actually saw before the gap. |

## Release rule
After every `altool --upload-app` and once the build is `VALID`:
```
node scripts/asc-attach-build.mjs <buildNumber>
```
See `COMPLETION_STANDARD.md` section 3. The internal "Self" group has
`hasAccessToAllBuilds=false` and that flag can't be toggled via the API, so each
build must be attached explicitly.
