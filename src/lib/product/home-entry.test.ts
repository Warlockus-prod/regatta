import { afterEach, describe, expect, it, vi } from "vitest";
import { getQuizForLesson } from "../../data/bootcamp-quiz";
import { sailLessons } from "../../data/sailing-lab/course";
import { emptyFoundation, FOUNDATION_KEY, updateFoundationCheck } from "../learning/foundation-progress";
import { hasMeaningfulStep, homeEntryCopy } from "./home-entry";
import { bookmarkForPath, webStepEvidence } from "./learning";
import { readWebLearning } from "./learning-web";
import { LEARNING_BOOKMARK_KEY } from "./learning-bookmark";
import { SAIL_PROGRESS_KEY } from "../../features/sailing-lab/lessons/progress";

// Package 9 (audit K2): Home continues only after a meaningful step, a passed
// check or a completed lesson. A visit, an opened lesson or a look at another
// course is not one.

afterEach(() => vi.unstubAllGlobals());
const storage = (values: Map<string, string>) => vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null });
const evidence = (values: Map<string, string>) => { storage(values); return webStepEvidence(readWebLearning()); };

describe("the meaningful step rule", () => {
  it("is false for nothing and true for one passed lesson or one passed sail check", () => {
    expect(hasMeaningfulStep({ lessonsPassed: 0, sailChecksPassed: 0 })).toBe(false);
    expect(hasMeaningfulStep({ lessonsPassed: 1, sailChecksPassed: 0 })).toBe(true);
    expect(hasMeaningfulStep({ lessonsPassed: 0, sailChecksPassed: 1 })).toBe(true);
  });

  it("does not count visits: an opened lesson, an opened sail lesson, /sternik or /radio", () => {
    const values = new Map<string, string>();
    // Opened two lessons and their practice, no check answered.
    const visited = { ...emptyFoundation(), current: "tacking", visited: ["wind-direction", "tacking"], practiceOpened: ["wind-direction"] };
    values.set(FOUNDATION_KEY, JSON.stringify(visited));
    values.set(SAIL_PROGRESS_KEY, JSON.stringify({ version: 1, current: sailLessons[2].id, checked: [] }));
    for (const path of ["/sternik", "/radio", `/learn/sails/${sailLessons[2].id}`]) {
      values.set(LEARNING_BOOKMARK_KEY, JSON.stringify(bookmarkForPath(path, "web")));
      expect(hasMeaningfulStep(evidence(values))).toBe(false);
    }
  });

  it("counts a passed theory check of the first course on the website", () => {
    const values = new Map<string, string>();
    const answers = Object.fromEntries(getQuizForLesson("wind-direction").map(question => [question.id, question.options.find(option => option.correct)!.id]));
    values.set(FOUNDATION_KEY, JSON.stringify(updateFoundationCheck({ ...emptyFoundation(), current: "wind-direction" }, "wind-direction", answers, 1)));
    expect(evidence(values)).toEqual({ lessonsPassed: 1, sailChecksPassed: 0 });
    expect(hasMeaningfulStep(evidence(values))).toBe(true);
  });

  it("counts a passed sail check and ignores unknown lesson ids", () => {
    const values = new Map<string, string>([[SAIL_PROGRESS_KEY, JSON.stringify({ version: 1, current: null, checked: ["removed-id"] })]]);
    expect(hasMeaningfulStep(evidence(values))).toBe(false);
    values.set(SAIL_PROGRESS_KEY, JSON.stringify({ version: 1, current: null, checked: [sailLessons[0].id] }));
    expect(evidence(values)).toEqual({ lessonsPassed: 0, sailChecksPassed: 1 });
  });
});

const LONG_DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

describe("home entry words", () => {
  it("are complete in seven languages, without long dashes, Polish with diacritics", () => {
    for (const label of Object.values(homeEntryCopy)) {
      for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
        expect(label[lang].trim().length).toBeGreaterThan(0);
        expect(label[lang]).not.toMatch(LONG_DASHES);
      }
    }
    expect(homeEntryCopy.value.pl).toMatch(/[ąćęłńóśźż]/);
    expect(homeEntryCopy.startFromScratch.ru).toBe("Начать с нуля");
    expect(homeEntryCopy.straightToRace.ru).toBe("Сразу в гонку");
  });
});
