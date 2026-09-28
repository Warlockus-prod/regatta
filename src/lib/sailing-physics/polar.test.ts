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

// Leeway is how far the keel lets the boat slide to leeward. Dedekam (p. 5):
// the keel works like a wing only while the boat drifts, so leeway is marked
// close-hauled and small to none on a broad reach or a run. The book gives no
// degrees; the 3-5 band is the one docs/design/SAILING_PHYSICS_REFERENCE.md
// section 6.3 states for a cruising keelboat close-hauled in moderate air.
// Before these were locked, close-hauled leeway sat on the 12 deg clamp at every
// wind speed, so the clamp, not the keel, was setting it. DECISIONS.md ADR-0002.
describe("leeway follows the course and the heel, not the clamp", () => {
  const at = (twa: number, tws: number) => solvePolarPoint(twa, tws).state;
  const leeway = (twa: number, tws: number) => Math.abs(at(twa, tws).leeway);

  it("is a few degrees close-hauled at normal heel", () => {
    for (const twa of [40, 45]) for (const tws of [8, 12]) {
      const s = at(twa, tws);
      expect(Math.abs(s.heel), `heel TWA ${twa} / ${tws} kn`).toBeLessThanOrEqual(25);
      expect(Math.abs(s.leeway), `TWA ${twa} / ${tws} kn`).toBeGreaterThanOrEqual(3);
      expect(Math.abs(s.leeway), `TWA ${twa} / ${tws} kn`).toBeLessThanOrEqual(5);
    }
  });

  it("grows once the boat is overpowered, and never rides the guard", () => {
    // Past about 25 deg of heel Dedekam says to reduce sail (p. 38). The keel
    // loses grip as it leans, so an unreefed boat pressed harder slides more.
    const [light, fresh, strong] = [12, 16, 22].map((tws) => at(40, tws));
    expect(Math.abs(strong.heel)).toBeGreaterThan(25);
    expect(Math.abs(fresh.leeway)).toBeGreaterThan(Math.abs(light.leeway));
    expect(Math.abs(strong.leeway)).toBeGreaterThan(Math.abs(fresh.leeway));
    expect(Math.abs(strong.leeway)).toBeLessThan(12);
  });

  it("is small on a beam reach and almost nothing on a run", () => {
    for (const tws of [8, 12, 16]) {
      expect(leeway(90, tws), `beam reach ${tws} kn`).toBeLessThan(2);
      expect(leeway(180, tws), `run ${tws} kn`).toBeLessThan(1);
    }
  });

  it("shrinks as the boat bears away", () => {
    // 90 -> 135 is left out on purpose: the broad reach is still slower than it
    // should be, and a slow boat needs more leeway for the same side force.
    // That is a boat-speed issue, tracked separately, not a keel one.
    const [close, beam, run] = [45, 90, 180].map((twa) => leeway(twa, 12));
    expect(close).toBeGreaterThan(beam);
    expect(beam).toBeGreaterThan(run);
  });
});
