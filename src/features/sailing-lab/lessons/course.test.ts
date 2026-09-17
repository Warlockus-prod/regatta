import { describe, expect, it } from "vitest";
import { sailLessons } from "../../../data/sailing-lab/course";
import { checkSailTheory, emptySailProgress, nextSailLesson, readSailProgress } from "./progress";
import { sailDiagram, windExample } from "./diagrams";
import { mainsheetExample, mainsheetReadout } from "./mainsheet-diagram";
import { vangExample } from "./shape-diagrams";
import { vangRiseLimit } from "../rig/vang";

describe("sailing theory module", () => {
  it("offers six real lessons with shared vang geometry and lower-profile comparisons", () => {
    expect(sailLessons).toHaveLength(6);
    const short = vangExample(0), long = vangExample(1);
    expect(vangRiseLimit(short.span)).toBeCloseTo(2, 6);
    expect(vangRiseLimit(long.span)).toBeCloseTo(8, 6);
    expect(sailDiagram("vang", 0)).not.toBe(sailDiagram("vang", 1));
    expect(sailDiagram("outhaul", 0)).not.toBe(sailDiagram("outhaul", 1));
    expect(sailLessons.filter(l => l.study === "shape").map(l => l.id)).toEqual(["vang", "outhaul"]);
  });
  it("has real content, complete translations, unique ids and valid checks", () => {
    expect(new Set(sailLessons.map(l => l.id)).size).toBe(sailLessons.length);
    for (const lesson of sailLessons) {
      expect(lesson.answers[lesson.correct]).toBeDefined();
      expect(lesson.sections.length).toBeGreaterThanOrEqual(2);
      for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
        for (const section of lesson.sections) expect(section.body[lang].length).toBeGreaterThan(180);
        expect(lesson.explanation[lang].length).toBeGreaterThan(50);
      }
      expect(lesson.sources.every(source => source.url.startsWith("https://"))).toBe(true);
    }
  });
  it("does not mark a visit or wrong answer as theory completion", () => {
    const p = emptySailProgress();
    expect(checkSailTheory(p, "rig-basics", 0)).toBe(p);
    expect(checkSailTheory(p, "missing", 1)).toBe(p);
    const checked = checkSailTheory(p, "rig-basics", 1);
    expect(checked.checked).toEqual(["rig-basics"]);
    expect(checkSailTheory(checked, "rig-basics", 1).checked).toEqual(["rig-basics"]);
    expect(nextSailLesson(checked)?.id).toBe("apparent-wind");
  });
  it("recovers corrupted storage without manufacturing progress", () => {
    expect(readSailProgress("broken")).toEqual(emptySailProgress());
    expect(readSailProgress('{"version":7,"checked":["rig-basics"]}')).toEqual(emptySailProgress());
    expect(readSailProgress('{"version":1,"checked":["rig-basics","rig-basics",null,"no"],"current":"no"}')).toEqual({ version: 1, checked: ["rig-basics"], current: null });
  });
  it("computes the wind illustration rather than changing a decorative arrow", () => {
    expect(windExample(0)).toEqual({ boatSpeed: 0, aws: 8, awa: 90 });
    expect(windExample(4).aws).toBeCloseTo(8.94427);
    expect(windExample(4).awa).toBeCloseTo(63.4349);
    expect(windExample(8).awa).toBeCloseTo(45);
    expect(sailDiagram("wind", 4)).toContain("63.4°");
    expect(sailDiagram("rig", 1)).not.toBe(sailDiagram("rig", 2));
    expect(sailDiagram("sheet", 0)).toContain("12°");
    expect(sailDiagram("sheet", Number.NaN)).toBe(sailDiagram("sheet", 0));
    expect(sailDiagram("wind", 8)).toContain("L165 190");
  });
  it("compares equal boom angles using the shared rig layout and names the geometry-only scope", () => {
    const a = mainsheetExample(0), b = mainsheetExample(1);
    expect(a.pose.yaw).toBe(b.pose.yaw);
    expect(b.workingLength).toBeGreaterThan(a.workingLength);
    expect(b.pose.rise).toBeGreaterThan(a.pose.rise);
    expect(mainsheetExample(Number.NaN)).toEqual(a);
    expect(sailDiagram("mainsheet", 0)).not.toEqual(sailDiagram("mainsheet", 1));
    expect(mainsheetReadout(1, "en")).toContain(`${b.workingLength.toFixed(2)} m`);
    const lesson = sailLessons.find(l => l.id === "mainsheet")!;
    expect(lesson.observe.en).toContain("new session");
    expect(lesson.observe.en).toContain("not a practical assessment");
    expect(nextSailLesson({ version: 1, checked: sailLessons.slice(0, 3).map(l => l.id), current: null })?.id).toBe("mainsheet");
  });
});
