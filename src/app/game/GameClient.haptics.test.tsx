import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceCockpit } from "./RaceCockpit";

// Contract (M3-4): the actual solo race hands the cockpit a vibration switch
// only where a race event can vibrate (a touch browser with navigator.vibrate,
// or an app WebView that announced its haptics handler), bound to the stored
// choice; a desktop browser and an older app build get no switch.
const capture = vi.hoisted(() => ({ cockpit: null as ComponentProps<typeof RaceCockpit> | null }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return {
    ...actual,
    // The race page in play, and client values instead of server defaults for the switch.
    useState: (initial: unknown) => actual.useState(initial === "menu" ? "racing" : initial),
    useSyncExternalStore: (_subscribe: unknown, get: () => unknown, server?: () => unknown) =>
      typeof window === "undefined" ? (server ?? get)() : get(),
  };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: (props: ComponentProps<typeof RaceCockpit>) => { capture.cockpit = props; return null; }, RaceModePicker: () => null }));
vi.mock("./RaceResults", () => ({ RaceResults: () => null }));
vi.mock("./RaceReplay", () => ({ RaceReplay: () => null }));
vi.mock("./GameMenu", () => ({ GameMenu: () => null }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: () => null }));
vi.mock("./race-prefs", () => ({ useRacePrefs: () => ({ prefs: { mode: "simple", guidance: true, trimHints: true, rules: true, penalties: false }, update: vi.fn() }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: () => undefined }));
vi.mock("@/features/race-hud/useStartSignals", () => ({ useStartSignals: () => undefined }));
import GameClient from "./GameClient";

const data = new Map<string, string>();
let host: EventTarget & { [key: string]: unknown };
beforeEach(() => {
  capture.cockpit = null; data.clear();
  vi.stubGlobal("React", React);
  host = Object.assign(new EventTarget() as EventTarget & { [key: string]: unknown }, {
    localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } },
    navigator: { maxTouchPoints: 0 },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    location: { href: "http://localhost/game", search: "", pathname: "/game" },
  });
  vi.stubGlobal("window", host);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("solo race vibration switch", () => {
  it("is not offered on a desktop browser or in an app build without the native handler", () => {
    renderToStaticMarkup(<GameClient />);
    expect(capture.cockpit).not.toBeNull();
    expect(capture.cockpit!.haptics).toBeUndefined();
    host.ReactNativeWebView = { postMessage: () => undefined };
    renderToStaticMarkup(<GameClient />);
    expect(capture.cockpit!.haptics).toBeUndefined();
  });

  it("is offered in the app WebView that announced the handler, and on a touch browser, with the stored choice", () => {
    host.ReactNativeWebView = { postMessage: () => undefined };
    host.__REGATTA_RACE_HAPTICS__ = true;
    renderToStaticMarkup(<GameClient />);
    expect(capture.cockpit!.haptics?.on).toBe(true);
    delete host.ReactNativeWebView; delete host.__REGATTA_RACE_HAPTICS__;
    host.navigator = { maxTouchPoints: 5, vibrate: () => true };
    data.set("regatta.race.haptics.v1", "off");
    renderToStaticMarkup(<GameClient />);
    expect(capture.cockpit!.haptics?.on).toBe(false);
    capture.cockpit!.haptics!.setOn(true);
    expect(data.get("regatta.race.haptics.v1")).toBe("on");
  });
});
