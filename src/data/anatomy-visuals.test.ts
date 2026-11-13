import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { anatomyParts } from "./anatomy";
import { PART_SECTIONS, YACHT_PART_IDS, isYachtPart, partVisuals, sectionParts } from "./anatomy-visuals";
import { checklistSections } from "./checklist";
import { onboardSections } from "./onboard";
import { glossaryTerms } from "./sailing-data";
import { PART_DRAWINGS, PART_PICTURE_SIZE } from "./anatomy-visuals.generated";

// Package 32. Contract: every part of the yacht has BOTH a schematic and a picture, the files
// exist, and nothing in those folders belongs to no part. A part added to anatomy.ts without
// re-running the Blender build (scripts/build-part-visuals.mjs) fails here, so no section can
// show a part that has one visual and not the other.
const size = (file: string) => {
  const bytes = readFileSync(file);
  // WebP: "RIFF....WEBP"; VP8X carries the canvas size, VP8 (lossy) and VP8L their own.
  expect(bytes.toString("ascii", 0, 4) + bytes.toString("ascii", 8, 12), file).toBe("RIFFWEBP");
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk === "VP8 ") return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  const bits = bytes.readUInt32LE(21);
  return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
};

describe("yacht parts: a schematic and a picture for every part", () => {
  it("covers exactly the parts of the anatomy data", () => {
    expect(YACHT_PART_IDS).toEqual(anatomyParts.map(part => part.id));
    expect(YACHT_PART_IDS.length).toBeGreaterThanOrEqual(17);
    for (const view of ["side", "top"] as const) expect(Object.keys(PART_DRAWINGS[view].points).sort(), view).toEqual([...YACHT_PART_IDS].sort());
  });

  it("gives every part a picture file of the declared size", () => {
    for (const id of YACHT_PART_IDS) {
      const visuals = partVisuals(id)!;
      expect(visuals, id).not.toBeNull();
      const file = `public${visuals.picture.src}`;
      expect(existsSync(file), file).toBe(true);
      expect(size(file), file).toEqual(PART_PICTURE_SIZE);
      // A render, not an empty frame: a flat colour compresses to a few hundred bytes.
      expect(statSync(file).size, file).toBeGreaterThan(3000);
    }
  });

  it("marks every part inside the drawing it is shown on", () => {
    for (const id of YACHT_PART_IDS) {
      const { drawing } = partVisuals(id)!;
      expect(size(`public${drawing.src}`), drawing.src).toEqual({ width: drawing.width, height: drawing.height });
      for (const value of [drawing.x, drawing.y]) { expect(value, id).toBeGreaterThan(0.02); expect(value, id).toBeLessThan(0.98); }
    }
    // Deck fittings are marked on the plan, the rig and the hull on the profile.
    expect(partVisuals("winch")!.drawing.view).toBe("top");
    expect(partVisuals("keel")!.drawing.view).toBe("side");
  });

  it("keeps no picture that belongs to no part, and knows no part that is not one", () => {
    expect(readdirSync("public/anatomy/parts").sort()).toEqual(YACHT_PART_IDS.map(id => `${id}.webp`).sort());
    expect(readdirSync("public/anatomy/diagram").sort()).toEqual(["side.webp", "top.webp"]);
    expect(isYachtPart("anchor")).toBe(false);
    expect(partVisuals("anchor")).toBeNull();
    expect(partVisuals("toString")).toBeNull();
  });
});

// The same subject in several sections: a part taught in the glossary, the checklist or the
// onboard guide shows the same two visuals there as on the anatomy page.
describe("yacht parts in the other sections that teach them", () => {
  /** How the English text of a section names a part. */
  const NAMED: Record<string, RegExp> = {
    bow: /\bbow\b/i, stern: /\bstern\b/i, mast: /\bmast\b/i, boom: /\bboom\b/i, mainsail: /\bmain(sail)?\b/i, jib: /\bjib\b/i,
    shrouds: /\bshrouds?\b/i, forestay: /\b(fore)?stays?\b/i, mainsheet: /\b(main)?sheets?\b/i, "jib-sheet": /\bsheets?\b/i,
    winch: /\bwinch(es)?\b/i, cleat: /\bcleats?\b/i, rudder: /\brudder\b/i, keel: /\bkeel\b/i, fender: /\bfenders?\b/i,
    wheel: /\bwheel\b/i, cockpit: /\bcockpit\b/i,
  };
  const texts: Record<string, Record<string, string>> = {
    checklist: Object.fromEntries(checklistSections.map(section => [section.id, section.itemsEn.join("\n")])),
    onboard: Object.fromEntries(onboardSections.map(section => [section.id, section.itemsEn.join("\n")])),
  };

  it("lists only real sections and real parts, and each section's text names every part it shows", () => {
    for (const [page, sections] of Object.entries(PART_SECTIONS)) {
      for (const [section, parts] of Object.entries(sections)) {
        const text = texts[page][section];
        expect(text, `${page}.${section}`).toBeTruthy();
        expect(new Set(parts).size, `${page}.${section}`).toBe(parts.length);
        for (const id of parts) {
          expect(isYachtPart(id), id).toBe(true);
          expect(text, `${page}.${section} names ${id}`).toMatch(NAMED[id]);
        }
        expect(sectionParts(page as keyof typeof PART_SECTIONS, section)).toEqual(parts);
      }
    }
    expect(sectionParts("checklist", "no-such-section")).toEqual([]);
    expect(sectionParts("checklist", "constructor")).toEqual([]);
  });

  it("shows every part the checklist's parts list defines", () => {
    // The section that IS a list of parts: each distinctly named part in it has its visuals.
    const text = texts.checklist.parts;
    const distinct = ["mast", "boom", "winch", "cleat", "wheel", "shrouds", "bow", "stern", "jib"];
    for (const id of distinct) if (NAMED[id].test(text)) expect(PART_SECTIONS.checklist.parts, id).toContain(id);
  });

  it("gives the glossary terms that are parts of the yacht the same visuals", () => {
    const shared = glossaryTerms.map(term => term.id).filter(isYachtPart);
    expect(shared.sort()).toEqual(["boom", "bow", "cockpit", "jib", "keel", "mainsail", "mast", "rudder", "stern"]);
    // The pages read the registry by the item's own id: no per-page list to forget.
    expect(readFileSync("src/app/glossary/page.tsx", "utf8")).toContain("<PartVisuals id={term.id}");
    expect(readFileSync("src/app/anatomy/page.tsx", "utf8")).toContain("<PartVisuals id={active.id}");
    for (const page of ["checklist", "onboard"]) expect(readFileSync(`src/app/${page}/page.tsx`, "utf8")).toContain(`sectionParts('${page}', section.id)`);
  });
});

