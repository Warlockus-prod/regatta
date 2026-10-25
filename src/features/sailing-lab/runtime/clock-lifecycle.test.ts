import { describe, expect, it } from "vitest";
import { bindClockLifecycle } from "./clock-lifecycle";
import { createFixedClock, SAILING_STEP_SECONDS } from "./fixed-clock";
import { createRaceStartupGate } from "../../../lib/race-startup";

function harness() {
  const clock = createFixedClock(), documentEvents = new EventTarget();
  let now = 0, hidden = false, paused = false, enabled = true, seconds = 0;
  const active = () => !hidden && !paused && enabled;
  const detach = bindClockLifecycle(clock, { target: documentEvents, active, now: () => now });
  const tick = (dt: number) => { expect(dt).toBe(SAILING_STEP_SECONDS); seconds += dt; };
  return {
    clock, detach,
    frame(at: number) { now = at; return clock.advance(now, active(), tick); },
    visibility(at: number, value: boolean) { now = at; hidden = value; documentEvents.dispatchEvent(new Event("visibilitychange")); },
    pause(at: number, value: boolean) { now = at; paused = value; clock.synchronize(now, active()); },
    enable(at: number, value: boolean) { now = at; enabled = value; clock.synchronize(now, active()); },
    get seconds() { return seconds; },
  };
}

describe("foreground fixed-clock lifecycle", () => {
  it("accounts for jittered foreground intervals including the former 250ms cutoff", () => {
    const h = harness();
    const intervals = [100, 250, 300, 500, 333, 517, 2000, 125, 875];
    let now = 0;
    for (let pass = 0; pass < 5; pass++) for (const delta of intervals) {
      now += delta;
      const count = h.frame(now);
      expect(count).toBeLessThanOrEqual(60);
      expect(h.seconds).toBeLessThanOrEqual(now / 1000 + 1e-8);
      expect(now / 1000 - h.seconds).toBeLessThan(SAILING_STEP_SECONDS + 1e-8);
      expect(h.clock.alpha).toBeGreaterThanOrEqual(0);
      expect(h.clock.alpha).toBeLessThan(1);
    }
    h.detach();
  });

  it.each([50, 500, 5000])("excludes %ims hidden time even if no animation frame runs while hidden", gap => {
    const h = harness();
    h.frame(500);
    const ticks = h.clock.ticks;
    h.visibility(500, true);
    h.visibility(500 + gap, false);
    expect(h.clock.ticks).toBe(ticks);
    expect(h.frame(1000 + gap)).toBe(15);
    expect(h.seconds).toBeCloseTo(1, 12);
    h.detach();
  });

  it("preserves ticks but discards fractional elapsed at a short pause and disabled boundary", () => {
    const h = harness();
    h.frame(350);
    expect(h.clock.ticks).toBe(10);
    expect(h.clock.alpha).toBeCloseTo(.5);
    h.pause(350, true);
    h.pause(850, false);
    expect(h.clock.ticks).toBe(10);
    expect(h.frame(1350)).toBe(15);
    h.enable(1350, false);
    h.enable(1850, true);
    expect(h.frame(2350)).toBe(15);
    expect(h.clock.ticks).toBe(40);
    h.detach();
  });

  it("does not infer a resume boundary when only an inactive frame was observed", () => {
    const clock = createFixedClock();
    let count = 0;
    const step = () => { count++; };
    clock.advance(0, true, step);
    clock.advance(500, false, step);
    clock.advance(900, true, step);
    expect(count).toBe(0);
    expect(clock.advance(1400, true, step)).toBe(15);
    expect(count).toBe(15);
  });

  it("bounds catch-up at 60 steps and drops giant, backward or non-finite discontinuities", () => {
    const clock = createFixedClock();
    let seconds = 0;
    const step = (dt: number) => { seconds += dt; };
    clock.synchronize(0, true);
    expect(clock.advance(2000, true, step)).toBe(60);
    const before = seconds;
    expect(clock.advance(4001, true, step)).toBe(0);
    expect(clock.advance(4501, true, step)).toBe(15);
    expect(seconds - before).toBeCloseTo(.5, 12);
    expect(clock.advance(4000, true, step)).toBe(0);
    expect(clock.advance(NaN, true, step)).toBe(0);
    expect(clock.advance(Infinity, true, step)).toBe(0);
    expect(clock.advance(10000, true, step)).toBe(0);
    expect(clock.advance(10500, true, step)).toBe(15);
    expect(clock.ticks).toBe(90);
    clock.reset();
    expect(clock.ticks).toBe(0);
    expect(clock.alpha).toBe(0);
  });

  it("keeps a cold or stale renderer from contributing elapsed time to a new race", () => {
    const gate = createRaceStartupGate(), clock = createFixedClock();
    gate.reset("first");
    clock.synchronize(0, gate.active(false, false));
    const step = () => {};
    clock.advance(7000, gate.active(false, false), step);
    expect(clock.ticks).toBe(0);
    gate.reset("second");
    expect(gate.rendered("first")).toBe(false);
    clock.advance(7500, gate.active(false, false), step);
    expect(clock.ticks).toBe(0);
    expect(gate.rendered("second")).toBe(true);
    clock.synchronize(7500, gate.active(false, false));
    expect(clock.advance(8000, gate.active(false, false), step)).toBe(15);
    expect(clock.ticks).toBe(15);
  });

  it("detaches visibility listeners and disarms a disposed host", () => {
    const h = harness();
    h.frame(500); h.detach();
    h.visibility(800, false);
    expect(h.frame(1000)).toBe(0);
    expect(h.clock.ticks).toBe(15);
  });
});
