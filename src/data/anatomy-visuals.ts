// Package 32 (owner 2026-11-13: "if we make diagrams and pictures of the boat, the hull, the
// rudder, we make both the diagram and the picture; not in one section and missing in another").
// One registry for the visuals of the yacht's parts. Every part of anatomy.ts has
//   - a schematic: its place marked on a drawing of the whole yacht (profile or plan), and
//   - a picture: a render of that part on the boat,
// both produced from the same Blender scene as the 3D model (scripts/blender/render_part_visuals.py,
// scripts/build-part-visuals.mjs). Every section that shows a part reads it from here
// (src/components/anatomy/PartVisuals.tsx), so a part cannot have a picture in one section and none
// in another. anatomy-visuals.test.ts fails when a part lacks either, or a file has no part.
// No import of anatomy.ts here: the app reads this module too (mobile/src/anatomy/PartVisuals.tsx).
import { PART_DRAWINGS, PART_PICTURE_SIZE } from "./anatomy-visuals.generated";

export type PartDrawingView = keyof typeof PART_DRAWINGS;
export type YachtPartId = keyof typeof PART_DRAWINGS.side.points;

/** Parts that sit on deck and read better from above; the others are marked on the profile. */
const PLAN_PARTS: ReadonlySet<string> = new Set(["cockpit", "winch", "cleat", "wheel", "fender", "jib-sheet"]);

export interface PartVisuals {
  id: YachtPartId;
  /** The render of the part on the boat. */
  picture: { src: string; width: number; height: number };
  /** The drawing of the whole yacht and where the part is on it, as fractions from its top left. */
  drawing: { view: PartDrawingView; src: string; width: number; height: number; x: number; y: number };
}

/** The parts, in the order of the anatomy data the drawings were built from (the test holds the two together). */
export const YACHT_PART_IDS: readonly string[] = Object.keys(PART_DRAWINGS.side.points);

export function isYachtPart(id: string): id is YachtPartId {
  return Object.prototype.hasOwnProperty.call(PART_DRAWINGS.side.points, id);
}

/** Glossary terms that are a part under a broader name: "a sheet" is shown by the mainsheet. */
export const PART_ALIASES: Readonly<Record<string, YachtPartId>> = { sheet: "mainsheet" };

/** Both visuals of a part, by its id or an alias; null for an id that is not a part of the yacht. */
export function partVisuals(alias: string): PartVisuals | null {
  const id = Object.prototype.hasOwnProperty.call(PART_ALIASES, alias) ? PART_ALIASES[alias] : alias;
  if (!isYachtPart(id)) return null;
  const view: PartDrawingView = PLAN_PARTS.has(id) ? "top" : "side";
  const drawing = PART_DRAWINGS[view];
  const [x, y] = drawing.points[id];
  return {
    id,
    picture: { src: `/anatomy/parts/${id}.webp`, ...PART_PICTURE_SIZE },
    drawing: { view, src: drawing.src, width: drawing.width, height: drawing.height, x, y },
  };
}

/**
 * Sections outside the anatomy page that teach parts of the yacht, with the parts each one
 * names, in reading order. Those sections show the same two visuals for every part listed
 * (src/components/anatomy/PartVisuals.tsx: PartStrip). anatomy-visuals.test.ts checks that the
 * sections exist in the data and that the text of each really names its parts, so a part
 * cannot be taught in a section and shown nowhere on it.
 */
export const PART_SECTIONS = {
  checklist: {
    parts: ["mast", "boom", "mainsail", "jib", "mainsheet", "jib-sheet", "winch", "cleat", "wheel", "shrouds", "forestay", "bow", "stern"],
  },
  onboard: {
    rigging: ["mainsheet", "jib-sheet", "winch", "cleat", "boom"],
    "danger-zones": ["boom", "winch", "forestay", "shrouds", "mast"],
  },
} as const satisfies Record<string, Record<string, readonly YachtPartId[]>>;

/** The parts a section of a page teaches, or an empty list. */
export function sectionParts(page: keyof typeof PART_SECTIONS, section: string): readonly YachtPartId[] {
  const sections: Record<string, readonly YachtPartId[]> = PART_SECTIONS[page];
  return Object.prototype.hasOwnProperty.call(sections, section) ? sections[section] : [];
}
