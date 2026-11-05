import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceResults } from "./RaceResults";
import type { RaceLoopInput } from "./useRaceLoop";

// Contract (M5 step 7, ADR-0015 point 10): the actual GameClient keys every
// record of the results screen on the race's context. With the emission flag
// as shipped (false), the metric trial's results show no medal course, no
// skill bars and no practice return, and its save posts nothing, exactly as
// before. With the flag on (switch A, mocked here), the same results get the
// metric medal course and a practice return to the same metric course, and
// the leaderboard save posts the classified metric payload { raceContext,
// mode, course, rawFinishTimeSec, penaltySeconds }. A legacy free race posts
// the legacy class as before.
//
// The trial profile is seeded into its useState as in GameClient.medals.test.tsx.
type Seed = { hook: "state" | "ref"; initial: unknown; nth: number; value: unknown };
const capture = vi.hoisted(() => ({ results: null as ComponentProps<typeof RaceResults> | null, loop: null as RaceLoopInput | null,
  seed: null as Seed | null, seen: 0 }));
const flag = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/race-context", async original => {
  const real = await original<typeof import("@/lib/race-context")>();
  return { ...real, get PHYSICAL_RACE_EMISSION_ENABLED() { return flag.on; },
    raceRecordsEnabled: (context: import("@/lib/race-context").RaceContext) => context.model === "legacy-race-v1" || flag.on };
});
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
vi.mock("@/lib/funnel", () => ({ trackRaceCountdown: vi.fn(), trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn(), trackRaceAssist: vi.fn(), trackRaceReplay: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: (input: RaceLoopInput) => { capture.loop = input; } }));
import GameClient from "./GameClient";
import { LEGACY_RACE_CONTEXT, physicalRaceContext } from "@/lib/race-context";
import { makeCourse, type Boat } from "./race-model";

function render() {
  capture.results = null; capture.loop = null; capture.seen = 0;
  renderToStaticMarkup(<GameClient />);
}
function seededTrial() {
  for (let nth = 0; nth < 60; nth++) {
    capture.seed = { hook: "state", initial: null, value: "short", nth };
    try { render(); } catch { continue; }
    if (capture.results?.trialProfile === "short") return;
  }
  throw new Error("the trial seed never reached its state");
}

let bodies: { url: string; body: Record<string, unknown> }[];
beforeEach(() => {
  capture.seed = null; flag.on = false; bodies = [];
  vi.stubGlobal("React", React);
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { body?: string }) => {
    bodies.push({ url, body: JSON.parse(init?.body ?? "{}") });
    return { ok: true, json: async () => ({ ok: true, nickname: "Nick" }) };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); flag.on = false; });

/** Finish the race on the loop's refs as the countdown and the loop leave them, then save. */
async function finishAndSave(profile: "short" | null) {
  const refs = capture.loop!.refs;
  refs.physicalRef.current = profile;
  refs.raceContextRef!.current = profile ? physicalRaceContext(profile) : LEGACY_RACE_CONTEXT;
  refs.courseRef.current = makeCourse(profile);
  refs.boatsRef.current = [{ id: "player", name: "You", color: "#fff", pos: { x: 400, y: 900 }, heading: 0, speed: 0, isPlayer: true,
    lapDone: 2, finishTime: 301.5, speedMul: 1, started: true } as Boat];
  capture.results!.saveResult("Nick");
  await new Promise(resolve => setTimeout(resolve, 0));
  return bodies.find(b => b.url === "/api/race-result")?.body ?? null;
}

describe("the nickname is asked only when the result is on a visible board (R-12)", () => {
  async function finishWithoutNickname(boardRows: { isMe: boolean }[]) {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { body?: string }) => {
      bodies.push({ url, body: JSON.parse(init?.body ?? "{}") });
      return { ok: true, json: async () => (url.startsWith("/api/leaderboard") ? { rows: boardRows } : { ok: true, nickname: "Ola" }) };
    }));
    render();
    const refs = capture.loop!.refs;
    refs.physicalRef.current = null;
    refs.raceContextRef!.current = LEGACY_RACE_CONTEXT;
    refs.courseRef.current = makeCourse(null);
    refs.boatsRef.current = [{ id: "player", name: "You", color: "#fff", pos: { x: 400, y: 900 }, heading: 0, speed: 0, isPlayer: true,
      lapDone: 2, finishTime: 301.5, speedMul: 1, started: true } as Boat];
    capture.results!.saveResult();
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  const rows = (count: number, mine: boolean) => Array.from({ length: count }, (_, index) => ({ isMe: mine && index === 0 }));

  it("saves the result at once under the neutral name, with no call to /api/player", async () => {
    await finishWithoutNickname(rows(3, true));
    expect(bodies.find(b => b.url === "/api/race-result")?.body).toMatchObject({ nicknameFallback: "Player", finishTimeSec: 301.5 });
    expect(bodies.some(b => b.url === "/api/player")).toBe(false);
  });

  it("looks up the board this result landed on, by its class, mode, level and wind", async () => {
    await finishWithoutNickname(rows(3, true));
    const board = bodies.find(b => b.url.startsWith("/api/leaderboard"))?.url ?? "";
    expect(board).toContain("raceClass=");
    expect(board).toContain("raceMode=simple");
  });

  it("a name given in the prompt only names the saved result, it does not save the race twice", async () => {
    await finishWithoutNickname(rows(10, true));
    capture.results!.saveResult("Ola");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(bodies.filter(b => b.url === "/api/race-result")).toHaveLength(1);
    expect(bodies.filter(b => b.url === "/api/player").map(b => b.body)).toEqual([{ nickname: "Ola" }]);
  });

  it("does not look up a board when a nickname is known", async () => {
    render();
    await finishAndSave(null);
    expect(bodies.some(b => b.url.startsWith("/api/leaderboard"))).toBe(false);
  });
});

describe("the metric trial's records with the emission flag as shipped (false)", () => {
  it("shows no medal course, no skill bars and no practice return, and saves nothing", async () => {
    seededTrial();
    expect(capture.results?.medal).toBeNull();
    expect(capture.results?.practiceReturn).toBeNull();
    expect(capture.results?.skillBars).toBeNull();
    expect(await finishAndSave("short")).toBeNull();
    expect(bodies).toEqual([]);
  });
});

describe("the metric race's records with switch A on (mocked)", () => {
  beforeEach(() => { flag.on = true; });

  it("hands the results the metric medal course and a practice return to the same metric course", () => {
    seededTrial();
    expect(capture.results?.medal?.course).toEqual({ raceContext: physicalRaceContext("short"),
      difficulty: capture.results?.difficulty, windStrength: capture.results?.windStrength });
    expect(capture.results?.practiceReturn?.setup).toMatchObject({ kind: "conditions", race: "short" });
  });

  it("posts the classified metric result: its context, mode, course and raw time", async () => {
    seededTrial();
    const body = await finishAndSave("short");
    expect(body).toMatchObject({ raceContext: physicalRaceContext("short"), mode: "simple", rawFinishTimeSec: 301.5, penaltySeconds: 0, finishTimeSec: 301.5 });
    expect(body?.course).toEqual(JSON.parse(JSON.stringify(makeCourse("short"))));
  });

  it("posts a legacy free race under the legacy class, as before", async () => {
    render();
    const body = await finishAndSave(null);
    expect(body).toMatchObject({ raceContext: LEGACY_RACE_CONTEXT, mode: "simple", rawFinishTimeSec: 301.5 });
    expect(capture.results?.medal?.course.raceContext).toEqual(LEGACY_RACE_CONTEXT);
  });
});
