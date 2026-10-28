import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BEST_TIMES_STORE_MAX_CHARS, getBestRecord, planBestRecordUpdate, tryUpdateBestRecord } from "./best-times";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext } from "./race-context";
import { raceComparisonKey } from "./race-record-class";
import { parseDiagnosticBatch } from "./diagnostics";

const { diagnostic } = vi.hoisted(() => ({ diagnostic: vi.fn() }));
vi.mock("./diagnostics-controls", () => ({ recordDiagnostic: diagnostic }));

const KEY = "regatta.best-times.v1";
const storage = new Map<string, string>();
beforeEach(() => {
  diagnostic.mockReset();
  storage.clear();
  vi.stubGlobal("window", { localStorage: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  } });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("local best times by race mode", () => {
  it("reads legacy records as Simple and leaves Pro empty", () => {
    const legacy = { timeSec: 110, ts: 1234 };
    storage.set(KEY, JSON.stringify({ "medium-medium": legacy }));
    expect(getBestRecord("medium", "medium")).toEqual(legacy);
    expect(getBestRecord("medium", "medium", "simple")).toEqual(legacy);
    expect(getBestRecord("medium", "medium", "pro")).toBeNull();
  });

  it("keeps a slower Pro record independent of a faster legacy Simple record", () => {
    const legacy = { timeSec: 110, ts: 1234 };
    storage.set(KEY, JSON.stringify({ "medium-medium": legacy }));
    const pro = tryUpdateBestRecord("medium", "medium", 140, "pro");
    expect(pro.isNewRecord).toBe(true);
    expect(pro.previousBest).toBeNull();
    expect(getBestRecord("medium", "medium", "pro")?.timeSec).toBe(140);
    expect(getBestRecord("medium", "medium")).toEqual(legacy);
    expect(JSON.parse(storage.get(KEY)!)).toMatchObject({ "medium-medium": legacy, "pro:medium-medium": { timeSec: 140 } });
  });

  it("updates only the selected mode, difficulty and wind bucket", () => {
    tryUpdateBestRecord("hard", "heavy", 160);
    tryUpdateBestRecord("medium", "medium", 100);
    tryUpdateBestRecord("medium", "medium", 140, "pro");
    const slower = tryUpdateBestRecord("medium", "medium", 150, "pro");
    expect(slower.isNewRecord).toBe(false);
    expect(slower.currentBest?.timeSec).toBe(140);
    const faster = tryUpdateBestRecord("medium", "medium", 130, "pro");
    expect(faster.isNewRecord).toBe(true);
    expect(faster.previousBest?.timeSec).toBe(140);
    expect(getBestRecord("medium", "medium", "simple")?.timeSec).toBe(100);
    expect(getBestRecord("hard", "heavy")?.timeSec).toBe(160);
    expect(getBestRecord("hard", "heavy", "pro")).toBeNull();
  });

  it("uses the old key for explicit Simple and rejects invalid Pro times in the correct bucket", () => {
    tryUpdateBestRecord("easy", "light", 100, "simple");
    tryUpdateBestRecord("easy", "light", 200, "pro");
    const before = storage.get(KEY);
    for (const invalid of [0, -1, NaN, Infinity]) {
      const result = tryUpdateBestRecord("easy", "light", invalid, "pro");
      expect(result.isNewRecord).toBe(false);
      expect(result.currentBest?.timeSec).toBe(200);
    }
    expect(storage.get(KEY)).toBe(before);
    expect(getBestRecord("easy", "light")?.timeSec).toBe(100);
  });

  it("never reports a saved new record after a failed write, with or without a previous best", () => {
    const previous = { timeSec: 200, ts: 1234 };
    storage.set(KEY, JSON.stringify({ "easy-light": previous, unknown: "PRIVATE_USER_DATA" }));
    const before = storage.get(KEY);
    vi.mocked(window.localStorage.setItem).mockImplementation(() => { throw new Error("private-quota-detail"); });
    expect(tryUpdateBestRecord("easy", "light", 100)).toEqual({ status: "failed", isNewRecord: false, previousBest: previous, currentBest: previous });
    expect(tryUpdateBestRecord("hard", "heavy", 100)).toEqual({ status: "failed", isNewRecord: false, previousBest: null, currentBest: null });
    expect(storage.get(KEY)).toBe(before);
    const events = diagnostic.mock.calls.map(([event]) => event);
    expect(parseDiagnosticBatch({ version: 1, events })?.events).toEqual(events);
    expect(events).toEqual(Array(2).fill({ type: "storage.operation", surface: "race", target: "personal-best", action: "write", outcome: "failed", source: "system", reason: "storage-write" }));
    expect(JSON.stringify(events)).not.toMatch(/PRIVATE_USER_DATA|private-quota-detail|easy-light|timeSec/);
  });

  it("blocks writing after a storage read failure instead of replacing the unread store", () => {
    const before = '{"easy-light":{"timeSec":200,"ts":1},"unknown":"preserve"}';
    storage.set(KEY, before);
    vi.mocked(window.localStorage.getItem).mockImplementation(() => { throw new Error("read-private-detail"); });
    expect(tryUpdateBestRecord("easy", "light", 100)).toMatchObject({ status: "failed", isNewRecord: false, currentBest: null });
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(storage.get(KEY)).toBe(before);
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith({ type: "storage.operation", surface: "race", target: "personal-best", action: "read", outcome: "failed", source: "system", reason: "storage-read" });
  });

  it.each(["{invalid", "[]", "null", '"invalid"', ""])("preserves unreadable PB bytes without a write: %j", bytes => {
    storage.set(KEY, bytes);
    expect(tryUpdateBestRecord("easy", "light", 100)).toMatchObject({ status: "failed", isNewRecord: false, currentBest: null });
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(storage.get(KEY)).toBe(bytes);
  });

  it("keeps no-op bytes and unknown entries, and only replaces the selected faster record", () => {
    const previous = { timeSec: 100, ts: 1 };
    const unknown = { future: ["keep", 1] };
    const bytes = JSON.stringify({ "easy-light": previous, unknown }, null, 2);
    storage.set(KEY, bytes);
    expect(tryUpdateBestRecord("easy", "light", 101)).toEqual({ status: "unchanged", isNewRecord: false, previousBest: previous, currentBest: previous });
    expect(storage.get(KEY)).toBe(bytes);
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(tryUpdateBestRecord("easy", "light", 99)).toMatchObject({ status: "written", isNewRecord: true });
    expect(JSON.parse(storage.get(KEY)!)).toMatchObject({ "easy-light": { timeSec: 99 }, unknown });
  });

  it("enforces the actual whole-store bound including unknown entries without deleting them", () => {
    const previous = { timeSec: 200, ts: 1 };
    const bytes = JSON.stringify({ "easy-light": previous, unknown: "x".repeat(BEST_TIMES_STORE_MAX_CHARS) });
    storage.set(KEY, bytes);
    expect(tryUpdateBestRecord("easy", "light", 100)).toEqual({ status: "failed", isNewRecord: false, previousBest: previous, currentBest: previous });
    expect(storage.get(KEY)).toBe(bytes);
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(diagnostic.mock.calls.at(-1)?.[0]).toMatchObject({ action: "write", outcome: "failed", reason: "limit" });
  });

  it("plans all72 isolated buckets without enabling physical result writes", () => {
    let store: Record<string, unknown> = { unknown: { keep: "preserve" } };
    for (const raceContext of [LEGACY_RACE_CONTEXT, ...PHYSICAL_RACE_PROFILES.map(physicalRaceContext)]) {
      for (const mode of ["simple", "pro"] as const) for (const difficulty of ["easy", "medium", "hard"] as const) for (const windStrength of ["light", "medium", "heavy"] as const) {
        const comparison = { raceContext, mode, difficulty, windStrength };
        const before = JSON.stringify(store);
        const plan = planBestRecordUpdate(store, comparison, 100, 1);
        expect(plan.status).toBe("candidate");
        expect(JSON.stringify(store)).toBe(before);
        if (plan.status !== "candidate") throw new Error("Expected valid isolated plan");
        const next = JSON.parse(plan.serialized);
        expect(next).toMatchObject(store);
        expect(next[raceComparisonKey(comparison)!]).toEqual({ timeSec: 100, ts: 1 });
        store = next;
      }
    }
    expect(Object.keys(store)).toHaveLength(73);
    expect(JSON.stringify(store).length).toBeLessThanOrEqual(BEST_TIMES_STORE_MAX_CHARS);
    const bytes = JSON.stringify(store);
    storage.set(KEY, bytes);
    for (const profile of PHYSICAL_RACE_PROFILES) {
      expect(getBestRecord("easy", "light", "pro", physicalRaceContext(profile))).toEqual({ timeSec: 100, ts: 1 });
      expect(tryUpdateBestRecord("easy", "light", 99, "pro", physicalRaceContext(profile))).toEqual({ status: "rejected", isNewRecord: false, previousBest: { timeSec: 100, ts: 1 }, currentBest: { timeSec: 100, ts: 1 } });
    }
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(storage.get(KEY)).toBe(bytes);
  });

  it("does not default physical missing mode or unknown metadata to a legacy bucket", () => {
    const bytes = '{"easy-light":{"timeSec":100,"ts":1}}';
    storage.set(KEY, bytes);
    for (const context of [physicalRaceContext("short"), { ...physicalRaceContext("short"), version: 2 }]) {
      expect(getBestRecord("easy", "light", undefined, context)).toBeNull();
      expect(tryUpdateBestRecord("easy", "light", 99, undefined, context)).toMatchObject({ status: "rejected", isNewRecord: false, currentBest: null });
    }
    expect(window.localStorage.getItem).not.toHaveBeenCalled();
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(storage.get(KEY)).toBe(bytes);
  });

  it("does not manufacture a record from invalid time or malformed selected record", () => {
    expect(tryUpdateBestRecord("easy", "light", NaN)).toMatchObject({ status: "rejected", isNewRecord: false, currentBest: null });
    storage.set(KEY, '{"easy-light":{"timeSec":"invalid","ts":1}}');
    const bytes = storage.get(KEY);
    expect(tryUpdateBestRecord("easy", "light", 100)).toMatchObject({ status: "failed", isNewRecord: false, currentBest: null });
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(storage.get(KEY)).toBe(bytes);
  });

  it("keeps actual storage outcomes even if diagnostic recording fails", () => {
    diagnostic.mockImplementation(() => { throw new Error("diagnostic-failure"); });
    expect(() => tryUpdateBestRecord("easy", "light", 100)).not.toThrow();
    expect(getBestRecord("easy", "light")).toMatchObject({ timeSec: 100 });
  });
});
