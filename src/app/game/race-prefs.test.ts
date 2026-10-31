import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WindDisplay } from "@/lib/race-visual-prefs";
import type { RacePrefs } from "./race-prefs";

const mocks = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: mocks.record }));
beforeEach(() => { vi.resetModules(); mocks.record.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); });

function host(native = false) {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: vi.fn((key: string, value: string) => { values.set(key, value); }) };
  const location = { href: "https://example.test/game?scene=next#private-anchor", search: "?scene=next" };
  const postMessage = vi.fn();
  const windowHost = Object.assign(new EventTarget(), {
    location, history: { state: {}, replaceState: vi.fn((_state: unknown, _title: string, url: string | URL) => {
      location.href = String(url); location.search = new URL(location.href).search;
    }) },
    __REGATTA_RACE_NATIVE__: native,
    __REGATTA_EMBED__: { query: "scene=next" },
    ReactNativeWebView: { postMessage },
  });
  vi.stubGlobal("window", windowHost); vi.stubGlobal("localStorage", storage);
  return { values, storage, windowHost, postMessage };
}

describe("shared race preference storage", () => {
  it("reads legacy and malformed assists field by field with a stable compass snapshot", async () => {
    const h = host();
    h.values.set("regatta.race.mode.v1", "pro");
    h.values.set("regatta.race.assists.v1", JSON.stringify({ guidance: false, trimHints: false, rules: false, penalties: true }));
    const { readRacePrefs } = await import("./race-prefs");
    expect(readRacePrefs()).toEqual({ mode: "pro", guidance: false, trimHints: false, rules: false, penalties: true, windDisplay: "compass", miniMap: true });
    expect(readRacePrefs()).toBe(readRacePrefs());
    h.values.set("regatta.race.assists.v1", JSON.stringify({ guidance: false, windDisplay: "private-weather", penalties: "true" }));
    expect(readRacePrefs()).toEqual({ mode: "pro", guidance: false, trimHints: true, rules: true, penalties: false, windDisplay: "compass", miniMap: true });
    h.values.set("regatta.race.assists.v1", "null");
    expect(readRacePrefs().windDisplay).toBe("compass");
  });

  it("writes every closed wind style through the existing keys without changing unrelated sound preferences", async () => {
    const h = host(); h.values.set("regatta.muted.v1", "1");
    const { readRacePrefs, writeRacePrefs } = await import("./race-prefs");
    for (const windDisplay of ["off", "compass", "arrows", "both"] as const) {
      writeRacePrefs({ windDisplay });
      expect(readRacePrefs().windDisplay).toBe(windDisplay);
      expect(JSON.parse(h.values.get("regatta.race.assists.v1")!)).toMatchObject({ windDisplay, guidance: true, trimHints: true, rules: true, penalties: false });
    }
    expect([...h.values.keys()].sort()).toEqual(["regatta.muted.v1", "regatta.race.assists.v1", "regatta.race.mode.v1"]);
    expect(h.values.get("regatta.muted.v1")).toBe("1");
    expect(h.postMessage).not.toHaveBeenCalled();
  });

  it("bridges the normalized style and preserves it on relaunch while removing only one-shot mode queries", async () => {
    const h = host(true);
    h.windowHost.__REGATTA_EMBED__.query = "scene=next&mode=pro";
    const prefs = await import("./race-prefs");
    expect(prefs.readRacePrefs().mode).toBe("pro");
    prefs.writeRacePrefs({ windDisplay: "both", guidance: false, miniMap: false }, "multiplayer");
    expect(JSON.parse(h.postMessage.mock.calls[0][0])).toEqual({ type: "race-prefs", mode: "pro", assists: { guidance: false, trimHints: true, rules: true, penalties: false, windDisplay: "both", miniMap: false } });
    expect(h.windowHost.__REGATTA_EMBED__.query).toBe("scene=next");
    expect(h.windowHost.location.href).toBe("https://example.test/game?scene=next#private-anchor");
    expect(mocks.record).toHaveBeenCalledWith({ type: "control.preferences", surface: "multiplayer", preference: "wind-display", value: "both", previous: "compass", outcome: "accepted" });
    vi.resetModules();
    const relaunched = await import("./race-prefs");
    expect(relaunched.readRacePrefs()).toMatchObject({ mode: "pro", windDisplay: "both", guidance: false, miniMap: false });
  });

  it("keeps invalid updates out of storage and diagnostics and avoids wind logs for unrelated settings", async () => {
    const h = host(); const { writeRacePrefs, readRacePrefs } = await import("./race-prefs");
    writeRacePrefs({ windDisplay: "arrows" }); mocks.record.mockClear();
    writeRacePrefs({ guidance: false });
    expect(mocks.record).not.toHaveBeenCalled();
    writeRacePrefs({ windDisplay: "PRIVATE", mode: "unknown", extra: "PRIVATE" } as unknown as Partial<RacePrefs>);
    expect(readRacePrefs()).toMatchObject({ windDisplay: "arrows", mode: "simple", guidance: false });
    expect(JSON.stringify([...h.values])).not.toContain("PRIVATE");
    expect(mocks.record.mock.calls).toEqual([[{ type: "control.preferences", surface: "race", preference: "wind-display", value: "arrows", previous: "arrows", outcome: "noop", reason: "unchanged" }]]);
  });

  it("keeps live targets and native transport working when storage and diagnostic recording throw", async () => {
    const h = host(true);
    h.storage.setItem.mockImplementation(() => { throw new Error("quota unavailable"); });
    mocks.record.mockImplementation(() => { throw new Error("journal unavailable"); });
    const { writeRacePrefs, readRacePrefs } = await import("./race-prefs");
    expect(() => writeRacePrefs({ windDisplay: "off" as WindDisplay })).not.toThrow();
    expect(readRacePrefs().windDisplay).toBe("off");
    expect(JSON.parse(h.postMessage.mock.calls[0][0]).assists.windDisplay).toBe("off");
  });

  it("keeps the race sound choice in its own row, apart from mode, assists and the wheel clicks (M1-5)", async () => {
    const h = host(); Object.assign(h.windowHost, { localStorage: h.storage });
    const prefs = await import("./race-prefs");
    expect(prefs.RACE_SOUND_KEY).toBe("regatta.race.sound.v1");
    let setSound: ((on: boolean) => void) | undefined;
    let seen: boolean | undefined;
    function Probe() { const { soundOn, setSoundOn } = prefs.useRaceSound("multiplayer"); seen = soundOn; setSound = setSoundOn; return null; }
    renderToStaticMarkup(React.createElement(Probe));
    expect(seen).toBe(true);
    setSound!(false);
    expect(h.values.get("regatta.race.sound.v1")).toBe("off");
    expect(mocks.record).toHaveBeenCalledWith({ type: "control.preferences", surface: "multiplayer", preference: "sound", value: false, previous: true, outcome: "accepted" });
    prefs.writeRacePrefs({ mode: "pro", guidance: false });
    expect(h.values.get("regatta.race.sound.v1")).toBe("off");
    expect(JSON.parse(h.values.get("regatta.race.assists.v1")!)).not.toHaveProperty("sound");
    expect(h.values.has("regatta.controls.v1")).toBe(false);
    expect(h.postMessage.mock.calls.some(([m]) => String(m).includes("sound"))).toBe(false);
  });
});
