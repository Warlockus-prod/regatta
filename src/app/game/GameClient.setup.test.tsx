import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameMenu } from "./GameMenu";
import type { RaceResults } from "./RaceResults";
import type { RaceBriefing } from "./RaceBriefing";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";

// Contract (M1-1): the actual race page sends the lobby's start to the
// briefing only on a first visit to the course, "i" always to the briefing,
// the briefing's start marks the course seen, and the result's "Again" goes
// straight to the countdown with the same setup.

const capture = vi.hoisted(() => ({
  phase: "menu",
  menu: null as ComponentProps<typeof GameMenu> | null,
  results: null as ComponentProps<typeof RaceResults> | null,
  briefing: null as ComponentProps<typeof RaceBriefing> | null,
}));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === "menu" ? capture.phase : initial) };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./GameMenu", () => ({ GameMenu: (props: ComponentProps<typeof GameMenu>) => { capture.menu = props; return null; } }));
vi.mock("./RaceResults", () => ({ RaceResults: (props: ComponentProps<typeof RaceResults>) => { capture.results = props; return null; } }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: (props: ComponentProps<typeof RaceBriefing>) => { capture.briefing = props; return null; } }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: () => null, RaceModePicker: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import { RACE_BRIEFING_SEEN_KEY } from "./race-setup-flow";

// A fresh module graph per case: the seen-briefing session memory must not
// leak from one case into the next (each case is a new page load).
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
  values.clear(); capture.phase = "menu"; capture.menu = null; capture.results = null; capture.briefing = null;
  vi.mocked(recordWebDiagnostic).mockReset();
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("one race setup on the actual race page", () => {
  it("opens the briefing on the first start and goes straight to the countdown once the course is seen", async () => {
    await renderPage();
    capture.menu!.onStart();
    expect(lifecycle()).toEqual(["init", "briefing"]);
    vi.mocked(recordWebDiagnostic).mockClear();
    values.set(RACE_BRIEFING_SEEN_KEY, JSON.stringify(["classic"]));
    capture.menu!.onStart();
    expect(lifecycle()).toEqual(["init", "countdown"]);
  });

  it("opens the briefing from the lobby's i button even after the course is seen", async () => {
    values.set(RACE_BRIEFING_SEEN_KEY, JSON.stringify(["classic"]));
    await renderPage();
    capture.menu!.onShowBriefing();
    expect(lifecycle()).toEqual(["init", "briefing"]);
  });

  it("marks the course seen when the player starts from the briefing, without asking the mode again", async () => {
    capture.phase = "briefing";
    await renderPage();
    expect(capture.briefing).not.toBeNull();
    expect(capture.briefing).not.toHaveProperty("updateRacePrefs");
    expect(capture.briefing!.mode).toBe("simple");
    capture.briefing!.onStart();
    expect(JSON.parse(values.get(RACE_BRIEFING_SEEN_KEY)!)).toEqual(["classic"]);
    expect(lifecycle()).toEqual(["countdown"]);
  });

  it("sends Again from the result straight to the countdown, never through the briefing", async () => {
    capture.phase = "finished";
    await renderPage();
    capture.results!.onAgain();
    // The journal names the restart and where it came from before the new race (diagnostics).
    expect(lifecycle()).toEqual(["restart", "init", "countdown"]);
    expect(vi.mocked(recordWebDiagnostic).mock.calls[0][0]).toMatchObject({ type: "race.lifecycle", action: "restart", setupSource: "again", phase: "finished" });
    expect(values.has(RACE_BRIEFING_SEEN_KEY)).toBe(false);
  });
});
