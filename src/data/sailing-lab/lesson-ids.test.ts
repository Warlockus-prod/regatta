import { describe, expect, it } from "vitest";
import { sailLessons } from "./course";
import { SAIL_LESSON_IDS } from "./lesson-ids";

// Navigation saves the sail bookmark from this list instead of importing the
// course. If it drifts, opening a new lesson never becomes "continue here".
describe("sail lesson ids match sailLessons", () => {
  it("ids, in course order", () => {
    expect([...SAIL_LESSON_IDS]).toEqual(sailLessons.map(l => l.id));
  });
});
