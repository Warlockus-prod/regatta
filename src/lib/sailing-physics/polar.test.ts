import { describe, expect, it } from "vitest";
import { solvePolarPoint } from "./polar";
import { tick, settle } from "./simulate";
import { getBoatParams } from "./boat";
import { computeSailForce } from "./forces";

describe("equilibrium and section contracts", () => {
  it("converges across the declared cruiser wind and reef envelope", () => {
    for (const wind of [0, 4, 8, 12, 18, 25]) for (const angle of [42, 60, 90, 120, 150, 180]) for (const reef of [0, .5, 1]) {
      const point = solvePolarPoint(angle, wind, reef);
      expect(point.converged, `${wind}/${angle}/${reef} residual ${point.residual}`).toBe(true);
      const later = settle(point.state, point.controls, getBoatParams(), 60);
      expect(Math.abs(later.state.boatSpeed - point.speed)).toBeLessThan(.03);
      expect(Number.isFinite(point.speed)).toBe(true);
    }
  });
  it("has a beam target at least as good as the known fixed trim", () => {
    const point = solvePolarPoint(90, 12);
    const alternative = tick(point.state, { ...point.controls, mainSheet: .4, jibSheet: .2 }, getBoatParams(), 1);
    expect(alternative.state.boatSpeed).toBeLessThanOrEqual(point.speed + .01);
  });
  it("twist changes force and stall through the same sections", () => {
    const aw = { x: -5, y: -5 };
    const cfg = { area: 45, angleOff: 24, side: -1 as const, twist: 0 };
    const closed = computeSailForce(aw, Math.sqrt(50), cfg);
    const open = computeSailForce(aw, Math.sqrt(50), { ...cfg, twist: 1 });
    expect(closed.stalled).toBe(true);
    expect(open.aoa).toBeLessThan(closed.aoa);
    expect(open.drive).not.toBeCloseTo(closed.drive, 3);
  });
});
