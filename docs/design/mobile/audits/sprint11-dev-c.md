# Sprint 11 Dev-C: Bootcamp lesson micro-quizzes

**Branch:** `app`
**Lane:** Mobile
**Status:** Implemented; `cd mobile && npm run check` -> 20 suites / 102 tests pass.

## What this sprint added

The expert audit asked us to extend the "Rules scenario mini-quiz" pattern
to bootcamp lessons. Each of the 8 lessons in
`mobile/src/data/bootcamp.json` now has a 2-3 question micro-quiz at the
bottom of the lesson detail screen, with results persisted in
AsyncStorage and a >=70% pass threshold that gates a "fully complete"
state for future Day-N visualisations on the bootcamp index.

## Files touched

Created:
- `mobile/src/bootcamp/quiz-data.ts` (question bank, 7 langs).
- `mobile/src/persistence/bootcamp-quiz.ts` (`useBootcampQuiz()` hook).
- `mobile/src/design-system/components/QuizCard.tsx` (one-question primitive).

Modified (additive):
- `mobile/app/bootcamp/[id].tsx` (in-screen quiz state machine appended).
- `mobile/src/design-system/components/index.ts` (export QuizCard).
- `mobile/src/bootcamp/days.ts` (`isLessonFullyComplete`, `quizLength`).

Untouched per scope: `mobile/app/bootcamp/index.tsx`, all other screens,
bootcamp data bundle, web `src/*`, `mobile/__tests__/*`.

## Question bank

| Lesson id        | # qs | Topic of each question                                              |
|------------------|------|---------------------------------------------------------------------|
| `wind-direction` | 3    | What is TWA / where wind comes from at TWA 45 / what is no-go zone  |
| `points-of-sail` | 3    | Fastest point of sail / no-go vs courses / what is beam reach       |
| `how-sail-works` | 2    | Where lift is generated / which way the boom moves on ease          |
| `tacking`        | 2    | First command before tacking / what the bow passes through          |
| `jibing`         | 2    | Which way the boom swings / hazard in heavy wind                    |
| `vmg-beating`    | 2    | What VMG stands for / why sailors zigzag upwind                     |
| `simple-rules`   | 3    | Right of way port vs starboard / windward vs leeward / overtaking   |
| `mini-race`      | 2    | What the start line is / where the windward mark is                 |

**Total: 19 questions across 8 lessons.** Stable option ids
(`<lesson>-q<n>-<a/b/c>`) so React keys are deterministic. Each option
carries a `correct: boolean` and a multi-language `label`. The
`explanation` is required and renders under the options on reveal -
that is the actual learning moment.

## QuizCard API

```ts
interface QuizCardProps {
  question: QuizQuestion;
  selectedId?: string;       // pre-reveal pick
  onSelect: (id: string) => void;
  revealed: boolean;         // after parent's "Check answer"
  correctId: string;         // pre-computed by parent for O(1) styling
}
```

Visual states (uses `colors.success`, `colors.danger`, `colors.warning`,
`colors.accentCyan` from `mobile/src/design-system/tokens.ts`):

- idle: dark card, faint cyan border, secondary-text bullet.
- picked (pre-reveal): cyan-tinted background and border.
- correct (post-reveal): green tint on the right answer.
- wrong (post-reveal): red tint on the user's wrong pick (others stay idle).
- explanation: green-tinted on correct, amber-tinted on wrong, with a
  "CORRECT / NOT QUITE" badge and a "WHY" body.

Each option is a `Pressable` with `role=button`,
`accessibilityLabel="A. <label>"`, and `accessibilityState={{ selected,
disabled }}`. Disabled = revealed.

Localisation: badges and "Why" label go through `tp()` inside QuizCard.
Question / option / explanation strings arrive as already-typed
`LocalizedPrompt` and resolve via `pickPrompt` in `quiz-data.ts` (same
ru/en/pl required + es/fr/de/it optional fallback chain as `tp()`).

## Quiz flow state machine

State lives in `mobile/app/bootcamp/[id].tsx` as a discriminated union:

```ts
type Phase =
  | { kind: 'intro' }
  | { kind: 'question'; index: number; pickedId?: string; revealed: boolean }
  | { kind: 'result';   score: number; recorded: boolean };
```

Transitions:

```
intro
  -- "Start quiz" / "Retake quiz" --> question(index=0, revealed=false)
question
  -- onSelect --> question(... pickedId)
  -- "Check answer" --> question(... revealed=true)
  -- "Next question" --> question(index+1, revealed=false)
  -- "Finish quiz" --> result(score)
result
  -- "Mark complete" --> result(recorded=true)  // calls recordResult
  -- "Try again"     --> question(index=0, revealed=false)
```

"Check answer" is disabled until an option is picked. On reveal, the
per-question correct/wrong is captured into a local `answers` map; on
Finish, score = count of `true` entries. Result card border is
success-green on pass, warning-amber on fail. "Mark complete" calls
`recordResult` and `markCompleted` in tandem (legacy progress set stays
in sync) and then disappears - no double-record possible.

If the lesson already has a previous result, the intro card shows
"Last result: X / N" and a "Retake quiz" button (plus a "PASSED" pill
when pass threshold was met).

## Persistence (`useBootcampQuiz`)

```
key   = regatta.bootcamp-quiz.v1
value = { [lessonId]: { score, total, answeredAt } }
```

Hook mirrors `useBootcampProgress`: hydrates async, exposes `ready`,
`results`, and `recordResult(lessonId, score, total)`. Defensive parse
yields an empty map on corrupt JSON, non-object root, or invalid
entries. Overwrites previous entry for the same lesson (one
current-best result is enough for v1; per-question history can layer
later via a v2 key).

## Day-N integration helper

`days.ts` adds (additively, no existing exports changed):

```ts
export function isLessonFullyComplete(
  lessonId: string,
  completedIds: Set<string>,
  quizResults: QuizResultsMap,
): boolean
```

Rule: in `completedIds` AND (no quiz, OR quiz score >=70%). The bootcamp
index will adopt this in a follow-up commit; existing
`completedIds.has(id)` callers keep working unchanged.

`quizLength(lessonId)` returns the question count for the future
"X / N quiz" affordance.

## i18n + typography

All UI strings via `tp()` with the 4-arg extras for ES/FR/DE/IT. PL is
ASCII-only (no `ą ę ż ł ó ć ń ś ź`). RU uses ASCII hyphens, no
em-dashes. ES/FR/DE/IT keep their semantic diacritics but no curly
quotes or em-dashes.

## Verification

```
$ cd mobile && npm run check
> sync-content:check ........ all bundles up to date.
> lint                     .. 0 errors, 0 warnings
> typecheck                .. clean
> jest                     .. 20 passed, 102 tests
```

Pre-existing `__tests__/screens/bootcamp-detail.test.tsx` still passes
(5/5). Quiz section is appended below existing CTAs so legacy assertions
("Wind & direction" title, "FOCUS THIS TIME" label, "Open" CTA, "not
found" fallback, mark-complete-and-navigate) are untouched.

## Follow-ups (next mobile-lane sprint)

1. **Bootcamp index Day-N visualisation.** Adopt
   `isLessonFullyComplete(...)` so a viewed-but-quiz-failed lesson
   renders distinct from a viewed-and-passed one (suggest a
   `LessonStatus = 'todo' | 'viewed' | 'complete'` enum).
2. **Continue-CTA tweak.** Reroute "Continue" to the lowest-order
   not-fully-complete lesson so users return to finish failed quizzes.
3. **Per-question history.** v2 key `regatta.bootcamp-quiz.v2` could
   add `attempts: Array<{score,total,answeredAt}>` without breaking v1.
4. **Analytics ping.** Once the API contract has `coach.quizAttempt`,
   the screen has score+total ready; a single `fetch` away.

## QA checklist (manual)

- [ ] Open `wind-direction` -> "Test your understanding" card with
      "Start quiz" appears below "Try this in the simulator".
- [ ] Tap Start -> first question, "Check answer" disabled.
- [ ] Pick option -> button enables, option highlighted cyan.
- [ ] Check answer -> correct=green, wrong=red, explanation card with
      CORRECT or NOT QUITE badge.
- [ ] Last question button reads "Finish quiz", others "Next question".
- [ ] Result card -> green border on pass, amber on fail; X/N headline.
- [ ] "Mark complete" -> button vanishes, AsyncStorage at
      `regatta.bootcamp-quiz.v1` populated.
- [ ] Re-open lesson -> "Last result: 3 / 3 + PASSED" pill,
      "Retake quiz" instead of "Start quiz".
- [ ] Switch lang RU / EN / PL / ES / FR / DE / IT -> every quiz string
      follows; no Cyrillic leak in non-RU langs.
- [ ] Existing CTAs ("Open", "Try this in the simulator") still mark
      viewed and navigate as before.
