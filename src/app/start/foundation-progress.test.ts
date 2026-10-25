import { describe, expect, it } from "vitest";
import { bootcampLessons } from "@/data/bootcamp";
import { getQuizForLesson } from "@/data/bootcamp-quiz";
import { emptyFoundation, FOUNDATION_KEY, foundationHref, foundationPracticeHref, foundationReturnForSearch, LEGACY_FOUNDATION_KEY, loadFoundation, passedFoundationIds, readFoundationProgress, readLegacyFoundation, saveFoundation, theoryResult, updateFoundationCheck, updateFoundationDraft } from "@/lib/learning/foundation-progress";

const correct = (id: string) => Object.fromEntries(getQuizForLesson(id).map(question => [question.id, question.options.find(option => option.correct)!.id]));
const memory = (seed: Record<string, string> = {}) => {
  const data = new Map(Object.entries(seed));
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
};
describe("additive web foundation evidence", () => {
  it("keeps every old completed ID as viewed without inventing a passed check or changing the old bytes", () => {
    const old = JSON.stringify({ v: 1, data: { completed: bootcampLessons.map(lesson => lesson.id), current: "tacking", startedAt: 10, updatedAt: 20 } });
    const storage = memory({ [LEGACY_FOUNDATION_KEY]: old });
    const loaded = loadFoundation(storage);
    expect(loaded.visited).toHaveLength(8); expect(loaded.legacy.current).toBe("tacking");
    expect(passedFoundationIds(loaded.progress)).toEqual([]);
    saveFoundation(storage, { ...loaded.progress, current: "wind-direction", positions: { "wind-direction": { step: "check", diagram: 2 } } });
    expect(storage.data.get(LEGACY_FOUNDATION_KEY)).toBe(old);
    expect(loadFoundation(storage).progress.positions["wind-direction"]).toEqual({ step: "check", diagram: 2 });
  });
  it("grades the original answers and never trusts a stored score, an opened practice or a partial check", () => {
    const partial = correct("wind-direction"); delete partial["wd-q3"];
    expect(() => updateFoundationCheck(emptyFoundation(), "wind-direction", partial)).toThrow();
    const forged = readFoundationProgress(JSON.stringify({ version: 1, visited: ["wind-direction"], practiceOpened: ["wind-direction"], checks: { "wind-direction": { score: 100, passed: true, answeredAt: 1, answers: partial } } }))!;
    expect(theoryResult(forged, "wind-direction").passed).toBe(false);
    const answers = correct("wind-direction"); answers["wd-q1"] = "wd-q1-b";
    const failed = updateFoundationCheck(emptyFoundation(), "wind-direction", answers, 1);
    expect(theoryResult(failed, "wind-direction")).toMatchObject({ score: 2, total: 3, passed: false });
    const passed = updateFoundationCheck(failed, "wind-direction", correct("wind-direction"), 2);
    expect(passedFoundationIds(passed)).toEqual(["wind-direction"]); expect(passed.practiceOpened).toEqual([]);
  });
  it("restores an incomplete answer draft and step without awarding a check", () => {
    const progress = updateFoundationDraft({ ...emptyFoundation(), positions: { "wind-direction": { step: "check", diagram: 2 } } }, "wind-direction", { "wd-q1": "wd-q1-a", "wd-q2": "not-an-option", unknown: "a" });
    const restored = readFoundationProgress(JSON.stringify(progress))!;
    expect(restored.drafts["wind-direction"]).toEqual({ "wd-q1": "wd-q1-a" });
    expect(restored.positions["wind-direction"]).toEqual({ step: "check", diagram: 2 });
    expect(theoryResult(restored, "wind-direction").answered).toBe(false);
  });
  it("keeps unreadable or unwritable evidence intact and makes the same pending save retryable", () => {
    const storage = memory({ [FOUNDATION_KEY]: "broken" });
    expect(() => loadFoundation(storage)).toThrow(); expect(() => saveFoundation(storage, emptyFoundation())).toThrow();
    expect(storage.data.get(FOUNDATION_KEY)).toBe("broken");
    storage.data.delete(FOUNDATION_KEY);
    const pending = updateFoundationCheck(emptyFoundation(), "wind-direction", correct("wind-direction"), 1);
    expect(() => saveFoundation({ ...storage, setItem() { throw new Error("Disk full"); } }, pending)).toThrow();
    expect(passedFoundationIds(loadFoundation(storage).progress)).toEqual([]);
    saveFoundation(storage, pending);
    expect(passedFoundationIds(loadFoundation(storage).progress)).toEqual(["wind-direction"]);
  });
  it("preserves every old practice destination and carries a bounded visible return context", () => {
    for (const lesson of bootcampLessons) {
      const original = new URL(lesson.route, "https://local.invalid");
      const href = foundationPracticeHref(lesson.id);
      const next = new URL(href, "https://local.invalid");
      expect(next.pathname).toBe(original.pathname);
      expect(next.hash).toBe(original.hash);
      for (const [key, value] of original.searchParams) expect(next.searchParams.get(key)).toBe(value);
      expect(foundationReturnForSearch(next.search)).toBe(lesson.id);
      expect(foundationHref(lesson.id, "practice")).toBe(`/start?lesson=${lesson.id}&step=practice`);
      expect(foundationReturnForSearch(next.search, true)).toBeNull();
      next.searchParams.set("embed", "1");
      expect(foundationReturnForSearch(next.search)).toBeNull();
    }
    expect(foundationPracticeHref("removed-id")).toBe("/start");
    for (const search of ["", "?fromLesson=https://evil.test", "?fromLesson=../../game", "?fromLesson=removed-id"]) expect(foundationReturnForSearch(search)).toBeNull();
  });
  it("validates stable IDs, restores only known positions and confines generated course links", () => {
    const progress = readFoundationProgress(JSON.stringify({ version: 1, current: "../../evil", visited: ["wind-direction", "removed"], positions: { tacking: { step: "practice", diagram: 2 }, unknown: { step: "check", diagram: 1 } } }))!;
    expect(progress.current).toBeNull(); expect(progress.visited).toEqual(["wind-direction"]);
    expect(Object.keys(progress.positions)).toEqual(["tacking"]);
    expect(readLegacyFoundation("{broken")).toEqual({ visited: [], current: null });
    expect(foundationHref("wind-direction", "check")).toBe("/start?lesson=wind-direction&step=check");
    expect(foundationHref("../../evil")).toBe("/start");
  });
});
