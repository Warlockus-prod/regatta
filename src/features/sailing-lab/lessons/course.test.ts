import { describe, expect, it } from "vitest";
import { sailLessons } from "../../../data/sailing-lab/course";
import { checkSailTheory, emptySailProgress, nextSailLesson, readSailProgress } from "./progress";
import { sailDiagram, windExample, diagramOptions, diagramReadout } from "./diagrams";
import { mainsheetExample, mainsheetReadout } from "./mainsheet-diagram";
import { vangExample } from "./shape-diagrams";
import { vangRiseLimit } from "../rig/vang";
import { telltaleState } from "./telltale-diagram";
import { REEF_PHASES, REEF_LINE } from "./reef-diagram";
import { halyardState, camberAt } from "./halyard-diagram";
import { jibLeadState, luffHit, JIB_CARS } from "./jib-lead-diagram";
import { slotGap } from "./slot-diagram";
import { helmZone, helmState, HELM_ANGLES } from "./helm-diagram";
import { courseModules, learningCopy, lessonTermIds, lessonTerms } from "../../../data/sailing-lab/learning-path";
import { assessmentCopy } from "../../../data/sailing-lab/assessment-copy";

describe("sailing theory module", () => {
  it("groups every available lesson exactly once and supplies contextual terms in all languages", () => {
    expect(courseModules.flatMap(module => module.lessons)).toEqual(sailLessons.map(lesson => lesson.id));
    for (const lesson of sailLessons) {
      expect(lessonTermIds[lesson.id].length).toBeGreaterThan(1);
      expect(new Set(lessonTermIds[lesson.id]).size).toBe(lessonTermIds[lesson.id].length);
    }
    const labels = [...Object.values(learningCopy), ...Object.values(assessmentCopy), ...Object.values(lessonTerms).flatMap(term => [term.name, term.meaning]), ...courseModules.map(module => module.title)];
    for (const label of labels) {
      for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
        expect(label[lang].length).toBeGreaterThan(2);
        expect(label[lang]).not.toMatch(/[\u2013\u2014]/);
      }
    }
  });
  it("offers thirteen real lessons: shared geometry, the book module and a working equipment bench", () => {
    expect(sailLessons).toHaveLength(13);
    expect(sailLessons.find(l => l.id === "winch-clutch")?.practice).toBe("line-bench");
    expect(sailDiagram("winch", 0)).not.toBe(sailDiagram("winch", 1));
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

  it("appends the book-based lessons after the original six, so stored progress keeps its order", () => {
    expect(sailLessons.slice(0, 6).map(l => l.id)).toEqual(["rig-basics", "apparent-wind", "sheet-control", "mainsheet", "vang", "outhaul"]);
    expect(sailLessons.slice(6, 12).map(l => l.id)).toEqual(["telltales", "halyard", "jib-lead", "slot", "trim-doctor", "reef"]);
    expect(nextSailLesson({ version: 1, checked: sailLessons.slice(0, 6).map(l => l.id), current: null })?.id).toBe("telltales");
    // The equipment lesson is appended after the book module, never inserted.
    expect(sailLessons.slice(12).map(l => l.id)).toEqual(["winch-clutch"]);
    expect(nextSailLesson({ version: 1, checked: sailLessons.slice(0, 12).map(l => l.id), current: null })?.id).toBe("winch-clutch");
    for (const lesson of sailLessons.slice(6, 12)) {
      expect(lesson.destination).toBe("boat");
      expect(lesson.sections.length).toBeGreaterThanOrEqual(3);
      expect(lesson.observe.en).toMatch(/checked (afloat|on the boat)/);
      const options = diagramOptions(lesson.diagram, "en");
      expect(options.length).toBeGreaterThanOrEqual(3);
      expect(diagramReadout(lesson.diagram, 0, "en")).toBeTruthy();
      const drawings = options.map(o => sailDiagram(lesson.diagram, o.value));
      expect(new Set(drawings).size).toBe(options.length);
    }
  });
  it("derives which telltale breaks from the incidence at the entry", () => {
    expect(telltaleState(0)).toMatchObject({ windward: "breaking", leeward: "streaming" });
    expect(telltaleState(1)).toMatchObject({ windward: "streaming", leeward: "streaming" });
    expect(telltaleState(2)).toMatchObject({ windward: "streaming", leeward: "breaking" });
    expect(telltaleState(Number.NaN)).toEqual(telltaleState(1));
  });
  it("keeps the reefing order both books insist on", () => {
    const phaseOf = (pred: (p: (typeof REEF_PHASES)[number]) => boolean) => REEF_PHASES.findIndex(pred);
    const liftTaken = phaseOf(p => p.lines.includes(REEF_LINE.toppingLift) && !p.liftSlack);
    const halyardEased = phaseOf(p => p.headDrop);
    const reefLineIn = phaseOf(p => p.lines.includes(REEF_LINE.reefLine));
    const liftEased = phaseOf(p => p.liftSlack);
    // Boom onto the topping lift before the halyard comes down, or it drops into the cockpit.
    expect(liftTaken).toBeLessThan(halyardEased);
    // Reef line only after the tack is hooked and the halyard is back up, with sheet and vang still eased.
    expect(REEF_PHASES[reefLineIn].tackHooked).toBe(true);
    expect(REEF_PHASES[reefLineIn].lines).toContain(REEF_LINE.halyard);
    expect(REEF_PHASES[reefLineIn].sheetsSlack).toBe(true);
    // Topping lift eased last, together with setting sheet and vang, or the main twists hugely.
    expect(liftEased).toBe(REEF_PHASES.length - 1);
    expect(REEF_PHASES.slice(0, -1).every(p => p.sheetsSlack)).toBe(true);
  });
  it("moves the draft forward and rounds the entry as the halyard tightens", () => {
    const [eased, set, tight] = [0, 1, 2].map(halyardState);
    expect(eased.draftPct).toBeGreaterThan(set.draftPct);
    expect(set.draftPct).toBeGreaterThan(tight.draftPct);
    expect([eased.wrinkles, set.wrinkles, tight.wrinkles]).toEqual(["across", "none", "along"]);
    // Camber peaks at the draft, and a forward draft means a rounder entry.
    expect(camberAt(.45, .45)).toBeCloseTo(1, 9);
    expect(camberAt(.1, .35)).toBeGreaterThan(camberAt(.1, .55));
  });
  it("computes where the sheet line meets the luff instead of drawing it", () => {
    const [aft, neutral, forward] = [0, 1, 2].map(jibLeadState);
    expect(neutral.hit).toBeCloseTo(.5, 6);
    expect(forward.hit).toBeGreaterThan(neutral.hit);
    expect(aft.hit).toBeLessThan(neutral.hit);
    expect(luffHit(JIB_CARS[1] - 10)).toBeGreaterThan(luffHit(JIB_CARS[1]));
    // Too much twist luffs the top first (move the car forward); too little, the foot.
    expect([aft.luffsFirst, neutral.luffsFirst, forward.luffsFirst]).toEqual(["top", "whole", "bottom"]);
  });
  it("measures the slot rather than drawing a width", () => {
    const [narrow, right, wide] = [0, 1, 2].map(slotGap);
    expect(narrow).toBeLessThan(right);
    expect(right).toBeLessThan(wide);
    expect(narrow).toBeGreaterThan(0);
  });
  it("classifies the helm with the book's 3 / 5 / 8 degree thresholds", () => {
    expect([-1, 1, 3, 5, 5.1, 8, 8.1].map(helmZone)).toEqual(["lee", "light", "optimal", "optimal", "brake", "brake", "reduce"]);
    expect(HELM_ANGLES.map(a => helmZone(a))).toEqual(["lee", "optimal", "brake", "reduce"]);
    expect(helmState(Number.NaN)).toEqual(helmState(1));
  });
  // Against heavy helm the main is reefed first: less genoa moves the centre of
  // effort aft and makes the helm heavier (book audit on D4-36). The lesson once
  // offered "reef the main or roll away genoa" as equals.
  it("cures heavy helm with a main reef, not with less genoa", () => {
    const doctor = sailLessons.find(l => l.id === "trim-doctor")!;
    const reduce = HELM_ANGLES.findIndex(a => helmZone(a) === "reduce");
    const genoa = /genu|genoa|génova|génois|гену/i;
    for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
      expect(doctor.answers[doctor.correct][lang]).not.toMatch(genoa);
      expect(diagramReadout("helm", reduce, lang)).not.toMatch(genoa);
    }
    expect(doctor.answers[doctor.correct].en).toBe("Reduce sail: reef the main first");
  });
});
