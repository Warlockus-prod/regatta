import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRaceRulesState } from "@/lib/race-rules";
import { createRaceStartupGate } from "@/lib/race-startup";
import { createPendingRaceSaves } from "@/lib/race-completion";
import { createPendingNativeBestCommands } from "@/lib/race-best-command";
import { legacyRaceSpawns } from "@/lib/race-spawn";
import { MIN_BOAT_SEPARATION, raceTrim } from "@/lib/race-physics";
import type { RaceSoundscape } from "@/lib/race-soundscape-audio";
import type { Controls } from "@/lib/sailing-physics/types";
import { GHOST_STORAGE_KEY, ghostClassKey, makeGhostTrack, readGhostStore, type GhostTrack } from "@/lib/race-ghost";
import { LEGACY_RACE_CONTEXT } from "@/lib/race-context";
import { finishHoldStore } from "./race-finish-hold";
import { makeCourse, type Boat } from "./race-model";
import type { RaceLoopInput } from "./useRaceLoop";

// Contract (M4-4): in the actual solo race loop, when the player rounds the
// windward mark with a ghost of the same class beside them, the HUD shows one
// split against it, green (success) and "-" when ahead, red (danger) and "+"
// when behind; no ghost, no split. At the finish the loop hands the results
// the mark and finish splits against that ghost, and writes the new ghost row
// in the iOS app too, where its race bridge carries it to native storage.
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
interface Opts { ghost?: GhostTrack | null; heading?: number; mode?: "simple" | "pro"; trim?: Partial<Controls>; paused?: boolean; overlap?: boolean; frames?: number; frameMs?: number;
  place?: (player: Boat, course: ReturnType<typeof makeCourse>) => void; rudder?: number; keys?: string[]; onFrame?: (i: number, refs: RaceLoopInput["refs"]) => void }
function sail({ ghost = null, heading = 85, mode = "simple", trim = {}, paused = false, overlap = false, frames = 30, frameMs = 100, place, rudder = 0, keys = [], onFrame }: Opts = {}) {
  const course = makeCourse(), spawns = legacyRaceSpawns(course, 2);
  const boats: Boat[] = spawns.map((spawn, i) => ({ id: i ? `ai${i - 1}` : "player", name: i ? `AI ${i}` : "You", color: "#888888",
    pos: { ...spawn.pos }, heading: i ? spawn.heading : heading, speed: i ? 0 : 5, isPlayer: i === 0, lapDone: 0, speedMul: 1, started: true }));
  if (overlap) boats[1].pos = { x: boats[0].pos.x + 1, y: boats[0].pos.y };
  place?.(boats[0], course);
  const gate = createRaceStartupGate(); gate.reset("race-1"); gate.rendered("race-1");
  const set = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn()) }) as unknown as RaceLoopInput["set"];
  const refs = {
    boatsRef: ref(boats), courseRef: ref(course), physicalRef: ref(null), physicalNavRef: ref(undefined), fleetRef: ref(null), keysRef: ref(new Set<string>(keys)),
    rudderRef: ref(rudder), autopilotOnRef: ref(false), autopilotHeadingRef: ref(0),
    racePrefsRef: ref({ mode, guidance: false, trimHints: false, rules: false, penalties: false, windDisplay: "compass", miniMap: false }),
    trimRef: ref(raceTrim({ mainHoisted: true, ...trim })), windDirRef: ref(355), windGustRef: ref(1), windStrengthRef: ref(1), raceClockRef: ref(10), hudRefreshRef: ref(0),
    ruleStateRef: ref(createRaceRulesState()), ruleEventsRef: ref([]), startedAtRef: ref(0), copyRef: ref({ ruleMessage: () => "" }),
    ghostTrackRef: ref(ghost), ghostBoatsRef: ref([]), markTimesRef: ref(new Map()), logSamplesRef: ref([]),
    logEventsRef: ref([]), lastSampleTimeRef: ref(0), wasInNoGoRef: ref(false),
    lastTackSignRef: ref(0), speedLogRef: ref([]), turnRef: ref(null), standingsKeyRef: ref(""), shownRankRef: ref(0), pendingRankRef: ref(null),
    raceIdRef: ref("race-1"), pendingNativeSaves: ref(createPendingRaceSaves()), pendingNativeBests: ref(createPendingNativeBestCommands()),
    guidanceStateRef: ref(null), rafRef: ref(null), simulationClockRef: ref(null), startupGate: ref(gate), pausedRef: ref(paused), langRef: ref("en"),
    raceSetupRef: ref({ source: "hub", briefingShown: true, race: "free" }), raceTallyRef: ref({ missedMarkNotices: 0, contacts: 0 }),
  } as unknown as RaceLoopInput["refs"];
  const soundscape = { update: vi.fn(), winch: vi.fn(), thud: vi.fn(), setLive: vi.fn(), silence: vi.fn(), dispose: vi.fn() } satisfies RaceSoundscape;
  const showContact = vi.fn(), showEvent = vi.fn();
  // The hook runs once outside React here: react is mocked so its effect runs inline.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useRaceLoop({ gameState: "racing", difficulty: "easy", windStrength: "medium", selectedMission: null, lang: "en", tp: (_ru, en) => en, paused, sceneReady: true,
    showEvent, showNotice: vi.fn(), showContact, requestNativeBest: vi.fn(), soundscape, refs, set });
  for (let i = 1, now = frameMs; frame && i <= frames; i++, now += frameMs) { onFrame?.(i, refs); const step = frame; frame = null; step(now); }
  return { soundscape, showContact, showEvent, set, refs, player: boats[0] };
}

const key = ghostClassKey({ raceContext: LEGACY_RACE_CONTEXT, mode: "simple", difficulty: "easy", windStrength: "medium", missionId: null });
const ghostWith = (marks: number[], finish = 60) => makeGhostTrack(key, finish,
  Array.from({ length: 4 }, (_, i) => ({ t: i * 5, x: 400 + i, y: 900 - i, heading: 0, speed: 5, lap: i < 3 ? 0 : 1 })), marks)!;
const roundMark = (player: Boat, course: ReturnType<typeof makeCourse>) => {
  const m = course.marks[0], inner = m.radius + MIN_BOAT_SEPARATION / 2;
  player.roundPhase = 2; player.pos = { x: m.pos.x - inner - 30, y: m.pos.y - 4 };
};
const splitCalls = (showEvent: ReturnType<typeof vi.fn>) => showEvent.mock.calls.filter(([event]) => event.kind === "split");

describe("ghost splits in the solo race loop", () => {
  it("shows a red, plus-signed split at the mark when the ghost rounded earlier", () => {
    const { showEvent, refs } = sail({ ghost: ghostWith([4]), heading: 180, place: roundMark });
    const at = refs.markTimesRef.current.get("player")!;
    expect(at).toBeGreaterThan(4);
    const splits = splitCalls(showEvent);
    expect(splits).toHaveLength(1);
    expect(splits[0]).toEqual([{ kind: "split", deltaSec: Math.round((at - 4) * 10) / 10, verdict: "behind" }, "danger"]);
  });

  it("shows a green, minus-signed split when you round before the ghost", () => {
    const { showEvent } = sail({ ghost: ghostWith([40]), heading: 180, place: roundMark });
    const [[event, tone]] = splitCalls(showEvent);
    expect(event.verdict).toBe("ahead");
    expect(event.deltaSec).toBeLessThan(0);
    expect(tone).toBe("success");
  });

  it("shows no split without a ghost", () => {
    const { showEvent, refs } = sail({ heading: 180, place: roundMark });
    expect(refs.markTimesRef.current.has("player")).toBe(true);
    expect(splitCalls(showEvent)).toEqual([]);
  });

  it("hands the results the mark and finish splits with the penalty, and keeps the new best ghost in the app too", () => {
    const mem = new Map<string, string>();
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true, localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } } });
    const { set, player } = sail({ ghost: ghostWith([9], 60), heading: 180, onFrame: (i, refs) => {
      // A 5 s penalty counts in the finish split and in the stored ghost time, as in the record.
      if (i === 1) { refs.ruleStateRef.current.penalties.player = 5; refs.markTimesRef.current.set("player", 8); refs.logEventsRef.current.push({ type: "mark-rounded", t: 8, note: "windward-port" });
        refs.logSamplesRef.current.push({ t: 0, x: 400, y: 900, heading: 0, twa: 0, speed: 5, lap: 0 }, { t: 8, x: 400, y: 200, heading: 0, twa: 0, speed: 5, lap: 1 }); }
    }, place: (p, course) => {
      const a = course.finishLine.a, b = course.finishLine.b;
      p.lapDone = 1; p.pos = { x: (a.x + b.x) / 2, y: a.y - 4 };
    } });
    expect(player.finishTime).toBeDefined();
    const splits = vi.mocked(set.setGhostSplits!).mock.calls.at(-1)![0] as unknown as { at: string; verdict: string; deltaSec: number }[];
    expect(splits.map(s => [s.at, s.verdict, s.deltaSec])).toEqual([["mark", "ahead", -1], ["finish", "ahead", Math.round((player.finishTime! + 5 - 60) * 10) / 10]]);
    const stored = readGhostStore({ getItem: k => mem.get(k) ?? null })[key];
    expect(mem.has(GHOST_STORAGE_KEY)).toBe(true);
    expect(stored.finishTimeSec).toBeCloseTo(player.finishTime! + 5, 5);
    expect(stored.marks).toEqual([8]);
  });
});
