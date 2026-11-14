import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { partVisuals } from "./anatomy-visuals";
import { bootcampLessons, quickRefreshLessons } from "./bootcamp";
import { trainerCatalog } from "./drills";
import { ruleScenarios } from "./rules";
import { glossaryTerms, maneuvers, pointsOfSail, racingRules, racingStrategies } from "./sailing-data";
import { sailLessons } from "./sailing-lab/course";
import {
  COURSE_SUBJECTS, DRILL_SUBJECTS, FOUNDATION_LESSON_SUBJECTS, HEEL_SHOWN_DEG, LESSON_FRAME_IDS, RACE_SUBJECTS, RULES_WITHOUT_PICTURE, SAILING_PICTURE_SIZE, SAILING_SECTIONS,
  SAILING_SUBJECT_ALIASES, SAILING_SUBJECT_IDS, SAIL_LESSON_PICTURES, TACTICS_SUBJECTS, TRIM_SUBJECTS, WIND_SUBJECTS, drillVisuals, foundationLessonThumb, foundationLessonVisuals,
  FOUNDATION_OWN_PHOTO, ruleVisuals,
  sailLessonPicture, sailingSectionSubjects, sailingSubject, sailingVisuals, tacticsVisuals,
} from "./sailing-visuals";

const isWebp = (file: string) => { const bytes = readFileSync(file); return bytes.toString("ascii", 0, 4) + bytes.toString("ascii", 8, 12) === "RIFFWEBP"; };

// Package 32. Contract: every sailing subject (point of sail, turn, wind, trim, the race) has BOTH
// a schematic and a picture, the same in every section; every section that teaches one reads it
// from the registry; every sail lesson and "From scratch" lesson has a picture, every trainer
// exercise has both, and a rule card or a tactic shows the picture of the subject it draws.
describe("sailing subjects: a schematic and a picture for each", () => {
  it("covers every point of sail of the data, the two turns that have steps and every wind term of the glossary", () => {
    const turns = maneuvers.filter(turn => (turn.stepsRu?.length ?? 0) > 0).map(turn => turn.id);
    expect(Object.keys(COURSE_SUBJECTS)).toEqual([...pointsOfSail.map(point => point.id), ...turns]);
    expect(turns).toEqual(["tacking", "jibing"]);
    expect(Object.keys(WIND_SUBJECTS)).toEqual(glossaryTerms.filter(term => term.category === "wind").map(term => term.id));
    expect(SAILING_SUBJECT_IDS).toEqual([...Object.keys(COURSE_SUBJECTS), ...Object.keys(WIND_SUBJECTS), ...Object.keys(TRIM_SUBJECTS), ...Object.keys(RACE_SUBJECTS)]);
  });

  it("draws each point of sail inside the range the data gives it", () => {
    for (const point of pointsOfSail) {
      const subject = COURSE_SUBJECTS[point.id as keyof typeof COURSE_SUBJECTS];
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
      // At most one label, and a large one: the drawing is shown in tiles 100 px wide.
      const sizes = [...svg.matchAll(/font-size="(\d+)"/g)].map(match => Number(match[1]));
      expect(sizes.length, id).toBeLessThanOrEqual(1);
      for (const size of sizes) expect(size, id).toBeGreaterThanOrEqual(74);
      // The wind is the same blue arrow in every drawing.
      expect(svg, id).toContain('stroke="#006ea6"');
      const file = `public${visuals.picture.src}`;
      expect(existsSync(file), file).toBe(true);
      expect(isWebp(file), file).toBe(true);
      expect(statSync(file).size, file).toBeGreaterThan(5000);
      expect(visuals.picture).toMatchObject(SAILING_PICTURE_SIZE);
    }
    // Distinct drawings: a subject is not shown by its neighbour's schematic.
    expect(new Set(SAILING_SUBJECT_IDS.map(id => sailingVisuals(id)!.schematic())).size).toBe(SAILING_SUBJECT_IDS.length);
    expect(sailingVisuals("heeling")!.schematic()).toContain(`>${HEEL_SHOWN_DEG}°<`);
  });

  it("ships exactly the pictures the subjects and the lessons name", () => {
    expect(readdirSync("public/learning/subjects").sort()).toEqual([...SAILING_SUBJECT_IDS, ...LESSON_FRAME_IDS].map(id => `${id}.webp`).sort());
  });

  it("resolves the glossary's names for the same subjects, and nothing else", () => {
    const direct = ["true-wind", "apparent-wind", "windward", "leeward", "gust", "lull", "wind-shift", "trim", "halyard", "luff-sail", "leech", "heeling", "vmg", "vmc"];
    const shared = glossaryTerms.map(term => term.id).filter(id => sailingSubject(id) !== null).sort();
    // "beating" is a manoeuvre of the points-of-sail page, not a glossary term.
    expect(shared).toEqual([...Object.keys(SAILING_SUBJECT_ALIASES).filter(id => id !== "beating"), ...direct].sort());
    expect(shared).toHaveLength(31);
    expect(maneuvers.some(turn => turn.id === "beating")).toBe(true);
    expect(sailingVisuals("beating")!.id).toBe("upwind");
    expect(sailingVisuals("race-right-of-way")!.id).toBe("port-vs-starboard");
    expect(sailingVisuals("no-go-zone")!.id).toBe("in-irons");
    expect(sailingVisuals("man-tacking")!.id).toBe("tacking");
    expect(sailingVisuals("man-luffing")!.id).toBe("luffing");
    for (const id of ["man-heaving-to", "port", "race-protest", "start", "constructor", "toString"]) expect(sailingVisuals(id), id).toBeNull();
    // With the yacht parts (and "a sheet", shown by the mainsheet) 41 of the glossary's terms have the pair.
    expect(partVisuals("sheet")!.id).toBe("mainsheet");
    expect(glossaryTerms.filter(term => partVisuals(term.id) || sailingSubject(term.id)).length).toBe(41);
    for (const term of glossaryTerms) expect(Boolean(partVisuals(term.id)) && sailingSubject(term.id) !== null, term.id).toBe(false);
  });

  it("names real cards in the sections that teach these subjects, and the pages read the registry", () => {
    for (const [card, subjects] of Object.entries(SAILING_SECTIONS.quick)) {
      expect(quickRefreshLessons.some(lesson => lesson.id === card), card).toBe(true);
      expect(sailingSectionSubjects("quick", card)).toEqual(subjects);
    }
    // Every card of the 15-minute refresher names its subjects.
    expect(Object.keys(SAILING_SECTIONS.quick).sort()).toEqual(quickRefreshLessons.map(lesson => lesson.id).sort());
    expect(sailingSectionSubjects("quick", "q-none")).toEqual([]);
    expect(readFileSync("src/app/glossary/page.tsx", "utf8")).toContain("<SubjectVisuals id={term.id}");
    const courses = readFileSync("src/app/courses/page.tsx", "utf8");
    expect(courses).toContain("<SubjectVisuals id={point.id}");
    expect(courses).toContain("<SubjectVisuals id={maneuver.id}");
    expect(readFileSync("src/app/quick/page.tsx", "utf8")).toContain("sailingSectionSubjects('quick', l.id)");
  });
});

describe("sail lessons: a picture beside every lesson's drawing", () => {
  it("names a picture for every lesson of the course, and the file exists", () => {
    expect(Object.keys(SAIL_LESSON_PICTURES).sort()).toEqual(sailLessons.map(lesson => lesson.id).sort());
    for (const lesson of sailLessons) {
      const picture = sailLessonPicture(lesson.id)!;
      expect(existsSync(`public${picture.src}`), picture.src).toBe(true);
      expect(isWebp(`public${picture.src}`), picture.src).toBe(true);
      if ("part" in picture.asset) expect(partVisuals(picture.asset.part), lesson.id).not.toBeNull();
    }
    expect(sailLessonPicture("constructor")).toBeNull();
    // A lesson about a subject of the registry shows that subject's picture, not a second one.
    for (const id of ["apparent-wind", "halyard", "slot"]) expect(sailLessonPicture(id)!.src).toBe(sailingVisuals(id)!.picture.src);
  });

  it("is shown by the lesson page of the site and of the app", () => {
    expect(readFileSync("src/features/sailing-lab/ui/SailingCourse.tsx", "utf8")).toContain("<LessonPicture lessonId={lesson.id}");
    expect(readFileSync("mobile/src/sailing/SailingCourseScreen.tsx", "utf8")).toContain("<LessonPicture lessonId={lesson.id}");
  });
});

describe("trainer exercises: the schematic and the picture of what each one practises", () => {
  it("names a subject for every exercise of the catalogue", () => {
    expect(Object.keys(DRILL_SUBJECTS).sort()).toEqual(trainerCatalog.map(entry => entry.id).sort());
    for (const entry of trainerCatalog) expect(drillVisuals(entry.id), entry.id).not.toBeNull();
    expect(drillVisuals("toString")).toBeNull();
  });

  it("is shown by the exercise cards of the site and of the app", () => {
    for (const file of ["src/features/simulator-v3/ui/panels/ScenarioPicker.tsx", "src/features/simulator-v3/ui/panels/DrillCard.tsx"]) expect(readFileSync(file, "utf8"), file).toMatch(/<SubjectThumbs visuals=\{drillVisuals\([sd]\.id\)\}/);
    const native = readFileSync("mobile/app/simulator/index.tsx", "utf8");
    expect(native).toContain("<SubjectThumbs visuals={drillVisuals(d.id)} />");
    expect(native).toContain("<SubjectThumbs visuals={drillVisuals(m.id)} />");
  });
});

describe("the race: rule cards, tactics and the first lessons show the subject they draw", () => {
  it("gives a rule card the picture of the drawing it names, except the cards the scene cannot show", () => {
    for (const rule of ruleScenarios) {
      expect(Object.keys(RACE_SUBJECTS), rule.id).toContain(rule.svg);
      const visuals = ruleVisuals(rule);
      if (RULES_WITHOUT_PICTURE.includes(rule.id)) expect(visuals, rule.id).toBeNull();
      else expect(visuals!.id, rule.id).toBe(rule.svg);
    }
    // The cards without a picture are real cards of the collision regulations, never a racing rule.
    for (const id of RULES_WITHOUT_PICTURE) expect(ruleScenarios.find(rule => rule.id === id)?.source, id).toBe("colregs");
    expect(ruleScenarios.filter(rule => ruleVisuals(rule)).length).toBe(16);
  });

  it("names a subject for every strategy and every right-of-way rule of the tactics page", () => {
    expect(Object.keys(TACTICS_SUBJECTS).sort()).toEqual([...racingStrategies, ...racingRules].map(item => item.id).sort());
    for (const item of [...racingStrategies, ...racingRules]) expect(tacticsVisuals(item.id), item.id).not.toBeNull();
    expect(tacticsVisuals("start")!.id).toBe("start-line");
    expect(tacticsVisuals("toString")).toBeNull();
  });

  it("names a subject for every lesson of From scratch but the one with its own photo pair", () => {
    expect([...Object.keys(FOUNDATION_LESSON_SUBJECTS), "how-sail-works"].sort()).toEqual(bootcampLessons.map(lesson => lesson.id).sort());
    for (const id of Object.keys(FOUNDATION_LESSON_SUBJECTS)) expect(foundationLessonVisuals(id), id).not.toBeNull();
    expect(foundationLessonVisuals("how-sail-works")).toBeNull();
  });

  it("is shown by the rule cards, the tactics page and the first lessons of the site and of the app", () => {
    expect(readFileSync("src/app/rules/page.tsx", "utf8").match(/<SubjectPicture visuals=\{ruleVisuals\(r\)\}/g)).toHaveLength(2);
    const tactics = readFileSync("src/app/racing/page.tsx", "utf8");
    expect(tactics).toContain("<SubjectPicture visuals={tacticsVisuals(strategy.id)}");
    expect(tactics).toContain("<SubjectPicture visuals={tacticsVisuals(rule.id)}");
    expect(readFileSync("src/app/start/FoundationClient.tsx", "utf8")).toContain("<SubjectPicture visuals={foundationLessonVisuals(id)}");
    expect(readFileSync("mobile/app/rules/[id].tsx", "utf8")).toContain("<SubjectPicture visuals={ruleVisuals(scenario)}");
    const native = readFileSync("mobile/app/racing/index.tsx", "utf8");
    // The app's tactics screen had no drawing for the four rules: it shows the rule card's diagram and the picture.
    expect(native).toContain("<RuleScenarioDiagram scenario={{ svg: ruleVisual.id");
    expect(native).toContain("<SubjectPicture visuals={ruleVisual}");
    expect(native).toContain("<SubjectPicture visuals={tacticsVisuals(strategy.id)}");
    expect(readFileSync("mobile/src/bootcamp/FoundationScene.tsx", "utf8")).toContain("<SubjectPicture visuals={foundationLessonVisuals(id)}");
  });
});

// Package 32, stage C: lists show what each row is about.
describe("lists: a thumbnail in every row of the first lessons, the rule cards and the manoeuvres", () => {
  it("has a picture for every lesson of From scratch: its subject's frame, or the lesson's own photo", () => {
    for (const lesson of bootcampLessons) {
      const thumb = foundationLessonThumb(lesson.id)!;
      expect(existsSync(`public${thumb.src}`), lesson.id).toBe(true);
      expect(thumb.subject === null, lesson.id).toBe(lesson.id === FOUNDATION_OWN_PHOTO.lesson);
    }
    // The own photo is the first frame of the pair that lesson shows (src/data/sail-shape.ts).
    expect(readFileSync("src/data/sail-shape.ts", "utf8")).toContain(`src: "${FOUNDATION_OWN_PHOTO.src}"`);
    expect(foundationLessonThumb("toString")).toBeNull();
  });

  it("is drawn by the lists of the site and of the app", () => {
    expect(readFileSync("src/app/start/FoundationClient.tsx", "utf8")).toContain("foundationLessonThumb(item.id)");
    // Every rule card names a drawing, so every row of both lists (racing rules, collision regulations) has one.
    expect(readFileSync("src/app/rules/page.tsx", "utf8").match(/<SchematicThumb visuals=\{sailingVisuals\(r\.svg\)\} \/>/g)).toHaveLength(2);
    expect(readFileSync("src/features/manoeuvres/ManoeuvresApp.tsx", "utf8")).toMatch(/<Schematic exercise=\{e\}[^\n]* compact \/>/);
    expect(readFileSync("mobile/app/bootcamp/index.tsx", "utf8")).toContain("foundationLessonThumb(lesson.id)");
    expect(readFileSync("mobile/app/rules/index.tsx", "utf8")).toContain("sailingVisuals(scenario.svg)?.schematic()");
  });
});
