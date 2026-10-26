import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import RadioFront from "./RadioFront";
import { channel, createInitialRadio, radioReducer, softkeys, type RadioEvent, type RadioModel } from "./radioModel";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import { createDiagnosticJournal } from "@/lib/diagnostics";

const capture = vi.hoisted(() => ({ buttons: new Map<string, React.ButtonHTMLAttributes<HTMLButtonElement>>() }));
vi.mock("react/jsx-runtime", async original => {
  const actual = await original<typeof import("react/jsx-runtime")>();
  const wrap = (render: typeof actual.jsx) => (...args: Parameters<typeof actual.jsx>) => {
    const [type, props] = args;
    const attributes = props as React.ButtonHTMLAttributes<HTMLButtonElement> & { "data-testid"?: string };
    if (type === "button" && typeof attributes?.["data-testid"] === "string") capture.buttons.set(attributes["data-testid"], attributes);
    return render(...args);
  };
  return { ...actual, jsx: wrap(actual.jsx), jsxs: wrap(actual.jsxs) };
});
vi.mock("react/jsx-dev-runtime", async original => {
  const actual = await original<typeof import("react/jsx-dev-runtime")>();
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    const [type, props] = args;
    const attributes = props as React.ButtonHTMLAttributes<HTMLButtonElement> & { "data-testid"?: string };
    if (type === "button" && typeof attributes?.["data-testid"] === "string") capture.buttons.set(attributes["data-testid"], attributes);
    return actual.jsxDEV(...args);
  } };
});
vi.mock("../localization/context", () => ({ useRadioI18n: () => ({ rt: <T,>(value: T) => value, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal("React", React); vi.mocked(recordWebDiagnostic).mockReset(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

type ButtonHandlers = React.ButtonHTMLAttributes<HTMLButtonElement>;
function panelControls(model: RadioModel, realistic = false, compact = false) {
  const buttons = capture.buttons = new Map<string, ButtonHandlers>();
  // The test-only JSX wrapper delegates every element to React unchanged and
  // captures actual rendered button callbacks. Hooks/refs and reducers are real.
  let state = radioReducer({ ...createInitialRadio(model), power: true, screen: "standby", softPage: 1 }, { type: "up" });
  const dispatch = vi.fn((event: RadioEvent) => { state = radioReducer(state, event); });
  renderToStaticMarkup(<RadioFront s={state} model={model} realistic={realistic} compact={compact}
    dispatch={dispatch} holdPct={0} onDistressDown={() => {}} onDistressUp={() => {}}
    onPttDown={() => dispatch({ type: "ptt-down" })} onPttUp={() => dispatch({ type: "ptt-up" })} clock="12:00" nextTxSec={0} />);
  return { dispatch, state: () => state, button: (id: string) => {
    const button = buttons.get(id);
    if (!button) throw new Error(`Missing rendered control ${id}`);
    return button;
  } };
}
const touch = () => ({ pointerType: "touch", pointerId: 1, isPrimary: true } as React.PointerEvent<HTMLButtonElement>);

it("cancels a 16/C touch without selecting CH16 or firing a delayed Call Channel hold in either model/layout", () => {
  for (const model of ["M330", "M323"] as const) for (const realistic of [false, true]) for (const compact of [false, true]) {
    const panel = panelControls(model, realistic, compact), key = panel.button("key-16c");
    const initial = panel.state();
    expect(channel(initial).num).not.toBe("16");
    key.onPointerDown!(touch()); vi.advanceTimersByTime(400);
    key.onPointerCancel!(touch());
    // Some input stacks may still deliver a release after cancellation.
    key.onPointerUp!(touch()); vi.advanceTimersByTime(1500);
    expect(panel.dispatch, `${model}/${realistic}/${compact}`).not.toHaveBeenCalled();
    expect(panel.state()).toBe(initial);
    expect(vi.getTimerCount()).toBe(0);
    key.onPointerDown!(touch()); vi.advanceTimersByTime(50); key.onPointerUp!(touch());
    expect(panel.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "key-16c" });
    expect(channel(panel.state()).num).toBe("16");
  }
});

it("preserves real 16/C tap and exact1000ms hold without an additional CH16 release", () => {
  for (const model of ["M330", "M323"] as const) {
    const tap = panelControls(model), tapKey = tap.button("key-16c");
    tapKey.onPointerDown!(touch()); vi.advanceTimersByTime(100); tapKey.onPointerUp!(touch());
    expect(tap.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "key-16c" });
    expect(channel(tap.state()).num).toBe("16");
    const hold = panelControls(model), holdKey = hold.button("key-16c");
    holdKey.onPointerDown!(touch()); vi.advanceTimersByTime(999);
    expect(hold.dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hold.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "key-16c-hold" });
    holdKey.onPointerUp!(touch());
    expect(hold.dispatch).toHaveBeenCalledTimes(1);
    expect(channel(hold.state()).num).toBe("06");
  }
});

it("keeps cancellation as release for held AQUA and PTT controls", () => {
  for (const model of ["M330", "M323"] as const) {
    const panel = panelControls(model);
    const aquaIndex = softkeys(panel.state()).indexOf("AQUA");
    expect(aquaIndex).toBeGreaterThanOrEqual(0);
    const aqua = panel.button(`soft-${aquaIndex}`), ptt = panel.button("ptt");
    aqua.onPointerDown!(touch()); expect(panel.state().aquaActive).toBe(true);
    aqua.onPointerCancel!(touch()); expect(panel.state().aquaActive).toBe(false);
    ptt.onPointerDown!(touch()); expect(panel.state().ptt).toBe(true);
    ptt.onPointerCancel!(touch()); expect(panel.state().ptt).toBe(false);
    expect(panel.dispatch.mock.calls.map(([event]) => event.type)).toEqual(["aqua-down", "aqua-up", "ptt-down", "ptt-up"]);
  }
  expect(recordWebDiagnostic).not.toHaveBeenCalled();
});

it("records exactly one safe16/C pointer-cancel row without a radio command or changed channel", () => {
  const journal = createDiagnosticJournal({ now: () => 0 });
  vi.mocked(recordWebDiagnostic).mockImplementation(input => journal.record(input));
  const panel = panelControls("M330"), key = panel.button("key-16c"), initial = panel.state();
  key.onPointerDown!(touch()); vi.advanceTimersByTime(100); key.onPointerCancel!(touch());
  key.onPointerUp!(touch()); vi.advanceTimersByTime(1500);
  expect(recordWebDiagnostic).toHaveBeenCalledTimes(1);
  expect(journal.snapshot().entries.map(entry => entry.event)).toEqual([{
    type: "radio.gesture", surface: "radio", control: "16c", action: "cancel",
    outcome: "noop", source: "pointer", reason: "pointer-cancel",
  }]);
  expect(panel.dispatch).not.toHaveBeenCalled();
  expect(panel.state()).toBe(initial);
});

it("does not mislabel a pointer leave or an ordinary tap as pointer-cancel", () => {
  const panel = panelControls("M323"), key = panel.button("key-16c");
  key.onPointerDown!(touch()); vi.advanceTimersByTime(100); key.onPointerLeave!(touch());
  vi.advanceTimersByTime(1500);
  expect(panel.dispatch).not.toHaveBeenCalled();
  expect(recordWebDiagnostic).not.toHaveBeenCalled();
  key.onPointerDown!(touch()); vi.advanceTimersByTime(100); key.onPointerUp!(touch());
  expect(panel.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "key-16c" });
  expect(recordWebDiagnostic).not.toHaveBeenCalled();
});

it("cancels the real hold timer before a throwing diagnostic recorder can interrupt it", () => {
  vi.mocked(recordWebDiagnostic).mockImplementation(() => { throw new Error("Diagnostic unavailable"); });
  const panel = panelControls("M330"), key = panel.button("key-16c"), initial = panel.state();
  key.onPointerDown!(touch()); vi.advanceTimersByTime(100);
  expect(() => key.onPointerCancel!(touch())).not.toThrow();
  key.onPointerUp!(touch()); vi.advanceTimersByTime(1500);
  expect(recordWebDiagnostic).toHaveBeenCalledTimes(1);
  expect(panel.dispatch).not.toHaveBeenCalled();
  expect(panel.state()).toBe(initial);
  expect(vi.getTimerCount()).toBe(0);
});
it("keeps one moving index and both accessible rotation alternatives in every model, skin and layout", () => {
  for (const model of ["M330", "M323"] as const) for (const skin of ["green", "amber"] as const) for (const realistic of [false, true]) for (const compact of [false, true]) {
    const html = renderToStaticMarkup(<RadioFront s={createInitialRadio(model)} model={model} skin={skin} realistic={realistic} compact={compact}
      dispatch={() => {}} holdPct={0} onDistressDown={() => {}} onDistressUp={() => {}} onPttDown={() => {}} onPttUp={() => {}} clock="12:00" nextTxSec={0} />);
    for (const id of ["dial-center", "dial-index", "dial-ccw", "dial-cw"]) expect(html.match(new RegExp(`data-testid="${id}"`, "g")), `${model}/${skin}/${realistic}/${compact}: ${id}`).toHaveLength(1);
    expect(html).toContain('aria-label="Rotate dial counter-clockwise"');
    expect(html).toContain('aria-label="Rotate dial clockwise"');
    expect(html).toContain('aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"');
  }
});
