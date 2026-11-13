import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { edgeArrowInsets, waterEdgeArrowInsets } from "@/features/race-scene/edge-arrow";

// Package 31, R-45 prototype. The app's frame must follow the cockpit even when
// a message is lost (react-native-webview reinstalls its handler when a stored
// row changes): "on" repeats while the cockpit is on screen, "off" a few times
// after it leaves, and a new cockpit cancels a pending "off".
const effects = vi.hoisted(() => ({ cleanups: [] as (() => void)[] }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useEffect: (effect: () => void | (() => void)) => { const cleanup = effect(); if (cleanup) effects.cleanups.push(cleanup); },
}));
import { announceRaceWater, RACE_WATER_OFF_REPEATS_MS, RACE_WATER_REPEAT_MS, useRaceWaterEdges } from "./race-water-layout";

let sent: string[] = [];
const on = '{"type":"race-water","on":true}', off = '{"type":"race-water","on":false}';
beforeEach(() => {
  vi.useFakeTimers();
  sent = [];
  effects.cleanups = [];
  vi.stubGlobal("window", { ReactNativeWebView: { postMessage: (m: string) => sent.push(m) }, setInterval, clearInterval, setTimeout, clearTimeout });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("the water layout's message to the app", () => {
  it("is silent in a plain browser and with the layout off", () => {
    vi.stubGlobal("window", { setInterval, clearInterval, setTimeout, clearTimeout });
    expect(() => announceRaceWater(true)).not.toThrow();
    vi.stubGlobal("window", { ReactNativeWebView: { postMessage: (m: string) => sent.push(m) }, setInterval, clearInterval, setTimeout, clearTimeout });
    useRaceWaterEdges(false);
    vi.advanceTimersByTime(RACE_WATER_REPEAT_MS * 3);
    expect(sent).toEqual([]);
  });
  it("repeats on while mounted, so one lost message does not leave the frame", () => {
    useRaceWaterEdges(true);
    expect(sent).toEqual([on]);
    vi.advanceTimersByTime(RACE_WATER_REPEAT_MS * 2);
    expect(sent).toEqual([on, on, on]);
  });
  it("says off when the cockpit leaves, a few times, and stops repeating on", () => {
    useRaceWaterEdges(true);
    sent = [];
    effects.cleanups[0]();
    expect(sent).toEqual([off]);
    vi.advanceTimersByTime(RACE_WATER_OFF_REPEATS_MS[1] + RACE_WATER_REPEAT_MS * 3);
    expect(sent).toEqual([off, off, off]);
  });
  it("a restart's new cockpit cancels the pending off, so the frame does not come back", () => {
    useRaceWaterEdges(true);
    effects.cleanups[0]();
    sent = [];
    useRaceWaterEdges(true);
    vi.advanceTimersByTime(Math.max(...RACE_WATER_OFF_REPEATS_MS));
    expect(sent.every(message => message === on)).toBe(true);
    effects.cleanups[1]();
    vi.advanceTimersByTime(Math.max(...RACE_WATER_OFF_REPEATS_MS));
  });
});

describe("the mark arrow in the water layout", () => {
  const blank = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
  it("stays above the helm bar and the coach line on a portrait phone", () => {
    for (const [w, h] of [[390, 844], [402, 874], [440, 956]]) {
      const water = waterEdgeArrowInsets(w, h, blank());
      expect(water.bottom).toBeGreaterThan(edgeArrowInsets(w, h, blank()).bottom);
      expect(water.bottom).toBeGreaterThanOrEqual(240);
    }
  });
  it("stays above the bar and clear of the island on a turned phone", () => {
    const water = waterEdgeArrowInsets(874, 402, blank());
    expect(water.bottom).toBeGreaterThanOrEqual(93);
    expect(water.right).toBeGreaterThanOrEqual(62);
  });
  it("keeps right of the coach line and the wind box on a turned phone", () => {
    // The coach line ends at the side inset + 8 px + 38% of the width between the side paddings.
    for (const [w, side] of [[874, 62], [844, 59], [667, 0]]) {
      const lineEnd = side + 8 + Math.min((w - 2 * (side + 8)) * 0.38, 340);
      expect(waterEdgeArrowInsets(w, 390, blank()).left).toBeGreaterThanOrEqual(lineEnd);
    }
  });
});
