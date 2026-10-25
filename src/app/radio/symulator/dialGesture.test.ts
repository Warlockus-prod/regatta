import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beginDialGesture, DIAL_HOLD_MS, moveDialGesture, RadioDialInput } from "./dialGesture";
import type { RadioEvent } from "./radioModel";
import { createDiagnosticJournal } from "@/lib/diagnostics";

const bounds = { left: 0, top: 0, width: 60, height: 60 };
const center = { x: 30, y: 30 };
const polar = (angle: number) => ({ x: 30 + 25 * Math.cos(angle * Math.PI / 180), y: 30 + 25 * Math.sin(angle * Math.PI / 180) });
describe("radio DIAL motion", () => {
  it("latches a center grab to horizontal travel even after leaving the hub", () => {
    const initial = beginDialGesture(1, center, bounds)!;
    expect(initial.mode).toBe("horizontal");
    const motion = moveDialGesture(initial, { x: 42, y: 10 });
    expect(motion.steps).toBe(2);
    expect(motion.visualDegrees).toBe(30);
    expect(motion.gesture.mode).toBe("horizontal");
    const innerGrip = beginDialGesture(2, { x: 42, y: 30 }, bounds)!;
    expect(innerGrip.mode).toBe("horizontal");
    expect(moveDialGesture(innerGrip, { x: 30, y: 30 }).steps).toBe(-2);
  });
  it("takes the short direction across the angular seam and preserves reversal detents", () => {
    const initial = beginDialGesture(1, polar(170), bounds)!;
    const clockwise = moveDialGesture(initial, polar(-170));
    expect(clockwise.steps).toBe(1);
    expect(clockwise.visualDegrees).toBeCloseTo(20);
    const reverse = moveDialGesture(clockwise.gesture, polar(170));
    expect(reverse.steps).toBe(-1);
    expect(reverse.visualDegrees).toBeCloseTo(-20);
  });
  it("accumulates small movements and does not reverse a whole detent for one pixel", () => {
    let gesture = beginDialGesture(1, center, bounds)!;
    let total = 0;
    for (const x of [32, 34, 36]) { const motion = moveDialGesture(gesture, { x, y: 30 }); gesture = motion.gesture; total += motion.steps; }
    expect(total).toBe(1);
    const tinyReverse = moveDialGesture(gesture, { x: 35, y: 30 });
    expect(tinyReverse.steps).toBe(0);
    expect(moveDialGesture(tinyReverse.gesture, center).steps).toBe(-1);
  });
  it("rebases an outer grab after crossing the hub without a seam jump", () => {
    const initial = beginDialGesture(1, polar(0), bounds)!;
    const hub = moveDialGesture(initial, center);
    expect(hub.steps).toBe(0);
    const outside = moveDialGesture(hub.gesture, polar(90));
    expect(outside.steps).toBe(0);
    expect(outside.visualDegrees).toBe(0);
    expect(moveDialGesture(outside.gesture, polar(120)).steps).toBe(2);
  });
  it("rejects malformed coordinates and bounds and bounds a single remote pointer jump", () => {
    expect(beginDialGesture(1, center, { ...bounds, width: 0 })).toBeNull();
    expect(beginDialGesture(1, { x: NaN, y: 3 }, bounds)).toBeNull();
    const initial = beginDialGesture(1, center, bounds)!;
    expect(moveDialGesture(initial, { x: Infinity, y: 30 }).gesture).toBe(initial);
    expect(moveDialGesture(initial, { x: 1e9, y: 30 }).steps).toBe(24);
  });
});

describe("radio DIAL input ownership", () => {
  let events: RadioEvent[], visual: number[], input: RadioDialInput;
  beforeEach(() => {
    vi.useFakeTimers(); events = []; visual = [];
    input = new RadioDialInput(event => events.push(event), angle => visual.push(angle));
  });
  afterEach(() => { input.dispose(); vi.useRealTimers(); });
  it("a tap pushes once and its subsequent pointer click cannot duplicate it", () => {
    input.pointerDown(1, center, bounds); vi.advanceTimersByTime(500); input.pointerUp(1); input.click(1, "touch");
    expect(events).toEqual([{ type: "dial-push" }]);
    vi.advanceTimersByTime(2000); expect(events).toHaveLength(1);
  });
  it("keeps the exact1000ms hold and never pushes or turns after power fires", () => {
    input.pointerDown(1, center, bounds); vi.advanceTimersByTime(DIAL_HOLD_MS - 1); expect(events).toEqual([]);
    vi.advanceTimersByTime(1); input.pointerMove(1, { x: 48, y: 30 }); input.pointerUp(1); input.click(1, "touch");
    expect(events).toEqual([{ type: "dial-hold" }]); expect(visual).toEqual([]);
  });
  it("a real center drag turns without a push or delayed power even when held beyond1000ms", () => {
    input.pointerDown(1, center, bounds); input.pointerMove(1, { x: 48, y: 30 });
    vi.advanceTimersByTime(2000); input.pointerUp(1); input.click(1, "mouse");
    expect(events).toEqual(Array.from({ length: 3 }, () => ({ type: "dial-rotate", dir: 1 })));
    expect(visual).toEqual([45]);
  });
  it("movement intent below a full detent cancels tap and hold, while ordinary jitter does not", () => {
    input.pointerDown(1, center, bounds); input.pointerMove(1, { x: 35, y: 30 });
    vi.advanceTimersByTime(1500); input.pointerUp(1); expect(events).toEqual([]);
    input.pointerDown(2, center, bounds); input.pointerMove(2, { x: 32, y: 31 });
    vi.advanceTimersByTime(1000); input.pointerUp(2); expect(events).toEqual([{ type: "dial-hold" }]);
  });
  it("owns exactly one pointer so a second finger cannot leave an orphan timer", () => {
    input.pointerDown(1, center, bounds); vi.advanceTimersByTime(300);
    expect(input.pointerDown(2, center, bounds)).toBe(false);
    input.pointerMove(2, { x: 60, y: 30 }); input.pointerCancel(2); input.pointerUp(2);
    expect(input.pointerId).toBe(1);
    input.pointerUp(1); vi.advanceTimersByTime(2000);
    expect(events).toEqual([{ type: "dial-push" }]);
  });
  it("cancel, capture loss, lifecycle reset and disposal do not turn into a tap or late power", () => {
    input.pointerDown(1, center, bounds); input.pointerCancel(1); input.pointerUp(1);
    input.pointerDown(2, center, bounds); input.cancel(); input.pointerUp(2);
    input.pointerDown(3, center, bounds); input.dispose(); vi.advanceTimersByTime(2000);
    expect(events).toEqual([]);
  });
  it("does not leave a stuck click suppression after cancellation or a pointer release", () => {
    input.pointerDown(1, center, bounds); input.cancel(); input.click(0); expect(events).toEqual([]);
    vi.advanceTimersByTime(0); input.click(0); expect(events).toEqual([{ type: "dial-push" }]);
  });
  it("mount/reset without an active gesture does not swallow a click-only activation", () => {
    input.cancel(); input.click(0);
    expect(events).toEqual([{ type: "dial-push" }]);
  });
  it("keyboard presses, held power and click-only assistive activation each emit once", () => {
    expect(input.keyDown("Enter")).toBe(true); input.click(0); input.keyDown("Enter", true); input.keyUp("Enter"); input.click(0);
    expect(events).toEqual([{ type: "dial-push" }]);
    vi.advanceTimersByTime(0); input.click(0); expect(events).toHaveLength(2);
    input.keyDown(" "); vi.advanceTimersByTime(1000); input.keyUp(" "); input.click(0);
    expect(events.at(-1)).toEqual({ type: "dial-hold" }); expect(events).toHaveLength(3);
  });
  it("keyboard and visible arrow alternatives use the same detents and marker", () => {
    input.keyDown("ArrowRight"); input.keyDown("ArrowLeft"); input.step(-1);
    expect(events).toEqual([{ type: "dial-rotate", dir: 1 }, { type: "dial-rotate", dir: -1 }, { type: "dial-rotate", dir: -1 }]);
    expect(visual).toEqual([15, -15, -15]);
  });
  it("updates the dispatch adapter without restarting a live hold or capturing stale callbacks", () => {
    input.pointerDown(1, center, bounds);
    const latest = vi.fn(); input.setEmit(latest); vi.advanceTimersByTime(1000);
    expect(events).toEqual([]); expect(latest).toHaveBeenCalledWith({ type: "dial-hold" });
  });
  it("records only validated gesture notices and keeps a broken recorder out of the command path", () => {
    const journal = createDiagnosticJournal({ now: () => 0 });
    const logged = new RadioDialInput(event => events.push(event), () => {}, notice => {
      expect(journal.record({ type: "radio.gesture", surface: "radio", control: "dial", ...notice })).not.toBeNull();
      throw new Error("PRIVATE_RECORDER_FAILURE");
    });
    logged.pointerDown(1, center, bounds); logged.pointerMove(1, { x: 42, y: 30 }); logged.pointerUp(1); logged.dispose();
    expect(events).toEqual([{ type: "dial-rotate", dir: 1 }, { type: "dial-rotate", dir: 1 }]);
    expect(JSON.stringify(journal.snapshot())).not.toContain("PRIVATE_RECORDER_FAILURE");
    expect(journal.snapshot().entries.some(entry => entry.event.type === "radio.gesture" && entry.event.action === "rotate")).toBe(true);
  });
});
