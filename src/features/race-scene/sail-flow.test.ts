import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SAIL_FLOW_COLOURS, SAIL_FLOW_POINTS, raceWindLayers, sailFlowColour, sailFlowFromCoach, sailFlowFromWind, sailFlowIntensity,
  sailFlowRibbons, sailFlowSpeed, sampleSailFlow, type SailFlowInput, type SailFlowRibbon,
} from "./sail-flow";

// F6 contract: the ribbons arrive from the side the apparent wind blows from,
// bend along the lee face of a drawing sail, pass a luffing one straight, and
// grow stronger with the apparent wind. Frame: +x bow, +z starboard.

/** Close hauled with the wind from starboard: sails set to port (negative angles). */
const starboardTack: SailFlowInput = { awa: 32, aws: 14, boomAngle: -8, jibAngle: -10 };
const portTack: SailFlowInput = { awa: -32, aws: 14, boomAngle: 8, jibAngle: 10 };

const x = (r: SailFlowRibbon, i: number) => r.points[i * 3];
const z = (r: SailFlowRibbon, i: number) => r.points[i * 3 + 2];
const last = SAIL_FLOW_POINTS - 1;
/** Heading change between the first segment and the segment starting at point `at` (default: the last), deg. */
function bend(r: SailFlowRibbon, at = last - 1): number {
  const a = Math.atan2(z(r, 1) - z(r, 0), x(r, 1) - x(r, 0));
  const b = Math.atan2(z(r, at + 1) - z(r, at), x(r, at + 1) - x(r, at));
  return Math.abs(((b - a) * 180 / Math.PI + 540) % 360 - 180);
}

describe("sailFlowRibbons", () => {
  it("draws the arriving air on the starboard side for wind from starboard, and on port for wind from port", () => {
    const right = sailFlowRibbons(starboardTack);
    const left = sailFlowRibbons(portTack);
    expect(right).toHaveLength(5);
    for (const r of right) { expect(z(r, 0)).toBeGreaterThan(1); expect(x(r, 0)).toBeGreaterThan(x(r, last)); }
    for (const r of left) expect(z(r, 0)).toBeLessThan(-1);
    // A beam wind from starboard arrives from abeam to starboard, not from ahead.
    for (const r of sailFlowRibbons({ awa: 90, aws: 12, boomAngle: -45, jibAngle: -40 })) expect(z(r, 0)).toBeGreaterThan(4);
  });

  it("bends a drawing ribbon along the lee face, which is the side the sails are on", () => {
    for (const r of sailFlowRibbons(starboardTack)) {
      // Along the cloth the air has turned from the wind's direction to the sail's chord.
      expect(bend(r, 6)).toBeGreaterThan(12);
      expect(bend(r)).toBeGreaterThan(8);
      // Along the sail (points 4..9) the air runs on the port (lee) side of the chord.
      for (let i = 5; i < 9; i++) expect(z(r, i)).toBeLessThan(0);
    }
  });

  it("passes a luffing sail straight, and lets the air leave a stalled sail's lee face", () => {
    const luffing = sailFlowRibbons({ ...starboardTack, main: "luffing", jib: "luffing" });
    for (const r of luffing) { expect(r.shape).toBe("luffing"); expect(bend(r)).toBeLessThan(0.5); }
    const attached = sailFlowRibbons(starboardTack)[1];
    const stalled = sailFlowRibbons({ ...starboardTack, main: "stalled" })[1];
    expect(stalled.shape).toBe("stalled");
    // Further from the cloth at the leech than the attached ribbon at the same height.
    expect(Math.abs(z(stalled, 9))).toBeGreaterThan(Math.abs(z(attached, 9)) + 1);
    // And leaving the leech still further to leeward, never back into the cloth:
    // signed distance along the lee normal of the chord (attached points 4 and 9 lie on it).
    const cx = x(attached, 9) - x(attached, 4), cz = z(attached, 9) - z(attached, 4);
    const n = Math.hypot(cx, cz);
    const lee = cx / n < 0 ? { x: -cz / n, z: cx / n } : { x: cz / n, z: -cx / n }; // lee side = port (-z) here
    const toLee = (i: number) => (x(stalled, i) - x(attached, 4)) * lee.x + (z(stalled, i) - z(attached, 4)) * lee.z;
    expect(toLee(last)).toBeGreaterThan(toLee(9) + 1);
    expect(toLee(10)).toBeGreaterThan(toLee(9));
    // The jib keeps its own state.
    expect(sailFlowRibbons({ ...starboardTack, main: "stalled" })[3].shape).toBe("attached");
  });

  it("pushes into the windward face on a run and stops there", () => {
    const run = sailFlowRibbons({ awa: -165, aws: 8, boomAngle: 80, jibAngle: 70 });
    for (const r of run) {
      expect(r.shape).toBe("pushing");
      expect(x(r, 0)).toBeLessThan(x(r, last)); // arrives from astern
      expect(bend(r)).toBeLessThan(0.5);
    }
  });

  it("with the flow unknown, only brings the air up to the windward side of the luff", () => {
    const right = sailFlowRibbons({ ...starboardTack, main: "unknown", jib: "unknown" });
    expect(right).toHaveLength(5);
    for (const r of right) {
      expect(r.shape).toBe("unknown");
      expect(bend(r)).toBeLessThan(0.5);
      // Every point on the windward (starboard) side: nothing drawn along the lee face.
      for (let i = 0; i < SAIL_FLOW_POINTS; i++) expect(z(r, i)).toBeGreaterThan(0);
    }
    // It stops at the luff: much shorter than a luffing ribbon that passes the whole sail.
    const luffing = sailFlowRibbons({ ...starboardTack, main: "luffing", jib: "luffing" });
    expect(right[0].length).toBeLessThan(luffing[0].length - 3);
    for (const r of sailFlowRibbons({ ...portTack, main: "unknown", jib: "unknown" })) expect(z(r, last)).toBeLessThan(0);
  });

  it("draws nothing in calm or unknown air, and no ribbon on a lowered main or a rolled jib", () => {
    expect(sailFlowRibbons({ ...starboardTack, aws: 0.4 })).toEqual([]);
    expect(sailFlowRibbons({ ...starboardTack, awa: Number.NaN })).toEqual([]);
    expect(sailFlowRibbons({ ...starboardTack, mainHoisted: false }).map(r => r.sail)).toEqual(["jib", "jib"]);
    expect(sailFlowRibbons({ ...starboardTack, jibFurl: 1 }).map(r => r.sail)).toEqual(["main", "main", "main"]);
  });

  it("samples a point on the path and the direction the air moves there", () => {
    const r = sailFlowRibbons(starboardTack)[0];
    const at = { x: 0, y: 0, z: 0 }, dir = { x: 0, y: 0, z: 0 };
    sampleSailFlow(r, 0, at, dir);
    expect(at.x).toBeCloseTo(x(r, 0)); expect(at.z).toBeCloseTo(z(r, 0));
    // Air from starboard bow moves aft and to port.
    expect(dir.x).toBeLessThan(0); expect(dir.z).toBeLessThan(0);
    expect(Math.hypot(dir.x, dir.y, dir.z)).toBeCloseTo(1);
    sampleSailFlow(r, 1, at, dir);
    expect(at.x).toBeCloseTo(x(r, last)); expect(at.z).toBeCloseTo(z(r, last));
  });
});

describe("strength and telltale colour", () => {
  it("scales with the apparent wind: hidden below 1 kn, stronger and faster as it rises", () => {
    expect(sailFlowIntensity(0.5)).toBe(0);
    expect(sailFlowIntensity(Number.NaN)).toBe(0);
    const values = [2, 6, 10, 14, 18].map(sailFlowIntensity);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
    expect(sailFlowIntensity(30)).toBe(1);
    expect(sailFlowSpeed(20)).toBeGreaterThan(sailFlowSpeed(10));
    expect(sailFlowSpeed(0)).toBeGreaterThan(0);
  });

  it("reads each sail's flow from the race trim coach and colours it only when advice is given", () => {
    expect(sailFlowFromCoach("luffJib")).toEqual({ main: "attached", jib: "luffing" });
    expect(sailFlowFromCoach("stallMain")).toEqual({ main: "stalled", jib: "attached" });
    expect(sailFlowFromCoach("inIrons")).toEqual({ main: "luffing", jib: "luffing" });
    expect(sailFlowFromCoach("good")).toEqual({ main: "attached", jib: "attached" });
    expect(sailFlowFromCoach(null)).toBeNull();
    expect(sailFlowFromWind(true)).toBe("luffing");
    expect(sailFlowFromWind(false)).toBe("attached");
    // Pro without advice: the player trims, so outside the no-go the flow is unknown.
    expect(sailFlowFromWind(false, true)).toBe("unknown");
    expect(sailFlowFromWind(true, true)).toBe("luffing");
    expect(sailFlowColour("unknown", true)).toBe(SAIL_FLOW_COLOURS.neutral);
    expect(sailFlowColour("stalled", true)).toBe(SAIL_FLOW_COLOURS.stalled);
    expect(sailFlowColour("luffing", true)).toBe(SAIL_FLOW_COLOURS.luffing);
    expect(sailFlowColour("pushing", true)).toBe(SAIL_FLOW_COLOURS.attached);
    expect(sailFlowColour("stalled", false)).toBe(SAIL_FLOW_COLOURS.neutral);
  });

  it("never uses the action cyan of either theme", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const cyans = [...css.matchAll(/--accent-cyan:\s*(#[0-9a-fA-F]{6})/g)].map(m => m[1].toLowerCase());
    expect(cyans.length).toBeGreaterThanOrEqual(2);
    const colours = Object.values(SAIL_FLOW_COLOURS).map(c => c.toLowerCase());
    for (const c of cyans) expect(colours).not.toContain(c);
    // Nor anything near it: no saturated colour in the cyan-blue hues.
    for (const c of colours) {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max - min < 0.25) continue; // near white: the neutral ribbon
      const hue = max === r ? 60 * (((g - b) / (max - min) + 6) % 6) : max === g ? 60 * ((b - r) / (max - min) + 2) : 60 * ((r - g) / (max - min) + 4);
      expect(hue < 165 || hue > 225, c).toBe(true);
    }
  });
});

describe("raceWindLayers", () => {
  it("never draws the 3D wind arrows and the sail ribbons together", () => {
    expect(raceWindLayers(true, true)).toEqual({ arrows: false, ribbons: true });
    expect(raceWindLayers(true, false)).toEqual({ arrows: true, ribbons: false });
    expect(raceWindLayers(false, true)).toEqual({ arrows: false, ribbons: true });
    expect(raceWindLayers(false, false)).toEqual({ arrows: false, ribbons: false });
  });
});
