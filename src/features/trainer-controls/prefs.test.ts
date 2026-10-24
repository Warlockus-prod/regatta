import { describe, expect, it } from "vitest";
import { DEFAULT_CONTROL_PREFS, helmMappingFor, sanitizeControlPrefs } from "./prefs";

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
});
