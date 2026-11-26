import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRaceRulesState } from "@/lib/race-rules";
import { createRaceStartupGate } from "@/lib/race-startup";
import { createPendingRaceSaves } from "@/lib/race-completion";
import { createPendingNativeBestCommands } from "@/lib/race-best-command";
import { legacyRaceSpawns } from "@/lib/race-spawn";
import { raceTrim } from "@/lib/race-physics";
import type { RaceSoundscape } from "@/lib/race-soundscape-audio";
import type { Controls } from "@/lib/sailing-physics/types";
import type { GhostTrack } from "@/lib/race-ghost";
import { RACE_MEDALS_STORAGE_KEY, courseMedal, readMedalStore, type MedalAward } from "@/lib/race-medals";
import { LEGACY_RACE_CONTEXT } from "@/lib/race-context";
import { RACE_HOME_STORAGE_KEY, localDay, parseRaceHomeStore } from "@/lib/race-next-step";
import { finishHoldStore } from "./race-finish-hold";
import { makeCourse, type Boat } from "./race-model";
import type { RaceLoopInput } from "./useRaceLoop";

// Contract (M4-5): in the actual solo race loop a finish records the course
// medal (web and app storage alike) and hands it to the results; route or
// trim hints on at ANY moment of the countdown or the race, paused or not,
// take gold off that race; a timeout and the physical trial record nothing.
const effects = vi.hoisted(() => ({ cleanups: [] as (void | (() => void))[] }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: (fn: () => void | (() => void)) => { effects.cleanups.push(fn()); } }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/sounds", () => ({ playTack: vi.fn(), playMarkRound: vi.fn(), playFinish: vi.fn(), playNoGo: vi.fn(), readRaceSound: () => true }));
vi.mock("@/lib/race-haptics", () => ({ raceHaptic: vi.fn() }));
vi.mock("@/lib/funnel", () => ({ trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn(), trackRaceCountdown: vi.fn() }));
vi.mock("@/lib/race-resume", () => ({ clearRaceSetup: vi.fn() }));
import { useRaceLoop } from "./useRaceLoop";

let frame: ((now: number) => void) | null = null;
beforeEach(() => {
  effects.cleanups = []; frame = null;
  vi.stubGlobal("document", { hidden: false, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("performance", { now: () => 0 });
  vi.stubGlobal("requestAnimationFrame", (callback: (now: number) => void) => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => { for (const cleanup of effects.cleanups) cleanup?.(); vi.unstubAllGlobals(); finishHoldStore.set(null); });

const ref = <T,>(current: T) => ({ current });
interface Opts { dailyDay?: string | null; gameState?: "racing" | "countdown"; physical?: "short" | null; clock?: number; guidance?: boolean; hints?: { current: boolean }; ghost?: GhostTrack | null; heading?: number; mode?: "simple" | "pro"; trim?: Partial<Controls>; paused?: boolean; overlap?: boolean; frames?: number; frameMs?: number;
  place?: (player: Boat, course: ReturnType<typeof makeCourse>) => void; rudder?: number; keys?: string[]; onFrame?: (i: number, refs: RaceLoopInput["refs"]) => void }
function sail({ dailyDay = null, gameState = "racing", physical = null, clock = 10, guidance = false, hints = { current: false }, ghost = null, heading = 85, mode = "simple", trim = {}, paused = false, overlap = false, frames = 30, frameMs = 100, place, rudder = 0, keys = [], onFrame }: Opts = {}) {
  const course = makeCourse(), spawns = legacyRaceSpawns(course, 2);
  const boats: Boat[] = spawns.map((spawn, i) => ({ id: i ? `ai${i - 1}` : "player", name: i ? `AI ${i}` : "You", color: "#888888",
    pos: { ...spawn.pos }, heading: i ? spawn.heading : heading, speed: i ? 0 : 5, isPlayer: i === 0, lapDone: 0, speedMul: 1, started: true }));
  if (overlap) boats[1].pos = { x: boats[0].pos.x + 1, y: boats[0].pos.y };
  place?.(boats[0], course);
  const gate = createRaceStartupGate(); gate.reset("race-1"); gate.rendered("race-1");
  const set = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn()) }) as unknown as RaceLoopInput["set"];
  const refs = {
    boatsRef: ref(boats), courseRef: ref(course), physicalRef: ref(physical), physicalNavRef: ref(undefined), fleetRef: ref(null), keysRef: ref(new Set<string>(keys)),
    rudderRef: ref(rudder), autopilotOnRef: ref(false), autopilotHeadingRef: ref(0),
    racePrefsRef: ref({ mode, guidance, trimHints: false, rules: false, penalties: false, windDisplay: "compass", miniMap: false }),
    trimRef: ref(raceTrim({ mainHoisted: true, ...trim })), windDirRef: ref(355), windGustRef: ref(1), windStrengthRef: ref(1), raceClockRef: ref(clock), hudRefreshRef: ref(0),
    ruleStateRef: ref(createRaceRulesState()), ruleEventsRef: ref([]), startedAtRef: ref(0), copyRef: ref({ ruleMessage: () => "" }),
    ghostTrackRef: ref(ghost), ghostBoatsRef: ref([]), markTimesRef: ref(new Map()), logSamplesRef: ref([]),
    logEventsRef: ref([]), lastSampleTimeRef: ref(0), wasInNoGoRef: ref(false),
    lastTackSignRef: ref(0), speedLogRef: ref([]), turnRef: ref(null), standingsKeyRef: ref(""), shownRankRef: ref(0), pendingRankRef: ref(null),
    raceIdRef: ref("race-1"), pendingNativeSaves: ref(createPendingRaceSaves()), pendingNativeBests: ref(createPendingNativeBestCommands()),
    guidanceStateRef: ref(null), rafRef: ref(null), simulationClockRef: ref(null), startupGate: ref(gate), pausedRef: ref(paused), langRef: ref("en"),
    raceSetupRef: ref({ source: "hub", briefingShown: true, race: "free" }), raceTallyRef: ref({ missedMarkNotices: 0, contacts: 0 }), raceHintsRef: hints,
  } as unknown as RaceLoopInput["refs"];
  const soundscape = { update: vi.fn(), winch: vi.fn(), thud: vi.fn(), setLive: vi.fn(), silence: vi.fn(), dispose: vi.fn() } satisfies RaceSoundscape;
  const showContact = vi.fn(), showEvent = vi.fn();
  // The hook runs once outside React here: react is mocked so its effect runs inline.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useRaceLoop({ gameState, difficulty: "easy", windStrength: "medium", selectedMission: null, dailyDay, lang: "en", tp: (_ru, en) => en, paused, sceneReady: true,
    showEvent, showNotice: vi.fn(), showContact, requestNativeBest: vi.fn(), soundscape, refs, set });
  for (let i = 1, now = frameMs; frame && i <= frames; i++, now += frameMs) { onFrame?.(i, refs); const step = frame; frame = null; step(now); }
  return { soundscape, showContact, showEvent, set, refs, player: boats[0] };
}

const course = { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy" as const, windStrength: "medium" as const };
const atFinish = (p: Boat, c: ReturnType<typeof makeCourse>) => {
  const a = c.finishLine.a, b = c.finishLine.b;
  p.lapDone = 1; p.pos = { x: (a.x + b.x) / 2, y: a.y - 4 };
};
let mem: Map<string, string>;
beforeEach(() => {
  mem = new Map();
  vi.stubGlobal("window", { localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } } });
});
const award = (set: RaceLoopInput["set"]) => vi.mocked(set.setMedalAward!).mock.calls.at(-1)![0] as MedalAward | null;

describe("course medals in the solo race loop", () => {
  it("records gold for a fast finish with hints off, in storage and for the results", () => {
    const { set, player } = sail({ heading: 180, place: atFinish });
    expect(player.finishTime).toBeLessThan(102);
    expect(award(set)).toMatchObject({ earned: "gold", medal: "gold", improved: true, saved: true });
    expect(courseMedal(readMedalStore({ getItem: k => mem.get(k) ?? null }), course)).toBe("gold");
  });

  it("takes gold off when route hints were on for one moment of the race", () => {
    const hints = { current: false };
    const { set } = sail({ heading: 180, place: atFinish, hints, frames: 30, onFrame: (i, refs) => {
      const prefs = refs.racePrefsRef.current as { guidance: boolean };
      if (i === 1) prefs.guidance = true;
      if (i === 2) prefs.guidance = false;
    } });
    expect(hints.current).toBe(true);
    expect(award(set)).toMatchObject({ earned: "silver", medal: "silver" });
  });

  it("takes gold off when route hints were read during a pause and switched off before resuming", () => {
    const hints = { current: false };
    const { set, player } = sail({ heading: 180, place: atFinish, hints, paused: true, frames: 40, onFrame: (i, refs) => {
      const prefs = refs.racePrefsRef.current as { guidance: boolean };
      if (i === 2) prefs.guidance = true;
      if (i === 4) prefs.guidance = false;
      if (i === 6) refs.pausedRef.current = false;
    } });
    expect(player.finishTime).toBeLessThan(102);
    expect(hints.current).toBe(true);
    expect(award(set)).toMatchObject({ earned: "silver", medal: "silver" });
  });

  it("counts route hints shown during the countdown, and nothing when they stay off", () => {
    const shown = { current: false };
    sail({ gameState: "countdown", hints: shown, frames: 5, onFrame: (i, refs) => {
      const prefs = refs.racePrefsRef.current as { guidance: boolean };
      if (i === 2) prefs.guidance = true;
      if (i === 3) prefs.guidance = false;
    } });
    expect(shown.current).toBe(true);
    const off = { current: false };
    sail({ gameState: "countdown", hints: off, frames: 5 });
    expect(off.current).toBe(false);
  });

  it("marks the award as not saved when the device refuses the medal row", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } } });
    const { set } = sail({ heading: 180, place: atFinish });
    expect(award(set)).toMatchObject({ earned: "gold", improved: true, saved: false });
  });

  it("counts Pro trim hints", () => {
    const pro = sail({ heading: 180, place: atFinish, mode: "pro", onFrame: (i, refs) => { if (i === 1) (refs.racePrefsRef.current as { trimHints: boolean }).trimHints = true; } });
    expect(award(pro.set)?.earned).toBe("silver");
  });

  it("does not count the trim hint switch in Simple, which shows no trim hints", () => {
    const simple = sail({ heading: 180, place: atFinish, mode: "simple", onFrame: (i, refs) => { if (i === 1) (refs.racePrefsRef.current as { trimHints: boolean }).trimHints = true; } });
    expect(award(simple.set)?.earned).toBe("gold");
  });

  it("records nothing for a timeout or for a finished physical trial", () => {
    const timeout = sail({ clock: 301, heading: 180 });
    expect(timeout.player.finishTime).toBeUndefined();
    expect(award(timeout.set)).toBeNull();
    finishHoldStore.set(null);
    // A trial finish that would be gold in the legacy race:
    const trial = sail({ physical: "short", clock: 61, heading: 180, place: p => { p.lapDone = 2; p.finishTime = 60; } });
    expect(vi.mocked(trial.set.setMedalAward!)).toHaveBeenCalledWith(null);
    expect(mem.has(RACE_MEDALS_STORAGE_KEY)).toBe(false);
  });
});

// Contract (M4-6): every ended solo race (a finish or the time limit) writes the
// race menu's row: today's local day, the coach's main mistake as the next goal,
// and a finished daily race as done; the physical trial writes nothing.
describe("the race menu's next step from the solo race loop", () => {
  const homeRow = () => parseRaceHomeStore(mem.get(RACE_HOME_STORAGE_KEY));

  it("records the day and a finished daily race", () => {
    sail({ heading: 180, place: atFinish, dailyDay: "2026-11-01" });
    expect(mem.has(RACE_HOME_STORAGE_KEY)).toBe(true);
    expect(homeRow()).toMatchObject({ schema: 1, days: [localDay(new Date())], dailyDone: "2026-11-01" });
  });

  it("records a timed-out race's day and its main mistake, but not the daily race as done", () => {
    // Pointing into the wind for the whole race: the coach's main mistake is the no-go zone.
    sail({ clock: 301, heading: 0, dailyDay: "2026-11-01", frames: 5, onFrame: (_i, refs) => {
      (refs.logSamplesRef.current as unknown[]).push(...[0, 10, 20, 30, 40].map(t => ({ t, x: 0, y: 0, heading: 0, speed: 0.5, twa: 5 })));
      (refs.logEventsRef.current as unknown[]).push({ t: 1, type: "no-go-entered" }, { t: 11, type: "no-go-entered" }, { t: 21, type: "no-go-entered" });
    } });
    const row = homeRow();
    expect(row.days).toEqual([localDay(new Date())]);
    expect(row.dailyDone).toBeNull();
    expect(row.goal).toBe("no-go");
  });

  it("writes nothing for the physical trial", () => {
    sail({ physical: "short", clock: 61, heading: 180, place: p => { p.lapDone = 2; p.finishTime = 60; } });
    expect(mem.has(RACE_HOME_STORAGE_KEY)).toBe(false);
  });
});
