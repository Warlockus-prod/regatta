/**
 * Package 32 (owner 2026-11-13: "if we make diagrams and pictures of the boat, the hull, the
 * rudder, we make both, and not in one section and missing in another"). Contract for the app:
 * every part of the yacht has both visuals bundled, they are the very files the site ships, and
 * the native screens that teach parts (glossary, checklist, onboard, the anatomy fallback) show
 * the pair by the part's id.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react-native";
import { anatomyParts, checklistSections, glossaryTerms, onboardSections } from "../src/data";
import { PART_SECTIONS, YACHT_PART_IDS, isYachtPart, partVisuals } from "../../src/data/anatomy-visuals";
import { PartStrip, PartVisuals } from "../src/anatomy/PartVisuals";
import { PART_DRAWING_ASSETS, PART_PICTURE_ASSETS } from "../src/anatomy/part-visuals.generated";

const labels = { diagram: "Diagram", picture: "On the boat" };
const root = join(__dirname, "../..");

it("bundles a picture and both drawings for exactly the parts of the anatomy data", () => {
  const ids = anatomyParts.map(part => part.id);
  expect([...YACHT_PART_IDS]).toEqual(ids);
  expect(Object.keys(PART_PICTURE_ASSETS)).toEqual(ids);
  expect(Object.keys(PART_DRAWING_ASSETS).sort()).toEqual(["side", "top"]);
  for (const id of ids) expect(PART_DRAWING_ASSETS[partVisuals(id)!.drawing.view]).toBeDefined();
});

it("ships the very files the site ships", () => {
  for (const dir of ["parts", "diagram"]) {
    const site = join(root, "public/anatomy", dir), app = join(root, "mobile/assets/anatomy", dir);
    expect(readdirSync(app).sort()).toEqual(readdirSync(site).sort());
    for (const name of readdirSync(site)) expect(readFileSync(join(app, name)).equals(readFileSync(join(site, name)))).toBe(true);
  }
});

it("draws the pair for a part and nothing for anything else", () => {
  const view = render(<PartVisuals id="rudder" name="Rudder" labels={labels} />);
  expect(view.getByLabelText("Rudder: Diagram")).toBeTruthy();
  expect(view.getByLabelText("Rudder: On the boat")).toBeTruthy();
  expect(view.getByTestId("part-picture").props.source).toBe(PART_PICTURE_ASSETS.rudder);
  // The drawing fills its tile by an explicit width and height: without them React Native keeps the
  // file's own 936x1404 and only an empty corner of the drawing shows (seen on the simulator).
  const { StyleSheet } = jest.requireActual("react-native");
  expect(StyleSheet.flatten(view.getByTestId("part-drawing").props.style)).toMatchObject({ position: "absolute", width: "100%", height: "100%" });
  expect(StyleSheet.flatten(view.getByTestId("part-picture").props.style)).toMatchObject({ width: "100%", aspectRatio: 4 / 3 });
  expect(render(<PartVisuals id="port" name="Port" labels={labels} />).toJSON()).toBeNull();
});

it("shows every part a section teaches, and no strip for a section that teaches none", () => {
  const names = (id: string) => anatomyParts.find(part => part.id === id)!.nameEn;
  const strip = render(<PartStrip parts={PART_SECTIONS.onboard.rigging} names={names} labels={labels} title="Where it is on the boat" />);
  expect(strip.getAllByTestId("part-visuals")).toHaveLength(PART_SECTIONS.onboard.rigging.length);
  for (const id of PART_SECTIONS.onboard.rigging) expect(strip.getByLabelText(`${names(id)}: Diagram`)).toBeTruthy();
  expect(render(<PartStrip parts={[]} names={names} labels={labels} title="x" />).toJSON()).toBeNull();
});

it("wires the same registry into every native screen that teaches parts", () => {
  // The screens read the registry by the item's own id, so a new part or term needs no per-screen list.
  const source = (file: string) => readFileSync(join(__dirname, "..", file), "utf8");
  expect(source("app/glossary/index.tsx")).toContain("<SubjectVisuals id={term.id}");
  expect(source("src/learning/SubjectVisuals.tsx")).toContain("if (partVisuals(id)) return <PartVisuals id={id}");
  expect(source("app/anatomy-offline/index.tsx")).toContain("<PartVisuals id={part.id}");
  expect(source("app/checklist/index.tsx")).toContain("sectionParts('checklist', section.id)");
  expect(source("app/onboard/index.tsx")).toContain("sectionParts('onboard', section.id)");
  // The data the app carries has the sections and the shared terms the registry names.
  expect(glossaryTerms.map(term => term.id).filter(isYachtPart).sort()).toEqual(["boom", "bow", "cockpit", "jib", "keel", "mainsail", "mast", "rudder", "stern"]);
  for (const id of Object.keys(PART_SECTIONS.checklist)) expect(checklistSections.some(section => section.id === id)).toBe(true);
  for (const id of Object.keys(PART_SECTIONS.onboard)) expect(onboardSections.some(section => section.id === id)).toBe(true);
});
