import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceResults } from "./RaceResults";
// Contract (M4-2): the actual GameClient hands the finish screen the race the
// practice links return to, built from the race it just ran: its level and
// wind, its mission, its daily day and the foundation lesson it was opened
// from. A physical trial gets none, so no link leads to an ordinary,
// recorded race.
//
// A static render runs no effects, so a state the page sets later is seeded
// as in GameClient.skills.test.tsx: the n-th useState called with the given
// initial value starts with the seed, trying n = 0, 1, ... until it lands.
type Seed = { initial: unknown; nth: number; value: unknown };
const capture = vi.hoisted(() => ({ results: null as ComponentProps<typeof RaceResults> | null, seed: null as Seed | null, seen: 0, search: "" }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  const seeded = (initial: unknown) => {
    const seed = capture.seed;
    return Boolean(seed && Object.is(initial, seed.initial) && capture.seen++ === seed.nth);
  };
  return { ...actual,
    useState: (initial: unknown) => actual.useState(seeded(initial) ? capture.seed!.value : initial === "menu" ? "finished" : initial),
  };
});
vi.mock("@/lib/race-native", async original => ({
  ...await original<typeof import("@/lib/race-native")>(),
  readRaceSearch: () => new URLSearchParams(capture.search),
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceResults", () => ({ RaceResults: (props: ComponentProps<typeof RaceResults>) => { capture.results = props; return null; } }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: () => null, RaceModePicker: () => null }));
vi.mock("./RaceReplay", () => ({ RaceReplay: () => null }));
vi.mock("./GameMenu", () => ({ GameMenu: () => null }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: () => {} }));
import GameClient from "./GameClient";
import { missions } from "@/data/missions";
import { raceReturnFor, raceReturnHref } from "@/lib/race-return";
import { readPhysicalTrial } from "@/lib/race-trial";

function render() {
  capture.results = null; capture.seen = 0;
  renderToStaticMarkup(<GameClient />);
}

function seeded(seed: Omit<Seed, "nth">, landed: () => boolean) {
  for (let nth = 0; nth < 40; nth++) {
    capture.seed = { ...seed, nth };
    try { render(); } catch { continue; }
    if (landed()) return;
  }
  throw new Error(`seed ${String(seed.value)} never reached its state`);
}

beforeEach(() => { capture.results = null; capture.seed = null; capture.search = ""; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("race finish practice return wiring (M4-2)", () => {
  it("a conditions race returns to its level and wind", () => {
    seeded({ initial: "medium", value: "hard" }, () => capture.results?.difficulty === "hard");
    expect(capture.results?.practiceReturn).toEqual(raceReturnFor({ difficulty: "hard", windStrength: "medium" }));
    expect(raceReturnHref(capture.results!.practiceReturn!)).toBe("/game?difficulty=hard&wind=medium");
  });

  it("a mission race returns to its mission", () => {
    const mission = missions[1];
    seeded({ initial: null, value: mission }, () => capture.results?.selectedMission === mission);
    expect(capture.results?.practiceReturn).toEqual({ setup: { kind: "mission", id: mission.id }, lesson: null });
  });

  it("a daily race returns to its day", () => {
    seeded({ initial: null, value: "2026-10-30" }, () => capture.results?.practiceReturn?.setup.kind === "daily");
    expect(capture.results?.practiceReturn).toEqual({ setup: { kind: "daily", day: "2026-10-30" }, lesson: null });
  });

  it("a race opened from lesson 8 keeps the lesson in its return", () => {
    capture.search = "?fromLesson=mini-race";
    render();
    expect(capture.results?.practiceReturn).toEqual(raceReturnFor({ difficulty: "medium", windStrength: "medium", fromLesson: "mini-race" }));
    expect(capture.results?.practiceReturn?.lesson).toBe("mini-race");
  });

  it("a physical trial gets no return, so its finish shows no practice links", () => {
    const trial = readPhysicalTrial("?race=short");
    expect(trial).not.toBeNull();
    seeded({ initial: null, value: trial }, () => capture.results?.trialProfile === trial);
    expect(capture.results?.practiceReturn).toBeNull();
  });
});
