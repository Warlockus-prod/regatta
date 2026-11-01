import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameMenu } from "./GameMenu";
import type { RaceCockpit } from "./RaceCockpit";
import type { RaceResults } from "./RaceResults";
import type { RaceIntroProps } from "@/features/race-hud/RaceIntro";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";

// Contract (F5) on the actual race page: the lobby's first start on a device
// that has not seen the race intro opens the intro instead of the briefing or
// the countdown; its Start race goes straight to the countdown and records the
// intro and the classic briefing as seen; its Skip records the intro and goes
// to the briefing of a course's first start; "i", Again and a device that has
// seen it never open it, and neither does the physical trial (?race=), even
// before its engine has loaded; the lobby and the race settings reopen it, the
// race pauses under it and stays paused after it, and Got it on its last card
// records it as seen (Close does not); opened by the app's Race hub it gives
// the screen back to the hub.
const capture = vi.hoisted(() => ({
  phase: "menu", intro: "closed",
  menu: null as ComponentProps<typeof GameMenu> | null,
  cockpit: null as ComponentProps<typeof RaceCockpit> | null,
  results: null as ComponentProps<typeof RaceResults> | null,
  introProps: null as RaceIntroProps | null,
  introSet: [] as unknown[],
}));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    if (initial !== "closed") return actual.useState(initial === "menu" ? capture.phase : initial);
    const [value, set] = actual.useState(capture.intro);
    return [value, (next: unknown) => { capture.introSet.push(next); set(next as string); }];
  } };
});
// Both lazy parts of the page (the scene and the intro) come through next/dynamic; the intro is the one with onEnd.
vi.mock("next/dynamic", () => ({ default: () => (props: Record<string, unknown>) => {
  if (typeof props.onEnd === "function") capture.introProps = props as unknown as RaceIntroProps;
  return null;
} }));
vi.mock("./GameMenu", () => ({ GameMenu: (props: ComponentProps<typeof GameMenu>) => { capture.menu = props; return null; } }));
vi.mock("./RaceResults", () => ({ RaceResults: (props: ComponentProps<typeof RaceResults>) => { capture.results = props; return null; } }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: (props: ComponentProps<typeof RaceCockpit>) => { capture.cockpit = props; return null; }, RaceModePicker: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import { RACE_BRIEFING_SEEN_KEY } from "./race-setup-flow";
import { RACE_INTRO_KEY } from "@/features/race-hud/race-intro";

// A fresh module graph per case: the intro's session memory is a new page load each time.
async function renderPage() {
  vi.resetModules();
  const { default: GameClient } = await import("./GameClient");
  renderToStaticMarkup(<GameClient />);
}
const values = new Map<string, string>();
function lifecycle(): string[] {
  return vi.mocked(recordWebDiagnostic).mock.calls.map(([event]) => event as { type: string; action?: string })
    .filter(event => event.type === "race.lifecycle").map(event => event.action ?? "");
}
beforeEach(() => {
  values.clear(); capture.phase = "menu"; capture.intro = "closed";
  capture.menu = null; capture.cockpit = null; capture.results = null; capture.introProps = null; capture.introSet = [];
  vi.mocked(recordWebDiagnostic).mockReset();
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("the race intro before the first race", () => {
  it("opens on the lobby's first start of a device that has not seen it, with the race set up", async () => {
    await renderPage();
    capture.menu!.onStart();
    expect(capture.introSet).toEqual(["first"]);
    expect(lifecycle()).toEqual(["init"]);
    expect(values.has(RACE_INTRO_KEY)).toBe(false);
  });

  it("never opens once seen, from the i button or from Again", async () => {
    values.set(RACE_INTRO_KEY, "1");
    await renderPage();
    capture.menu!.onStart();
    expect(lifecycle()).toEqual(["init", "briefing"]);
    values.clear();
    capture.menu!.onShowBriefing();
    capture.phase = "finished";
    await renderPage();
    capture.results!.onAgain();
    expect(capture.introSet).toEqual([]);
  });

  it("Start race goes straight to the countdown and records the intro and the course as seen", async () => {
    capture.intro = "first";
    await renderPage();
    expect(capture.introProps).toMatchObject({ open: "first", pro: false });
    capture.introProps!.onEnd("start");
    expect(lifecycle()).toEqual(["countdown"]);
    expect(values.get(RACE_INTRO_KEY)).toBe("1");
    expect(JSON.parse(values.get(RACE_BRIEFING_SEEN_KEY)!)).toEqual(["classic"]);
    expect(capture.introSet).toEqual(["closed"]);
  });

  it("Skip records the intro and goes to the briefing of a course's first start", async () => {
    capture.intro = "first";
    await renderPage();
    capture.introProps!.onEnd("skip");
    expect(lifecycle()).toEqual(["briefing"]);
    expect(values.get(RACE_INTRO_KEY)).toBe("1");
    expect(values.has(RACE_BRIEFING_SEEN_KEY)).toBe(false);
  });

  it("Skip on a course already briefed goes to the countdown", async () => {
    values.set(RACE_BRIEFING_SEEN_KEY, JSON.stringify(["classic"]));
    capture.intro = "first";
    await renderPage();
    capture.introProps!.onEnd("skip");
    expect(lifecycle()).toEqual(["countdown"]);
  });
});

describe("the race intro in the physical trial", () => {
  it("never opens on the trial's first start, even before its engine has loaded", async () => {
    await renderPage();
    const local = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: () => {} };
    vi.stubGlobal("window", { location: { search: "?race=short", href: "https://x.test/game?race=short" }, localStorage: local, sessionStorage: local,
      history: { state: null, replaceState: () => {} } });
    capture.menu!.onStart();
    expect(capture.introSet).toEqual([]);
    expect(lifecycle()).toEqual(["init", "briefing"]);
    expect(values.has(RACE_INTRO_KEY)).toBe(false);
  });
});

describe("How to race on request", () => {
  it("reopens from the lobby and only closes", async () => {
    values.set(RACE_INTRO_KEY, "1");
    await renderPage();
    capture.menu!.onShowIntro!();
    expect(capture.introSet).toEqual(["lobby"]);
    capture.intro = "lobby";
    await renderPage();
    expect(capture.introProps?.open).toBe("lobby");
    capture.introProps!.onEnd("close");
    expect(lifecycle()).toEqual([]);
  });

  it("records the intro as seen when read to Got it, not on Close", async () => {
    capture.intro = "lobby";
    await renderPage();
    capture.introProps!.onEnd("close");
    expect(values.has(RACE_INTRO_KEY)).toBe(false);
    await renderPage();
    capture.introProps!.onEnd("done");
    expect(values.get(RACE_INTRO_KEY)).toBe("1");
    expect(lifecycle()).toEqual([]);
  });

  it("opened by the app's Race hub, gives the screen back to the hub", async () => {
    capture.intro = "hub";
    await renderPage();
    expect(capture.introProps).toMatchObject({ open: "hub" });
    const postMessage = vi.fn();
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true, ReactNativeWebView: { postMessage }, location: { search: "?intro=1" } });
    capture.introProps!.onEnd("close");
    expect(postMessage.mock.calls.map(([message]) => JSON.parse(message as string))).toEqual([{ type: "native-navigate", href: "/race" }]);
    expect(values.has(RACE_INTRO_KEY)).toBe(false);
    expect(lifecycle()).toEqual([]);
  });

  it("pauses the race under the intro from the race settings and leaves it paused", async () => {
    capture.phase = "racing";
    await renderPage();
    capture.cockpit!.onShowIntro!();
    expect(lifecycle()).toEqual(["pause"]);
    expect(capture.introSet).toEqual(["race"]);
    vi.mocked(recordWebDiagnostic).mockClear();
    capture.intro = "race";
    await renderPage();
    expect(capture.introProps?.open).toBe("race");
    capture.introProps!.onEnd("close");
    expect(lifecycle()).toEqual([]);
  });
});
