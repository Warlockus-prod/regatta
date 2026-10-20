import { describe, expect, it } from "vitest";
import { sailLessons } from "../../../data/sailing-lab/course";
import { courseModules } from "../../../data/sailing-lab/learning-path";
import { guideCopy, lessonGoals, moduleGoals } from "../../../data/sailing-lab/lesson-guide";
import { emptyPositions, readPositions, visitLesson } from "./lesson-position";
import { emptyPracticeResults, mergePracticeResults, readPracticeResults } from "./practice-results";
import { parseStorageRequest, STORAGE_CHANNEL } from "../runtime/storage-protocol";

describe("learning continuity", () => {
  it("retains independent lesson steps and never stores answers as progress", () => {
    const first = visitLesson(emptyPositions(), "mainsheet", { step: "try", diagram: 1 });
    const second = visitLesson(first, "vang", { step: "check" });
    expect(readPositions(JSON.stringify(second)).lessons.mainsheet).toEqual({ step: "try", diagram: 1 });
    expect(second.current).toBe("vang");
    expect(visitLesson(second, "unknown", { step: "try" })).toBe(second);
    expect(Object.keys(second).sort()).toEqual(["current", "lessons", "version"]);
  });
  it("ignores obsolete IDs and invalid steps or diagram settings", () => {
    expect(readPositions("broken")).toEqual(emptyPositions());
    const restored = readPositions(JSON.stringify({ version: 1, current: "gone", lessons: { gone: { step: "try" }, mainsheet: { step: "passed", diagram: 999 }, "apparent-wind": { step: "try", diagram: 4 } } }));
    expect(restored.current).toBeNull();
    expect(restored.lessons).toEqual({ mainsheet: { step: "understand", diagram: 0 }, "apparent-wind": { step: "try", diagram: 4 } });
  });
  it("merges results without erasing another task or accepting fabricated IDs", () => {
    const a = readPracticeResults('{"version":1,"completed":{"depth":123,"exam":200,"twist":-1,"mainsheet":"passed"}}');
    expect(a.completed).toEqual({ depth: 123 });
    expect(mergePracticeResults(a, { version: 1, completed: { twist: 200, depth: 100 } }).completed).toEqual({ depth: 123, twist: 200 });
    expect(readPracticeResults('{"version":9,"completed":{"depth":123}}')).toEqual(emptyPracticeResults());
  });
  it("exposes only the two fixed storage destinations to the native bridge", () => {
    const read = { channel: STORAGE_CHANNEL, id: "test", action: "read" };
    expect(parseStorageRequest(JSON.stringify({ ...read, store: "auth-token" }))).toBeNull();
    expect(parseStorageRequest(JSON.stringify({ ...read, store: "practice" }))?.store).toBe("practice");
    expect(parseStorageRequest(JSON.stringify({ ...read, action: "write", store: "practice", raw: '{"version":1,"snapshot":"wrong"}' }))).toBeNull();
  });
  it("covers every lesson once and supplies all seven languages", () => {
    const ids = courseModules.flatMap(m => m.lessons);
    expect(ids).toEqual(sailLessons.map(l => l.id));
    expect(new Set(ids).size).toBe(sailLessons.length);
    expect(Object.keys(lessonGoals).sort()).toEqual([...ids].sort());
    for (const label of [...Object.values(guideCopy), ...Object.values(lessonGoals), ...Object.values(moduleGoals)]) {
      for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) expect(label[lang]?.trim().length).toBeGreaterThan(0);
    }
  });
});
