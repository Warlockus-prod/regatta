import { describe, expect, it } from "vitest";
import { SRC_BANK } from "@/data/src-radio";
import { THEORY_CHAPTERS, THEORY_SOURCES, TOTAL_THEORY_MINUTES } from "./courseData";
import { ALL_MAPPED_QUESTION_IDS } from "./courseMap";

describe("SRC theory course", () => {
  it("contains a complete 18 chapter sequence", () => {
    expect(THEORY_CHAPTERS).toHaveLength(18);
    expect(THEORY_CHAPTERS.map((chapter) => chapter.number)).toEqual(
      Array.from({ length: 18 }, (_, index) => index + 1),
    );
    expect(new Set(THEORY_CHAPTERS.map((chapter) => chapter.id)).size).toBe(18);
    expect(new Set(THEORY_CHAPTERS.map((chapter) => chapter.diagram)).size).toBe(18);
  });

  it("connects every chapter to reasoning, procedure, sources, and practice", () => {
    for (const chapter of THEORY_CHAPTERS) {
      expect(chapter.why.pl.length).toBeGreaterThan(40);
      expect(chapter.why.ru.length).toBeGreaterThan(40);
      expect(chapter.concepts.length).toBeGreaterThanOrEqual(3);
      expect(chapter.steps.length).toBeGreaterThanOrEqual(3);
      expect(chapter.allowed.length).toBeGreaterThanOrEqual(2);
      expect(chapter.forbidden.length).toBeGreaterThanOrEqual(2);
      expect(chapter.questionTopics.length).toBeGreaterThanOrEqual(3);
      expect(chapter.sourceIds.length).toBeGreaterThanOrEqual(3);
      expect(chapter.practiceHref.startsWith("/radio/")).toBe(true);
      expect(chapter.minutes).toBeGreaterThan(0);
      expect(chapter.questionIds?.length).toBeGreaterThan(0);
    }
  });

  it("maps every official UKE study question to theory", () => {
    expect(new Set(ALL_MAPPED_QUESTION_IDS)).toEqual(
      new Set(SRC_BANK.map((question) => question.id)),
    );
  });

  it("uses only declared sources and has a realistic duration", () => {
    const sourceIds = new Set(THEORY_SOURCES.map((source) => source.id));
    for (const chapter of THEORY_CHAPTERS) {
      for (const sourceId of chapter.sourceIds) expect(sourceIds.has(sourceId)).toBe(true);
    }
    expect(TOTAL_THEORY_MINUTES).toBeGreaterThanOrEqual(240);
    expect(TOTAL_THEORY_MINUTES).toBeLessThanOrEqual(360);
  });
});
