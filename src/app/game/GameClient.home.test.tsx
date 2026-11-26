import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RaceLoopInput } from "./useRaceLoop";
// Contract (M4-6): the actual GameClient hands the race loop the daily race
// day of this race (from the ?daily= link), so a finished daily race is the
// one the loop records as done in regatta.race.home.v1 and the lobby stops
// offering it (the loop's own write: useRaceLoop.medals.test.ts). A race that
// is not the daily race hands the loop no day.
//
// A static render runs no effects, so the day the page sets from the link is
// seeded as in GameClient.medals.test.tsx: the n-th useState called with null
// starts with the day, trying n = 0, 1, ... until the loop receives it.
const capture = vi.hoisted(() => ({ loop: null as RaceLoopInput | null, seed: null as { nth: number; value: string } | null, seen: 0 }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual,
    useState: (initial: unknown) => {
      const seed = capture.seed;
      const hit = Boolean(seed && initial === null && capture.seen++ === seed.nth);
      return actual.useState(hit ? seed!.value : initial);
    },
  };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceResults", () => ({ RaceResults: () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: () => null, RaceModePicker: () => null }));
vi.mock("./RaceReplay", () => ({ RaceReplay: () => null }));
vi.mock("./GameMenu", () => ({ GameMenu: () => null }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/funnel", () => ({ trackRaceCountdown: vi.fn(), trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: (input: RaceLoopInput) => { capture.loop = input; } }));
import GameClient from "./GameClient";

function render() {
  capture.loop = null; capture.seen = 0;
  renderToStaticMarkup(<GameClient />);
}

beforeEach(() => { capture.seed = null; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("daily race wiring in GameClient (M4-6)", () => {
  it("hands the loop no daily day outside the daily race", () => {
    render();
    expect(capture.loop).not.toBeNull();
    expect(capture.loop!.dailyDay).toBeNull();
  });

  it("hands the loop the daily day of the daily race", () => {
    const day = "2026-10-28";
    for (let nth = 0; nth < 60; nth++) {
      capture.seed = { nth, value: day };
      try { render(); } catch { continue; }
      if (capture.loop?.dailyDay === day) return;
    }
    throw new Error("the loop never received the daily race day");
  });
});
