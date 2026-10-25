import { afterEach, describe, expect, it, vi } from "vitest";
import { getQuizForLesson } from "../../data/bootcamp-quiz";
import { emptyFoundation, FOUNDATION_KEY, updateFoundationCheck } from "../learning/foundation-progress";
import { homeLearning } from "./learning";
import { readWebLearning } from "./learning-web";

afterEach(() => vi.unstubAllGlobals());
describe("website continuation reads actual foundation evidence", () => {
  it("keeps old bytes intact and resumes an original passed check using the new evidence only", () => {
    const old = '{"v":1,"data":{"completed":["wind-direction","tacking"],"current":"wind-direction","updatedAt":7}}';
    const values = new Map([["regatta.bootcamp", old]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null });
    expect(homeLearning(readWebLearning(), "en", "web")).toMatchObject({ href: "/start?lesson=wind-direction", count: 0, metric: "Theory checks passed" });
    const answers = Object.fromEntries(getQuizForLesson("wind-direction").map(question => [question.id, question.options.find(option => option.correct)!.id]));
    values.set(FOUNDATION_KEY, JSON.stringify(updateFoundationCheck({ ...emptyFoundation(), current: "wind-direction" }, "wind-direction", answers, 1)));
    expect(homeLearning(readWebLearning(), "en", "web")).toMatchObject({ href: "/start?lesson=points-of-sail", count: 1 });
    expect(values.get("regatta.bootcamp")).toBe(old);
  });
  it("reports inaccessible or corrupt new evidence instead of showing a guessed zero or overwriting it", () => {
    vi.stubGlobal("localStorage", { getItem: (key: string) => key === FOUNDATION_KEY ? "broken" : null });
    expect(() => readWebLearning()).toThrow("Unreadable foundation evidence");
    vi.stubGlobal("localStorage", { getItem() { throw new Error("Storage unavailable"); } });
    expect(() => readWebLearning()).toThrow("Storage unavailable");
  });
});
