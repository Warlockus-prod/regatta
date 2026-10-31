import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRaceRulesState, type RaceRuleEvent } from "@/lib/race-rules";
import { createRaceStartupGate } from "@/lib/race-startup";
import { createPendingRaceSaves } from "@/lib/race-completion";
import { createPendingNativeBestCommands } from "@/lib/race-best-command";
import { legacyRaceSpawns } from "@/lib/race-spawn";
import { raceTrim } from "@/lib/race-physics";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import type { DiagnosticInput } from "@/lib/diagnostics";
import { finishHoldStore } from "./race-finish-hold";
import { makeCourse, type Boat } from "./race-model";
import type { RaceLoopInput } from "./useRaceLoop";

// Contract: the actual solo race loop, at its end (time limit or finish),
// writes race.lifecycle and the two race.summary rows with this race's setup
// and counts, and still publishes the results and the coach as before.
const effects = vi.hoisted(() => ({ cleanups: [] as (void | (() => void))[] }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: (fn: () => void | (() => void)) => { effects.cleanups.push(fn()); } }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/sounds", () => ({ playTack: vi.fn(), playMarkRound: vi.fn(), playFinish: vi.fn(), playNoGo: vi.fn(), readRaceSound: () => true }));
vi.mock("@/lib/funnel", () => ({ trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn() }));
vi.mock("@/lib/race-resume", () => ({ clearRaceSetup: vi.fn() }));
vi.mock("@/lib/best-times", () => ({ tryUpdateBestRecord: () => ({ currentBest: null, isNewRecord: false }) }));
import { useRaceLoop } from "./useRaceLoop";

let frame: ((now: number) => void) | null = null;
beforeEach(() => {
  effects.cleanups = []; frame = null; vi.mocked(recordWebDiagnostic).mockReset();
  vi.stubGlobal("document", { hidden: false, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("performance", { now: () => 0 });
  vi.stubGlobal("requestAnimationFrame", (callback: (now: number) => void) => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});
afterEach(() => { for (const cleanup of effects.cleanups) cleanup?.(); vi.unstubAllGlobals(); finishHoldStore.set(null); });

const ref = <T,>(current: T) => ({ current });
function race(player: Partial<Boat>, clock: number, ruleEvents: RaceRuleEvent[] = []) {
  const course = makeCourse(), spawns = legacyRaceSpawns(course, 2);
  const boats: Boat[] = spawns.map((spawn, i) => ({ id: i ? `ai${i - 1}` : "player", name: i ? `AI ${i}` : "You", color: "#888888", pos: { ...spawn.pos },
    heading: spawn.heading, speed: 0, isPlayer: i === 0, lapDone: 0, speedMul: 1, ...(i === 0 ? player : {}) }));
  const gate = createRaceStartupGate(); gate.reset("race-1"); gate.rendered("race-1");
  const set = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn()) }) as unknown as RaceLoopInput["set"];
  const refs = {
    boatsRef: ref(boats), courseRef: ref(course), physicalRef: ref(null), physicalNavRef: ref(undefined), fleetRef: ref(null), keysRef: ref(new Set<string>()),
    rudderRef: ref(0), autopilotOnRef: ref(false), autopilotHeadingRef: ref(0),
    racePrefsRef: ref({ mode: "pro", guidance: false, trimHints: false, rules: true, penalties: true, windDisplay: "compass", miniMap: false }),
    trimRef: ref(raceTrim({ mainHoisted: true })), windDirRef: ref(355), windGustRef: ref(1), windStrengthRef: ref(1), raceClockRef: ref(clock), hudRefreshRef: ref(0),
    ruleStateRef: ref(createRaceRulesState()), ruleEventsRef: ref(ruleEvents), startedAtRef: ref(0), copyRef: ref({ ruleMessage: () => "" }),
    ghostTrackRef: ref(null), ghostBoatsRef: ref([]), markTimesRef: ref(new Map()), logSamplesRef: ref([]),
    logEventsRef: ref([{ type: "start", t: 0 }, { type: "tack", t: 20 }, { type: "gybe", t: 90 }]), lastSampleTimeRef: ref(0), wasInNoGoRef: ref(false),
    lastTackSignRef: ref(0), speedLogRef: ref([]), turnRef: ref(null), standingsKeyRef: ref(""), shownRankRef: ref(0), pendingRankRef: ref(null),
    raceIdRef: ref("race-1"), pendingNativeSaves: ref(createPendingRaceSaves()), pendingNativeBests: ref(createPendingNativeBestCommands()),
    guidanceStateRef: ref(null), rafRef: ref(null), simulationClockRef: ref(null), startupGate: ref(gate), pausedRef: ref(false), langRef: ref("en"),
    raceSetupRef: ref({ source: "hub", briefingShown: true, race: "mission" }), raceTallyRef: ref({ missedMarkNotices: 2, contacts: 1 }),
  } as unknown as RaceLoopInput["refs"];
  useRaceLoop({ gameState: "racing", difficulty: "easy", windStrength: "heavy", selectedMission: null, lang: "en", tp: (_ru, en) => en, paused: false, sceneReady: true,
    showEvent: vi.fn(), showNotice: vi.fn(), showContact: vi.fn(), requestNativeBest: vi.fn(), refs, set });
  for (let now = 100; frame && now < 60_000; now += 100) { const step = frame; frame = null; step(now); }
  return { set: set as unknown as Record<string, ReturnType<typeof vi.fn>> };
}
const journal = () => vi.mocked(recordWebDiagnostic).mock.calls.map(([event]) => event as DiagnosticInput);

describe("the race loop's end writes the race summary", () => {
  it("time limit: lifecycle timeout, no finish hold, both summary rows with the race's setup and counts", async () => {
    const jostle = { id: "j", kind: "contact", rule: "14", boatId: "player", time: 4, penaltySeconds: 0 } as RaceRuleEvent;
    const incident = { id: "g", kind: "give-way", rule: "10", boatId: "player", time: 80, penaltySeconds: 0 } as RaceRuleEvent;
    // An early start and its clearing are one judge item, not two (judgeIncidents is the judge's own count).
    const early = { id: "e", kind: "early-start", rule: "29.1", boatId: "player", time: 1, penaltySeconds: 0 } as RaceRuleEvent;
    const clear = { id: "c", kind: "start-clear", rule: "29.1", boatId: "player", time: 6, penaltySeconds: 0 } as RaceRuleEvent;
    const { set } = race({}, 300, [early, jostle, clear, incident]);
    // With rules on the debrief row waits for the judge module.
    await vi.waitFor(() => expect(journal().filter(e => e.type === "race.summary")).toHaveLength(2));
    const events = journal();
    expect(events.filter(e => e.type === "race.lifecycle").map(e => e.action)).toEqual(["timeout"]);
    const summary = events.filter(e => e.type === "race.summary");
    expect(summary).toEqual([
      expect.objectContaining({ action: "result", mode: "pro", difficulty: "easy", wind: "heavy", setupSource: "hub", race: "mission", briefingShown: true,
        finished: false, total: 3, botsFinished: 0, finishHoldShown: false, soundOn: true }),
      expect.objectContaining({ action: "debrief", tacks: 1, gybes: 1, missedMarkNotices: 2, contacts: 1, startJostleEvents: 1, judgeIncidents: 2 }),
    ]);
    const result = summary[0] as { raceSeconds: number; place: number };
    expect(result.raceSeconds).toBeGreaterThanOrEqual(300);
    expect(result.place).toBeGreaterThanOrEqual(1);
    // The race end itself is unchanged: results, coach and the results screen.
    expect(set.setResults).toHaveBeenCalledTimes(1);
    expect(set.setCoaching).toHaveBeenCalled();
    expect(set.setGameState).toHaveBeenCalledWith("finished");
  });

  it("finish: lifecycle finish then finish-hold, and the summary says the hold showed", async () => {
    race({ lapDone: 2, finishTime: 150, started: true }, 150);
    await vi.waitFor(() => expect(journal().filter(e => e.type === "race.summary")).toHaveLength(2));
    const events = journal();
    expect(events.filter(e => e.type === "race.lifecycle").map(e => e.action)).toEqual(["finish", "finish-hold"]);
    const [result] = events.filter(e => e.type === "race.summary");
    expect(result).toMatchObject({ action: "result", finished: true, finishHoldShown: true, total: 3 });
    expect((result as { botsFinished: number }).botsFinished).toBeLessThanOrEqual(2);
  });
});
