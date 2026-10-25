import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearWeakSpots, RADIO_WEAK_AREAS, record, weakest } from "./weakSpots";

const KEY = "sternik.radio.weak.v1";
let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("window", { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } });
});
afterEach(() => vi.unstubAllGlobals());

describe("course-scoped weak spots", () => {
  it("filters before limiting so older Sternik records cannot displace SRC practice", () => {
    for (let i = 0; i < 8; i++) {
      const oral = { id: `oral-${i}`, label: "Jednostka z prawem drogi utrzymuje kurs i prędkość" };
      record("oral", [oral]);
      record("oral", [oral]);
    }
    record("theory", [{ id: "src-2-1", label: "DSC distress priority" }]);
    expect(weakest(1)[0].area).toBe("oral");
    expect(weakest(1, RADIO_WEAK_AREAS).map(({ id, area }) => ({ id, area }))).toEqual([{ id: "src-2-1", area: "theory" }]);
  });

  it("resets only SRC mistakes while preserving the complete saved Sternik record", () => {
    record("oral", [{ id: "right-of-way", label: "Jednostka z prawem drogi utrzymuje kurs i prędkość" }]);
    record("oral", [], [{ id: "right-of-way" }]);
    record("voice", [{ id: "over", label: "End the transmission with OVER" }]);
    const before = JSON.parse(storage.get(KEY)!);
    clearWeakSpots(RADIO_WEAK_AREAS);
    expect(JSON.parse(storage.get(KEY)!)).toEqual({ "oral:right-of-way": before["oral:right-of-way"] });
    expect(weakest(6, RADIO_WEAK_AREAS)).toEqual([]);
    record("oral", [{ id: "right-of-way", label: before["oral:right-of-way"].label }]);
    expect(JSON.parse(storage.get(KEY)!)["oral:right-of-way"].misses).toBe(2);
  });

  it("preserves the existing unscoped reset contract", () => {
    record("oral", [{ id: "oral", label: "Polish oral practice" }]);
    record("position", [{ id: "north", label: "NORTH" }]);
    clearWeakSpots();
    expect(storage.has(KEY)).toBe(false);
  });

  it("binds the SRC home panel and its Reset to the same course scope", () => {
    const home = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    const panel = readFileSync(new URL("./WeakSpotsPanel.tsx", import.meta.url), "utf8");
    expect(home).toContain("<WeakSpotsPanel areas={RADIO_WEAK_AREAS} />");
    expect(panel).toContain("weakest(6, areas)");
    expect(panel).toContain("clearWeakSpots(areas)");
  });
});
