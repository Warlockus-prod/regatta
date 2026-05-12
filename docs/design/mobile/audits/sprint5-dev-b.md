# Sprint 5 - Dev-B: Bootcamp lesson schemas + simulator drill CTA

**Lane:** Mobile
**Branch:** app
**Date:** 2026-05-12

## Goal

Close the bootcamp -> simulator learning loop:

1. Per-lesson SVG schema rendered between hero and body (visual companion to text).
2. "Try this in the simulator" CTA at the bottom that routes the user into the simulator with a `?drill=...&lesson=...` query string. The simulator (Dev-A in parallel) will read the param to pre-load Drill mode; until then it falls back to free mode without breaking.

## Files created

- `mobile/src/design-system/components/LessonDiagram.tsx` - one-file dispatcher; switch on `lessonId` -> per-lesson SVG. Uses `react-native-svg` (already in deps). 7-lang inline labels via `tp()`. ~330 LOC including helpers.
- `mobile/src/bootcamp/lesson-drill-map.ts` - `getDrillForLesson(id)` and `buildSimulatorDrillRoute(lesson, drill)`. Single source of truth for the lesson -> drill contract.

## Files modified

- `mobile/src/design-system/components/index.ts` - exported `LessonDiagram` (one new line, no other touch).
- `mobile/app/bootcamp/[id].tsx` - inserted `<LessonDiagram lessonId={lesson.id} />` between hero and summary; appended a secondary `Button` titled "Try this in the simulator" after the existing primary `Open` CTA when a drill mapping exists. The existing detail logic (mark completed, route to lesson route, day badge, focus card) is unchanged.

## Lesson -> diagram mapping

| Lesson id        | Diagram                                                               |
|------------------|-----------------------------------------------------------------------|
| wind-direction   | Compass with N/E/S/W, downward `TWD` arrow from top, single boat with a `TWA` dashed arc |
| points-of-sail   | Pizza-slice polar diagram (no-go red, beat/reach/broad cyan, run amber) with a boat at beam reach |
| how-sail-works   | Sail cross-section (curved cyan-to-white gradient), three flow stream lines with arrowheads, big green `LIFT` vector, `AWA` label |
| tacking          | Top-down arc bow-through-wind: three boats (start port tack, mid head-to-wind, end starboard tack), wind axis dashed |
| jibing           | Top-down arc stern-through-wind: three boats running broad reach -> dead downwind -> broad reach the other side, with red "boom flies!" warning at apex |
| vmg-beating      | Zig-zag upwind path with three boats on alternating tacks, vertical green `VMG` vector toward goal mark |
| simple-rules     | Two boats meeting upwind: green starboard, red port (gives way), warning dashed predicted-paths |
| mini-race        | Course outline: start line at bottom (two pin marks), windward mark at top, course path zig-zagging up + finish flags |

All diagrams share a common 200x140 viewBox, render at 100% width and a fixed 170px height inside a card frame matching `RuleScenarioDiagram`'s look (`bgCard` background, `borderCyanFaint` border, `radii.md`). Color contract: `accentCyan` for primary lines, `success` for "go"/lift arrows, `warning` for caution/marks, `danger` for no-go and port-tack, `windColor` for wind axes and `TWD` arrows.

## Lesson -> drill mapping

| Lesson id        | Drill id                | CTA visible? |
|------------------|-------------------------|--------------|
| wind-direction   | hold-twa-45             | yes          |
| points-of-sail   | hold-twa-90             | yes          |
| how-sail-works   | max-speed-on-reach      | yes          |
| tacking          | tack-clean              | yes          |
| jibing           | jibe-clean              | yes          |
| vmg-beating      | windward-mark-mission   | yes          |
| simple-rules     | -                       | hidden (no drill) |
| mini-race        | course-mission          | yes          |

When `getDrillForLesson(id)` returns null (only `simple-rules` today), the CTA block does not render at all - no empty button.

## URL contract for Dev-A

The CTA emits exactly: `/simulator?drill=<urlEncoded(drillId)>&lesson=<urlEncoded(lessonId)>`.

- `drill` is the canonical id from `lesson-drill-map.ts` above.
- `lesson` is the originating bootcamp lesson id; useful for analytics and to render a "back to lesson" affordance once Dev-A is wired up.
- Both values are `encodeURIComponent`'d. Dev-A should `useLocalSearchParams<{ drill?: string; lesson?: string }>()` and treat both as optional.

## Design choices worth flagging

- The diagrams are deliberately small (170 px tall, 16:9-ish at the top of the lesson) so they read as a "kicker visual" not a separate screen. Web has full diagrams at /courses, /rules, /racing - this is the per-lesson minimal version.
- The Try CTA uses `variant="secondary"` (outlined cyan on dark card) rather than `primary` so the existing primary "Open" CTA stays the dominant action. The `Open` button remains the test-asserted entry point for `bootcampLessons[0].route` in `bootcamp-detail.test.tsx`.
- Both buttons mark the lesson completed via `markCompleted(lesson.id)` before navigating, so either path counts toward bootcamp progress.
- All new strings ship in 7 languages via `tp()` with the standard ASCII-only typography (no em-dash, no curly quotes, no Polish diacritics). Inline SVG labels were kept short to fit small text boxes.
- Diagram dispatcher uses a switch on lessonId rather than a JSON manifest because the SVG content is hand-tuned per lesson and not data-driven; a manifest would be over-engineering for 8 entries.

## Verification

- `cd mobile && npx tsc --noEmit` -> clean (no output).
- `cd mobile && npm test` -> 20 suites, 103 tests, all passing (no regressions in `bootcamp-detail.test.tsx`; the `Open` CTA test still finds the primary button by label "Open").

## Follow-ups for QA

- Spot-check each of the 8 lesson detail screens in light + dark mode (light is unused on mobile today but RN may render different on iPad).
- Tap the "Try in the simulator" CTA on each lesson with a drill; confirm the URL bar (or Expo Router history) shows `/simulator?drill=...&lesson=...`. simple-rules should NOT show the CTA.
- Verify all 7 languages render the diagram inline labels and CTA copy without truncation. Polish and German tend to be longest; the labels were sized for 200x140 viewBox at 8-9 px - if they bleed, the SVG `viewBox` will scale them down rather than overflow.
- Verify accessibility: the SVG has no a11y label today (matches `RuleScenarioDiagram` precedent). If QA wants screen-reader support, that is a follow-up across all diagram components, not Sprint 5 scope.

## Follow-ups for Dev-A integration

- Confirm the drill-id catalog in `mobile/src/simulator/*` matches the strings in `lesson-drill-map.ts`. If a drill id changes (e.g. rename `tack-clean` -> `tack-90`), update `LESSON_TO_DRILL` here and ping Dev-B.
- Wire `useLocalSearchParams<{ drill?: string }>()` in `mobile/app/simulator/index.tsx`. If drill is unknown, fall back to free mode silently (do not crash).
- Optional: add a small "From bootcamp lesson: <title>" banner inside the simulator when `lesson` query param is present, with a back-link to `/bootcamp/<lesson>`. Lightweight UX win.

## Follow-ups for Dev-B (next sprint)

- Add an inline a11y label per diagram (`accessibilityLabel="Compass showing wind from the north and the no-go zone..."`) once the strings are translated.
- Consider a tap-to-zoom interaction for the diagram (currently view-only). Lightbox component already exists in the anatomy section - would just need a thin wrapper.
- If the drill catalog grows (more than ~20 drills), promote `lesson-drill-map.ts` to a JSON manifest and validate against the catalog at build time.
