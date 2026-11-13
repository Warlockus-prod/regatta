import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { quickRefreshLessons } from "./bootcamp";
import { glossaryTerms, maneuvers, pointsOfSail } from "./sailing-data";
import { SAILING_PICTURE_SIZE, SAILING_SECTIONS, SAILING_SUBJECTS, SAILING_SUBJECT_ALIASES, SAILING_SUBJECT_IDS, sailingSectionSubjects, sailingSubject, sailingVisuals } from "./sailing-visuals";

// Package 32. Contract: every point of sail and both turns have BOTH a schematic and a picture,
// the same in every section, and every section that teaches one of them reads it from the registry.
describe("points of sail and turns: a schematic and a picture for each", () => {
  it("covers every point of sail of the data and the two turns that have steps", () => {
    const turns = maneuvers.filter(turn => (turn.stepsRu?.length ?? 0) > 0).map(turn => turn.id);
    expect(SAILING_SUBJECT_IDS).toEqual([...pointsOfSail.map(point => point.id), ...turns]);
    expect(turns).toEqual(["tacking", "jibing"]);
  });

  it("draws each point of sail inside the range the data gives it", () => {
    for (const point of pointsOfSail) {
      const subject = SAILING_SUBJECTS[point.id as keyof typeof SAILING_SUBJECTS];
      expect(subject.kind, point.id).toBe("point");
      if (subject.kind !== "point") continue;
      expect(subject.angle, point.id).toBeGreaterThanOrEqual(point.angleMin);
      expect(subject.angle, point.id).toBeLessThanOrEqual(point.angleMax);
    }
  });

  it("gives every subject a schematic without small text and a picture file of the declared size", () => {
    for (const id of SAILING_SUBJECT_IDS) {
      const visuals = sailingVisuals(id)!;
      const svg = visuals.schematic();
      expect(svg, id).toMatch(/^<svg [^>]*viewBox="0 0 800 600"/);
      // At most one label, and a large one: the drawing is shown in tiles 130 px wide.
      const sizes = [...svg.matchAll(/font-size="(\d+)"/g)].map(match => Number(match[1]));
      expect(sizes.length, id).toBeLessThanOrEqual(1);
      for (const size of sizes) expect(size, id).toBeGreaterThanOrEqual(74);
      const file = `public${visuals.picture.src}`;
      expect(existsSync(file), file).toBe(true);
      const bytes = readFileSync(file);
      expect(bytes.toString("ascii", 0, 4) + bytes.toString("ascii", 8, 12)).toBe("RIFFWEBP");
      expect(statSync(file).size, file).toBeGreaterThan(5000);
      expect(visuals.picture).toMatchObject(SAILING_PICTURE_SIZE);
    }
    expect(readdirSync("public/learning/courses").sort()).toEqual(SAILING_SUBJECT_IDS.map(id => `${id}.webp`).sort());
    // Distinct drawings: a subject is not shown by its neighbour's schematic.
    expect(new Set(SAILING_SUBJECT_IDS.map(id => sailingVisuals(id)!.schematic())).size).toBe(SAILING_SUBJECT_IDS.length);
  });

  it("resolves the glossary's names for the same subjects, and nothing else", () => {
    const shared = glossaryTerms.map(term => term.id).filter(id => sailingSubject(id) !== null).sort();
    expect(shared).toEqual(Object.keys(SAILING_SUBJECT_ALIASES).sort());
    expect(shared).toHaveLength(8);
    expect(sailingVisuals("no-go-zone")!.id).toBe("in-irons");
    expect(sailingVisuals("man-tacking")!.id).toBe("tacking");
    for (const id of ["man-luffing", "port", "constructor", "toString"]) expect(sailingVisuals(id), id).toBeNull();
  });

  it("names real cards in the sections that teach these subjects, and the pages read the registry", () => {
    for (const [card, subjects] of Object.entries(SAILING_SECTIONS.quick)) {
      expect(quickRefreshLessons.some(lesson => lesson.id === card), card).toBe(true);
      expect(sailingSectionSubjects("quick", card)).toEqual(subjects);
    }
    expect(sailingSectionSubjects("quick", "q-rules")).toEqual([]);
    expect(readFileSync("src/app/glossary/page.tsx", "utf8")).toContain("<SubjectVisuals id={term.id}");
    const courses = readFileSync("src/app/courses/page.tsx", "utf8");
    expect(courses).toContain("<SubjectVisuals id={point.id}");
    expect(courses).toContain("<SubjectVisuals id={maneuver.id}");
    expect(readFileSync("src/app/quick/page.tsx", "utf8")).toContain("sailingSectionSubjects('quick', l.id)");
  });
});
