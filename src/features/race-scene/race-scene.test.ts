import { describe, expect, it } from "vitest";
import { TACTICAL_PITCH, lookAhead, tacticalPose } from "./camera";
import { shoreDistanceAt, shoreField } from "./shore";
import { TRAIL_LIFE, buildRibbon, pushTrail, ribbonIndices, type TrailPoint } from "./trail";
import { initialDpr, nextDpr } from "./quality";
import { landColor } from "./land";
import { VENUES } from "@/data/venues/venues";

// Contracts of the race scene's pure parts (ADR-0008): the tactical camera
// keeps upwind at the top and the next mark ahead, the shore field is zero on
// land and grows away from it, the wake widens and fades with age, and the
// pixel ratio only steps down while the frame rate is low.

describe("tactical camera", () => {
  const base = { player: { x: 240, z: 600 }, target: { x: 240, z: 80 }, windFrom: 0, portrait: true };

  it("keeps the boat just below the middle of an upright phone, above the race controls", () => {
    const pose = tacticalPose(base);
    // The boat is at the origin; its angle below the camera's view axis, as a share of the half field of view.
    const toBoat = Math.atan2(pose.position[1], Math.hypot(pose.position[0], pose.position[2]));
    const below = toBoat - (TACTICAL_PITCH * Math.PI) / 180;
    const share = Math.tan(below) / Math.tan(((pose.fov / 2) * Math.PI) / 180);
    const fromTop = 0.5 + share / 2;
    expect(fromTop).toBeGreaterThan(0.5);
    expect(fromTop).toBeLessThan(0.62);
  });

  it("stands downwind of the boat and looks upwind and down", () => {
    const pose = tacticalPose(base);
    expect(pose.position[2]).toBeGreaterThan(pose.look[2]); // south of the view centre: upwind (north) is up the screen
    const back = Math.hypot(pose.position[0] - pose.look[0], pose.position[2] - pose.look[2]);
    const pitch = (Math.atan2(pose.position[1], back) * 180) / Math.PI;
    expect(pitch).toBeCloseTo(TACTICAL_PITCH, 5);
  });

  it("turns with the wind: wind from the east puts the camera to the west", () => {
    const pose = tacticalPose({ ...base, windFrom: 90, target: null });
    expect(pose.position[0]).toBeLessThan(pose.look[0]);
  });

  it("looks part of the way to the target, never past it", () => {
    const far = lookAhead(base);
    expect(far.z).toBeLessThan(0);
    expect(Math.hypot(far.x, far.z)).toBeLessThanOrEqual(14 + 1e-9);
    expect(Math.hypot(...Object.values(lookAhead({ ...base, portrait: false })) as [number, number])).toBeLessThanOrEqual(18 + 1e-9);
    const near = lookAhead({ ...base, target: { x: 240, z: 590 } });
    expect(Math.hypot(near.x, near.z)).toBeLessThanOrEqual(10 + 1e-9);
  });
});

describe("shore field", () => {
  const island = [{ x: 0, z: 0 }, { x: 40, z: 0 }, { x: 40, z: 40 }, { x: 0, z: 40 }];
  const field = shoreField([island], { min: { x: -100, z: -100 }, max: { x: 140, z: 140 } }, { cols: 96, rows: 96, maxDist: 60 });

  it("is zero on land and grows with distance from the beach", () => {
    expect(shoreDistanceAt(field, { x: 20, z: 20 })).toBe(0);
    const a = shoreDistanceAt(field, { x: 50, z: 20 });
    const b = shoreDistanceAt(field, { x: 70, z: 20 });
    expect(a).toBeGreaterThan(5);
    expect(b).toBeGreaterThan(a);
    expect(shoreDistanceAt(field, { x: 130, z: -90 })).toBe(60);
    expect(shoreDistanceAt(field, { x: 1000, z: 1000 })).toBe(60);
  });
});

describe("wake ribbon", () => {
  it("keeps recent points only, spaced along the path", () => {
    const pts: TrailPoint[] = [];
    for (let i = 0; i < 400; i++) pushTrail(pts, { x: i * 0.5, z: 0, t: i * 0.1 });
    expect(pts.length).toBeGreaterThan(10);
    expect(pts[pts.length - 1].t - pts[0].t).toBeLessThanOrEqual(TRAIL_LIFE);
    for (let i = 1; i < pts.length; i++) expect(pts[i].x - pts[i - 1].x).toBeGreaterThanOrEqual(1.5 - 1e-9);
  });

  it("starts narrow at the stern and opens into a V with age", () => {
    const pts: TrailPoint[] = [{ x: 0, z: 100, t: 0 }, { x: 0, z: 50, t: 5 }];
    const pos = new Float32Array(6 * 10);
    const uv = new Float32Array(4 * 10);
    const n = buildRibbon(pts, { x: 0, z: 0, t: 10 }, 10, { x: 0, z: 0 }, () => 0, pos, uv);
    expect(n).toBe(6);
    const width = (k: number) => Math.hypot(pos[k * 6] - pos[k * 6 + 3], pos[k * 6 + 2] - pos[k * 6 + 5]);
    expect(width(0)).toBeLessThan(width(1));
    expect(width(1)).toBeLessThan(width(2));
    expect(uv[1]).toBe(0); // the stern is new
    expect(uv[9]).toBeCloseTo(10 / TRAIL_LIFE, 5); // the oldest point's age
    expect(ribbonIndices(3).length).toBe(12);
  });
});

describe("adaptive quality", () => {
  it("steps the pixel ratio down only while the frame rate is low", () => {
    expect(nextDpr(2, 30, { min: 1, max: 2 })).toBe(1.75);
    expect(nextDpr(1, 20, { min: 1, max: 2 })).toBe(1);
    expect(nextDpr(1.5, 60, { min: 1, max: 2 })).toBe(1.5);
    expect(initialDpr(3)).toBe(2);
    expect(initialDpr(0)).toBe(1);
  });
});

describe("land colour", () => {
  const palette = VENUES[0].palette;

  it("paints only the beach rows as sand, flat land behind them as vegetation", () => {
    expect(landColor(1, 0, palette, 0.2)).toBe(palette.sand);
    expect(landColor(2, 0, palette, 0.2)).not.toBe(palette.sand);
    expect(landColor(6, 0.01, palette, 0.9)).not.toBe(palette.sand);
    expect(landColor(6, 0.95, palette, 0.2)).toBe(palette.peak);
  });
});
