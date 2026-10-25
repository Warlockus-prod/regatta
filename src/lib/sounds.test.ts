import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isMuted, setMuted, toggleMuted } from "./sounds";
import { CONTROL_PREFS_KEY, DEFAULT_CONTROL_PREFS, LEGACY_RACE_MUTE_KEY, readControlPrefs, writeControlPrefs } from "@/features/trainer-controls/prefs";

const data = new Map<string, string>();
const postMessage = vi.fn();
beforeEach(() => {
  data.clear(); postMessage.mockClear();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) }, dispatchEvent: vi.fn(), ReactNativeWebView: { postMessage } });
});
afterEach(() => vi.unstubAllGlobals());

describe("one sound choice for race signals and trainer controls", () => {
  it("starts silent, follows settings immediately and persists changes through the native bridge", () => {
    expect(isMuted()).toBe(true);
    writeControlPrefs({ ...DEFAULT_CONTROL_PREFS, sound: true });
    expect(isMuted()).toBe(false);
    expect(toggleMuted()).toBe(true);
    expect(readControlPrefs().sound).toBe(false);
    expect(data.get(LEGACY_RACE_MUTE_KEY)).toBe("1");
    expect(JSON.parse(postMessage.mock.calls.at(-1)![0]).prefs.sound).toBe(false);
    setMuted(false);
    expect(JSON.parse(data.get(CONTROL_PREFS_KEY)!).sound).toBe(true);
  });

  it("preserves the old explicit race choice until a canonical preference exists", () => {
    data.set(LEGACY_RACE_MUTE_KEY, "0");
    expect(isMuted()).toBe(false);
    data.set(CONTROL_PREFS_KEY, JSON.stringify({ ...DEFAULT_CONTROL_PREFS, sound: false }));
    expect(isMuted()).toBe(true);
  });

  it("uses the native settings copy even when a WebView has old conflicting sound data", () => {
    data.set(LEGACY_RACE_MUTE_KEY, "0");
    Object.assign(window, { __REGATTA_CONTROLS__: { ...DEFAULT_CONTROL_PREFS, sound: false } });
    expect(isMuted()).toBe(true);
    Object.assign(window, { __REGATTA_CONTROLS__: { ...DEFAULT_CONTROL_PREFS, sound: true } });
    expect(isMuted()).toBe(false);
  });
});
