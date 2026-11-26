/**
 * Package 32: the sailing subjects (points of sail, turns, wind, trim), the sail lessons'
 * pictures and the trainer exercises' pairs. Contract for the app: each subject
 * has both visuals bundled (the schematic is drawn by the shared renderer, the picture is the
 * very file the site ships), the native component draws the pair by the item's id or its
 * glossary alias, and the screens that teach these subjects read the shared registry.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { glossaryTerms, maneuvers, pointsOfSail, quickRefreshLessons, racingRules, racingStrategies, ruleScenarios } from "../src/data";
import { COURSE_SUBJECTS, DRILL_SUBJECTS, LESSON_FRAME_IDS, SAILING_SECTIONS, SAILING_SUBJECT_IDS, SAIL_LESSON_PICTURES, drillVisuals, foundationLessonVisuals, ruleVisuals, sailingSubject, sailingVisuals, tacticsVisuals } from "../../src/data/sailing-visuals";
import { LessonPicture, SubjectPicture, SubjectStrip, SubjectThumbs, SubjectVisuals } from "../src/learning/SubjectVisuals";
import { subjectSchematic } from "../../src/data/sailing-schematics";
import { SUBJECT_PICTURE_ASSETS } from "../src/learning/subject-pictures.generated";
import { PART_PICTURE_ASSETS } from "../src/anatomy/part-visuals.generated";
import { DRILLS, MISSIONS } from "../src/simulator/missions";

const labels = { diagram: "Diagram", picture: "On the water" };
const root = join(__dirname, "../..");

it("bundles a picture for exactly the subjects and lesson frames of the registry", () => {
  const turns = maneuvers.filter(turn => (turn.stepsRu?.length ?? 0) > 0).map(turn => turn.id);
  expect(Object.keys(COURSE_SUBJECTS)).toEqual([...pointsOfSail.map(point => point.id), ...turns]);
  expect(Object.keys(SUBJECT_PICTURE_ASSETS).sort()).toEqual([...SAILING_SUBJECT_IDS, ...LESSON_FRAME_IDS].sort());
  const site = join(root, "public/learning/subjects"), app = join(root, "mobile/assets/learning/subjects");
  expect(readdirSync(app).sort()).toEqual(readdirSync(site).sort());
  for (const name of readdirSync(site)) expect(readFileSync(join(app, name)).equals(readFileSync(join(site, name)))).toBe(true);
});

it("draws the pair for a point of sail, for a glossary alias and for a part, and nothing else", () => {
  const point = render(<SubjectVisuals id="beam-reach" name="Beam reach" labels={labels} />);
  expect(point.getByLabelText("Beam reach: Diagram")).toBeTruthy();
  expect(point.getByLabelText("Beam reach: On the water")).toBeTruthy();
  const picture = point.getByTestId("subject-picture");
  expect(picture.props.source).toBe(SUBJECT_PICTURE_ASSETS["beam-reach"]);
  // An explicit height next to the ratio: without it React Native keeps the file's own height.
  expect(StyleSheet.flatten(picture.props.style)).toMatchObject({ width: "100%", height: undefined, aspectRatio: 4 / 3 });
  expect("height" in StyleSheet.flatten(picture.props.style)).toBe(true);

  const alias = render(<SubjectVisuals id="man-tacking" name="Tacking" labels={labels} />);
  expect(alias.getByTestId("subject-picture").props.source).toBe(SUBJECT_PICTURE_ASSETS.tacking);
  expect(render(<SubjectVisuals id="rudder" name="Rudder" labels={labels} />).getByTestId("part-visuals")).toBeTruthy();
  expect(render(<SubjectVisuals id="man-luffing" name="Luffing" labels={labels} />).getByTestId("subject-picture").props.source).toBe(SUBJECT_PICTURE_ASSETS.luffing);
  expect(render(<SubjectVisuals id="gust" name="Gust" labels={labels} />).getByLabelText("Gust: Diagram")).toBeTruthy();
  // "A sheet" is shown by the mainsheet's pair.
  expect(render(<SubjectVisuals id="sheet" name="Sheet" labels={labels} />).getByTestId("part-picture").props.source).toBe(PART_PICTURE_ASSETS.mainsheet);
  expect(render(<SubjectVisuals id="man-heaving-to" name="Heaving to" labels={labels} />).toJSON()).toBeNull();
});

it("shows a picture for every sail lesson, from the subject, the yacht part or the lesson's own frame", () => {
  const captions = { boat: "On the boat", water: "On the water" };
  for (const [lesson, asset] of Object.entries(SAIL_LESSON_PICTURES)) {
    const picture = render(<LessonPicture lessonId={lesson} name="Lesson" labels={captions} />).getByLabelText("part" in asset ? "Lesson: On the boat" : "Lesson: On the water");
    expect(picture.props.source).toBe("part" in asset ? PART_PICTURE_ASSETS[asset.part] : SUBJECT_PICTURE_ASSETS[asset.frame]);
    expect(picture.props.source).toBeDefined();
    expect("height" in StyleSheet.flatten(picture.props.style)).toBe(true);
  }
  expect(render(<LessonPicture lessonId="nope" name="x" labels={captions} />).toJSON()).toBeNull();
});

it("gives every native exercise and mission the pair of the subject it practises", () => {
  for (const item of [...DRILLS, ...MISSIONS]) {
    expect(DRILL_SUBJECTS[item.id]).toBeDefined();
    expect(render(<SubjectThumbs visuals={drillVisuals(item.id)} />).getByTestId("subject-thumbs", { includeHiddenElements: true })).toBeTruthy();
  }
  expect(render(<SubjectThumbs visuals={drillVisuals("nope")} />).toJSON()).toBeNull();
});

it("shows every subject a card teaches, and no strip for a card that teaches none", () => {
  const names = (id: string) => (pointsOfSail.find(point => point.id === id) ?? maneuvers.find(turn => turn.id === id))!.nameEn;
  const strip = render(<SubjectStrip ids={SAILING_SECTIONS.quick["q-courses"]} names={names} labels={labels} title="What it looks like" />);
  expect(strip.getAllByTestId("subject-visuals")).toHaveLength(5);
  expect(render(<SubjectStrip ids={[]} names={names} labels={labels} title="x" />).toJSON()).toBeNull();
});

it("wires the same registry into every native screen that teaches these subjects", () => {
  const source = (file: string) => readFileSync(join(__dirname, "..", file), "utf8");
  expect(source("app/glossary/index.tsx")).toContain("<SubjectVisuals id={term.id}");
  expect(source("app/courses/index.tsx")).toContain("<SubjectVisuals id={point.id}");
  expect(source("app/courses/index.tsx")).toContain("<SubjectVisuals id={maneuver.id}");
  expect(source("app/quick/index.tsx")).toContain("sailingSectionSubjects('quick', lesson.id)");
  // The app's own data has the terms and cards the registry names.
  expect(glossaryTerms.map(term => term.id).filter(id => sailingSubject(id) !== null)).toHaveLength(31);
  expect(source("src/sailing/SailingCourseScreen.tsx")).toContain("<LessonPicture lessonId={lesson.id}");
  expect(source("app/simulator/index.tsx")).toContain("<SubjectThumbs visuals={drillVisuals(d.id)} />");
  for (const card of Object.keys(SAILING_SECTIONS.quick)) expect(quickRefreshLessons.some(lesson => lesson.id === card)).toBe(true);
  for (const id of SAILING_SUBJECT_IDS) expect(subjectSchematic(id)).toContain('viewBox="0 0 800 600"');
});

it("shows the picture of the race subject a rule card, a tactic or a first lesson draws", () => {
  const source = (file: string) => readFileSync(join(__dirname, "..", file), "utf8");
  // The app's own copies of the rules and the tactics are the ones the registry names.
  expect(ruleScenarios.filter(rule => ruleVisuals(rule)).length).toBe(16);
  for (const item of [...racingStrategies, ...racingRules]) expect(SUBJECT_PICTURE_ASSETS[tacticsVisuals(item.id)!.id]).toBeDefined();
  const rule = ruleScenarios.find(item => item.id === "mark-room")!;
  const shown = render(<SubjectPicture visuals={ruleVisuals(rule)} name="Mark-room" label="On the water" />);
  expect(shown.getByLabelText("Mark-room: On the water").props.source).toBe(SUBJECT_PICTURE_ASSETS["mark-room"]);
  // A card the scene cannot show (lights at night) has no picture rather than a wrong one.
  expect(render(<SubjectPicture visuals={ruleVisuals(ruleScenarios.find(item => item.id === "colregs-lights-basics")!)} name="x" label="y" />).toJSON()).toBeNull();
  expect(foundationLessonVisuals("simple-rules")!.id).toBe("port-vs-starboard");
  expect(source("app/rules/[id].tsx")).toContain("<SubjectPicture visuals={ruleVisuals(scenario)}");
  expect(source("app/racing/index.tsx")).toContain("<SubjectPicture visuals={ruleVisual}");
  expect(source("app/racing/index.tsx")).toContain("<SubjectPicture visuals={tacticsVisuals(strategy.id)}");
  expect(source("src/bootcamp/FoundationScene.tsx")).toContain("<SubjectPicture visuals={foundationLessonVisuals(id)}");
});
