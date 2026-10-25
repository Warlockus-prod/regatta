import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseDiagnosticBatch, type DiagnosticInput } from "./diagnostics";
const input: DiagnosticInput = { type: "radio.gesture", surface: "radio", action: "rotate", control: "dial", steps: 2, outcome: "accepted" };
function browser() {
  const callbacks = new Map<string, () => void>();
  const postMessage = vi.fn();
  const owner = { ReactNativeWebView: { postMessage }, performance: { now: () => 0 }, localStorage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() }, document: { visibilityState: "visible" }, addEventListener: (name: string, callback: () => void) => callbacks.set(name, callback) };
  return { owner, postMessage, callbacks };
}
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("append-only native diagnostic bridge", () => {
  it("is inert during SSR and ordinary browser use", async () => {
    vi.stubGlobal("window", undefined);
    const bridge = await import("./diagnostics-bridge");
    expect(() => bridge.initializeDiagnosticBridge()).not.toThrow();
    vi.stubGlobal("window", { });
    expect(() => bridge.initializeDiagnosticBridge()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("starts once and sends original inputs without cumulative count duplication", async () => {
    const b = browser(); vi.stubGlobal("window", b.owner);
    const bridge = await import("./diagnostics-bridge"), web = await import("./diagnostics-web");
    bridge.initializeDiagnosticBridge(); bridge.initializeDiagnosticBridge();
    web.recordWebDiagnostic(input); web.recordWebDiagnostic(input);
    expect(web.getWebDiagnosticJournal().snapshot().entries[0].count).toBe(2);
    expect(b.postMessage).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    const message = JSON.parse(b.postMessage.mock.calls[0][0]);
    expect(message.type).toBe("diagnostic-events");
    expect(parseDiagnosticBatch({ version: message.version, events: message.events })?.events.map(event => "steps" in event ? event.steps : null)).toEqual([2, 2]);
    expect(b.postMessage).toHaveBeenCalledTimes(1);
  });
  it("bounds batches, rejects private extra fields and flushes on pagehide", async () => {
    const b = browser(); vi.stubGlobal("window", b.owner);
    const bridge = await import("./diagnostics-bridge"), web = await import("./diagnostics-web");
    bridge.initializeDiagnosticBridge();
    for (let i = 0; i < 17; i++) web.recordWebDiagnostic(input);
    web.recordWebDiagnostic({ ...input, privateText: "PRIVATE_SENTINEL" } as DiagnosticInput);
    expect(JSON.parse(b.postMessage.mock.calls[0][0]).events).toHaveLength(16);
    b.callbacks.get("pagehide")?.();
    expect(JSON.parse(b.postMessage.mock.calls[1][0]).events).toHaveLength(1);
    expect(JSON.stringify(b.postMessage.mock.calls)).not.toContain("PRIVATE_SENTINEL");
    vi.advanceTimersByTime(1000); expect(b.postMessage).toHaveBeenCalledTimes(2);
  });
  it("never propagates a native post failure to the control", async () => {
    const b = browser(); b.postMessage.mockImplementation(() => { throw new Error("native unavailable"); }); vi.stubGlobal("window", b.owner);
    (await import("./diagnostics-bridge")).initializeDiagnosticBridge();
    (await import("./diagnostics-web")).recordWebDiagnostic(input);
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
  });
});


it("flushes pending input before a native exit without replaying the batch", async () => {
  const b = browser(); vi.stubGlobal("window", b.owner);
  const bridge = await import("./diagnostics-bridge"), web = await import("./diagnostics-web");
  bridge.initializeDiagnosticBridge(); web.recordWebDiagnostic(input);
  bridge.flushDiagnosticBridge();
  b.owner.ReactNativeWebView.postMessage(JSON.stringify({ type: "radio-exit" }));
  expect(b.postMessage.mock.calls.map(call => JSON.parse(call[0]).type)).toEqual(["diagnostic-events", "radio-exit"]);
  vi.advanceTimersByTime(1000); expect(b.postMessage).toHaveBeenCalledTimes(2);
});
