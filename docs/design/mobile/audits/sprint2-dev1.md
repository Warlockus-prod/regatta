# Sprint v0.3.0 - Dev-1 status note

Lane: Dev-1 (Bootcamp / "race-ready in a week" narrative).
Date: 2026-05-12.

## Files changed

- `mobile/app/bootcamp/index.tsx` - lessons now render under "Day N" group
  headers with per-day completion line. Top-level "Completed N of 8" line
  preserved untouched. Intro caption now reads
  "8 lessons, around 54 min total - 7 days to the regatta" (and the
  6 sibling languages).
- `mobile/app/bootcamp/[id].tsx` - hero gains a small cyan
  "DAY N" kicker above the emoji. Detail also calls
  `markLastViewed(lesson.id)` in a mount-effect so Home's Continue hook
  prefers the latest opened lesson.
- `mobile/app/index.tsx` - Home gains two new conditional rows above the
  "Where to start" section:
  - `<ContinueRow>` (cyan-tinted Card, mirrors EntryCard pattern) when
    the user has at least one completed lesson and is not yet at Day 7.
  - `<CelebrationRow>` (success-tinted Card) when all 8 lessons are
    done. Tapping it routes to `/game`.
- `mobile/src/persistence/bootcamp.ts` - extended hook with
  `lastViewedLessonId` plus `markLastViewed(id)`. New AsyncStorage key
  `regatta.progress.bootcamp.lastViewed.v1` stores a JSON-encoded string.
  Existing `regatta.progress.bootcamp.v1` shape unchanged - existing
  bootcamp-progress test suite stays green without modifications.
- `mobile/src/bootcamp/days.ts` (new) - day-mapping helper module.

## Day mapping rationale

The brief suggested a draft mapping but invited refinement. The data
file actually has these 8 lessons:

| Order | id              | Title (EN)            |
|-------|-----------------|------------------------|
| 1     | wind-direction  | Wind & direction       |
| 2     | points-of-sail  | Points of sail         |
| 3     | how-sail-works  | How a sail works       |
| 4     | tacking         | Tacking                |
| 5     | jibing          | Jibing                 |
| 6     | vmg-beating     | Beating and VMG        |
| 7     | simple-rules    | Simple rules (RRS)     |
| 8     | mini-race       | Mini race              |

There is no anchoring lesson, and "sail trim" is covered by the
"How a sail works" lesson. The final mapping:

- Day 1: wind-direction (orientation)
- Day 2: points-of-sail
- Day 3: how-sail-works (the sail-trim / lift mental model)
- Day 4: tacking + jibing (the turning-maneuvers pair, intentional double)
- Day 5: vmg-beating (upwind strategy)
- Day 6: simple-rules (rules of the road - RRS + COLREGS)
- Day 7: mini-race (regatta day)

Day 4 is the only multi-lesson day because tacking and jibing are
opposite halves of the same mental model and read better side by side.
Every other day is single-lesson, which keeps the per-day commitment
honest (one focused lesson, ~5-10 min) and makes the per-day "1 of 1"
counter feel meaningful rather than always pegged at 1.

## Persistence schema

```
regatta.progress.bootcamp.v1            (existing) JSON string[] of completed lesson IDs
regatta.progress.bootcamp.lastViewed.v1 (new)      JSON string (single lesson id) or absent
```

Both are read in parallel during the hook's hydration pass. Writes are
fire-and-forget; UI state always wins on conflict so a flaky storage
write doesn't desync the screen.

## Home Continue-hook visibility logic

In `summarizeContinue(completedIds, lastViewedLessonId)`:

1. `pickContinueLesson` prefers `lastViewedLessonId` if it is set AND
   not yet completed (covers "user opened lesson 3 yesterday but never
   pressed Open"). Otherwise it picks the lowest-`order` uncompleted
   lesson.
2. If no lesson remains, `allDone = true` and the hook collapses to the
   Celebration row instead.

Render rules in `app/index.tsx`:

- `showContinue = ready && completedIds.size > 0 && !allDone`
- `showCelebration = ready && allDone && completedIds.size > 0`

A user with 0 completed lessons sees neither row and gets the original
"Where to start / Bootcamp" entry card unmolested. We do not gate on
"day < 7" explicitly; instead we let `allDone` flip the row, which
correctly handles the case where a user completed all 8 lessons but
never opened the mini-race detail.

## Expected UI (ASCII)

Home (mid-bootcamp, last viewed = jibing, completed = [wind, points, tacking]):

```
+----------------------------------+
|       Week to                    |
|       Regatta                    |
|       Sailing tutor              |
+----------------------------------+
| CONTINUE DAY 4                 -> |
| Jibing                            |
| Day 4 of 7  .  1 of 2 in this day |
| CONTINUE                          |
+----------------------------------+
| WHERE TO START                    |
| ... (existing entry cards)        |
```

Home (all 8 done):

```
+----------------------------------+
| All 7 days done. Ready for the   |
| regatta.                       -> |
| TO THE RACE                       |
+----------------------------------+
```

Bootcamp index (mid-progress):

```
8 lessons, around 54 min total - 7 days to the regatta
Completed 3 of 8

DAY 1                    1 of 1 done
[wind-direction card]

DAY 2                    1 of 1 done
[points-of-sail card]

DAY 3                    0 of 1 done
[how-sail-works card]

DAY 4                    1 of 2 done
[tacking card]
[jibing card]

DAY 5                    0 of 1 done
[vmg-beating card]
...
```

## Verification

- `npx tsc --noEmit` - exit 0
- `npm test -- --silent` - 20 suites, 103 tests, all green
  (existing bootcamp-progress.test.ts stays green because the new
  persistence keys are additive, and the existing API shape is
  preserved)
- ASCII typography scan on all touched files - no em-dash / en-dash /
  curly quotes

## Follow-ups for QA lane

- Add a screen test for Home that asserts the Continue row appears with
  the right kicker after `markCompleted` is called once.
- Add a screen test for Home that asserts the Celebration row appears
  after all 8 lessons are marked completed.
- Add a unit test for `summarizeContinue` covering: (a) empty progress,
  (b) lastViewed in-progress lesson wins over lower-order uncompleted,
  (c) lastViewed already completed falls through to next-by-order,
  (d) all-done returns `allDone: true`.
- Optional: snapshot the bootcamp index in a "Day 4 partially done"
  state to lock in the per-day count formatting for RU/EN/PL.

## What I did not touch (per scope)

- `mobile/app/settings.tsx`, `mobile/app/_layout.tsx` (Dev-3 lane)
- `mobile/app/checklist/*`, `mobile/src/data/checklist.json` (Dev-2 lane)
- `mobile/__tests__/*` (QA lane)
- `mobile/src/design-system/*` primitives (reused as-is)
