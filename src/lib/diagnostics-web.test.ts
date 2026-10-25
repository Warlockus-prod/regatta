import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDiagnosticJournal, DIAGNOSTIC_STORAGE_KEY, DIAGNOSTIC_TTL_MS, EMPTY_DIAGNOSTIC_SNAPSHOT, parseDiagnosticPersistence, serializeDiagnosticPersistence, type DiagnosticInput } from "./diagnostics";

const input: DiagnosticInput = { type: "radio.command", surface: "radio", outcome: "accepted", action: "dial-push" };
function browser() {
  const values = new Map<string, string>();
  const listeners = new Map<string, () => void>();
  let time = 0;
  const owner = {
    performance: { now: () => time },
    localStorage: { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { values.set(key, value); }), removeItem: vi.fn((key: string) => { values.delete(key); }) },
    addEventListener: vi.fn((type: string, listener: () => void) => { listeners.set(type, listener); }),
  };
  return { owner, values, advance: (ms: number) => { time += ms; }, pagehide: () => listeners.get("pagehide")?.() };
}
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(1_000_000_000); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("browser diagnostics adapter", () => {
  it("is an inert stable SSR store that cannot share request events", async () => {
    vi.stubGlobal("window", undefined);
    const web = await import("./diagnostics-web");
    expect(web.recordWebDiagnostic(input)).toBeNull();
    const snapshot = web.getWebDiagnosticJournal().snapshot();
    expect(snapshot).toEqual(EMPTY_DIAGNOSTIC_SNAPSHOT);
    expect(web.initializeWebDiagnostics().restore({})).toBe(false);
    expect(web.flushWebDiagnostics()).toBe(false);
    expect(() => web.getWebDiagnosticJournal().clear()).not.toThrow();
    expect(web.getWebDiagnosticJournal().snapshot()).toBe(snapshot);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("initializes once per window, debounces a safe envelope and flushes on pagehide", async () => {
    const b = browser(); vi.stubGlobal("window", b.owner);
    const web = await import("./diagnostics-web");
    const journal = web.getWebDiagnosticJournal();
    expect(web.initializeWebDiagnostics()).toBe(journal);
    expect(b.owner.localStorage.getItem).toHaveBeenCalledTimes(1);
    web.recordWebDiagnostic(input);
    b.advance(100); web.recordWebDiagnostic(input);
    vi.advanceTimersByTime(399);
    expect(b.owner.localStorage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(b.owner.localStorage.setItem).toHaveBeenCalledTimes(1);
    expect(parseDiagnosticPersistence(b.values.get(DIAGNOSTIC_STORAGE_KEY), Date.now())?.entries).toHaveLength(2);
    web.recordWebDiagnostic(input);
    b.pagehide();
    expect(b.owner.localStorage.setItem).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    expect(b.owner.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("restores a previous session and isolates a second browser context", async () => {
    const old = createDiagnosticJournal({ now: () => 0 }); old.record(input);
    const b = browser(); b.values.set(DIAGNOSTIC_STORAGE_KEY, serializeDiagnosticPersistence(old.snapshot(), Date.now())!);
    vi.stubGlobal("window", b.owner);
    const web = await import("./diagnostics-web");
    const journal = web.initializeWebDiagnostics();
    expect(journal.snapshot()).toMatchObject({ session: 2, entries: [{ session: 1, event: input }] });
    expect(web.recordWebDiagnostic(input)).toMatchObject({ seq: 2, session: 2 });
    expect(web.flushWebDiagnostics()).toBe(true);
    expect(parseDiagnosticPersistence(b.values.get(DIAGNOSTIC_STORAGE_KEY), Date.now())?.session).toBe(2);
    const other = browser(); vi.stubGlobal("window", other.owner);
    expect(web.getWebDiagnosticJournal()).not.toBe(journal);
    expect(web.getWebDiagnosticJournal().snapshot().entries).toHaveLength(0);
  });

  it("emits each original input exactly once despite coalescing, excluding restore, clear and invalid fields", async () => {
    const old = createDiagnosticJournal({ now: () => 0 }); old.record(input);
    const b = browser(); b.values.set(DIAGNOSTIC_STORAGE_KEY, serializeDiagnosticPersistence(old.snapshot(), Date.now())!);
    vi.stubGlobal("window", b.owner);
    const web = await import("./diagnostics-web");
    const listener = vi.fn();
    const unsubscribe = web.subscribeWebDiagnosticInput(listener);
    web.subscribeWebDiagnosticInput(() => { throw new Error("bridge unavailable"); });
    expect(listener).not.toHaveBeenCalled();
    const gesture: DiagnosticInput = { type: "radio.gesture", surface: "radio", outcome: "accepted", action: "rotate", control: "dial", steps: 2 };
    web.recordWebDiagnostic(gesture); web.recordWebDiagnostic(gesture);
    expect(web.getWebDiagnosticJournal().snapshot().entries.at(-1)).toMatchObject({ count: 2, event: { steps: 4 } });
    expect(listener.mock.calls.map(call => call[0].steps)).toEqual([2, 2]);
    expect(Object.isFrozen(listener.mock.calls[0][0])).toBe(true);
    web.recordWebDiagnostic({ ...input, outcome: "noop", reason: "limit" });
    web.recordWebDiagnostic({ ...input, outcome: "failed", reason: "disabled" });
    expect(listener.mock.calls.map(call => call[0].outcome)).toEqual(["accepted", "accepted", "noop", "failed"]);
    web.recordWebDiagnostic({ ...input, text: "PRIVATE_SENTINEL" } as DiagnosticInput);
    web.getWebDiagnosticJournal().clear();
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe(); web.recordWebDiagnostic(input);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("retains commands in memory when reads/writes fail without an error feedback loop", async () => {
    const b = browser();
    b.owner.localStorage.getItem.mockImplementation(() => { throw new Error("private mode"); });
    b.owner.localStorage.setItem.mockImplementation(() => { throw new Error("quota"); });
    b.owner.addEventListener.mockImplementation(() => { throw new Error("unavailable lifecycle"); });
    vi.stubGlobal("window", b.owner);
    const web = await import("./diagnostics-web");
    expect(() => web.recordWebDiagnostic(input)).not.toThrow();
    vi.advanceTimersByTime(10_000);
    expect(web.getWebDiagnosticJournal().snapshot().entries).toHaveLength(1);
    expect(b.owner.localStorage.getItem).toHaveBeenCalledTimes(1);
    expect(b.owner.localStorage.setItem).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(web.flushWebDiagnostics()).toBe(false);
    expect(web.getWebDiagnosticJournal().snapshot().entries).toHaveLength(1);
  });

  it.each(["corrupt", "expired", "future"])("ignores %s persisted data without blocking startup or touching other stores", async kind => {
    const b = browser();
    const old = createDiagnosticJournal({ now: () => 0 }); old.record(input);
    const savedAt = kind === "expired" ? Date.now() - DIAGNOSTIC_TTL_MS : kind === "future" ? Date.now() + 1 : Date.now();
    b.values.set(DIAGNOSTIC_STORAGE_KEY, kind === "corrupt" ? "PRIVATE_SENTINEL" : serializeDiagnosticPersistence(old.snapshot(), savedAt)!);
    b.values.set("radio.src.progress.v1", "real progress");
    b.values.set("regatta.race-history.v1", "real races");
    vi.stubGlobal("window", b.owner);
    const web = await import("./diagnostics-web");
    expect(web.getWebDiagnosticJournal().snapshot().entries).toHaveLength(0);
    web.recordWebDiagnostic(input);
    expect(web.flushWebDiagnostics()).toBe(true);
    expect(b.values.get(DIAGNOSTIC_STORAGE_KEY)).not.toContain("PRIVATE_SENTINEL");
    web.getWebDiagnosticJournal().clear();
    expect(web.flushWebDiagnostics()).toBe(true);
    expect(b.values.has(DIAGNOSTIC_STORAGE_KEY)).toBe(false);
    expect(b.values.get("radio.src.progress.v1")).toBe("real progress");
    expect(b.values.get("regatta.race-history.v1")).toBe("real races");
  });
});


it("uses memory only inside a native host so app Clear all cannot revive WK diagnostics", async () => {
  const b = browser();
  const old = createDiagnosticJournal({ now: () => 0 }); old.record(input);
  b.values.set(DIAGNOSTIC_STORAGE_KEY, serializeDiagnosticPersistence(old.snapshot(), Date.now())!);
  vi.stubGlobal("window", { ...b.owner, ReactNativeWebView: { postMessage: vi.fn() } });
  const web = await import("./diagnostics-web");
  expect(web.initializeWebDiagnostics().snapshot().entries).toHaveLength(0);
  expect(b.owner.localStorage.getItem).not.toHaveBeenCalled();
  web.recordWebDiagnostic(input); vi.advanceTimersByTime(1000); b.pagehide();
  expect(web.flushWebDiagnostics()).toBe(true);
  expect(b.owner.localStorage.setItem).not.toHaveBeenCalled();
  web.getWebDiagnosticJournal().clear(); web.flushWebDiagnostics();
  expect(b.owner.localStorage.removeItem).not.toHaveBeenCalled();
});
