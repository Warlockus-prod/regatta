import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { apparentWind, createInitialState, getBoatParams } from "../../../lib/sailing-physics";
import { computeSailForce } from "../../../lib/sailing-physics/forces";
import { outhaulDepthFactor } from "../../../lib/sailing-physics/mainsail-shape";
import { sailPoint } from "../../simulator-3d/sails/geometry";
import { createSailingSession, sessionInput, stepSailingSession } from "../runtime/session";
import { readSessionSnapshot, replaySession, writeSessionSnapshot } from "../runtime/snapshot";
import { yachtFromSession } from "../runtime/presentation";
import { engineTrimFromEase } from "../runtime/trim-controls";
import { createMainTrim, isMainTrimCommand, isMainTrimState, stepMainTrim, type MainTrimCommand } from "./main-trim";
import { vangGeometry, vangRiseLimit, vangSpanFromPercent, vangSpanPercent, VANG_LIMITS } from "./vang";
import { mainsheetGeometry } from "./layout";
import { observeTrim } from "../lessons/trim-study";

const params = getBoatParams(), controls = engineTrimFromEase({ mainEase: .5, jibEase: .4, reef: 0 });
function solve(command: MainTrimCommand, twa = 90, tws = 16) {
  const boat = createInitialState({ tws, twa, boatSpeed: 3 });
  let state = createMainTrim({ yaw: twa < 0 ? 25 : -25, rise: 4 }, command);
  for (let i = 0; i < 600; i++) state = stepMainTrim(state, command, boat, controls, params, 1 / 30);
  return state;
}
describe("vang and lower mainsail shape", () => {
  it("maps every integer HTML setting to a valid exact command, including Home and End", () => {
    expect(vangSpanFromPercent(0)).toBe(VANG_LIMITS.min);
    expect(vangSpanFromPercent(100)).toBe(VANG_LIMITS.max);
    for (let i = 0; i <= 100; i++) {
      const span = vangSpanFromPercent(Number(String(i)));
      expect(isMainTrimCommand({ workingLength: 24, traveler: 0, vangSpan: span })).toBe(true);
      expect(vangSpanPercent(span)).toBeCloseTo(i, 10);
    }
  });
  it("uses mast-axis geometry with a monotonic, yaw-independent upper rise limit", () => {
    for (const rise of [0, 1, 4, 8, 12]) for (const yaw of [-85, -30, 0, 30, 85]) {
      const span = vangGeometry({ yaw, rise }).span;
      expect(span).toBeCloseTo(vangGeometry({ yaw: 0, rise }).span, 12);
      expect(vangRiseLimit(Math.max(span, VANG_LIMITS.min))).toBeCloseTo(rise, 6);
    }
    expect(vangRiseLimit(VANG_LIMITS.max)).toBe(12);
    expect(() => vangRiseLimit(Number.NaN)).toThrow();
    expect(isMainTrimCommand({ workingLength: 9, traveler: 0, vangSpan: 0 })).toBe(false);
    expect(isMainTrimCommand({ workingLength: 9, traveler: 0, outhaulEase: 2 })).toBe(false);
  });
  it("limits boom rise and twist on a reach, symmetrically on both tacks", () => {
    const base = { workingLength: 24, traveler: 0 };
    const free = solve(base), limited = solve({ ...base, vangSpan: vangGeometry({ yaw: 0, rise: 2 }).span });
    expect(free.pose.rise).toBeGreaterThan(limited.pose.rise + 2);
    expect(limited.pose.rise).toBeLessThanOrEqual(2.00001);
    expect(limited.twist).toBeLessThan(free.twist);
    const mirror = solve({ ...base, vangSpan: limited.command.vangSpan }, -90);
    expect(mirror.pose.yaw).toBeCloseTo(-limited.pose.yaw, 8);
    expect(mirror.pose.rise).toBeCloseTo(limited.pose.rise, 8);
  });
  it("does not lift an unloaded boom when eased and respects both line constraints", () => {
    const boat = createInitialState({ tws: 0, twa: 90, boatSpeed: 0 });
    let s = createMainTrim({ yaw: -20, rise: 0 }, { workingLength: 25, traveler: 0, vangSpan: VANG_LIMITS.min });
    for (let i = 0; i < 600; i++) s = stepMainTrim(s, { workingLength: 25, traveler: 0, vangSpan: VANG_LIMITS.max }, boat, controls, params, 1 / 30);
    expect(s.pose.rise).toBe(0);
    for (const wind of [0, 12, 35, 60]) for (const twa of [-150, -45, 45, 150]) for (const car of [-.8, .8]) for (const length of [6.4, 11, 32]) {
      const state = solve({ workingLength: length, traveler: car, vangSpan: VANG_LIMITS.min, outhaulEase: .9 }, twa, wind);
      expect(isMainTrimState(state)).toBe(true);
      expect(state.pose.rise).toBeLessThan(1e-7);
      expect(mainsheetGeometry(state.pose, car).workingLength).toBeLessThanOrEqual(length + .002);
    }
  }, 15_000);
  it("uses the same lower-section depth in cloth and forces without altering legacy polars", () => {
    const shape = { camber: .6, twist: 0, luff: 0, reef: 0, side: 1, time: 0, fill: 1 };
    const point = (ease: number, h: number) => sailPoint("main", .45, h, { ...shape, outhaulEase: ease }, new THREE.Vector3());
    for (const h of [.1, .3, .7]) {
      expect(point(0, h).z / point(.5, h).z).toBeCloseTo(outhaulDepthFactor(0, h), 12);
      expect(point(1, h).z / point(.5, h).z).toBeCloseTo(outhaulDepthFactor(1, h), 12);
    }
    expect(point(1, .7)).toEqual(point(0, .7));
    const aw = apparentWind(12, 50, 4, 0), cfg = { area: 45, angleOff: 20, side: -1 as const, twist: .3 };
    const force = (ease?: number) => computeSailForce(aw.vec, aw.aws * .514444, { ...cfg, outhaulEase: ease });
    expect(force()).toEqual(force(.5));
    expect(Math.abs(force(0).drive - force(1).drive)).toBeGreaterThan(1);
  });
  it("persists in-flight commands, replays exactly, and prevents contaminating the first study", () => {
    const initialInput = { controls, steering: { mode: "course-assist" as const, heading: 0 },
      wind: { speed: 16, direction: 90, mode: "steady" as const }, mainTrim: { workingLength: 22, traveler: 0 } };
    const initial = createSailingSession(createInitialState({ tws: 16, twa: 90, boatSpeed: 3 }), initialInput, params);
    const changed = { ...initialInput, mainTrim: { workingLength: 23, traveler: .5, vangSpan: VANG_LIMITS.min, outhaulEase: 1 } };
    const state = replaySession(initial, [{ atTick: 10, input: changed }], 30, params);
    expect(state.mainTrim!.command.vangSpan).toBeGreaterThan(VANG_LIMITS.min);
    const restored = readSessionSnapshot(writeSessionSnapshot(state));
    if (!restored.ok) throw new Error("Shape snapshot rejected");
    expect(stepSailingSession(restored.session, sessionInput(restored.session), params)).toEqual(stepSailingSession(state, changed, params));
    expect(yachtFromSession(state).mainTrim?.outhaulEase).toBe(state.mainTrim?.command.outhaulEase);
    expect(observeTrim(state)?.ready).toBe(false);
    const broken = JSON.parse(writeSessionSnapshot(state));
    broken.session.mainTrim.vangSlack = .8;
    expect(readSessionSnapshot(JSON.stringify(broken)).ok).toBe(false);
  });
});
