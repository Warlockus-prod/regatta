import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createInitialRadio, radioReducer, type RadioEvent } from "./radioModel";
import { useRotaryDial } from "./useRotaryDial";

// Exercise the actual hook/ref callbacks and native EventTarget, with only the
// React commit scheduler supplied here. No browser or DOM package is required.
const lifecycle = vi.hoisted(() => ({ cursor: 0, pending: [] as (() => void)[],
  slots: [] as { current?: unknown; value?: unknown; callback?: unknown; deps?: readonly unknown[]; cleanup?: () => void }[] }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  const slot = () => lifecycle.slots[lifecycle.cursor++] ??= {};
  const equal = (a: readonly unknown[] | undefined, b: readonly unknown[]) => a?.length === b.length && b.every((value, index) => Object.is(value, a[index]));
  const effect = (run: () => void | (() => void), deps: readonly unknown[]) => {
    const state = slot();
    if (!equal(state.deps, deps)) {
      state.deps = deps;
      lifecycle.pending.push(() => { state.cleanup?.(); state.cleanup = run() || undefined; });
    }
  };
  return { ...actual,
    useRef: (initial: unknown) => { const state = slot(); if (!("current" in state)) state.current = initial; return state; },
    useState: (initial: unknown) => {
      const state = slot();
      if (!("value" in state)) state.value = typeof initial === "function" ? initial() : initial;
      return [state.value, (action: unknown) => { state.value = typeof action === "function" ? action(state.value) : action; }];
    },
    useCallback: (callback: unknown, deps: readonly unknown[]) => { const state = slot(); if (!equal(state.deps, deps)) { state.callback = callback; state.deps = deps; } return state.callback; },
    useLayoutEffect: effect, useEffect: effect,
  };
});
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));

class ButtonTarget extends EventTarget {
  added: { type: string; callback: EventListenerOrEventListenerObject | null; options?: boolean | AddEventListenerOptions }[] = [];
  removed: string[] = [];
  captured = new Set<number>();
  override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
    this.added.push({ type, callback, options }); super.addEventListener(type, callback, options);
  }
  override removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
    this.removed.push(type); super.removeEventListener(type, callback, options);
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 60, height: 60 }; }
  setPointerCapture(id: number) { this.captured.add(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
}
const asButton = (node: ButtonTarget) => node as unknown as HTMLButtonElement;
const pointer = (node: ButtonTarget, pointerId: number) => ({ pointerId, pointerType: "touch", isPrimary: true, button: 0,
  clientX: 30, clientY: 30, currentTarget: asButton(node), preventDefault: vi.fn() } as unknown as ReactPointerEvent<HTMLButtonElement>);
const commit = () => { for (const effect of lifecycle.pending.splice(0)) effect(); };
const renderDial = (dispatch: (event: RadioEvent) => void, enabled = true, identity = "M330:compact") => {
  lifecycle.cursor = 0;
  // eslint-disable-next-line react-hooks/rules-of-hooks -- The mock scheduler above deliberately drives this actual hook.
  return useRotaryDial(dispatch, enabled, identity);
};
beforeEach(() => {
  vi.useFakeTimers(); lifecycle.cursor = 0; lifecycle.slots = []; lifecycle.pending = [];
  vi.stubGlobal("window", new EventTarget()); vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
});
afterEach(() => { for (const state of lifecycle.slots) state.cleanup?.(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("native touch default on the actual DIAL node", () => {
  it("uses one non-passive local listener and never dispatches an extra touch-driven command", () => {
    const dispatch = vi.fn(), node = new ButtonTarget(), dial = renderDial(dispatch);
    dial.handlers.ref(asButton(node)); commit();
    dial.handlers.ref(asButton(node));
    expect(node.added).toHaveLength(1);
    expect(node.added[0]).toMatchObject({ type: "touchstart", options: { passive: false } });
    const event = new Event("touchstart", { cancelable: true });
    expect(node.dispatchEvent(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    vi.advanceTimersByTime(2600);
    expect(dispatch).not.toHaveBeenCalled();
    const uncancelable = new Event("touchstart"), prevent = vi.spyOn(uncancelable, "preventDefault");
    node.dispatchEvent(uncancelable);
    expect(prevent).not.toHaveBeenCalled();
    dial.handlers.ref(null);
  });

  it("preserves the real pointer hold and two taps after native default cancellation", () => {
    let radio = createInitialRadio();
    const events: RadioEvent[] = [], node = new ButtonTarget();
    const dial = renderDial(event => { events.push(event); radio = radioReducer(radio, event); });
    dial.handlers.ref(asButton(node)); commit();
    node.dispatchEvent(new Event("touchstart", { cancelable: true }));
    dial.handlers.onPointerDown(pointer(node, 1)); vi.advanceTimersByTime(2600); dial.handlers.onPointerUp(pointer(node, 1));
    for (const id of [2, 3]) {
      vi.advanceTimersByTime(1);
      expect(node.dispatchEvent(new Event("touchstart", { cancelable: true }))).toBe(false);
      dial.handlers.onPointerDown(pointer(node, id)); vi.advanceTimersByTime(50); dial.handlers.onPointerUp(pointer(node, id));
    }
    expect(events).toEqual([{ type: "dial-hold" }, { type: "dial-push" }, { type: "dial-push" }]);
    expect(radio).toMatchObject({ power: true, screen: "squelch", squelch: 4 });
    expect(node.captured.size).toBe(0);
    dial.handlers.ref(null);
  });

  it("reads committed enabled state without ref churn so Inspect can retain its ordinary click", () => {
    const dispatch = vi.fn(), node = new ButtonTarget();
    const active = renderDial(dispatch); active.handlers.ref(asButton(node)); commit();
    active.handlers.onPointerDown(pointer(node, 1)); vi.advanceTimersByTime(200);
    const inspect = renderDial(dispatch, false); commit();
    expect(inspect.handlers.ref).toBe(active.handlers.ref);
    expect(node.added).toHaveLength(1);
    const event = new Event("touchstart", { cancelable: true });
    expect(node.dispatchEvent(event)).toBe(true);
    expect(event.defaultPrevented).toBe(false);
    vi.advanceTimersByTime(2600);
    expect(dispatch).not.toHaveBeenCalled();
    const enabled = renderDial(dispatch, true); commit();
    expect(enabled.handlers.ref).toBe(active.handlers.ref);
    expect(node.dispatchEvent(new Event("touchstart", { cancelable: true }))).toBe(false);
    enabled.handlers.ref(null);
  });

  it("removes the listener from replaced and unmounted nodes and cancels a replaced hold", () => {
    const dispatch = vi.fn(), first = new ButtonTarget(), second = new ButtonTarget();
    const dial = renderDial(dispatch); dial.handlers.ref(asButton(first)); commit();
    dial.handlers.onPointerDown(pointer(first, 1));
    dial.handlers.ref(asButton(second));
    expect(first.removed).toEqual(["touchstart"]);
    expect(first.dispatchEvent(new Event("touchstart", { cancelable: true }))).toBe(true);
    expect(second.dispatchEvent(new Event("touchstart", { cancelable: true }))).toBe(false);
    vi.advanceTimersByTime(2600); expect(dispatch).not.toHaveBeenCalled();
    dial.handlers.ref(null);
    expect(second.removed).toEqual(["touchstart"]);
    expect(second.dispatchEvent(new Event("touchstart", { cancelable: true }))).toBe(true);
  });

  it("cancels on a model/layout identity change without replacing the touch listener", () => {
    const dispatch = vi.fn(), node = new ButtonTarget();
    const dial = renderDial(dispatch); dial.handlers.ref(asButton(node)); commit();
    dial.handlers.onPointerDown(pointer(node, 1)); vi.advanceTimersByTime(200);
    const next = renderDial(dispatch, true, "M323:wide"); commit();
    expect(next.handlers.ref).toBe(dial.handlers.ref);
    expect(node.added).toHaveLength(1);
    vi.advanceTimersByTime(2600); expect(dispatch).not.toHaveBeenCalled();
    next.handlers.ref(null);
  });
});
