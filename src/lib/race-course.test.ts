import { describe, expect, it } from "vitest";
import { makeStandardCourse, raceAutopilotTurn, stepBoat, updateLap, resolveCollisions, type RaceBoat } from "./race-physics";
const boat = (): RaceBoat => ({ id: "one", name: "one", color: "white", pos: {x:365,y:1080}, heading:45, speed:0, lapDone:0 });
describe("one complete fair regatta", () => {
  it("does not award a touched mark or wrong-side shortcut", () => {
    const b = boat(), c = makeStandardCourse();
    b.started = true; b.pos = {...c.marks[0].pos};
    expect(updateLap(b,{x:400,y:200},c,10)).toBeNull();
    expect(b.lapDone).toBe(0);
    b.pos = {x:350,y:160};
    expect(updateLap(b,{x:350,y:200},c,11)).toBeNull();
    expect(b.roundPhase ?? 0).toBe(0);
  });
  it("finishes through start, port-rounding gates and finish with the common engine", () => {
    const b = boat(), c = makeStandardCourse();
    for (let t=0; t<600 && b.lapDone<2; t+=.05) {
      const prev={...b.pos};
      stepBoat(b,.05,0,1,{turn:raceAutopilotTurn(b,c,0)});
      updateLap(b,prev,c,t);
    }
    expect(b.lapDone, JSON.stringify(b)).toBe(2);
    expect(b.finishTime).toBeGreaterThan(20);
  });
  it("returns after crossing early during countdown and finishes legally", () => {
    const b = boat(), c = makeStandardCourse();
    b.pos.y = c.startLine.a.y - 40;
    b.speed = 4;
    for (let t=0; t<600 && b.lapDone<2; t+=.05) {
      const prev={...b.pos};
      stepBoat(b,.05,0,1,{turn:raceAutopilotTurn(b,c,0)});
      updateLap(b,prev,c,t);
    }
    expect(b.lapDone, JSON.stringify(b)).toBe(2);
  });
  it("has no rudder authority while stationary and separates coincident boats", () => {
    const a=boat(), b={...boat(),id:"two",pos:{...boat().pos}};
    stepBoat(a,.05,0,1,{turn:1});
    expect(a.heading).toBe(45);
    a.pos={...b.pos}; resolveCollisions([a,b]);
    expect(Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y)).toBeCloseTo(22);
  });
});
