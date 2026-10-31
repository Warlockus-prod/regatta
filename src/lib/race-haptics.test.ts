import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contract (M3-4, owner decision #4): race events vibrate only for the start
// gun, a mark, a contact and the finish, with a short pattern each, at most
// once per 300 ms; the switch is on by default, saved in
// regatta.race.haptics.v1 ("on"/"off") and recorded in diagnostics; in the iOS
// app the page posts {type:"race-haptic", event} instead of vibrating; the
// switch is offered only where a vibration can happen.

const mocks = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: mocks.record }));

const KEY = "regatta.race.haptics.v1";
const data = new Map<string, string>();
type Host = EventTarget & {
  localStorage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };
  navigator: { vibrate?: (p: number[]) => boolean; maxTouchPoints?: number };
  matchMedia?: (q: string) => { matches: boolean };
  ReactNativeWebView?: { postMessage: (m: string) => void };
  __REGATTA_RACE_HAPTICS__?: unknown;
};
let host: Host;
let clock = 0;
beforeEach(() => {
  vi.resetModules(); mocks.record.mockReset(); data.clear(); clock = 1000;
  host = Object.assign(new EventTarget(), {
    localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, String(v)); } },
    navigator: { vibrate: vi.fn(() => true), maxTouchPoints: 5 },
  });
  vi.stubGlobal("window", host);
  vi.stubGlobal("performance", { now: () => clock });
});
afterEach(() => vi.unstubAllGlobals());
const load = () => import("./race-haptics");

describe("event to pattern", () => {
  it("has one short pattern for each of the four race events and nothing else", async () => {
    const h = await load();
    expect(Object.keys(h.HAPTIC_PATTERNS).sort()).toEqual(["contact", "finish", "mark", "start"]);
    expect(h.RACE_HAPTIC_EVENTS).toEqual(["start", "mark", "contact", "finish"]);
    for (const event of h.RACE_HAPTIC_EVENTS) {
      const pattern = h.HAPTIC_PATTERNS[event];
      expect(pattern.length % 2, event).toBe(1); // ends on a pulse
      const total = pattern.reduce((a, b) => a + b, 0);
      expect(total, event).toBeGreaterThan(0);
      expect(total, event).toBeLessThan(h.HAPTIC_MIN_INTERVAL_MS);
    }
    // Distinct, so a player can tell the events apart.
    expect(new Set(h.RACE_HAPTIC_EVENTS.map(e => h.HAPTIC_PATTERNS[e].join(","))).size).toBe(4);
  });

  it("vibrates the pattern of the event in a touch browser", async () => {
    const h = await load();
    for (const event of h.RACE_HAPTIC_EVENTS) { clock += 1000; h.raceHaptic(event); }
    expect(vi.mocked(host.navigator.vibrate!).mock.calls.map(([p]) => p)).toEqual(h.RACE_HAPTIC_EVENTS.map(e => [...h.HAPTIC_PATTERNS[e]]));
  });

  it("posts the event to the iOS app instead of vibrating", async () => {
    const post = vi.fn();
    host.ReactNativeWebView = { postMessage: post };
    host.__REGATTA_RACE_HAPTICS__ = true;
    const h = await load();
    h.raceHaptic("mark");
    expect(post).toHaveBeenCalledWith('{"type":"race-haptic","event":"mark"}');
    expect(host.navigator.vibrate).not.toHaveBeenCalled();
  });

  it("posts nothing to an app build that did not announce a haptics handler", async () => {
    const post = vi.fn();
    delete host.navigator.vibrate; // WKWebView has no vibrate
    host.ReactNativeWebView = { postMessage: post };
    for (const flag of [undefined, false, "true", 1]) {
      vi.resetModules();
      host.__REGATTA_RACE_HAPTICS__ = flag;
      const h = await load();
      clock += 1000; h.raceHaptic("finish");
      expect(h.raceHapticsAvailable(), String(flag)).toBe(false);
    }
    expect(post).not.toHaveBeenCalled();
  });

  it("vibrates the start gun only, not the warning horn, the short signals or a recall", async () => {
    const h = await load();
    for (const signal of ["warning", "tick", "recall", null, undefined] as const) { clock += 1000; h.raceStartHaptic(signal); }
    expect(host.navigator.vibrate).not.toHaveBeenCalled();
    clock += 1000; h.raceStartHaptic("start");
    expect(host.navigator.vibrate).toHaveBeenCalledWith([...h.HAPTIC_PATTERNS.start]);
  });

  it("drops an unknown event", async () => {
    const h = await load();
    h.raceHaptic("rudder" as never);
    expect(host.navigator.vibrate).not.toHaveBeenCalled();
  });
});

describe("throttle", () => {
  it("allows at most one vibration per 300 ms on a fake clock", async () => {
    const h = await load();
    const vibrate = vi.fn((_pattern: number[]) => true);
    let t = 0;
    const haptics = h.createRaceHaptics({ now: () => t, enabled: () => true, post: null, vibrate });
    expect(haptics.fire("mark")).toBe(true);
    t = 150; expect(haptics.fire("contact")).toBe(false);
    t = 299; expect(haptics.fire("finish")).toBe(false);
    t = 300; expect(haptics.fire("finish")).toBe(true);
    t = 301; expect(haptics.fire("start")).toBe(false);
    t = 700; expect(haptics.fire("start")).toBe(true);
    expect(vibrate.mock.calls.map(([p]) => p)).toEqual([[...h.HAPTIC_PATTERNS.mark], [...h.HAPTIC_PATTERNS.finish], [...h.HAPTIC_PATTERNS.start]]);
  });

  it("does not count a dropped event as the last vibration", async () => {
    const h = await load();
    let on = false, t = 0;
    const vibrate = vi.fn((_pattern: number[]) => true);
    const haptics = h.createRaceHaptics({ now: () => t, enabled: () => on, post: null, vibrate });
    expect(haptics.fire("mark")).toBe(false);
    on = true; t = 10;
    expect(haptics.fire("mark")).toBe(true);
  });

  it("throttles the shared path the race uses too", async () => {
    const h = await load();
    h.raceHaptic("mark"); clock += 100; h.raceHaptic("contact"); clock += 250; h.raceHaptic("finish");
    expect(vi.mocked(host.navigator.vibrate!).mock.calls.map(([p]) => p)).toEqual([[...h.HAPTIC_PATTERNS.mark], [...h.HAPTIC_PATTERNS.finish]]);
  });
});

describe("the switch", () => {
  it("is on by default and vibrates", async () => {
    const h = await load();
    expect(h.readRaceHaptics()).toBe(true);
    h.raceHaptic("finish");
    expect(host.navigator.vibrate).toHaveBeenCalledTimes(1);
  });

  it("saves off and on in its own key, records the change and announces it", async () => {
    const h = await load();
    const heard = vi.fn();
    const stop = h.subscribeRaceHaptics(heard);
    h.writeRaceHaptics(false, "multiplayer");
    expect(data.get(KEY)).toBe("off");
    expect(h.readRaceHaptics()).toBe(false);
    h.raceHaptic("finish");
    expect(host.navigator.vibrate).not.toHaveBeenCalled();
    h.writeRaceHaptics(true);
    expect(data.get(KEY)).toBe("on");
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
    expect(mocks.record.mock.calls.map(([e]) => e)).toEqual([
      expect.objectContaining({ type: "control.preferences", surface: "multiplayer", preference: "haptics", value: false, previous: true, outcome: "accepted" }),
      expect.objectContaining({ type: "control.preferences", surface: "race", preference: "haptics", value: true, previous: false, outcome: "accepted" }),
    ]);
  });

  it("keeps a stored off after a reload", async () => {
    data.set(KEY, "off");
    const h = await load();
    expect(h.readRaceHaptics()).toBe(false);
  });

  it("holds the choice in memory when storage refuses to save it", async () => {
    const h = await load();
    host.localStorage.setItem = () => { throw new Error("quota"); };
    h.writeRaceHaptics(false);
    expect(h.readRaceHaptics()).toBe(false);
  });

  it("is listed for the iOS app's race storage bridge so the app remembers it", () => {
    const file = readFileSync(join(process.cwd(), "mobile/src/persistence/race-web-storage.ts"), "utf8");
    expect(file).toContain(`"${KEY}"`);
  });

  it("is a known diagnostics preference", async () => {
    const { parseDiagnosticBatch } = await import("./diagnostics");
    const event = { type: "control.preferences", surface: "race", outcome: "accepted", preference: "haptics", value: false, previous: true };
    expect(parseDiagnosticBatch({ version: 1, events: [event] })?.events).toEqual([event]);
  });
});

describe("availability", () => {
  it("is offered in a touch browser with navigator.vibrate and in the app WebView", async () => {
    expect((await load()).raceHapticsAvailable()).toBe(true);
    vi.resetModules();
    delete host.navigator.vibrate;
    host.ReactNativeWebView = { postMessage: vi.fn() };
    host.__REGATTA_RACE_HAPTICS__ = true;
    expect((await load()).raceHapticsAvailable()).toBe(true);
  });

  it("lets the switch hear the app's late flag injection", async () => {
    const h = await load();
    const heard = vi.fn();
    const stop = h.subscribeRaceHapticsAvailable(heard);
    host.dispatchEvent(new Event("regatta-embed"));
    stop();
    host.dispatchEvent(new Event("regatta-embed"));
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("is not offered without vibrate, or on a desktop without touch", async () => {
    delete host.navigator.vibrate;
    expect((await load()).raceHapticsAvailable()).toBe(false);
    vi.resetModules();
    host.navigator = { vibrate: vi.fn(() => true), maxTouchPoints: 0 };
    host.matchMedia = () => ({ matches: false });
    const h = await load();
    expect(h.raceHapticsAvailable()).toBe(false);
    h.raceHaptic("finish");
    expect(host.navigator.vibrate).not.toHaveBeenCalled();
  });
});
