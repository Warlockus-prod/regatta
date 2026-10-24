import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBestRecord, tryUpdateBestRecord } from "./best-times";

const KEY = "regatta.best-times.v1";
const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal("window", { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
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
    expect(slower.currentBest.timeSec).toBe(140);
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
      expect(result.currentBest.timeSec).toBe(200);
    }
    expect(storage.get(KEY)).toBe(before);
    expect(getBestRecord("easy", "light")?.timeSec).toBe(100);
  });
});
