# Sprint 2 / v0.3.0 plan (PM)

Date: 2026-05-12. Author: PM (mobile lane).
Build target: Week to Regatta v0.3.0 (build 3) -> TestFlight Internal.
Inputs: pm-report.md (this folder), dev-report.md, qa-report.md.
v0.2.0 build 2 is LIVE in TestFlight as of 2026-05-12.

## Goal

Convert the v0.2.0 content shell into a credible "race-ready in a week"
companion: returning user lands on a Continue card, walks the 7-day
Bootcamp arc, finishes at the dock with a real Pre-race Checklist, and
sees an App-Store-defensible Settings surface with a first-launch
language nudge. No Game / Simulator scope expansion this sprint.

## In scope this sprint

### Feature A: Bootcamp "Day N of 7" + Home Continue (Dev-1)

Per P0-1 in pm-report. Map the 8 lessons onto Days 1-7, add a progress
strip at the top of Bootcamp, surface the next unstarted lesson on
Home as a primary card.

Acceptance:
- `mobile/app/bootcamp/index.tsx` shows a day-by-day arc: Day 1..Day 7 with
  the existing 8 lessons grouped (one day may hold two short lessons -
  same mapping the web `/start` page uses today). No new lesson content.
- A 0-of-7 progress strip renders above the lesson list when at least one
  lesson is complete, replacing the current "Completed N of 8" line.
- Home (`mobile/app/index.tsx`) reads `useBootcampProgress()`. When
  `0 < completedIds.size < 8`, the top of the page renders a "Continue
  Day N - <next lesson title>" Card linking to `/bootcamp/<next-id>`.
  When `completedIds.size === 0` or `=== 8` the existing 3-tile entry
  block renders unchanged.
- Lesson detail (`mobile/app/bootcamp/[id].tsx`) splits the practice CTA
  into "Open practice" (navigate only) and "Mark done" (toggle), per
  P1-6. Tap on "Open" no longer auto-completes.
- Persistence schema stays at `regatta.progress.bootcamp.v1`. No new
  bootcamp.json fields. If a new persisted field is needed (e.g.
  `lastOpenedAt`), add it under a new key
  (`regatta.progress.bootcamp.meta.v1`) so older builds keep parsing.

### Feature B: Pre-race Checklist screen (Dev-2)

Per P0-6. Port web `/checklist` (566 lines, 7 langs) as a read-only
mobile screen.

Acceptance:
- New route `mobile/app/checklist/index.tsx` renders the checklist as
  Card + bulleted list, mirroring `/onboard` layout primitives. No
  new design-system primitives.
- Content at new file `mobile/src/data/checklist.json`, synced from
  `src/data/checklist.ts` on web. Dev-2 extends
  `mobile/scripts/sync-content.ts` to include checklist; existing
  `sync-content:check` parity guard keeps it honest.
- New typed export `checklistSections` in `mobile/src/data/index.ts`
  with a matching `LegacyLocalized<>` type in
  `mobile/src/data/types.ts`.
- All 7 languages render. No Cyrillic leak in EN/PL/ES/FR/DE/IT (use
  the existing scan logic from qa-report).
- One screen-smoke test in
  `mobile/__tests__/screens/checklist.test.tsx`.

Dev-2 must NOT add a Home tile linking to `/checklist`. That
follow-up is post-sprint, owned by Dev-1's lane. Reachable via deep
link this sprint only.

### Feature C: Settings privacy section + language nudge (Dev-3)

Per P0-7 (App Review needs privacy policy + support + telemetry
opt-in) and P0-5 (light-touch first-launch nudge - the 3-step
regatta-date + track-picker flow is descoped).

Acceptance:
- `mobile/app/settings.tsx` grows a "Privacy" section above About:
  privacy policy link (URL on weektoregatta.com - placeholder if
  the Shared-lane URL is not live yet, tracked as a risk), terms
  link, support contact (mailto), telemetry opt-in toggle (default
  OFF, AsyncStorage key `regatta.settings.telemetry.v1`, no
  telemetry actually sent until ADR-0007).
- New "Data" section with destructive "Reset progress" Button +
  confirm Alert that clears the bootcamp progress key (P1-7).
- New `mobile/src/onboarding/LanguageNudge.tsx`: ONE-screen modal,
  not multi-step. If `regatta.onboarding.completed.v1 !== true`, asks
  the user to confirm or change the auto-detected language; on
  confirm, persists flag. Default-dismiss path is "Use suggested"
  pre-filled with the detected locale (blocking modals get App Store
  rejected).
- `mobile/app/_layout.tsx` wraps `Stack` in `<LanguageNudgeGate>`
  next to `SplashGate`; existing provider order (ErrorBoundary >
  GestureHandlerRootView > SafeAreaProvider > I18nProvider >
  SplashGate) unchanged.
- Screen-smoke test for Privacy + unit test for LanguageNudge
  first-launch persistence.

## Out of scope (deferred to v0.4.0+)

Each is a multi-week build. Listed to head off scope creep.

- Game screen full implementation (P0-2). Stays a PlaceholderScreen
  until v0.4.0 / Phase 2 entry.
- Simulator full physics (P0-3). Phase-2 preview ships as-is; the
  PREVIEW badge is already gone (build 2). Real VPP + missions +
  replays land in v0.4.0 with ADR-0003 step 2.
- Multiplayer / Leaderboard online (P0-4). Placeholder rows on Home
  remain; v0.4.0 once Phase 3 lands.
- AI coach (`/api/coach`). Phase 3 + ADR-0006.
- Daily challenge banner. Phase 3.
- Replay viewer / share-sheet. Phase 2 follow-on.
- Rules SVGs / Anatomy hotspots / Racing diagrams (P1 cluster).
  Bundled into a v0.5.0 visual-polish sprint after `react-native-svg`
  integration.
- Multi-step onboarding (regatta-date picker + track picker). Waits
  for ADR-0009 (v1 onboarding scope decision).

## Coordination matrix

| File | Owner this sprint | Other devs | Notes |
|---|---|---|---|
| `mobile/app/bootcamp/index.tsx` | Dev-1 | read-only | Day-N arc + progress strip |
| `mobile/app/bootcamp/[id].tsx` | Dev-1 | read-only | Open vs Mark done split |
| `mobile/app/index.tsx` (Home) | Dev-1 | DO NOT TOUCH | Continue card hook |
| `mobile/src/persistence/bootcamp.ts` | Dev-1 | read-only | Optional new meta key |
| `mobile/app/checklist/` (new dir) | Dev-2 | DO NOT TOUCH | New route |
| `mobile/src/data/checklist.json` (new) | Dev-2 | DO NOT TOUCH | Sync from web |
| `mobile/src/data/types.ts` | Dev-2 | append-only | Add Checklist type |
| `mobile/src/data/index.ts` | Dev-2 | append-only | Add checklistSections export |
| `mobile/scripts/sync-content.ts` | Dev-2 | DO NOT TOUCH | Add checklist source |
| `mobile/app/settings.tsx` | Dev-3 | DO NOT TOUCH | Privacy + Data sections |
| `mobile/src/onboarding/` (new dir) | Dev-3 | DO NOT TOUCH | LanguageNudge modal |
| `mobile/app/_layout.tsx` | Dev-3 | DO NOT TOUCH | Wrap Stack in nudge gate |
| `mobile/__tests__/screens/*.test.tsx` | each dev for own feature | no cross-edits | One smoke test per new flow |

Cross-cutting:

- All three devs may add `tp()` strings inline; strings live next to
  usage, no coordination.
- Each dev adds tests under `mobile/__tests__/` for their own feature;
  no shared test helper changes.
- Dev-2 is the only dev touching `sync-content.ts`. `_layout.tsx` is
  Dev-3-only.
- Each dev writes a status note at sprint end:
  `docs/design/mobile/audits/sprint2-dev{1,2,3}.md` covering what
  shipped, what slipped, drift with this plan.

## Acceptance gate (sprint exit)

All must be green before tagging v0.3.0 / build 3:

- `npx tsc --noEmit` exits 0 from `mobile/`.
- `npm test` from `mobile/` is fully green (current baseline: 20
  suites / 101 passing per qa-report; new tests must keep this trend).
- `npm run sync-content:check` clean (especially after Dev-2 adds
  checklist).
- Cyrillic-leak scan (per qa-report logic) shows 0 real leaks across
  EN/PL/ES/FR/DE/IT in the new checklist + Settings privacy strings.
- All three new flows (Continue card, Checklist, Privacy + nudge) have
  at least one screen-smoke test that renders without throwing.
- No new placeholder dead-ends introduced. Specifically: the
  Continue card never points to a 404 lesson id; the Checklist screen
  never shows an empty body if sync succeeded; the language nudge
  modal never blocks the user with no dismiss path.
- App.json bumped to `0.3.0` / `buildNumber: 3` BEFORE the EAS
  production build runs.
- `mobile/TESTFLIGHT.md` updated with the v0.3.0 release note draft
  (one paragraph, the three feature bullets above).

## Risks

- `_layout.tsx` conflict: Dev-3 owns the file. Dev-1's Home Continue
  card reads `useI18n()` in the screen body, NOT in `_layout.tsx`. If
  Dev-1 thinks they need a provider change, escalate to Dev-3 before
  editing.
- Bootcamp data drift: if Dev-1 wants a new `dayN` field on lessons,
  that touches `src/data/bootcamp.ts` on web (ADR-0003 single source of
  truth). PREFERRED path: derive Day N from `lesson.order` (1..8) in
  mobile code only. If a real field is needed later, write a
  one-paragraph ADR-0010 in the Shared lane first - do NOT silently
  edit `bootcamp.ts` from the mobile lane.
- App Store rejection on first-launch modal: blocking modals get
  rejected. Dev-3's nudge must have a default-dismiss path ("Use
  suggested" pre-filled with the detected locale).
- Checklist + privacy URLs not live: Dev-3's Privacy / Terms / Support
  links need real targets. If Shared lane has not deployed
  `/legal/privacy`, ship with placeholders that 200, but BLOCK
  production submission until they go live.
- `types.ts` shape drift: dev-report ISSUE-005 already flagged a gap.
  Dev-2's Checklist type must reuse the `LegacyLocalized<>` adapter,
  not invent a new shape. Fix any divergence in the same commit, not
  as follow-up.
- Two-week window: if anything slips, Feature A (Bootcamp Day N +
  Continue) is must-ship; Feature C (privacy) is next-must-ship for
  App Review credibility; Feature B (Checklist) can slip to v0.3.1 if
  Dev-2 hits a sync-script wall.

## Timeline

Two weeks wall clock, one week of focused implementation. Day 1-2
kickoff notes, Day 3-7 implementation, Day 8-9 cross-dev review +
real-device smoke, Day 10 EAS production build to TestFlight Internal.
