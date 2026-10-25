import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTROL_PREFS_KEY, DEFAULT_CONTROL_PREFS, helmMappingFor, sanitizeControlPrefs, writeControlPrefs } from "./prefs";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.mocked(recordWebDiagnostic).mockReset(); });

// Owner update 2026-10-24: wheels by default, the wheel does not return to
// center by default, no vibration (sound off by default), course steering by
// default in the Trainer and rudder in the 3D boat.
describe("control prefs", () => {
  it("defaults follow the owner decisions", () => {
    expect(DEFAULT_CONTROL_PREFS.mode).toBe("wheels");
    expect(DEFAULT_CONTROL_PREFS.helmReturnToCenter).toBe(false);
    expect(DEFAULT_CONTROL_PREFS.sound).toBe(false);
    expect(helmMappingFor(DEFAULT_CONTROL_PREFS, "trainer")).toBe("course");
    expect(helmMappingFor(DEFAULT_CONTROL_PREFS, "boat")).toBe("rudder");
    expect(helmMappingFor(DEFAULT_CONTROL_PREFS, "basics")).toBe("course");
  });

  it("garbage from storage or the app falls back to defaults field by field", () => {
    const p = sanitizeControlPrefs({ mode: "joystick", sensitivity: 7, sound: "yes", jibSheetSide: "right", helmMapping: { trainer: "rudder", boat: "autopilot" } });
    expect(p.mode).toBe("wheels");
    expect(p.sensitivity).toBe(1);
    expect(p.sound).toBe(false);
    expect(p.jibSheetSide).toBe("right");
    expect(p.helmMapping).toEqual({ trainer: "rudder" });
    expect(sanitizeControlPrefs(null)).toEqual(DEFAULT_CONTROL_PREFS);
  });

  it("Basics always steers by course even if a record says rudder", () => {
    const p = sanitizeControlPrefs({ helmMapping: { basics: "rudder" } });
    expect(helmMappingFor(p, "basics")).toBe("course");
  });

  it("favorites keep order, drop duplicates and junk, and are capped", () => {
    const ids = ["main", "jib", "main", 5, "", "x".repeat(80), ...Array.from({ length: 20 }, (_, i) => `c${i}`)];
    const p = sanitizeControlPrefs({ dock: { trainer: { favorites: ids } } });
    const fav = p.dock.trainer!.favorites;
    expect(fav.slice(0, 2)).toEqual(["main", "jib"]);
    expect(new Set(fav).size).toBe(fav.length);
    expect(fav.length).toBeLessThanOrEqual(12);
  });

  it("writes real normalized preferences and logs a same-count reorder without copying card ids", () => {
    const values = new Map([[CONTROL_PREFS_KEY, JSON.stringify({ ...DEFAULT_CONTROL_PREFS, dock: { trainer: { favorites: ["PRIVATE_MAIN", "PRIVATE_JIB"] } } })]]);
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }, dispatchEvent: vi.fn() });
    writeControlPrefs(sanitizeControlPrefs({ ...DEFAULT_CONTROL_PREFS, sensitivity: 2, dock: { trainer: { favorites: ["PRIVATE_JIB", "PRIVATE_MAIN", "PRIVATE_JIB"] } } }));
    expect(JSON.parse(values.get(CONTROL_PREFS_KEY)!)).toMatchObject({ sensitivity: 2, dock: { trainer: { favorites: ["PRIVATE_JIB", "PRIVATE_MAIN"] } } });
    expect(recordWebDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ type: "control.preferences", preference: "favorites-count", value: 2, previous: 2, outcome: "accepted" }));
    expect(recordWebDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ preference: "sensitivity", previous: 1, value: 2 }));
    expect(JSON.stringify(vi.mocked(recordWebDiagnostic).mock.calls)).not.toContain("PRIVATE_");
  });

  it("keeps native in-memory targets usable when storage and the diagnostic recorder fail", () => {
    const host = { __REGATTA_CONTROLS__: DEFAULT_CONTROL_PREFS, localStorage: { getItem: () => null, setItem: () => { throw new Error("quota"); } }, dispatchEvent: vi.fn() };
    vi.stubGlobal("window", host);
    vi.mocked(recordWebDiagnostic).mockImplementation(() => { throw new Error("journal unavailable"); });
    expect(() => writeControlPrefs({ ...DEFAULT_CONTROL_PREFS, mode: "sliders" })).not.toThrow();
    expect(host.__REGATTA_CONTROLS__.mode).toBe("sliders");
    expect(recordWebDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ type: "storage.operation", action: "write", outcome: "failed", target: "preferences", reason: "storage-write" }));
  });
});
