import { describe, expect, it } from "vitest";
import { createInitialState, getBoatParams } from "../../../lib/sailing-physics";
import { engineTrimFromEase } from "../runtime/trim-controls";
import { createMainTrim, stepMainTrim, type MainTrimCommand } from "./main-trim";
import { mainsheetGeometry } from "./layout";
import { apparentWind } from "../../../lib/sailing-physics";
import { computeSailForce } from "../../../lib/sailing-physics/forces";

const params = getBoatParams(), controls = engineTrimFromEase({ mainEase: .2, jibEase: .2, reef: 0 });
function run(command: MainTrimCommand, twa = 45, tws = 12, steps = 900) {
  const boat = createInitialState({ tws, twa, boatSpeed: 0 });
  let state = createMainTrim({ yaw: twa >= 0 ? -15 : 15, rise: 0 }, command);
  for (let i = 0; i < steps; i++) state = stepMainTrim(state, command, boat, controls, params, 1 / 30);
  return state;
}
describe("mainsheet unilateral constraint dynamics", () => {
  it("can retain the same boom angle with a windward car but different twist and drive", () => {
    const boat = createInitialState({ tws: 12, twa: 45, boatSpeed: 4 });
    const solve = (traveler: number) => {
      let low = 6.4, high = 20;
      let state = createMainTrim({ yaw: -15, rise: 0 }, { workingLength: 8, traveler });
      for (let trial = 0; trial < 18; trial++) {
        const workingLength = (low + high) / 2;
        state = createMainTrim({ yaw: -15, rise: 0 }, { workingLength, traveler });
        for (let i = 0; i < 1500; i++) state = stepMainTrim(state, state.target, boat, controls, params, 1 / 30);
        if (state.pose.yaw < -15) high = workingLength; else low = workingLength;
      }
      return state;
    };
    const center = solve(0), windward = solve(.65);
    expect(center.pose.yaw).toBeCloseTo(windward.pose.yaw, 1);
    expect(windward.pose.rise).toBeGreaterThan(center.pose.rise + 1);
    expect(windward.twist).toBeGreaterThan(center.twist);
    const aw = apparentWind(12, 45, 4, 0);
    const force = (s: typeof center) => computeSailForce(aw.vec, aw.aws * .514444, { area: params.mainArea * Math.cos(s.pose.rise * Math.PI / 180), angleOff: Math.abs(s.pose.yaw), side: -1, twist: s.twist });
    expect(Math.abs(force(center).drive - force(windward).drive)).toBeGreaterThan(10);
  // Two bounded equilibrium searches, 54,000 integration steps in total.
  // This checks causal mechanics, not wall-clock performance on a busy host.
  }, 30_000);
  it("does not push the boom outward when an unloaded line is eased", () => {
    const short = { workingLength: 9, traveler: 0 }, long = { workingLength: 20, traveler: 0 };
    let state = createMainTrim({ yaw: -15, rise: 0 }, short);
    const boat = createInitialState({ tws: 0, twa: 45, boatSpeed: 0 });
    for (let i = 0; i < 600; i++) state = stepMainTrim(state, long, boat, controls, params, 1 / 30);
    expect(state.pose).toEqual({ yaw: -15, rise: 0 });
    expect(state.sheetLoad).toBe(0);
    expect(state.slack).toBeGreaterThan(5);
  });
  it("mirrors geometry and reaction on the opposite tack", () => {
    const a = run({ workingLength: 9, traveler: .5 });
    const b = run({ workingLength: 9, traveler: -.5 }, -45);
    expect(a.pose.yaw).toBeCloseTo(-b.pose.yaw, 9);
    expect(a.pose.rise).toBeCloseTo(b.pose.rise, 9);
    expect(a.sheetLoad).toBeCloseTo(b.sheetLoad, 9);
  });
  it("easing under load changes the boom, twist and permissible length", () => {
    const a = run({ workingLength: 7, traveler: 0 });
    const b = run({ workingLength: 11, traveler: 0 });
    expect(Math.abs(b.pose.yaw)).toBeGreaterThan(Math.abs(a.pose.yaw));
    expect(b.twist).toBeGreaterThan(a.twist);
    for (const s of [a, b]) expect(mainsheetGeometry(s.pose, s.command.traveler).workingLength).toBeLessThanOrEqual(s.command.workingLength + .002);
  });
  it("converges over short/long sheets, both tacks, calm and loaded cases", () => {
    for (const tws of [0, 3, 12, 30, 60]) for (const twa of [-170, -90, -45, 0, 45, 90, 170]) {
      for (const traveler of [-.8, 0, .8]) for (const workingLength of [6.4, 8, 16, 32]) {
        const s = run({ workingLength, traveler }, twa, tws, 120);
        expect(s.residual).toBeLessThan(.002);
        expect(Number.isFinite(s.twist + s.pose.yaw + s.pose.rise)).toBe(true);
      }
    }
  });
  it("remains supported without the mainsail and rejects invalid steps", () => {
    const command = { workingLength: 12, traveler: 0 };
    let s = createMainTrim({ yaw: -15, rise: 8 }, command);
    const boat = createInitialState({ tws: 30, twa: 45, boatSpeed: 0 });
    for (let i = 0; i < 300; i++) s = stepMainTrim(s, command, boat, { ...controls, mainHoisted: false }, params, 1 / 30);
    expect(s.pose.rise).toBe(0);
    expect(s.sheetLoad).toBe(0);
    expect(() => stepMainTrim(s, { workingLength: NaN, traveler: 0 }, boat, controls, params, 1 / 30)).toThrow();
    expect(() => stepMainTrim(s, command, boat, controls, params, 1)).toThrow();
  });
});
