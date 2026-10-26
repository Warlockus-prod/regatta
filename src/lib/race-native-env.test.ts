import { afterEach, describe, expect, it, vi } from "vitest";
import { isNativeRace, navigateNativeRace, readRaceSearch } from "./race-native-env";
import * as publicApi from "./race-native";

afterEach(() => vi.unstubAllGlobals());

describe("lightweight native race environment", () => {
  it("keeps the existing public function identities and SSR fallbacks", () => {
    expect(publicApi.isNativeRace).toBe(isNativeRace);
    expect(publicApi.readRaceSearch).toBe(readRaceSearch);
    expect(publicApi.navigateNativeRace).toBe(navigateNativeRace);
    expect(isNativeRace()).toBe(false);
    expect(readRaceSearch().toString()).toBe("");
    expect(navigateNativeRace("/history")).toBe(false);
  });

  it("reads the public URL synchronously without classifying a web bridge as native", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("window", { location: { search: "?mode=pro&camera=orbit" }, ReactNativeWebView: { postMessage } });
    expect(readRaceSearch().get("mode")).toBe("pro");
    expect(readRaceSearch().get("camera")).toBe("orbit");
    expect(isNativeRace()).toBe(false);
    expect(navigateNativeRace("/history")).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it.each(["mode=pro&difficulty=hard", { mode: "pro", difficulty: "hard" }])("preserves injected query precedence and leaves its source unchanged", query => {
    const before = JSON.stringify(query);
    vi.stubGlobal("window", { location: { search: "?mode=simple&difficulty=easy" }, __REGATTA_EMBED__: { query } });
    const parsed = readRaceSearch();
    expect(parsed.get("mode")).toBe("pro");
    expect(parsed.get("difficulty")).toBe("hard");
    parsed.set("mode", "simple");
    expect(readRaceSearch().get("mode")).toBe("pro");
    expect(JSON.stringify(query)).toBe(before);
  });

  it("posts only the two existing destinations and never sends a result command", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true, ReactNativeWebView: { postMessage } });
    expect(isNativeRace()).toBe(true);
    for (const href of ["/", "/settings", "https://example.com/history", "/history?replay=1"]) {
      expect(navigateNativeRace(href as "/history")).toBe(false);
    }
    expect(postMessage).not.toHaveBeenCalled();
    expect(navigateNativeRace("/race")).toBe(true);
    expect(navigateNativeRace("/history")).toBe(true);
    expect(postMessage.mock.calls.map(([message]) => JSON.parse(message))).toEqual([
      { type: "native-navigate", href: "/race" }, { type: "native-navigate", href: "/history" },
    ]);
  });

  it("requires the exact native marker and an available bridge", () => {
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: "true" });
    expect(isNativeRace()).toBe(false);
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true });
    expect(isNativeRace()).toBe(true);
    expect(navigateNativeRace("/race")).toBe(false);
  });
});
