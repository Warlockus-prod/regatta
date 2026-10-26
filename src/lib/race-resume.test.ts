import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRaceSetup, inspectRaceSetup, loadRaceSetup, RACE_RESUME_MAX_CHARS, saveRaceSetup, type SavedRaceSetup } from "./race-resume";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext } from "./race-context";
import { parseDiagnosticBatch } from "./diagnostics";

const { diagnostic } = vi.hoisted(() => ({ diagnostic: vi.fn() }));
vi.mock("./diagnostics-controls", () => ({ recordDiagnostic: diagnostic }));
const KEY = "regatta.race-resume.v1";
const NOW = 10_000_000;
const TTL = 30 * 60 * 1000;
const oldSetup: SavedRaceSetup = { v: 1, difficulty: "easy", windStrength: "light", missionId: null, phase: "briefing", ts: NOW };
const intent = { difficulty: "easy", windStrength: "light", missionId: null, phase: "briefing" } as const;
const storage = new Map<string, string>();

beforeEach(() => {
  diagnostic.mockReset(); storage.clear();
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW);
  vi.stubGlobal("window", { localStorage: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn((key: string) => { storage.delete(key); }),
  } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("pure race setup inspection", () => {
  it("keeps the exact old returned fields without inventing a context or mode", () => {
    expect(inspectRaceSetup(null, NOW)).toEqual({ kind: "missing" });
    const bytes = JSON.stringify(oldSetup, null, 2);
    expect(inspectRaceSetup(bytes, NOW)).toEqual({ kind: "ready", setup: oldSetup });
    storage.set(KEY, bytes);
    expect(loadRaceSetup()).toEqual(oldSetup);
    expect(loadRaceSetup()).not.toHaveProperty("mode"); expect(loadRaceSetup()).not.toHaveProperty("raceContext");
    expect(storage.get(KEY)).toBe(bytes); expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });

  it("keeps historical null context and explicit legacy mode additively", () => {
    for (const raceContext of [null, LEGACY_RACE_CONTEXT]) {
      const setup = { ...oldSetup, raceContext, mode: "pro" as const };
      expect(inspectRaceSetup(JSON.stringify(setup), NOW)).toEqual({ kind: "ready", setup });
    }
  });

  it("retains the old30-minute boundary and setup-only semantics", () => {
    expect(inspectRaceSetup(JSON.stringify(oldSetup), NOW + TTL)).toEqual({ kind: "ready", setup: oldSetup });
    expect(inspectRaceSetup(JSON.stringify(oldSetup), NOW + TTL + 1)).toEqual({ kind: "expired", setup: oldSetup });
    expect(inspectRaceSetup(JSON.stringify({ ...oldSetup, ts: NOW + 1 }), NOW).kind).toBe("ready");
    expect(window.localStorage.getItem).not.toHaveBeenCalled(); expect(diagnostic).not.toHaveBeenCalled();
  });

  it.each([
    { ...oldSetup, v: 2 }, { ...oldSetup, raceContext: { ...LEGACY_RACE_CONTEXT, geometryRevision: 2 } },
    { ...oldSetup, raceContext: { ...LEGACY_RACE_CONTEXT, model: "future" } }, { ...oldSetup, mode: "future" },
  ])("checks explicit future metadata before TTL: %j", setup => {
    expect(inspectRaceSetup(JSON.stringify({ ...setup, ts: NOW - TTL - 1 }), NOW)).toEqual({ kind: "unsupported" });
  });

  it.each(["", "{invalid", "[]", "null", '"PRIVATE"', JSON.stringify({ ...oldSetup, mode: null }), JSON.stringify({ ...oldSetup, ts: -1 }), JSON.stringify({ ...oldSetup, ts: null })])("identifies invalid bytes without modifying them: %j", bytes => {
    expect(inspectRaceSetup(bytes, NOW)).toEqual({ kind: "invalid" });
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });

  it.each(PHYSICAL_RACE_PROFILES)("round-trips known %s physical intent purely, with explicit mode", profile => {
    const setup = { ...oldSetup, raceContext: physicalRaceContext(profile), mode: "pro" as const };
    const read = inspectRaceSetup(JSON.stringify(setup), NOW);
    expect(read).toEqual({ kind: "ready", setup });
    if (read.kind !== "ready") throw new Error("Expected known setup");
    expect(inspectRaceSetup(JSON.stringify(read.setup), NOW + TTL + 1)).toEqual({ kind: "expired", setup });
    expect(inspectRaceSetup(JSON.stringify({ ...setup, mode: undefined }), NOW)).toEqual({ kind: "invalid" });
    for (const patch of [{ missionId: "sub-90" }, { dailyDay: "2026-10-26" }, { daily: null }]) {
      expect(inspectRaceSetup(JSON.stringify({ ...setup, ...patch }), NOW)).toEqual({ kind: "invalid" });
    }
  });
});

describe("resume storage preservation and explicit intent", () => {
  const protectedSetups = [
    JSON.stringify({ ...oldSetup, v: 2, ts: NOW - TTL - 1 }),
    JSON.stringify({ ...oldSetup, raceContext: { ...LEGACY_RACE_CONTEXT, geometryRevision: 2 }, ts: NOW - TTL - 1 }),
    JSON.stringify({ ...oldSetup, mode: "future", ts: NOW - TTL - 1 }),
    "{PRIVATE_INVALID_BYTES",
  ];
  it.each(protectedSetups)("retains protected raw bytes across reads, autosave and implicit clear: %s", bytes => {
    storage.set(KEY, bytes);
    expect(loadRaceSetup()).toBeNull(); expect(saveRaceSetup(intent)).toBe(false); expect(clearRaceSetup()).toBe(false);
    expect(storage.get(KEY)).toBe(bytes); expect(window.localStorage.setItem).not.toHaveBeenCalled(); expect(window.localStorage.removeItem).not.toHaveBeenCalled();
  });

  it.each(PHYSICAL_RACE_PROFILES)("keeps public %s physical load/save closed even when expired or explicitly replacing", profile => {
    for (const ts of [NOW, NOW - TTL - 1]) {
      const bytes = JSON.stringify({ ...oldSetup, ts, mode: "pro", raceContext: physicalRaceContext(profile) });
      storage.set(KEY, bytes);
      expect(loadRaceSetup()).toBeNull(); expect(clearRaceSetup()).toBe(false); expect(saveRaceSetup(intent)).toBe(false);
      expect(saveRaceSetup({ ...intent, mode: "pro", raceContext: physicalRaceContext(profile) }, { replaceUnsupported: true })).toBe(false);
      expect(storage.get(KEY)).toBe(bytes);
    }
    expect(window.localStorage.setItem).not.toHaveBeenCalled(); expect(window.localStorage.removeItem).not.toHaveBeenCalled();
  });

  it.each([...protectedSetups, JSON.stringify({ ...oldSetup, mode: "pro", raceContext: physicalRaceContext("short") })])("allows explicit new legacy Start to replace protected bytes: %s", bytes => {
    storage.set(KEY, bytes);
    expect(saveRaceSetup({ ...intent, mode: "pro" }, { replaceUnsupported: true })).toBe(true);
    expect(loadRaceSetup()).toEqual({ ...oldSetup, mode: "pro" });
    expect(storage.get(KEY)).not.toBe(bytes);
  });

  it.each([...protectedSetups, JSON.stringify({ ...oldSetup, mode: "pro", raceContext: physicalRaceContext("long") })])("allows only explicit discard to remove protected bytes: %s", bytes => {
    storage.set(KEY, bytes);
    expect(clearRaceSetup({ discardUnsupported: true })).toBe(true);
    expect(storage.has(KEY)).toBe(false); expect(window.localStorage.removeItem).toHaveBeenCalledExactlyOnceWith(KEY);
  });

  it("cleans up expired known legacy setups while preserving the old exact TTL", () => {
    for (const extra of [{}, { raceContext: null }, { raceContext: LEGACY_RACE_CONTEXT, mode: "pro" }]) {
      const bytes = JSON.stringify({ ...oldSetup, ...extra, ts: NOW - TTL }); storage.set(KEY, bytes);
      expect(loadRaceSetup()).toMatchObject({ phase: "briefing" }); expect(storage.get(KEY)).toBe(bytes);
      storage.set(KEY, JSON.stringify({ ...oldSetup, ...extra, ts: NOW - TTL - 1 }));
      expect(loadRaceSetup()).toBeNull(); expect(storage.has(KEY)).toBe(false);
    }
  });

  it("keeps original formatting and unknown raw fields on a semantic no-op", () => {
    const bytes = JSON.stringify({ ...oldSetup, unknown: { preserve: "PRIVATE" } }, null, 2); storage.set(KEY, bytes);
    expect(saveRaceSetup(intent)).toBe(true);
    expect(storage.get(KEY)).toBe(bytes); expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(loadRaceSetup()).toEqual(oldSetup);
  });

  it("uses only the old key and approved intent fields, never a nickname or live boat state", () => {
    const input = { ...intent, mode: "pro" as const, nickname: "PRIVATE_NAME", boat: { x: 123, heading: 90 } };
    expect(saveRaceSetup(input)).toBe(true);
    expect([...storage.keys()]).toEqual([KEY]);
    expect(JSON.parse(storage.get(KEY)!)).toEqual({ ...oldSetup, mode: "pro" });
    expect(storage.get(KEY)).not.toMatch(/PRIVATE_NAME|boat|heading/);
  });

  it("validates the actual entire serialized16000-character intent before a write", () => {
    const overhead = JSON.stringify({ ...oldSetup, missionId: "" }).length;
    const valid = { ...intent, missionId: "x".repeat(RACE_RESUME_MAX_CHARS - overhead) };
    expect(saveRaceSetup(valid)).toBe(true); expect(storage.get(KEY)!.length).toBe(RACE_RESUME_MAX_CHARS);
    const before = storage.get(KEY); vi.mocked(window.localStorage.setItem).mockClear();
    expect(saveRaceSetup({ ...valid, missionId: valid.missionId + "x" })).toBe(false);
    expect(storage.get(KEY)).toBe(before); expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });

  it("treats missing clear as an actual no-op instead of a fabricated removal", () => {
    expect(clearRaceSetup()).toBe(true); expect(window.localStorage.removeItem).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith({ type: "storage.operation", surface: "race", target: "preferences", action: "clear", outcome: "noop", source: "system", reason: "not-found" });
  });
});

describe("resume I/O and private diagnostics", () => {
  it("blocks all writes and even explicit discard if the existing store cannot be read", () => {
    const bytes = JSON.stringify(oldSetup); storage.set(KEY, bytes);
    vi.mocked(window.localStorage.getItem).mockImplementation(() => { throw new Error("PRIVATE_READ_ERROR"); });
    expect(loadRaceSetup()).toBeNull(); expect(saveRaceSetup(intent, { replaceUnsupported: true })).toBe(false);
    expect(clearRaceSetup({ discardUnsupported: true })).toBe(false);
    expect(storage.get(KEY)).toBe(bytes); expect(window.localStorage.setItem).not.toHaveBeenCalled(); expect(window.localStorage.removeItem).not.toHaveBeenCalled();
    const events = diagnostic.mock.calls.map(([event]) => event);
    expect(events).toEqual(Array(3).fill({ type: "storage.operation", surface: "race", target: "preferences", action: "read", outcome: "failed", source: "system", reason: "storage-read" }));
    expect(parseDiagnosticBatch({ version: 1, events })?.events).toEqual(events);
    expect(JSON.stringify(events)).not.toMatch(/PRIVATE_READ_ERROR|missionId|regatta|timeSec/);
  });

  it("returns false after failed set/remove, preserving actual bytes and safe failure reasons", () => {
    const bytes = JSON.stringify(oldSetup); storage.set(KEY, bytes);
    vi.mocked(window.localStorage.setItem).mockImplementation(() => { throw new Error("PRIVATE_WRITE_ERROR"); });
    expect(saveRaceSetup({ ...intent, phase: "racing" })).toBe(false); expect(storage.get(KEY)).toBe(bytes);
    vi.mocked(window.localStorage.removeItem).mockImplementation(() => { throw new Error("PRIVATE_REMOVE_ERROR"); });
    expect(clearRaceSetup()).toBe(false); expect(storage.get(KEY)).toBe(bytes);
    const events = diagnostic.mock.calls.map(([event]) => event);
    expect(events.map(event => [event.action, event.outcome, event.reason])).toEqual([["write", "failed", "storage-write"], ["clear", "failed", "storage-write"]]);
    expect(JSON.stringify(events)).not.toMatch(/PRIVATE_|missionId|ts/);
  });

  it("does not claim TTL removal when removeItem throws", () => {
    const bytes = JSON.stringify({ ...oldSetup, ts: NOW - TTL - 1 }); storage.set(KEY, bytes);
    vi.mocked(window.localStorage.removeItem).mockImplementation(() => { throw new Error("PRIVATE_ERROR"); });
    expect(loadRaceSetup()).toBeNull(); expect(storage.get(KEY)).toBe(bytes);
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith({ type: "storage.operation", surface: "race", target: "preferences", action: "clear", outcome: "failed", source: "system", reason: "storage-write" });
  });

  it("records success only after sync storage changes, without calling it native ACK", () => {
    diagnostic.mockImplementation(event => {
      if (event.outcome === "accepted" && event.action === "write") expect(storage.has(KEY)).toBe(true);
      if (event.outcome === "accepted" && event.action === "clear") expect(storage.has(KEY)).toBe(false);
    });
    expect(saveRaceSetup(intent)).toBe(true); expect(clearRaceSetup()).toBe(true);
    const events = diagnostic.mock.calls.map(([event]) => event);
    expect(events.every(event => event.type === "storage.operation" && event.target === "preferences" && event.source === "system")).toBe(true);
    expect(parseDiagnosticBatch({ version: 1, events })?.events).toEqual(events);
  });

  it("keeps storage behavior independent from diagnostic recorder failures", () => {
    diagnostic.mockImplementation(() => { throw new Error("PRIVATE_DIAGNOSTIC_ERROR"); });
    expect(saveRaceSetup(intent)).toBe(true); expect(loadRaceSetup()).toEqual(oldSetup); expect(clearRaceSetup()).toBe(true);
  });

  it("stays unavailable in SSR without throwing or writing", () => {
    vi.stubGlobal("window", undefined);
    expect(loadRaceSetup()).toBeNull(); expect(saveRaceSetup(intent)).toBe(false); expect(clearRaceSetup()).toBe(false);
  });
});
