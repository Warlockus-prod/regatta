import { describe, expect, it } from "vitest";
import { bootcampLessons } from "./bootcamp";
import { BOOTCAMP_LESSON_IDS, BOOTCAMP_LESSON_PLAN, bootcampLessonHeads } from "./bootcamp-index";

// The root layout names, finds and routes foundation lessons from this index
// instead of importing the lesson text. If the plan drifts, the lesson footer
// and the home card point at an old route or length.
describe("foundation lesson index matches bootcampLessons", () => {
  it("heads are the start of every lesson, in course order", () => {
    expect(bootcampLessons.map(l => ({ id: l.id, order: l.order, emoji: l.emoji, titleRu: l.titleRu, titleEn: l.titleEn, titlePl: l.titlePl, titleEs: l.titleEs, titleFr: l.titleFr, titleDe: l.titleDe, titleIt: l.titleIt })))
      .toEqual(bootcampLessonHeads.map(head => ({ ...head })));
    // bootcamp.json (mobile sync) keeps its key order: the head comes first.
    for (const lesson of bootcampLessons) expect(Object.keys(lesson).slice(0, 10)).toEqual(["id", "order", "emoji", "titleRu", "titleEn", "titlePl", "titleEs", "titleFr", "titleDe", "titleIt"]);
    expect([...BOOTCAMP_LESSON_IDS]).toEqual(bootcampLessons.map(l => l.id));
  });
  it("route and length per lesson", () => {
    expect(BOOTCAMP_LESSON_PLAN.map(l => ({ ...l }))).toEqual(bootcampLessons.map(l => ({ id: l.id, route: l.route, estMinutes: l.estMinutes })));
  });
});
