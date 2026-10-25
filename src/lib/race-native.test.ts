import { afterEach, describe, expect, it, vi } from "vitest";
import { makeStandardCourse } from "./race-physics";
import { isNativeRace, navigateNativeRace, postNativeRace, postNativeRaceStarted, readNativeRaceReplay, readRaceSearch, validateNativeRace, type NativeRaceSnapshot } from "./race-native";
import { raceNativeDestination } from "../../mobile/src/navigation/race-entry";

function fixture(): NativeRaceSnapshot {
  const course = makeStandardCourse();
  return { schema: 1, id: "race_123", mode: "pro", difficulty: "medium", windStrength: "medium", missionId: null,
    finishTimeSec: 12, position: 1, totalBoats: 3,
    course: { ...course, marks: course.marks.map(m => ({ ...m, label: "Знак", labelEn: "Mark", labelPl: "Znak" })) },
    samples: [0, 12].map(t => ({ t, x: 200, y: 400 - t, heading: 45, twa: 45, speed: 4, lap: t ? 2 : 0 })),
    events: [{ type: "finish", t: 12 }], penaltySeconds: 5 };
}
afterEach(() => vi.unstubAllGlobals());
describe("native offline race boundary", () => {
  it("keeps original world course, mode and complete replay data", () => {
    const race = fixture();
    expect(validateNativeRace(race)).toEqual(race);
    expect(validateNativeRace({ ...race, mode: undefined })).not.toBeNull();
  });
  it("rejects non-finite, unbounded and unordered recordings", () => {
    const race = fixture();
    expect(validateNativeRace({ ...race, samples: [{ ...race.samples[0], x: NaN }, race.samples[1]] })).toBeNull();
    expect(validateNativeRace({ ...race, samples: [...race.samples].reverse() })).toBeNull();
    expect(validateNativeRace({ ...race, samples: [{ ...race.samples[0], lap: .5 }, race.samples[1]] })).toBeNull();
    expect(validateNativeRace({ ...race, id: "../../somewhere" })).toBeNull();
    expect(validateNativeRace({ ...race, unused: "x".repeat(1024 * 1024) })).toBeNull();
  });
  it("validates optional Pro rig state instead of trusting the bridge", () => {
    const race = fixture();
    race.samples[0].trim = { mainSheet: .3, jibSheet: .4, reef: 0, jibFurl: 0, mainHoisted: true };
    expect(validateNativeRace(race)).not.toBeNull();
    race.samples[0].trim.jibFurl = 4;
    expect(validateNativeRace(race)).toBeNull();
  });
  it("uses injected file route state and validates replay hydration", () => {
    vi.stubGlobal("window", { location: { search: "?difficulty=easy" }, __REGATTA_EMBED__: { query: "difficulty=hard&mode=pro" }, __REGATTA_RACE_REPLAY__: fixture() });
    expect(readRaceSearch().get("difficulty")).toBe("hard");
    expect(readNativeRaceReplay()?.mode).toBe("pro");
    expect(isNativeRace()).toBe(false);
  });
  it("posts only valid local results through the native bridge", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true, ReactNativeWebView: { postMessage } });
    expect(postNativeRace(fixture())).toBe(true);
    expect(JSON.parse(postMessage.mock.calls[0][0])).toMatchObject({ type: "race-finished", race: { schema: 1, id: "race_123" } });
    expect(postNativeRace({ ...fixture(), totalBoats: 0 })).toBe(false);
    expect(postMessage).toHaveBeenCalledTimes(1);
  });
  it("posts bounded starts only inside the native host", () => {
    const postMessage = vi.fn();
    const race = { id: "race_123", mode: "pro" as const, difficulty: "easy" as const, windStrength: "light" as const, missionId: null };
    expect(postNativeRaceStarted(race)).toBe(false);
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true, ReactNativeWebView: { postMessage } });
    expect(postNativeRaceStarted(race)).toBe(true);
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({ type: "race-started", ...race });
    expect(postNativeRaceStarted({ ...race, id: "../unsafe" })).toBe(false);
    expect(postNativeRaceStarted({ ...race, missionId: "x".repeat(101) })).toBe(false);
    expect(postMessage).toHaveBeenCalledTimes(1);
  });
  it("returns a hydrated replay to actual native history without reposting its result", () => {
    const postMessage = vi.fn();
    const saved = fixture();
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true, __REGATTA_RACE_REPLAY__: saved, ReactNativeWebView: { postMessage } });
    expect(readNativeRaceReplay()?.id).toBe(saved.id);
    expect(navigateNativeRace("/history")).toBe(true);
    expect(postMessage).toHaveBeenCalledOnce();
    const message = JSON.parse(postMessage.mock.calls[0][0]);
    expect(message).toEqual({ type: "native-navigate", href: "/history" });
    expect(raceNativeDestination(message.href)).toBe("/history");
    expect(readNativeRaceReplay()).toEqual(saved);
  });
  it("limits direct navigation to Race or History in a native host", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true, ReactNativeWebView: { postMessage } });
    expect(navigateNativeRace("/race")).toBe(true);
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({ type: "native-navigate", href: "/race" });
    for (const href of ["/", "/settings", "/game?replay=1", "https://example.com/history", "//example.com/history"]) {
      expect(navigateNativeRace(href as "/history")).toBe(false);
    }
    expect(postMessage).toHaveBeenCalledOnce();
  });
  it("allows web replay to use its local close fallback without an available native bridge", () => {
    expect(navigateNativeRace("/history")).toBe(false);
    const postMessage = vi.fn();
    vi.stubGlobal("window", { ReactNativeWebView: { postMessage } });
    expect(navigateNativeRace("/history")).toBe(false);
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true });
    expect(navigateNativeRace("/history")).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });
});
