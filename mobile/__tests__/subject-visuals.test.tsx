/**
 * Package 32, second subject: the points of sail and the two turns. Contract for the app: each
 * has both visuals bundled (the schematic is drawn by the shared renderer, the picture is the
 * very file the site ships), the native component draws the pair by the item's id or its
 * glossary alias, and the screens that teach these subjects read the shared registry.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { glossaryTerms, maneuvers, pointsOfSail, quickRefreshLessons } from "../src/data";
import { SAILING_SECTIONS, SAILING_SUBJECT_IDS, sailingSubject, sailingVisuals } from "../../src/data/sailing-visuals";
import { SubjectStrip, SubjectVisuals } from "../src/learning/SubjectVisuals";
import { COURSE_PICTURE_ASSETS } from "../src/learning/course-visuals.generated";

const labels = { diagram: "Diagram", picture: "On the water" };
const root = join(__dirname, "../..");

it("bundles a picture for exactly the points of sail and turns of the app's data", () => {
  const turns = maneuvers.filter(turn => (turn.stepsRu?.length ?? 0) > 0).map(turn => turn.id);
  expect(SAILING_SUBJECT_IDS).toEqual([...pointsOfSail.map(point => point.id), ...turns]);
  expect(Object.keys(COURSE_PICTURE_ASSETS)).toEqual(SAILING_SUBJECT_IDS);
  const site = join(root, "public/learning/courses"), app = join(root, "mobile/assets/learning/courses");
  expect(readdirSync(app).sort()).toEqual(readdirSync(site).sort());
  for (const name of readdirSync(site)) expect(readFileSync(join(app, name)).equals(readFileSync(join(site, name)))).toBe(true);
});

it("draws the pair for a point of sail, for a glossary alias and for a part, and nothing else", () => {
  const point = render(<SubjectVisuals id="beam-reach" name="Beam reach" labels={labels} />);
  expect(point.getByLabelText("Beam reach: Diagram")).toBeTruthy();
  expect(point.getByLabelText("Beam reach: On the water")).toBeTruthy();
  const picture = point.getByTestId("subject-picture");
  expect(picture.props.source).toBe(COURSE_PICTURE_ASSETS["beam-reach"]);
  // An explicit height next to the ratio: without it React Native keeps the file's own height.
  expect(StyleSheet.flatten(picture.props.style)).toMatchObject({ width: "100%", height: undefined, aspectRatio: 4 / 3 });
  expect("height" in StyleSheet.flatten(picture.props.style)).toBe(true);

  const alias = render(<SubjectVisuals id="man-tacking" name="Tacking" labels={labels} />);
  expect(alias.getByTestId("subject-picture").props.source).toBe(COURSE_PICTURE_ASSETS.tacking);
  expect(render(<SubjectVisuals id="rudder" name="Rudder" labels={labels} />).getByTestId("part-visuals")).toBeTruthy();
  expect(render(<SubjectVisuals id="man-luffing" name="Luffing" labels={labels} />).toJSON()).toBeNull();
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
  expect(glossaryTerms.map(term => term.id).filter(id => sailingSubject(id) !== null)).toHaveLength(8);
  for (const card of Object.keys(SAILING_SECTIONS.quick)) expect(quickRefreshLessons.some(lesson => lesson.id === card)).toBe(true);
  for (const id of SAILING_SUBJECT_IDS) expect(sailingVisuals(id)!.schematic()).toContain('viewBox="0 0 800 600"');
});
