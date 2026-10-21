import { describe, expect, it } from "vitest";
import { bootcampLessons } from "../../data/bootcamp";
import { sailLessons } from "../../data/sailing-lab/course";
import { bookmarkForPath, emptyLearningSnapshot, homeLearning, readLearningBookmark } from "./learning";

describe("honest home learning continuation", () => {
  it("starts a new learner without fabricating progress", () => {
    const next = homeLearning(emptyLearningSnapshot(), "en", "web");
    expect(next.href).toBe("/courses#wind");
    expect(next.started).toBe(false);
    expect(next.count).toBe(0);
  });
  it("uses existing nonsequential bootcamp progress", () => {
    const next = homeLearning({ ...emptyLearningSnapshot(), bootcamp: { completed: ["wind-direction", "tacking", "removed-id"], current: "how-sail-works" } }, "en", "native");
    expect(next.href).toBe("/bootcamp/how-sail-works");
    expect(next.count).toBe(2);
    expect(next.metric).toBe("Lessons visited");
  });
  it("resumes the last opened sail lesson, not the first ungraded one", () => {
    const next = homeLearning({ ...emptyLearningSnapshot(), bookmark: JSON.stringify(bookmarkForPath("/learn/sails/winch-clutch", "web")) }, "ru", "web");
    expect(next.href).toBe("/learn/sails/winch-clutch");
    expect(next.count).toBe(0);
  });
  it("advances after a saved theory check without counting practical mastery", () => {
    const snapshot = { ...emptyLearningSnapshot(), bookmark: JSON.stringify({ version: 1, course: "sails", lesson: sailLessons[0].id }), sails: JSON.stringify({ version: 1, current: sailLessons[0].id, checked: [sailLessons[0].id] }) };
    const next = homeLearning(snapshot, "en", "native");
    expect(next.href).toBe(`/learn/sails/${sailLessons[1].id}`);
    expect(next.metric).toBe("Theory checks passed");
  });
  it("falls back to legacy sail progress if there is no bookmark or bootcamp", () => {
    const next = homeLearning({ ...emptyLearningSnapshot(), sails: JSON.stringify({ version: 1, checked: [], current: "winch-clutch" }) }, "en", "web");
    expect(next.href).toBe("/learn/sails/winch-clutch");
  });
  it("opens the platform-specific radio course without an invented percentage", () => {
    const snapshot = { ...emptyLearningSnapshot(), bookmark: JSON.stringify(bookmarkForPath("/radio/teoria", "web")) };
    expect(homeLearning(snapshot, "en", "native")).toMatchObject({ href: "/kursy/radio", total: null, count: null });
    expect(homeLearning(snapshot, "en", "web").href).toBe("/radio");
  });
  it("does not let reference or free practice overwrite the current course", () => {
    for (const path of ["/menu", "/anatomy", "/simulator-v3", "/learn/sails", "/radio-fake", "/learn/sails/missing"]) expect(bookmarkForPath(path, "web")).toBeNull();
  });
  it("rejects malformed records and never accepts a saved external route", () => {
    for (const raw of ["{", "null", "[]", '{"version":2,"course":"sails"}', '{"version":1,"course":"https://evil.test"}']) expect(readLearningBookmark(raw)).toBeNull();
    expect(readLearningBookmark('{"version":1,"course":"sails","lesson":"https://evil.test"}')?.lesson).toBeNull();
    expect(homeLearning({ ...emptyLearningSnapshot(), bootcamp: { completed: "bad", current: {} } }, "en", "web").count).toBe(0);
  });
  it("offers review rather than claiming expertise when all lessons were visited", () => {
    const next = homeLearning({ ...emptyLearningSnapshot(), bootcamp: { completed: bootcampLessons.map(l => l.id), current: null } }, "en", "web");
    expect(next.complete).toBe(true);
    expect(next.href).toBe("/start");
    expect(next.title).toBe("Review lessons");
  });
});
