import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceResults } from "./RaceResults";
import type { RaceLoopInput } from "./useRaceLoop";
// Contract (M4-5): the actual GameClient hands the result screen the medal of
// the solo race's course with the loop's hint flag of THIS race, gives the
// physical trial no medal, and every new race ("Again", "Restart") starts
// with the hint flag cleared, so hints in one race never take gold off the
// next one.
//
// A static render runs no effects, so a state the page sets later (the
// physical trial, the hint flag) is seeded as in GameClient.skills.test.tsx:
// the n-th useState / useRef called with the given initial value starts with
// the seed, trying n = 0, 1, ... until the result screen shows it landed.
type Seed = { hook: "state" | "ref"; initial: unknown; nth: number; value: unknown };
const capture = vi.hoisted(() => ({ results: null as ComponentProps<typeof RaceResults> | null, loop: null as RaceLoopInput | null,
  seed: null as Seed | null, seen: 0 }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  const seeded = (hook: Seed["hook"], initial: unknown) => {
    const seed = capture.seed;
    return Boolean(seed && seed.hook === hook && Object.is(initial, seed.initial) && capture.seen++ === seed.nth);
  };
  return { ...actual,
    useState: (initial: unknown) => actual.useState(seeded("state", initial) ? capture.seed!.value : initial === "menu" ? "finished" : initial),
    useRef: (initial?: unknown) => actual.useRef(seeded("ref", initial) ? capture.seed!.value : initial),
  };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceResults", () => ({ RaceResults: (props: ComponentProps<typeof RaceResults>) => { capture.results = props; return null; } }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: () => null, RaceModePicker: () => null }));
vi.mock("./RaceReplay", () => ({ RaceReplay: () => null }));
vi.mock("./GameMenu", () => ({ GameMenu: () => null }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/funnel", () => ({ trackRaceCountdown: vi.fn(), trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: (input: RaceLoopInput) => { capture.loop = input; } }));
import GameClient from "./GameClient";
import { LEGACY_RACE_CONTEXT } from "@/lib/race-context";
import { readPhysicalTrial } from "@/lib/race-trial";

function render() {
  capture.results = null; capture.loop = null; capture.seen = 0;
  renderToStaticMarkup(<GameClient />);
}
function seeded(seed: Omit<Seed, "nth">, landed: () => boolean) {
  for (let nth = 0; nth < 60; nth++) {
    capture.seed = { ...seed, nth };
    try { render(); } catch { continue; }
    if (landed()) return;
  }
  throw new Error(`seed ${String(seed.value)} never reached its state`);
}

const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
beforeEach(() => { capture.seed = null; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("course medal wiring in GameClient (M4-5)", () => {
  it("gives the result screen the course of this race and the loop's hint flag", () => {
    render();
    expect(capture.results?.medal).toMatchObject({ award: null, hintsUsed: false,
      course: { raceContext: LEGACY_RACE_CONTEXT, difficulty: capture.results?.difficulty, windStrength: capture.results?.windStrength } });
    // The loop writes the same ref GameClient reads for the results.
    expect(capture.loop?.refs.raceHintsRef?.current).toBe(false);
    seeded({ hook: "ref", initial: false, value: true }, () => capture.results?.medal?.hintsUsed === true);
    expect(capture.loop?.refs.raceHintsRef?.current).toBe(true);
  });

  it("gives the physical trial no medal", () => {
    const trial = readPhysicalTrial("?race=short");
    expect(trial).not.toBeNull();
    seeded({ hook: "state", initial: null, value: trial }, () => capture.results?.trialProfile === trial);
    expect(capture.results?.medal).toBeNull();
  });

  it("clears the hint flag when the next race starts (Again)", () => {
    render();
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: false, localStorage: storage, sessionStorage: storage, location: { search: "", href: "https://x.test/game" },
      history: { state: null, replaceState: () => {} } });
    const hints = capture.loop!.refs.raceHintsRef!;
    hints.current = true;
    try { capture.results!.onAgain(); } catch { /* state setters of a static render may throw after the reset */ }
    expect(hints.current).toBe(false);
  });
});
