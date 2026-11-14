import { describe, expect, it } from "vitest";
import { THEORY_CHAPTERS } from "@/app/radio/teoria/courseData";
import { SCENARIOS } from "@/app/radio/symulator/scenarios";
import { anatomyParts } from "./anatomy";
import { PART_SECTIONS, isYachtPart, partVisuals } from "./anatomy-visuals";
import { bootcampLessons, quickRefreshLessons } from "./bootcamp";
import { checklistSections } from "./checklist";
import { trainerCatalog } from "./drills";
import { MANOEUVRES } from "./manoeuvres";
import { missions } from "./missions";
import { onboardSections } from "./onboard";
import { ruleScenarios } from "./rules";
import { glossaryTerms, pointsOfSail, racingRules, racingStrategies } from "./sailing-data";
import { sailLessons } from "./sailing-lab/course";
import { SAILING_SECTIONS, drillVisuals, sailLessonPicture, sailingSubject } from "./sailing-visuals";
import { STERNIK_BANK } from "./sternik";

// Package 32 (owner 2026-11-13: "walk the whole tree, every screen: nothing present in one
// section and missing in another"). The coverage matrix of the whole product, kept in code:
// for every section that lists teaching items, how many items there are and how many have a
// schematic, a picture, both. Numbers are computed from the data where the data says it and
// declared from the 2026-11-13 inventory where a page attaches the visual by hand
// (docs/audits/2026-11-13-visual-coverage-matrix.md names the file for each).
//
// The test pins the matrix: closing a gap, or opening one, changes a number here and has to be
// written down in this file and in the document in the same commit. The target for every row is
// both = items; the rows are ordered as the product's sections are.
interface Row { items: number; schematic: number; picture: number; both: number }
const count = <T,>(list: readonly T[], schematic: (item: T) => boolean, picture: (item: T) => boolean): Row => ({
  items: list.length, schematic: list.filter(schematic).length, picture: list.filter(picture).length,
  both: list.filter(item => schematic(item) && picture(item)).length,
});
const none = () => false, all = () => true;
const sectionsWithParts = (page: keyof typeof PART_SECTIONS) => (section: { id: string }) => Object.prototype.hasOwnProperty.call(PART_SECTIONS[page], section.id);

const matrix: Record<string, Row> = {
  // Learn
  // Every lesson draws its scene by id (src/lib/learning/foundation-drawings.ts); one has a photo pair (src/app/start/FoundationClient.tsx).
  "learn/from-scratch lessons": count(bootcampLessons, all, lesson => lesson.id === "how-sail-works"),
  // Every lesson draws its own diagram; its picture is named in SAIL_LESSON_PICTURES (src/data/sailing-visuals.ts).
  "learn/sails lessons": count(sailLessons, lesson => Boolean(lesson.diagram), lesson => sailLessonPicture(lesson.id) !== null),
  "learn/15-minute cards": count(quickRefreshLessons, card => card.id in SAILING_SECTIONS.quick, card => card.id in SAILING_SECTIONS.quick),
  "learn/racing rules cards": count(ruleScenarios, card => Boolean(card.svg), none),
  // Site: a diagram per strategy and per rule (src/app/racing/page.tsx); the app has none for the four rules.
  "learn/tactics strategies": count(racingStrategies, all, none),
  "learn/tactics right-of-way rules": count(racingRules, all, none),
  "learn/points of sail": count(pointsOfSail, point => sailingSubject(point.id) !== null, point => sailingSubject(point.id) !== null),
  "learn/radio theory chapters": count(THEORY_CHAPTERS, chapter => Boolean(chapter.diagram), none),
  "learn/motorboat questions": count(STERNIK_BANK, question => Boolean(question.figure), question => Boolean(question.photo)),
  // Practice
  // An exercise shows the pair of the subject it practises (DRILL_SUBJECTS).
  "practice/trainer drills": count(trainerCatalog, entry => drillVisuals(entry.id) !== null, entry => drillVisuals(entry.id) !== null),
  // The briefing draws each exercise from its own geometry (src/features/manoeuvres/Schematic.tsx).
  "practice/manoeuvres": count(MANOEUVRES, all, none),
  "practice/radio scenarios": count(SCENARIOS, none, none),
  // Race
  "race/missions": count(missions, none, none),
  // Library
  "library/yacht parts": count(anatomyParts, part => isYachtPart(part.id), part => isYachtPart(part.id)),
  "library/glossary terms": count(glossaryTerms, term => partVisuals(term.id) !== null || sailingSubject(term.id) !== null, term => partVisuals(term.id) !== null || sailingSubject(term.id) !== null),
  "library/checklist sections": count(checklistSections, sectionsWithParts("checklist"), sectionsWithParts("checklist")),
  "library/onboard sections": count(onboardSections, sectionsWithParts("onboard"), sectionsWithParts("onboard")),
};

describe("visual coverage of the whole product", () => {
  it("matches the recorded matrix, row by row", () => {
    expect(matrix).toEqual({
      "learn/from-scratch lessons": { items: 8, schematic: 8, picture: 1, both: 1 },
      "learn/sails lessons": { items: 13, schematic: 13, picture: 13, both: 13 },
      "learn/15-minute cards": { items: 6, schematic: 3, picture: 3, both: 3 },
      "learn/racing rules cards": { items: 21, schematic: 21, picture: 0, both: 0 },
      "learn/tactics strategies": { items: 4, schematic: 4, picture: 0, both: 0 },
      "learn/tactics right-of-way rules": { items: 4, schematic: 4, picture: 0, both: 0 },
      "learn/points of sail": { items: 5, schematic: 5, picture: 5, both: 5 },
      "learn/radio theory chapters": { items: 18, schematic: 18, picture: 0, both: 0 },
      "learn/motorboat questions": { items: 879, schematic: 9, picture: 8, both: 0 },
      "practice/trainer drills": { items: 16, schematic: 16, picture: 16, both: 16 },
      "practice/manoeuvres": { items: 10, schematic: 10, picture: 0, both: 0 },
      "practice/radio scenarios": { items: 19, schematic: 0, picture: 0, both: 0 },
      "race/missions": { items: 4, schematic: 0, picture: 0, both: 0 },
      "library/yacht parts": { items: 17, schematic: 17, picture: 17, both: 17 },
      "library/glossary terms": { items: 56, schematic: 32, picture: 32, both: 32 },
      "library/checklist sections": { items: 9, schematic: 1, picture: 1, both: 1 },
      "library/onboard sections": { items: 12, schematic: 2, picture: 2, both: 2 },
    });
  });

  it("has finished rows to copy: yacht parts, points of sail, sail lessons and trainer exercises all have both visuals", () => {
    for (const row of ["library/yacht parts", "learn/points of sail", "learn/sails lessons", "practice/trainer drills"]) expect(matrix[row].both, row).toBe(matrix[row].items);
  });
});
