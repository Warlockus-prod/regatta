import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceResults } from "./RaceResults";
import type { RaceSkillInput } from "@/lib/race-skill-metrics";
// M4-1: the actual GameClient measures the finished race's log against the
// HUD polar target and hands the skill bars to the result screen.
//
// A static render runs no effects, so a state the page sets later (the
// physical trial, the wind strength, the start crossing) is seeded: the n-th
// useState / useRef called with the given initial value starts with the seed
// instead. `seeded` tries n = 0, 1, ... until the result screen shows the seed
// landed on the intended state, so the test does not hard-code hook order.
type Seed = { hook: "state" | "ref"; initial: unknown; nth: number; value: unknown };
const capture = vi.hoisted(() => ({ phase: "finished", results: null as ComponentProps<typeof RaceResults> | null, inputs: [] as RaceSkillInput[],
  bars: [{ id: "start", value: 1, fill: 1, good: true }], seed: null as Seed | null, seen: 0 }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  const seeded = (hook: Seed["hook"], initial: unknown) => {
    const seed = capture.seed;
    return Boolean(seed && seed.hook === hook && Object.is(initial, seed.initial) && capture.seen++ === seed.nth);
  };
  return { ...actual,
    useState: (initial: unknown) => actual.useState(seeded("state", initial) ? capture.seed!.value : initial === "menu" ? capture.phase : initial),
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
vi.mock("./useRaceLoop", () => ({ useRaceLoop: () => {} }));
vi.mock("@/lib/race-skill-metrics", () => ({
  measureRaceSkills: (input: RaceSkillInput) => { capture.inputs.push(input); return { marker: true }; },
  raceSkillBars: (metrics: { marker?: boolean }) => metrics.marker ? capture.bars : [],
}));
import GameClient from "./GameClient";
import { makeStandardCourse } from "@/lib/race-physics";
import { polarFor, targetSpeed } from "@/features/race-hud/target";
import { raceSetupWindMultiplier } from "@/lib/race-setup";
import { readPhysicalTrial } from "@/lib/race-trial";

function render() {
  capture.results = null; capture.inputs = []; capture.seen = 0;
  renderToStaticMarkup(<GameClient />);
}

/** Render with the seed on the first matching hook for which `landed` holds. */
function seeded(seed: Omit<Seed, "nth">, landed: () => boolean) {
  for (let nth = 0; nth < 40; nth++) {
    capture.seed = { ...seed, nth };
    try { render(); } catch { continue; }
    if (landed()) return;
  }
  throw new Error(`seed ${String(seed.value)} never reached its state`);
}

beforeEach(() => { capture.results = null; capture.inputs = []; capture.phase = "finished"; capture.seed = null; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("solo race skill bars wiring (M4-1)", () => {
  it("measures the finished race against the HUD target and passes the bars to the result screen", () => {
    render();
    expect(capture.results?.skillBars).toBe(capture.bars);
    expect(capture.inputs).toHaveLength(1);
    const [input] = capture.inputs;
    const course = makeStandardCourse();
    expect(input.course.windwardMark).toEqual(course.marks[0].pos);
    expect(input.course.startLine).toEqual(course.startLine);
    expect(input.startedAt).toBeNull();
    expect(Array.isArray(input.samples) && Array.isArray(input.events)).toBe(true);
    // Medium wind: the same 12 kn polar the HUD target reads.
    expect(input.targetKn(45)).toBeCloseTo(targetSpeed(polarFor(12), 45), 6);
  });

  it("hands over the race loop's start crossing", () => {
    seeded({ hook: "ref", initial: undefined, value: 12.5 }, () => capture.inputs[0]?.startedAt === 12.5);
    expect(capture.inputs[0].startedAt).toBe(12.5);
  });

  it("measures a light-wind race against the light-wind polar, as the HUD does", () => {
    seeded({ hook: "state", initial: "medium", value: "light" }, () => capture.results?.windStrength === "light");
    const light = targetSpeed(polarFor(12 * raceSetupWindMultiplier("light")), 45);
    expect(capture.inputs[0].targetKn(45)).toBeCloseTo(light, 6);
    expect(Math.abs(light - targetSpeed(polarFor(12), 45))).toBeGreaterThan(0.1);
  });

  it("gives the physical trial no skill bars and measures nothing (no target, never ranked)", () => {
    const trial = readPhysicalTrial("?race=short");
    expect(trial).not.toBeNull();
    seeded({ hook: "state", initial: null, value: trial }, () => capture.results?.trialProfile === trial);
    expect(capture.results?.skillBars).toBeNull();
    expect(capture.inputs).toHaveLength(0);
  });

  it("measures nothing while the race is on", () => {
    capture.phase = "racing";
    render();
    expect(capture.inputs).toHaveLength(0);
  });
});
