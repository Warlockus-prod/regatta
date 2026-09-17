import { describe, expect, it } from "vitest";
import { createFixedClock, SAILING_STEP_SECONDS } from "./fixed-clock";
import { engineTrimFromEase, openPercentToFurl, sheetEaseToEngine } from "./trim-controls";
import { createInitialState, getBoatParams, tick } from "../../../lib/sailing-physics";

describe("sailing session clock", () => {
  it("produces identical boat state at 15, 30, 60 and 120 display FPS", () => {
    const runs = [15, 30, 60, 120].map(fps => {
      const clock = createFixedClock();
      let state = createInitialState({ tws: 12, twa: 90, boatSpeed: 5 });
      const controls = engineTrimFromEase({ mainEase: 0.6, jibEase: 0.8, reef: 0 });
      for (let frame = 0; frame <= fps * 10; frame++) {
        clock.advance(frame * 1000 / fps, true, dt => {
          expect(dt).toBe(SAILING_STEP_SECONDS);
          state = tick(state, controls, getBoatParams(), dt).state;
        });
      }
      return { state, ticks: clock.ticks };
    });
    runs.forEach(run => { expect(run.ticks).toBe(300); expect(run.state).toEqual(runs[0].state); });
  });
  it("does not catch up hidden time or carry partial steps through a pause", () => {
    const clock = createFixedClock();
    let calls = 0;
    const step = () => { calls++; };
    clock.advance(0, true, step);
    clock.advance(20, true, step);
    clock.advance(30, false, step);
    clock.advance(45, true, step);
    expect(calls).toBe(0);
    clock.advance(10000, true, step);
    expect(calls).toBe(0);
    clock.advance(10034, true, step);
    expect(calls).toBe(1);
    expect(clock.alpha).toBeGreaterThanOrEqual(0);
    expect(clock.alpha).toBeLessThan(1);
    clock.reset();
    expect(clock.ticks).toBe(0);
    expect(clock.advance(50000, true, step)).toBe(0);
  });
  it("drops negative and invalid clock inputs", () => {
    const clock = createFixedClock();
    const step = () => { throw new Error("Unexpected integration"); };
    clock.advance(100, true, step);
    clock.advance(90, true, step);
    clock.advance(Number.NaN, true, step);
    expect(clock.ticks).toBe(0);
  });
});

describe("legacy trim boundary", () => {
  it("never confuses eased sheet travel with engine sheet setting", () => {
    expect(sheetEaseToEngine(0)).toBe(1);
    expect(sheetEaseToEngine(1)).toBe(0);
    expect(engineTrimFromEase({ mainEase: 0.6, jibEase: 0.8, reef: 0 }).mainSheet).toBe(0.4);
  });
  it("converts the Trainer's open percentage to the engine's furled fraction", () => {
    expect(openPercentToFurl(100)).toBe(0);
    expect(openPercentToFurl(0)).toBe(1);
    expect(openPercentToFurl(25)).toBe(0.75);
  });
  it("bounds finite controls and rejects corrupt saved input", () => {
    expect(sheetEaseToEngine(-1)).toBe(1);
    expect(sheetEaseToEngine(10)).toBe(0);
    expect(() => sheetEaseToEngine(NaN)).toThrow(RangeError);
    expect(() => openPercentToFurl(Infinity)).toThrow(RangeError);
  });
});
