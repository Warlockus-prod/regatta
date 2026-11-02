import { describe, expect, it } from "vitest";
import { placeForceLabel, sailLabelPlaces } from "./SceneTop";
import { TRAINER_TERMS } from "@/lib/product/trainer-terms";

// Package 11 (audit B11, TestFlight 76): the top view's force labels never sit
// under the corner wind card, on the hull or on a sail, and the sail names are
// level words in the reader's language beside the sails.
const CX = 380, CY = 300;
const U = 1.95; // viewBox units per CSS px on a 390 px phone
const card = { l: 0, t: 0, r: 128 * U, b: 168 * U };
const overlaps = (a: { l: number; t: number; r: number; b: number }, b: typeof a) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

describe("top view force labels", () => {
  it("steps the drive label out of the wind card when the bow points at the card", () => {
    // Bow toward the top left corner: the label right past the arrow would lie under the card.
    const angle = -55;
    const naive = placeForceLabel({ cx: CX, cy: CY, tip: 140, angle, gap: 8 * U, size: 13 * U, chars: 4, avoid: [], bounds: { width: 760, height: 600 } });
    const placed = placeForceLabel({ cx: CX, cy: CY, tip: 140, angle, gap: 8 * U, size: 13 * U, chars: 4, avoid: [card], bounds: { width: 760, height: 600 } });
    expect(overlaps(naive.box, card)).toBe(true);
    expect(overlaps(placed.box, card)).toBe(false);
  });

  it("keeps the side label off the boat (hull and sails) at three headings", () => {
    for (const boatRotation of [-90, -45, -150]) {
      const placed = placeForceLabel({ cx: CX, cy: CY, tip: 40, angle: boatRotation + 90, gap: 8 * U, size: 13 * U, chars: 3, avoid: [card],
        bounds: { width: 760, height: 600 }, keepOut: 166 });
      const b = placed.box;
      const nearest = Math.hypot(Math.max(b.l - CX, 0, CX - b.r), Math.max(b.t - CY, 0, CY - b.b));
      expect(nearest, `rotation ${boatRotation}`).toBeGreaterThanOrEqual(166);
      expect(overlaps(b, card)).toBe(false);
    }
  });
});

describe("top view sail names", () => {
  it("names the sails in the reader's language, never JIB / MAIN in Russian, Polish or German", () => {
    for (const lang of ["ru", "pl", "de"] as const) {
      const names = sailLabelPlaces({ cx: CX, cy: CY, boatRotation: -90, sailSide: -1, windIntensity: 0.4, mainVisualScale: 1, size: 13 * U,
        main: { angle: -30, name: TRAINER_TERMS.mainsail[lang] }, jib: { angle: -20, name: TRAINER_TERMS.jib[lang] } }).map(label => label.name);
      expect(names).toEqual([TRAINER_TERMS.jib[lang], TRAINER_TERMS.mainsail[lang]]);
      expect(names.join(" ")).not.toMatch(/JIB|MAIN/);
    }
  });

  it("puts the two names apart and on the drawing at three points of sail", () => {
    for (const [boatRotation, angle] of [[-45, -12], [-90, -35], [-150, -80]] as const) {
      const places = sailLabelPlaces({ cx: CX, cy: CY, boatRotation, sailSide: -1, windIntensity: 0.4, mainVisualScale: 1, size: 13 * U,
        main: { angle, name: "Грот" }, jib: { angle, name: "Стаксель" } });
      expect(places).toHaveLength(2);
      expect(overlaps(places[0].box, places[1].box), `rotation ${boatRotation}`).toBe(false);
      for (const p of places) {
        expect(p.box.l).toBeGreaterThanOrEqual(0);
        expect(p.box.r).toBeLessThanOrEqual(760);
        expect(p.box.t).toBeGreaterThanOrEqual(0);
        expect(p.box.b).toBeLessThanOrEqual(600);
      }
    }
  });
});
