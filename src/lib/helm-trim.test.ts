import { describe, expect, it } from "vitest";
import { createInitialState, getBoatParams, settle, trimForDrive, type Controls } from "./sailing-physics";
import { crewTrim, restingTrim, trimTwist } from "./helm-trim";

// Contracts of the sheet solver (package 13 stage D, ADR-0022):
// - it is the race crew's solver (trimForDrive), not a table and not a fork;
// - at rest it is an optimum: no nearby sheet setting settles faster, on the
//   cruiser on three winds (AGENTS.md D1);
// - the answer depends on the wind, the course and the sails only, not on the
//   sheets the learner happens to hold.

const params = getBoatParams();
const SAILS: Controls = { mainHoisted: true, mainSheet: 0.5, jibSheet: 0.5, mainTwist: 0.18, jibTwist: 0.14, reef: 0, jibFurl: 0, jibSide: 1 };
// Measured 2026-11-02 on the cruiser: the best VMG angle upwind of each wind
// (helm-angles.test.ts) and a close reach.
const EXPECTED = [
  { tws: 6, twa: 45, main: 0.925, jib: 0.95, speed: 4.37 },
  { tws: 6, twa: 60, main: 0.85, jib: 0.85, speed: 5.34 },
  { tws: 12, twa: 40, main: 0.9, jib: 0.95, speed: 6.21 },
  { tws: 12, twa: 60, main: 0.8, jib: 0.75, speed: 7.35 },
  { tws: 20, twa: 40, main: 0.875, jib: 0.9, speed: 7.06 },
  { tws: 20, twa: 60, main: 0.725, jib: 0.65, speed: 8.24 },
] as const;

const settledSpeed = (twa: number, tws: number, controls: Controls) =>
  settle(createInitialState({ tws, twa, boatSpeed: Math.max(3, tws * 0.45) }), controls, params, 240, 0.1).state.boatSpeed;

describe("restingTrim on the cruiser, three winds", () => {
  for (const e of EXPECTED) {
    it(`${e.tws} kn, TWA ${e.twa}`, () => {
      const rest = restingTrim(e.twa, e.tws, SAILS, params);
      expect(rest.controls.mainSheet).toBeCloseTo(e.main, 3);
      expect(rest.controls.jibSheet).toBeCloseTo(e.jib, 3);
      expect(rest.result.state.boatSpeed).toBeCloseTo(e.speed, 1);
      // At rest: one more solve of the crew on the settled boat keeps the sheets.
      const again = crewTrim(rest.result.state, rest.controls, params, e.tws);
      expect(again.mainSheet).toBeCloseTo(rest.controls.mainSheet, 6);
      expect(again.jibSheet).toBeCloseTo(rest.controls.jibSheet, 6);
      // An optimum: moving either sheet 0.05 either way settles no faster.
      const best = settledSpeed(e.twa, e.tws, rest.controls);
      for (const key of ["mainSheet", "jibSheet"] as const) for (const d of [-0.05, 0.05]) {
        const v = rest.controls[key] + d;
        if (v < 0 || v > 1) continue;
        expect(settledSpeed(e.twa, e.tws, { ...rest.controls, [key]: v })).toBeLessThanOrEqual(best + 0.002);
      }
    });
  }

  it("does not depend on the sheets held before, nor on the side of the wind", () => {
    const a = restingTrim(60, 12, { ...SAILS, mainSheet: 0, jibSheet: 0 }, params);
    const b = restingTrim(60, 12, { ...SAILS, mainSheet: 1, jibSheet: 1 }, params);
    const port = restingTrim(-60, 12, SAILS, params);
    expect(b.controls).toEqual(a.controls);
    expect(port.controls.mainSheet).toBeCloseTo(a.controls.mainSheet, 6);
    expect(port.controls.jibSheet).toBeCloseTo(a.controls.jibSheet, 6);
  });

  it("keeps the sails the learner has up and sets the twist of the wind table", () => {
    const reefed = restingTrim(60, 20, { ...SAILS, reef: 0.45, jibFurl: 0.5 }, params);
    expect(reefed.controls).toMatchObject({ reef: 0.45, jibFurl: 0.5, mainHoisted: true, jibSide: 1, mainTwist: 0.34, jibTwist: 0.26 });
    expect(trimTwist(6)).toEqual({ mainTwist: 0.1, jibTwist: 0.08 });
    expect(trimTwist(12)).toEqual({ mainTwist: 0.2, jibTwist: 0.16 });
    expect(trimTwist(18)).toEqual({ mainTwist: 0.34, jibTwist: 0.26 });
  });
});

describe("crewTrim is the race crew's solver", () => {
  it("returns exactly what trimForDrive returns with the twist of the wind table", () => {
    for (const tws of [6, 12, 20]) {
      const state = settle(createInitialState({ tws, twa: 75, boatSpeed: 5 }), SAILS, params, 30, 0.1).state;
      expect(crewTrim(state, SAILS, params, tws)).toEqual(trimForDrive(state, { ...SAILS, ...trimTwist(tws) }, params));
    }
  });
});
