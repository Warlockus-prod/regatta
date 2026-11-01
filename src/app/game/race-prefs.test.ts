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
    expect(readRacePrefs()).toEqual({ mode: "pro", guidance: false, trimHints: false, rules: false, penalties: true, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false });
    expect(readRacePrefs()).toBe(readRacePrefs());
    h.values.set("regatta.race.assists.v1", JSON.stringify({ guidance: false, windDisplay: "private-weather", penalties: "true" }));
    expect(readRacePrefs()).toEqual({ mode: "pro", guidance: false, trimHints: true, rules: true, penalties: false, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false });
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

  it("records the F4 switches (coach line, first race hints, softer light) on the caller's surface", async () => {
    host();
    const { writeRacePrefs } = await import("./race-prefs");
    writeRacePrefs({ coachStrip: false });
    writeRacePrefs({ firstRaceHints: false });
    writeRacePrefs({ softLight: true }, "multiplayer");
    writeRacePrefs({ softLight: true }, "multiplayer");
    expect(mocks.record.mock.calls.map(([event]) => event)).toEqual([
      { type: "control.preferences", surface: "race", preference: "coach-strip", value: false, previous: true, outcome: "accepted" },
      { type: "control.preferences", surface: "race", preference: "first-race-hints", value: false, previous: true, outcome: "accepted" },
      { type: "control.preferences", surface: "multiplayer", preference: "soft-light", value: true, previous: false, outcome: "accepted" },
      { type: "control.preferences", surface: "multiplayer", preference: "soft-light", value: true, previous: true, outcome: "noop", reason: "unchanged" },
    ]);
  });

  it("bridges the normalized style and preserves it on relaunch while removing only one-shot mode queries", async () => {
    const h = host(true);
    h.windowHost.__REGATTA_EMBED__.query = "scene=next&mode=pro";
    const prefs = await import("./race-prefs");
    expect(prefs.readRacePrefs().mode).toBe("pro");
    prefs.writeRacePrefs({ windDisplay: "both", guidance: false, miniMap: false }, "multiplayer");
    expect(JSON.parse(h.postMessage.mock.calls[0][0])).toEqual({ type: "race-prefs", mode: "pro", assists: { guidance: false, trimHints: true, rules: true, penalties: false, windDisplay: "both", miniMap: false, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false } });
    expect(h.windowHost.__REGATTA_EMBED__.query).toBe("scene=next");
    expect(h.windowHost.location.href).toBe("https://example.test/game?scene=next#private-anchor");
    expect(mocks.record).toHaveBeenCalledWith({ type: "control.preferences", surface: "multiplayer", preference: "wind-display", value: "both", previous: "compass", outcome: "accepted" });
    vi.resetModules();
    const relaunched = await import("./race-prefs");
    expect(relaunched.readRacePrefs()).toMatchObject({ mode: "pro", windDisplay: "both", guidance: false, miniMap: false });
  });

  // F4: the Hints and Graphics switches persist in the assists row the app already carries
  // (mobile/src/persistence/race-web-storage.ts allowlist), so no new storage key.
  it("persists the coach line, first race hints and softer light, also across a relaunch and to the app", async () => {
    const h = host(true);
    const prefs = await import("./race-prefs");
    expect(prefs.readRacePrefs()).toMatchObject({ coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false });
    prefs.writeRacePrefs({ coachStrip: false });
    prefs.writeRacePrefs({ firstRaceHints: false, softLight: true });
    expect(JSON.parse(h.values.get("regatta.race.assists.v1")!)).toMatchObject({ coachStrip: false, firstRaceHints: false, softLight: true, guidance: true });
    expect([...h.values.keys()].sort()).toEqual(["regatta.race.assists.v1", "regatta.race.mode.v1"]);
    expect(JSON.parse(h.postMessage.mock.calls.at(-1)![0]).assists).toMatchObject({ coachStrip: false, firstRaceHints: false, softLight: true });
    vi.resetModules();
    const relaunched = await import("./race-prefs");
    expect(relaunched.readRacePrefs()).toMatchObject({ coachStrip: false, firstRaceHints: false, softLight: true });
  });

  it("persists wind on the sails (F6) in the same row, bridges it to the app and records the switch", async () => {
    const h = host(true);
    const prefs = await import("./race-prefs");
    prefs.writeRacePrefs({ sailFlow: true });
    expect(JSON.parse(h.values.get("regatta.race.assists.v1")!)).toMatchObject({ sailFlow: true, softLight: false });
    expect([...h.values.keys()].sort()).toEqual(["regatta.race.assists.v1", "regatta.race.mode.v1"]);
    expect(JSON.parse(h.postMessage.mock.calls.at(-1)![0]).assists).toMatchObject({ sailFlow: true });
    expect(mocks.record).toHaveBeenCalledWith({ type: "control.preferences", surface: "race", preference: "sail-flow", value: true, previous: false, outcome: "accepted" });
    vi.resetModules();
    const relaunched = await import("./race-prefs");
    expect(relaunched.readRacePrefs().sailFlow).toBe(true);
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
