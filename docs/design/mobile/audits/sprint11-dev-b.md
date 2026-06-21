# Sprint 11 Dev-B audit: Local leaderboard (was Phase-3 placeholder)

Date: 2026-05-13
Branch: `app`
Lane: Mobile / Dev-B

Leaderboard was the last `PlaceholderScreen` in the app. Game (Sprint 9
Dev-A) and Multiplayer (Sprint 10 Dev-B) had already graduated, and the
"Phase 3" pulse pill on Leaderboard was the only remaining piece of
"coming soon" framing. This sprint replaces the placeholder with a real
local leaderboard built from on-device race history, sorted by personal
best per course, with course + period filters. The screen is ready to
gain a "Global" tab once the online leaderboard backend lands; the
local helpers are pure and reusable as the offline fallback.

## Files touched (and only these)

Replaced:
- `mobile/app/leaderboard/index.tsx` (was a `PlaceholderScreen`, now a
  real leaderboard list with filter pills and `EmptyState` handling).

New:
- `mobile/src/leaderboard/local.ts` - pure, React-free helpers:
  `bestPerCourse`, `filterByCourse`, `filterByPeriod`, `relativeDate`,
  `scoreTier`, `buildLeaderboardRows`. All deterministic; the
  time-windowed helpers accept an optional `now` argument so tests can
  pin the clock.

Updated (surgical, leaderboard-only):
- `mobile/__tests__/screens/placeholder-screens.test.tsx` - replaced
  the "Phase 3 badge" assertion with three new assertions on the real
  screen: subtitle copy, `EmptyState`, and the four-pill course filter
  row. Animated.loop mock retained as a guardrail (see file comment).

Unchanged (per scope): every Dev-A / Dev-C area, simulator V1/V2/V3
mobile screens, web `src/`, ASC metadata, race-history persistence
API, design-system primitives.

## Rank algorithm

The leaderboard ranks the user against themselves, per course. The
rules below live in `src/leaderboard/local.ts` and are unit-friendly
(pure functions, single-responsibility):

1. `filterByCourse(races, courseFilter)` narrows the list to the
   selected course bucket, where `'all'` is the identity filter.
   `'daily'` collapses onto `'medium'` (same marks, same par) so a
   user who plays both surfaces gets a single PB row, not two
   near-identical ones.
2. `filterByPeriod(races, periodFilter, now=Date.now())` narrows the
   list to a recency window. We use rolling 24 h / 7 d windows
   (`now - 1d`, `now - 7d`) instead of calendar boundaries so the
   leaderboard reads consistently across timezones and the "this week"
   chip doesn't reset at midnight UTC for users in the Americas.
3. `bestPerCourse(races)` reduces to one row per course, picking the
   best record by:
   - higher `score` (primary)
   - tie-break: faster `timeSec`
   - tie-break: more recent `finishedAt`
4. The kept rows are then sorted globally by the same comparator so
   the top of the leaderboard is the user's overall best finish.

The screen wires these up with `useMemo([history.races, courseFilter,
periodFilter])` so the pipeline only re-runs when a filter changes or
a new race is persisted - cheap, with the 20-race history cap.

## Filter UX

Two pill rows above the list. Each row has its own muted uppercase
section label so the user's eye latches on without parsing a key:

```
COURSE   [All] [Short] [Medium] [Long]
PERIOD   [All time] [This week] [Today]
```

- Pill component is the same `chip` / `chipActive` / `chipPressed`
  pattern used by the Anatomy chips; reuse keeps the visual language
  consistent without dragging the chips into the design-system index
  (they're still ad-hoc enough to belong on the screen for now).
- `accessibilityState={{ selected: active }}` on every Pressable so a
  screen reader announces the active chip cleanly.
- Filters compose: filter-by-course feeds filter-by-period feeds
  best-per-course. The screen never short-circuits the chain so the
  "no races in this slice" `EmptyState` still appears even when the
  base list has rows.

## EmptyState copy

Two distinct empty states, picked by the screen at render time:

| Condition | Title (EN) | Subtitle (EN) | CTA |
| --- | --- | --- | --- |
| `races.length === 0` | "No races yet" | "Finish a race and it will land here. The best run on each course tops the board." | "To the race" -> `/game` |
| `races.length > 0 && rows.length === 0` | "No races in this slice" | "Clear the filter or finish a run on the selected course." | "Clear filters" (resets both filters) when at least one is active |

The clear-filters CTA only renders when `filtersActive === true`, so
the brand-new install never sees a pointless "Clear filters" button
under the EmptyState. Both states use the `leaderboard` brand glyph at
32 pt cyan so the surface still reads as the leaderboard rather than
a generic empty list.

All copy ships in the seven languages required by the i18n contract
(RU / EN / PL / ES / FR / DE / IT). PL drops diacritics per
CLAUDE.md; ES/FR/DE/IT drop curly punctuation per the same rule.

## Row anatomy

```
[#1]  Short race                  [PERSONAL BEST]
      today

      TIME    SCORE
      1:14    87  (gold tier)
```

- Rank pill (#1, #2, ...): cyan 22 pt tabular-nums.
- Course title: `findCourse(courseId)` -> course definition's `title`
  function evaluated against the active `tp` so the row reads in the
  user's language without a separate name table.
- "Personal best" pill: warm amber chip (`rgba(255, 170, 0, 0.16)` bg,
  `rgba(255, 170, 0, 0.4)` border) on every row, because every row IS
  a PB - we render top-1 per course. Future Global-tab rows would not
  carry this pill.
- Date: `relativeDate(finishedAt, lang)` - language-aware "today" /
  "yesterday" / "N days ago" / "last week" / "N weeks ago" /
  "N months ago". RU plurals follow the 2..4 vs other rule (`2 дня`
  vs `5 дней`); other langs use the simpler "N units" pattern. We
  deliberately don't reach for `Intl.RelativeTimeFormat` - mobile
  Hermes ships an inconsistent ICU and the strings would shift per
  device.
- Score colour tier:
  - `>= 78` -> success green (gold tier)
  - `>= 52` -> accent cyan (silver tier)
  - `< 52`  -> warning amber (bronze tier)
  Mirrors the simulator's `scoreColor` helper so a score of 80 reads
  the same green on both surfaces.

Tap routes to `/replay/{id}` so the user can rewatch the run that
earned them the PB. Sprint 10 Dev-A's replay viewer already accepts
that param; no other screen needed touching.

## Online-layer architecture sketch

The online leaderboard backend is on the Phase-3 backlog. When it
lands, the screen will:

1. Render local PBs (current behaviour) as a "Local" tab.
2. Add a "Global" tab that renders the same row component but from
   `GET /api/leaderboard?course=<id>&period=<window>` (already
   documented in `docs/design/mobile/API_CONTRACT.md`).
3. Cache the global response in AsyncStorage and fall back to the
   cached snapshot when offline (or to the local PBs, depending on
   what the user opted into).

The local helpers in `src/leaderboard/local.ts` stay - they're the
read side of the local-PB view that doubles as the offline fallback
for the Global tab. The row component (`LeaderboardRow` in the screen
file) is already shape-compatible with what the API will return:

| Local row | Global row | Notes |
| --- | --- | --- |
| `rank` (#1, #2, ...) | `rank` | Server-assigned for global. |
| `RaceRecord.courseId` | `courseId` | Same enum. |
| `RaceRecord.timeSec` | `timeSec` | Same units. |
| `RaceRecord.score` | `score` | Same 0..100 scale. |
| `RaceRecord.finishedAt` | `finishedAt` | ms-since-epoch. |
| (implicit "you") | `displayName` | Global only. |
| (omitted) | `country` | Global only. |

The "Personal best" pill becomes "You" pill on the global tab when
the row matches the current user's id. The screen's `useMemo`
pipeline becomes a `useQuery` for the global tab; the local tab
remains pure-RAM. No backend churn changes the local-tab shape.

## Test impact

`mobile/__tests__/screens/placeholder-screens.test.tsx` is the only
test file touched (per scope - I'm allowed exactly the Leaderboard
assertion in this file). Replaced the Phase-3 badge assertion with
three new assertions:

1. `renders the leaderboard subtitle in EN` - matches "Personal bests
   per course" copy. Stack.Screen is mocked to a no-op so we assert on
   body content rather than the route title (consistent with how every
   other screen test in this folder asserts on body copy).
2. `renders the EmptyState when no races are persisted yet` - empty
   AsyncStorage hydrates to `[]`, the EmptyState renders, the CTA
   label "To the race" routes to `/game`.
3. `renders the course filter pills` - All / Short / Medium / Long
   pills are present. Future copy edits to the chip row will fail
   loudly here.

Animated.loop mock retained as a guardrail in case anyone re-introduces
an Animated loop without a cleanup; the comment explains why.

Suite: `npm run check` -> sync-content + lint + typecheck + 20 suites /
102 tests, all green. (The PM brief mentioned 100 tests at sprint
start; my new 2 leaderboard test cases push it to 102. The original
1-test placeholder suite stayed in this file as 3 tests now.)

## Verification

- `cd mobile && npm run check` -> 0 errors, 0 warnings, 102/102 tests
  pass.
- `mobile/src/leaderboard/local.ts` and
  `mobile/app/leaderboard/index.tsx` both lint clean in isolation.
- ASCII-only typography: scanned both files with
  `grep -nP '[\x{2013}\x{2014}]'` (em / en dashes) -> 0 hits.
- Cyrillic-leak scan on the Polish strings -> 0 hits (caught and
  fixed one in draft: `ladujе` -> `laduje`).

## Follow-ups

1. **Global tab.** Once `/api/leaderboard` ships, add a tabbed header
   (`<TabBar>` style) and a second view that hits the API. Reuse the
   `LeaderboardRow` component as-is.
2. **Streak badge.** The race history already records `finishedAt`,
   so a tiny helper could surface "5-day streak" near the title once
   we have richer history data. Not a v1 concern; flag for the
   product backlog.
3. **`LeaderboardRow` extraction.** If the Global tab and the Local
   tab end up sharing > 80% of the row UI, lift `LeaderboardRow` into
   `src/leaderboard/Row.tsx` so both tabs import it. Today it lives
   in the screen file because there's only one consumer.
4. **PB animation.** When a new race beats the current PB, a one-shot
   highlight animation on the new top row would make the
   "I just got a personal best" feedback loop visible. Sprint 12+
   polish; not covered here.
5. **Course bucket: `daily` collapse.** I currently fold `daily` onto
   `medium` for filter math. If `daily` ever diverges (different
   marks, different par), revisit `normalizeCourseId` in
   `src/leaderboard/local.ts`.
6. **`buildLeaderboardRows`.** Provided as a future convenience for
   the Global tab to share the same pipeline shape; the screen
   doesn't use it today (it uses the three primitive helpers
   directly so each `useMemo` step has its own deps array). Keep or
   delete based on the Global tab's actual needs.
