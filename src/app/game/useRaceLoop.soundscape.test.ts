import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRaceRulesState } from "@/lib/race-rules";
import { createRaceStartupGate } from "@/lib/race-startup";
import { createPendingRaceSaves } from "@/lib/race-completion";
import { createPendingNativeBestCommands } from "@/lib/race-best-command";
import { legacyRaceSpawns } from "@/lib/race-spawn";
import { raceTrim } from "@/lib/race-physics";
import type { RaceSoundscapeTargets } from "@/lib/race-soundscape";
import type { RaceSoundscape } from "@/lib/race-soundscape-audio";
import type { Controls } from "@/lib/sailing-physics/types";
import { finishHoldStore } from "./race-finish-hold";
import { makeCourse, type Boat } from "./race-model";
import type { RaceLoopInput } from "./useRaceLoop";

// Contract (M3-2): the actual solo race loop feeds the soundscape at its HUD
// cadence (at most ten times per second) with the player's apparent wind,
// speed and heel; the sails flog in the no-go zone in both modes and on a
// luff only in Pro; a contact plays the thud; a paused race sends nothing.
const effects = vi.hoisted(() => ({ cleanups: [] as (void | (() => void))[], soundOn: true, coach: null as null | "luffBoth" }));
vi.mock("@/lib/race-trim-coach", async original => {
  const actual = await original<typeof import("@/lib/race-trim-coach")>();
  return { raceTrimCoach: (boat: Parameters<typeof actual.raceTrimCoach>[0]) => effects.coach ?? actual.raceTrimCoach(boat) };
});
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: (fn: () => void | (() => void)) => { effects.cleanups.push(fn()); } }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/sounds", () => ({ playTack: vi.fn(), playMarkRound: vi.fn(), playFinish: vi.fn(), playNoGo: vi.fn(), readRaceSound: () => effects.soundOn }));
vi.mock("@/lib/funnel", () => ({ trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn() }));
vi.mock("@/lib/race-resume", () => ({ clearRaceSetup: vi.fn() }));
import { useRaceLoop } from "./useRaceLoop";

let frame: ((now: number) => void) | null = null;
beforeEach(() => {
  effects.cleanups = []; effects.soundOn = true; effects.coach = null; frame = null;
  vi.stubGlobal("document", { hidden: false, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("performance", { now: () => 0 });
  vi.stubGlobal("requestAnimationFrame", (callback: (now: number) => void) => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => { for (const cleanup of effects.cleanups) cleanup?.(); vi.unstubAllGlobals(); finishHoldStore.set(null); });

const ref = <T,>(current: T) => ({ current });
interface Opts { heading?: number; mode?: "simple" | "pro"; trim?: Partial<Controls>; paused?: boolean; overlap?: boolean; frames?: number; frameMs?: number }
function sail({ heading = 85, mode = "simple", trim = {}, paused = false, overlap = false, frames = 30, frameMs = 100 }: Opts = {}) {
  const course = makeCourse(), spawns = legacyRaceSpawns(course, 2);
  const boats: Boat[] = spawns.map((spawn, i) => ({ id: i ? `ai${i - 1}` : "player", name: i ? `AI ${i}` : "You", color: "#888888",
    pos: { ...spawn.pos }, heading: i ? spawn.heading : heading, speed: i ? 0 : 5, isPlayer: i === 0, lapDone: 0, speedMul: 1, started: true }));
  if (overlap) boats[1].pos = { x: boats[0].pos.x + 1, y: boats[0].pos.y };
  const gate = createRaceStartupGate(); gate.reset("race-1"); gate.rendered("race-1");
  const set = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn()) }) as unknown as RaceLoopInput["set"];
  const refs = {
    boatsRef: ref(boats), courseRef: ref(course), physicalRef: ref(null), physicalNavRef: ref(undefined), fleetRef: ref(null), keysRef: ref(new Set<string>()),
    rudderRef: ref(0), autopilotOnRef: ref(false), autopilotHeadingRef: ref(0),
    racePrefsRef: ref({ mode, guidance: false, trimHints: false, rules: false, penalties: false, windDisplay: "compass", miniMap: false }),
    trimRef: ref(raceTrim({ mainHoisted: true, ...trim })), windDirRef: ref(355), windGustRef: ref(1), windStrengthRef: ref(1), raceClockRef: ref(10), hudRefreshRef: ref(0),
    ruleStateRef: ref(createRaceRulesState()), ruleEventsRef: ref([]), startedAtRef: ref(0), copyRef: ref({ ruleMessage: () => "" }),
    ghostTrackRef: ref(null), ghostBoatsRef: ref([]), markTimesRef: ref(new Map()), logSamplesRef: ref([]),
    logEventsRef: ref([]), lastSampleTimeRef: ref(0), wasInNoGoRef: ref(false),
    lastTackSignRef: ref(0), speedLogRef: ref([]), turnRef: ref(null), standingsKeyRef: ref(""), shownRankRef: ref(0), pendingRankRef: ref(null),
    raceIdRef: ref("race-1"), pendingNativeSaves: ref(createPendingRaceSaves()), pendingNativeBests: ref(createPendingNativeBestCommands()),
    guidanceStateRef: ref(null), rafRef: ref(null), simulationClockRef: ref(null), startupGate: ref(gate), pausedRef: ref(paused), langRef: ref("en"),
    raceSetupRef: ref({ source: "hub", briefingShown: true, race: "free" }), raceTallyRef: ref({ missedMarkNotices: 0, contacts: 0 }),
  } as unknown as RaceLoopInput["refs"];
  const seen: RaceSoundscapeTargets[] = [];
  const soundscape = { update: vi.fn((t: RaceSoundscapeTargets) => { seen.push({ ...t }); }), winch: vi.fn(), thud: vi.fn(), setLive: vi.fn(), silence: vi.fn(), dispose: vi.fn() } satisfies RaceSoundscape;
  const showContact = vi.fn();
  useRaceLoop({ gameState: "racing", difficulty: "easy", windStrength: "medium", selectedMission: null, lang: "en", tp: (_ru, en) => en, paused, sceneReady: true,
    showEvent: vi.fn(), showNotice: vi.fn(), showContact, requestNativeBest: vi.fn(), soundscape, refs, set });
  for (let i = 1, now = frameMs; frame && i <= frames; i++, now += frameMs) { const step = frame; frame = null; step(now); }
  return { soundscape, seen, showContact, player: boats[0] };
}

describe("the race loop drives the soundscape", () => {
  it("sends the player's sailing to the soundscape at most ten times per second", () => {
    const { soundscape, seen } = sail({ frames: 120, frameMs: 1000 / 60 });
    // Two seconds at 60 frames per second: about twenty updates, never one per frame.
    expect(soundscape.update.mock.calls.length).toBeGreaterThanOrEqual(15);
    expect(soundscape.update.mock.calls.length).toBeLessThanOrEqual(21);
    const last = seen.at(-1)!;
    expect(last.silent).toBe(false);
    expect(last.windGain).toBeGreaterThan(0.05);
    expect(last.waterGain).toBeGreaterThan(0.05);
    expect(last.flogGain).toBe(0);
  });

  it("reuses one target object for the whole race", () => {
    const { soundscape } = sail({ frames: 10 });
    const objects = new Set(soundscape.update.mock.calls.map(([t]) => t));
    expect(objects.size).toBe(1);
  });

  it("flogs the sails head to wind in both modes", () => {
    for (const mode of ["simple", "pro"] as const) {
      const { seen } = sail({ heading: 355, mode, frames: 5 });
      expect(seen.at(-1)!.flogGain, mode).toBeGreaterThan(0);
    }
  });

  it("flogs on a luff only in Pro, where the player holds the sheets", () => {
    const eased = { mainSheet: 0, jibSheet: 0 };
    const pro = sail({ heading: 60, mode: "pro", trim: eased, frames: 10 }).seen.at(-1)!;
    const simple = sail({ heading: 60, mode: "simple", trim: eased, frames: 10 }).seen.at(-1)!;
    expect(pro.flogGain).toBeGreaterThan(0);
    expect(simple.flogGain).toBe(0);
  });

  it("ignores a luff reading in Simple even when the coach reports one", () => {
    effects.coach = "luffBoth";
    expect(sail({ heading: 60, mode: "simple", frames: 5 }).seen.at(-1)!.flogGain).toBe(0);
    expect(sail({ heading: 60, mode: "pro", frames: 5 }).seen.at(-1)!.flogGain).toBeGreaterThan(0);
  });

  it("is silent when race sound is off", () => {
    effects.soundOn = false;
    const { seen } = sail({ frames: 5 });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(t => t.silent)).toBe(true);
  });

  it("sends nothing while the race is paused", () => {
    const { soundscape } = sail({ paused: true, frames: 10 });
    expect(soundscape.update).not.toHaveBeenCalled();
  });

  it("plays the contact thud with the red contact frame", () => {
    const { soundscape, showContact } = sail({ overlap: true, frames: 3 });
    expect(showContact).toHaveBeenCalled();
    expect(soundscape.thud).toHaveBeenCalledTimes(showContact.mock.calls.length);
  });
});
