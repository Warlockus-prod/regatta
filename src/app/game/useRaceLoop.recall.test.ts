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

// Contract (M3-3): the actual solo race loop reports the player's premature
// start, as detected by the race rules (RRS 29.1), once, so the page raises
// flag X and sounds the recall; it reports the clearing once the player has
// returned behind the line; a clean start and a race without rules report
// nothing. The loop itself never decides the start was early.
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
interface Opts { heading?: number; mode?: "simple" | "pro"; trim?: Partial<Controls>; paused?: boolean; overlap?: boolean; frames?: number; frameMs?: number; early?: boolean; rules?: boolean; back?: number }
function sail({ heading = 85, mode = "simple", trim = {}, paused = false, overlap = false, frames = 30, frameMs = 100, early = false, rules = true, back }: Opts = {}) {
  const course = makeCourse(), spawns = legacyRaceSpawns(course, 2);
  const boats: Boat[] = spawns.map((spawn, i) => ({ id: i ? `ai${i - 1}` : "player", name: i ? `AI ${i}` : "You", color: "#888888",
    pos: { ...spawn.pos }, heading: i ? spawn.heading : heading, speed: i ? 0 : 5, isPlayer: i === 0, lapDone: 0, speedMul: 1, started: true }));
  if (overlap) boats[1].pos = { x: boats[0].pos.x + 1, y: boats[0].pos.y };
  const lineY = (course.startLine.a.y + course.startLine.b.y) / 2;
  // Over the line at the gun: on the course side (smaller y) and not started.
  if (early) { boats[0].started = false; boats[0].speed = 0; boats[0].pos = { x: (course.startLine.a.x + course.startLine.b.x) / 2, y: lineY - 40 }; }
  const gate = createRaceStartupGate(); gate.reset("race-1"); gate.rendered("race-1");
  const set = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn()) }) as unknown as RaceLoopInput["set"];
  const refs = {
    boatsRef: ref(boats), courseRef: ref(course), physicalRef: ref(null), physicalNavRef: ref(undefined), fleetRef: ref(null), keysRef: ref(new Set<string>()),
    rudderRef: ref(0), autopilotOnRef: ref(false), autopilotHeadingRef: ref(0),
    racePrefsRef: ref({ mode, guidance: false, trimHints: false, rules, penalties: false, windDisplay: "compass", miniMap: false }),
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
  const onStartRecall = vi.fn();
  useRaceLoop({ gameState: "racing", difficulty: "easy", windStrength: "medium", selectedMission: null, lang: "en", tp: (_ru, en) => en, paused, sceneReady: true,
    showEvent: vi.fn(), showNotice: vi.fn(), showContact, requestNativeBest: vi.fn(), soundscape, onStartRecall, refs, set });
  for (let i = 1, now = frameMs; frame && i <= frames; i++, now += frameMs) {
    // The player sails back behind the line from frame `back` on.
    if (back !== undefined && i === back) boats[0].pos = { ...boats[0].pos, y: lineY + 60 };
    const step = frame; frame = null; step(now);
  }
  return { soundscape, seen, showContact, onStartRecall, player: boats[0] };
}

describe("the race loop reports the player's recall", () => {
  it("reports an early start once while the player stays over the line", () => {
    const { onStartRecall } = sail({ early: true, frames: 20 });
    expect(onStartRecall.mock.calls).toEqual([[true]]);
  });

  it("reports the clearing once the player is back behind the line", () => {
    const { onStartRecall } = sail({ early: true, frames: 20, back: 10 });
    expect(onStartRecall.mock.calls).toEqual([[true], [false]]);
  });

  it("reports nothing for a clean start or when the race rules are off", () => {
    expect(sail({ frames: 10 }).onStartRecall).not.toHaveBeenCalled();
    expect(sail({ early: true, rules: false, frames: 10 }).onStartRecall).not.toHaveBeenCalled();
  });
});
