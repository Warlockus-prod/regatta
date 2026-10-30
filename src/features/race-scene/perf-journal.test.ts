import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseDiagnosticBatch } from "@/lib/diagnostics";
import { startPerfJournal } from "./perf-journal";

const { record, flush, effects, unsubscribe } = vi.hoisted(() => ({
  record: vi.fn(), flush: vi.fn(), effects: [] as ((t: number) => void)[], unsubscribe: vi.fn(),
}));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: record, flushWebDiagnostics: flush }));
vi.mock("@react-three/fiber", () => ({ addAfterEffect: (callback: (t: number) => void) => { effects.push(callback); return unsubscribe; } }));

let visibility: "visible" | "hidden" = "visible";
const listeners = new Set<() => void>();
beforeEach(() => {
  vi.clearAllMocks(); effects.length = 0; listeners.clear(); visibility = "visible";
  vi.stubGlobal("document", {
    get visibilityState() { return visibility; },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  });
});
afterEach(() => vi.unstubAllGlobals());

function rig(racing = true) {
  const info = { autoReset: true, reset: vi.fn(() => { info.render.drawCalls = 0; info.render.triangles = 0; }), render: { drawCalls: 0, triangles: 0 } };
  const gl = { info, getPixelRatio: () => 1.5 };
  let x = 0, t = 0, moving = true;
  const source = { backend: "webgpu" as const, player: () => ({ pos: { x, y: 0 }, heading: 0 }), racing: () => racing, firstFrameMs: () => 1800 };
  const stop = startPerfJournal(gl, source);
  /** `count` frames of `ms`, each with 7 draw calls and 900 triangles submitted. */
  const frames = (count: number, ms = 1000 / 60) => {
    for (let i = 0; i < count; i++) {
      t += ms; if (moving) x += 1;
      info.render.drawCalls += 7; info.render.triangles += 900;
      effects.forEach(effect => effect(t));
    }
  };
  const setVisibility = (next: typeof visibility) => { visibility = next; listeners.forEach(fn => fn()); };
  return { info, stop, frames, setVisibility, pause: (on: boolean) => { moving = !on; }, gap: (ms: number) => { t += ms; } };
}
const events = () => record.mock.calls.map(([event]) => event);

describe("race performance journal on a canvas", () => {
  it("samples at most once a minute while racing and records a final event at unmount", () => {
    const { info, stop, frames } = rig();
    expect(info.autoReset).toBe(false);
    frames(60 * 59);
    expect(record).not.toHaveBeenCalled();
    frames(60 * 2);
    expect(events().map(e => e.action)).toEqual(["sample"]);
    frames(60 * 30);
    expect(record).toHaveBeenCalledTimes(1);
    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(info.autoReset).toBe(true);
    const final = events()[1];
    expect(final).toMatchObject({ type: "race.perf", action: "final", backend: "webgpu", dpr: 1.5, drawCalls: 7, triangles: 900, firstFrameMs: 1800, fpsP5: 60 });
    expect(final.fpsAvg).toBeCloseTo(60, 0);
    // The counters were reset after every frame: one frame's draw calls, not a running total.
    expect(info.reset).toHaveBeenCalledTimes(60 * 91);
    expect(parseDiagnosticBatch({ version: 1, events: events() })?.events).toEqual(events());
  });

  it("does not count a frozen race, a stopped race clock or the time the page was hidden", () => {
    const { stop, frames, pause, setVisibility, gap } = rig();
    frames(600);                          // 10 s racing
    setVisibility("hidden");
    expect(events().map(e => e.action)).toEqual(["sample"]);
    expect(flush).toHaveBeenCalledTimes(1);
    gap(1500);                            // shorter than a frozen-tab gap, still not a frame
    setVisibility("visible");
    frames(600);
    pause(true); frames(600); pause(false);  // 10 s paused: only its first 0.5 s looks like racing
    frames(600);
    stop();
    const final = events().at(-1)!;
    expect(final.action).toBe("final");
    expect(final.fpsP5).toBe(60);
    // About 30 s of racing; the paused and hidden time are not in it.
    expect(final.seconds).toBeGreaterThan(29.8);
    expect(final.seconds).toBeLessThan(30.8);
    const idle = rig(false);
    record.mockClear();
    idle.frames(600);
    idle.stop();
    expect(record).not.toHaveBeenCalled();
  });
});
