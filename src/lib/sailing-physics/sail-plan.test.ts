import { describe, expect, it } from "vitest";
import { createSailGeometry, updateSailGeometry } from "@/features/simulator-3d/sails/geometry";
import { createInitialState, getBoatParams, tick, type Controls } from "./index";
import { computeBalance } from "./balance";
import { projectedSailPath } from "@/features/simulator-v3/ui/sail-projection";

const controls: Controls = {mainSheet: 0.4, jibSheet: 0.2, mainTwist: 0.35, jibTwist: 0.4, reef: 0, jibFurl: 0, jibSide: 1};
function meshArea(kind: "main" | "jib", reef = 0, furl = 0) {
  const g = createSailGeometry(30, 80);
  updateSailGeometry(g, kind, {camber: 0.5, twist: 0, luff: 0, reef, furl, side: 1, time: 0});
  const p = g.getAttribute("position"), index = g.getIndex()!;
  let area = 0;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    area += Math.abs((p.getX(b)-p.getX(a))*(p.getY(c)-p.getY(a)) - (p.getY(b)-p.getY(a))*(p.getX(c)-p.getX(a)))/2;
  }
  g.dispose(); return area;
}

describe("physical sail contracts", () => {
  it("draws a 45/30 full sail plan, independent of cloth camber", () => {
    expect(meshArea("main")).toBeCloseTo(45, 2);
    expect(meshArea("jib")).toBeCloseTo(30, 2);
    expect(meshArea("main") / meshArea("jib")).toBeCloseTo(1.5, 3);
  });
  it("matches drawn reef and furl areas to the force model through the range", () => {
    for (const reduction of [0, 0.25, 0.5, 0.75, 1]) {
      expect(meshArea("main", reduction)).toBeCloseTo(45 * (1 - .65 * reduction), 2);
      expect(meshArea("jib", 0, reduction)).toBeCloseTo(30 * (1 - reduction), 2);
    }
  });
  it("has zero sail force with main lowered and jib completely furled", () => {
    for (const twa of [-150,-90,-45,0,45,90,150,180]) {
      const result = tick(createInitialState({tws:25,twa,boatSpeed:0}), {...controls, mainHoisted:false, jibFurl:1}, getBoatParams(), .1);
      expect(result.diag.drive).toBe(0);
      expect(result.diag.side).toBe(0);
      expect(result.state.boatSpeed).toBe(0);
    }
  });
  it("a lowered main cannot blanket the jib on a dead run", () => {
    const state = createInitialState({ tws: 12, twa: 180, boatSpeed: 0 });
    const run = (jibSide: 1 | -1) => tick(state, {
      ...controls, mainHoisted: false, jibSide,
    }, getBoatParams(), .1).diag.drive;
    expect(run(1)).toBeGreaterThan(0);
    expect(run(1)).toBeCloseTo(run(-1), 8);
  });
  it("halves isolated jib force at half furl and removes it at full furl", () => {
    const state = createInitialState({tws:12,twa:90,boatSpeed:5});
    const run = (jibFurl: number) => tick(state, {...controls,mainHoisted:false,jibFurl}, getBoatParams(), .1).diag;
    expect(run(.5).drive).toBeCloseTo(run(0).drive / 2, 8);
    expect(run(1).drive).toBe(0);
  });
  it("does not double-count roller furling by also lowering the full-height jib", () => {
    const state = createInitialState({tws:12,twa:90,boatSpeed:5});
    const alpha = 1 - Math.exp(-.1 / 2);
    const momentRatio = (furl: number) => {
      const next = tick(state, {...controls,mainHoisted:false,jibFurl:furl}, getBoatParams(), .1);
      return Math.tan(next.state.heel / alpha * Math.PI / 180);
    };
    expect(momentRatio(.5) / momentRatio(0)).toBeCloseTo(.5, 8);
    expect(momentRatio(1)).toBe(0);
  });
  it("balances signed moments rather than adding opposing force magnitudes", () => {
    const args = {fSideMainN:1000,fSideJibN:-1000,mainCop:5,jibCop:5,boatSpeedKn:5,params:getBoatParams()};
    expect(computeBalance(args).heelEquilibrium).toBe(0);
    expect(computeBalance({...args,mainCop:3}).heelEquilibrium).toBeLessThan(0);
    expect(computeBalance({...args,mainCop:7}).heelEquilibrium).toBeGreaterThan(0);
  });
  it("projects the same full and reefed plan into the Trainer without NaN", () => {
    for (const rear of [false,true]) for (const angle of [0,45,85]) for (const reef of [0,.5,1]) {
      expect(projectedSailPath("main",angle,-1,reef,0,rear)).not.toMatch(/NaN|Infinity/);
      expect(projectedSailPath("jib",angle,1,0,reef,rear)).not.toMatch(/NaN|Infinity/);
    }
  });
});
