import { describe, expect, it } from "vitest";
import { parseDiagnosticBatch } from "@/lib/diagnostics";
import { PERF_MAX_FRAME_MS, PERF_MIN_FRAMES, PERF_STILL_MS, createPerfMeter, createProgressWatch, perfEvent } from "./perf";

/** Feed `count` frames of `ms` each, starting at `t`; returns the end time. */
function run(meter: ReturnType<typeof createPerfMeter>, t: number, count: number, ms: number, active = true) {
  for (let i = 0; i < count; i++) { t += ms; meter.frame(t, active, 120, 5000); }
  return t;
}

describe("race performance meter", () => {
  it("averages and takes the 5th percentile of racing frames only", () => {
    const meter = createPerfMeter();
    let t = run(meter, 0, 951, 1000 / 60);   // the first frame only starts the interval
    t = run(meter, t, 50, 50);                // 50 hitches at 20 fps: 5% of 1000 frames
    const summary = meter.summary()!;
    expect(meter.frames).toBe(1000);
    expect(summary.fpsP5).toBe(20);
    expect(summary.fpsAvg).toBeCloseTo(1000 / (950 / 60 + 2.5), 0);
    expect(summary.seconds).toBeCloseTo(950 / 60 + 2.5, 1);
    expect(summary).toMatchObject({ drawCalls: 120, triangles: 5000 });
    expect(t).toBeGreaterThan(0);
  });

  it("excludes paused and hidden time, and the gap when the race resumes", () => {
    const meter = createPerfMeter();
    let t = run(meter, 0, 101, 20);           // 100 measured frames at 50 fps
    t = run(meter, t, 300, 5, false);         // paused: fast frames that must not count
    t += 30_000;                              // hidden: no frames, then a long gap
    t = run(meter, t, 101, 20);
    meter.frame(t + PERF_MAX_FRAME_MS + 1, true, 0, 0);  // a frozen tab is not a frame
    const summary = meter.summary()!;
    expect(meter.frames).toBe(200);
    expect(summary.fpsAvg).toBe(50);
    expect(summary.fpsP5).toBe(50);
    expect(summary.seconds).toBe(4);
  });

  it("does not count the resume gap after a pause shorter than a frozen tab", () => {
    const meter = createPerfMeter();
    let t = run(meter, 0, 101, 20);
    t = run(meter, t, 10, 100, false);        // 1 s paused
    run(meter, t, 100, 20);                   // the first resumed frame only restarts the interval
    expect(meter.frames).toBe(199);
    expect(meter.summary()!.seconds).toBe(4);   // 3.98 s, journalled in tenths
  });

  it("says nothing about too short a session and clamps a very fast display", () => {
    const meter = createPerfMeter();
    run(meter, 0, PERF_MIN_FRAMES, 10);
    expect(meter.summary()).toBeNull();
    expect(perfEvent(meter, "final", "webgpu", 2, 900)).toBeNull();
    const fast = createPerfMeter();
    run(fast, 0, 100, 1);
    expect(fast.summary()).toMatchObject({ fpsP5: 240, fpsAvg: 240 });
  });

  it("produces a bounded journal event the schema accepts, and the schema rejects free text or out-of-range values", () => {
    const meter = createPerfMeter();
    run(meter, 0, 200, 1000 / 30);
    const event = perfEvent(meter, "sample", "webgl2", 1.333333, 1234.6)!;
    expect(event).toMatchObject({ type: "race.perf", action: "sample", backend: "webgl2", dpr: 1.33, firstFrameMs: 1235, fpsP5: 30 });
    expect(parseDiagnosticBatch({ version: 1, events: [event] })?.events[0]).toEqual(event);
    for (const bad of [{ fpsAvg: 241 }, { fpsP5: 30.5 }, { dpr: 9 }, { drawCalls: -1 }, { backend: "metal" }, { seconds: Infinity }, { note: "free text" }, { firstFrameMs: 600_001 }]) {
      expect(parseDiagnosticBatch({ version: 1, events: [{ ...event, ...bad }] })).toBeNull();
    }
    const minimal: Record<string, unknown> = { ...event };
    delete minimal.triangles; delete minimal.firstFrameMs;
    expect(parseDiagnosticBatch({ version: 1, events: [minimal] })).not.toBeNull();
    expect(perfEvent(meter, "final", "webgpu", NaN, null)).not.toHaveProperty("firstFrameMs");
  });
});

describe("race progress watch", () => {
  const boat = (x: number, heading = 0) => ({ pos: { x, y: 0 }, heading });

  it("is active while the player's state changes, and stops when a pause freezes it", () => {
    const moving = createProgressWatch();
    expect(moving(0, boat(0))).toBe(false);  // a first reading is not movement
    expect(moving(16, boat(1))).toBe(true);
    expect(moving(32, boat(1))).toBe(true);  // a render frame between two simulation steps
    expect(moving(16 + PERF_STILL_MS, boat(1))).toBe(false);
    expect(moving(16 + PERF_STILL_MS + 16, boat(1, 5))).toBe(true);
    expect(moving(10_000, undefined)).toBe(false);
  });
});
