import { describe, expect, it } from "vitest";
import { createFixedClock } from "@/features/sailing-lab/runtime/fixed-clock";
import { stepBoat, windAt, type RaceBoat } from "./race-physics";

describe("solo race timing on slower displays", () => {
  it("steers and sails identically at 2, 3, 5, 10, 15, 30, 60 and 120 FPS", () => {
    const runs = [2, 3, 5, 10, 15, 30, 60, 120].map(fps => {
      const clock = createFixedClock();
      const boat: RaceBoat = { id: "player", name: "Test", color: "#00d4ff", pos: { x: 400, y: 900 }, heading: 60, speed: 4, lapDone: 0 };
      let time = 0;
      for (let frame = 0; frame <= fps * 10; frame++) clock.advance(frame * 1000 / fps, true, dt => {
        const wind = windAt(time);
        stepBoat(boat, dt, wind.dir, wind.gust, { turn: time < 3 ? .4 : 0 }, { steering: "responsive" });
        time += dt;
      });
      return { boat, time, ticks: clock.ticks };
    });
    for (const run of runs) {
      expect(run.ticks).toBe(300);
      expect(run.time).toBeCloseTo(10, 10);
      expect(run.boat).toEqual(runs[0].boat);
    }
  });
  it("never fast-forwards a race after pause or backgrounding", () => {
    const clock = createFixedClock();
    let time = 0;
    const tick = (dt: number) => { time += dt; };
    clock.advance(0, true, tick); clock.advance(100, true, tick);
    expect(time).toBeCloseTo(.1);
    clock.advance(100000, false, tick); clock.advance(100100, false, tick);
    expect(time).toBeCloseTo(.1);
    clock.synchronize(100100, true);
    clock.advance(100200, true, tick);
    expect(time).toBeCloseTo(.2);
  });
});
