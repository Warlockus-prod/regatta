import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRaceRulesState } from "@/lib/race-rules";
import { createRaceStartupGate } from "@/lib/race-startup";
import { createPendingRaceSaves } from "@/lib/race-completion";
import { createPendingNativeBestCommands } from "@/lib/race-best-command";
import { legacyRaceSpawns } from "@/lib/race-spawn";
import { raceTrim } from "@/lib/race-physics";
import { KNOT_METRES_PER_SECOND } from "@/lib/sailing-kinematics";
import type { PhysicalFleetFrame, PhysicalFleetStep } from "@/lib/race-physical-fleet";
import type { RaceSoundscape } from "@/lib/race-soundscape-audio";
import { planPhysicalRaceGuidance } from "@/lib/race-guidance-physical";
import { finishHoldStore } from "./race-finish-hold";
import { makeCourse, type Boat } from "./race-model";
import type { RaceLoopInput } from "./useRaceLoop";

// Contract (M5 step 7, ADR-0015 points 10, 11 and 15): every record the solo
// race loop writes keys on the race's context. With the emission flag as
// shipped (false), a finished metric race (`?race=`) writes no row of any
// kind: no best time, ghost, medal, race home row, funnel event or native
// history, and a legacy race writes the rows it always wrote under the legacy
// class. With the flag switched on (switch A, mocked here, never in
// production code), the same metric finish writes its best time under
// `ctx:physical-cruiser-v1:short:r1:...`, its ghost under the metric class,
// the race home row, the native snapshot and PB command with the metric
// context, and no medal (a metric class has no thresholds before step 10),
// while every row stays readable by the frozen build 74 parsers.
const flag = vi.hoisted(() => ({ on: false }));
const effects = vi.hoisted(() => ({ cleanups: [] as (void | (() => void))[] }));
vi.mock("@/lib/race-context", async original => {
  const real = await original<typeof import("@/lib/race-context")>();
  return { ...real, get PHYSICAL_RACE_EMISSION_ENABLED() { return flag.on; },
    raceRecordsEnabled: (context: import("@/lib/race-context").RaceContext) => context.model === "legacy-race-v1" || flag.on };
});
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: (fn: () => void | (() => void)) => { effects.cleanups.push(fn()); } }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/sounds", () => ({ playTack: vi.fn(), playMarkRound: vi.fn(), playFinish: vi.fn(), playNoGo: vi.fn(), readRaceSound: () => true }));
vi.mock("@/lib/race-haptics", () => ({ raceHaptic: vi.fn() }));
vi.mock("@/lib/funnel", () => ({ trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn(), trackRaceCountdown: vi.fn() }));
vi.mock("@/lib/race-resume", () => ({ clearRaceSetup: vi.fn() }));
import { useRaceLoop } from "./useRaceLoop";
import { trackRaceEnd } from "@/lib/funnel";
import { BEST_TIMES_STORAGE_KEY } from "@/lib/best-times";
import { GHOST_STORAGE_KEY, readGhostStore } from "@/lib/race-ghost";
import { RACE_MEDALS_STORAGE_KEY } from "@/lib/race-medals";
import { RACE_HOME_STORAGE_KEY } from "@/lib/race-next-step";
import { physicalRaceContext } from "@/lib/race-context";
import { isGhostStoreText74, isRaceHomeStoreText74, raceComparisonKey74 } from "@/lib/race-m5-compat.parsers74";
import { validateNativeRace } from "@/lib/race-native";

let frame: ((now: number) => void) | null = null;
let mem: Map<string, string>;
let posted: { type: string; race?: Record<string, unknown> }[];
beforeEach(() => {
  effects.cleanups = []; frame = null; mem = new Map(); posted = []; flag.on = false;
  vi.mocked(trackRaceEnd).mockClear();
  vi.stubGlobal("document", { hidden: false, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("performance", { now: () => 0 });
  vi.stubGlobal("requestAnimationFrame", (callback: (now: number) => void) => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("window", { localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } } });
});
afterEach(() => { for (const cleanup of effects.cleanups) cleanup?.(); vi.unstubAllGlobals(); finishHoldStore.set(null); flag.on = false; });

const ref = <T,>(current: T) => ({ current });
const native = () => {
  const win = window as unknown as Record<string, unknown>;
  win.__REGATTA_RACE_NATIVE__ = true;
  win.ReactNativeWebView = { postMessage: (message: string) => { posted.push(JSON.parse(message)); } };
};

/** One race that ends on its first frames: a legacy finish (the player crosses
 * the line) or a metric one (a scripted fleet finishes the player on tick 30). */
function race(kind: "legacy" | "metric") {
  const metric = kind === "metric";
  const course = makeCourse(metric ? "short" : null);
  let boats: Boat[];
  if (metric) {
    boats = [
      { id: "player", name: "You", color: "#fff", pos: { x: 400, y: 950 }, heading: 90, speed: 2, isPlayer: true, lapDone: 0, speedMul: 1, started: true },
      { id: "ai0", name: "ai0", color: "#888", pos: { x: 422, y: 950 }, heading: 90, speed: 0, isPlayer: false, lapDone: 0, speedMul: 1, started: true },
    ];
  } else {
    boats = legacyRaceSpawns(course, 1).map((spawn, i) => ({ id: i ? `ai${i - 1}` : "player", name: i ? "AI" : "You", color: "#888",
      pos: { ...spawn.pos }, heading: i ? spawn.heading : 180, speed: i ? 0 : 5, isPlayer: i === 0, lapDone: 0, speedMul: 1, started: true }));
    const a = course.finishLine.a, b = course.finishLine.b;
    boats[0].lapDone = 1; boats[0].pos = { x: (a.x + b.x) / 2, y: a.y - 4 };
  }
  let tick = 0;
  const unitsPerKnotSecond = KNOT_METRES_PER_SECOND / 0.6;
  const fleet = { planPhysicalRaceGuidance, stepPhysicalRaceFleet: (f: PhysicalFleetFrame): PhysicalFleetStep => {
    tick += 1;
    const next = f.entries.map(({ boat }) => {
      const b = { ...boat, pos: { ...boat.pos } };
      const r = b.heading * Math.PI / 180;
      b.pos.x += Math.sin(r) * b.speed * unitsPerKnotSecond * f.dt; b.pos.y -= Math.cos(r) * b.speed * unitsPerKnotSecond * f.dt;
      const finished = b.isPlayer && b.lapDone < 2 && tick === 30;
      if (finished) { b.lapDone = 2; b.finishTime = f.raceTime; b.roundPhase = 2; }
      return { boat: b, finished };
    });
    return { boats: next.map(n => n.boat), navigation: new Map(), motions: new Map(), contacts: [], initialContacts: [], impacts: [],
      progress: next.map(({ boat: b, finished }) => ({ boatId: b.id, stage: b.lapDone === 2 ? "complete" as const : "round-east" as const, event: finished ? "finish" as const : null })) };
  } };
  const gate = createRaceStartupGate(); gate.reset("race-1"); gate.rendered("race-1");
  const set = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn()) }) as unknown as RaceLoopInput["set"];
  // The race log starts at the gun, as GameClient writes it at the countdown's end.
  const start = { t: 0, x: boats[0].pos.x, y: boats[0].pos.y, heading: boats[0].heading, twa: 90, speed: 0, lap: 0 };
  const pendingNativeBests = createPendingNativeBestCommands();
  const refs = {
    boatsRef: ref(boats), courseRef: ref(course), physicalRef: ref(metric ? "short" : null), physicalNavRef: ref(undefined), fleetRef: ref(metric ? fleet : null),
    keysRef: ref(new Set<string>()), rudderRef: ref(0), autopilotOnRef: ref(false), autopilotHeadingRef: ref(0),
    racePrefsRef: ref({ mode: "simple", guidance: false, trimHints: false, rules: false, penalties: false, windDisplay: "compass", miniMap: false }),
    trimRef: ref(raceTrim({ mainHoisted: true })), windDirRef: ref(0), windGustRef: ref(1), windStrengthRef: ref(1), raceClockRef: ref(20), hudRefreshRef: ref(0),
    ruleStateRef: ref(createRaceRulesState()), ruleEventsRef: ref([]), startedAtRef: ref(0), copyRef: ref({ ruleMessage: () => "" }),
    ghostTrackRef: ref(null), ghostBoatsRef: ref([]), markTimesRef: ref(new Map()), logSamplesRef: ref([start]),
    logEventsRef: ref([{ type: "start", t: 0 }]), lastSampleTimeRef: ref(0), wasInNoGoRef: ref(false),
    lastTackSignRef: ref(0), speedLogRef: ref([]), turnRef: ref(null), standingsKeyRef: ref(""), shownRankRef: ref(0), pendingRankRef: ref(null),
    raceIdRef: ref("race-1"), pendingNativeSaves: ref(createPendingRaceSaves()), pendingNativeBests: ref(pendingNativeBests),
    guidanceStateRef: ref(null), rafRef: ref(null), simulationClockRef: ref(null), startupGate: ref(gate), pausedRef: ref(false), langRef: ref("en"),
    raceSetupRef: ref({ source: "hub", briefingShown: true, race: metric ? "trial" : "free" }), raceTallyRef: ref({ missedMarkNotices: 0, contacts: 0 }), raceHintsRef: ref(false),
  } as unknown as RaceLoopInput["refs"];
  const soundscape = { update: vi.fn(), winch: vi.fn(), thud: vi.fn(), setLive: vi.fn(), silence: vi.fn(), dispose: vi.fn() } satisfies RaceSoundscape;
  const requestNativeBest = vi.fn();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useRaceLoop({ gameState: "racing", difficulty: "easy", windStrength: "medium", selectedMission: null, lang: "en", tp: (_ru, en) => en, paused: false, sceneReady: true,
    showEvent: vi.fn(), showNotice: vi.fn(), showContact: vi.fn(), requestNativeBest, soundscape, refs, set });
  for (let i = 1, now = 100; frame && i <= 12; i++, now += 100) { const step = frame; frame = null; step(now); }
  return { set, player: (refs.boatsRef.current as Boat[]).find(b => b.isPlayer)!, requestNativeBest, pendingNativeBests };
}

const metricGhostKey = "physical-cruiser-v1:short:r1|simple|easy|medium|-";
const metricBestKey = "ctx:physical-cruiser-v1:short:r1:simple:easy:medium";

describe("records of a finished race with the emission flag as shipped (false)", () => {
  it("writes no row of any kind for a finished metric race", () => {
    const { set, player } = race("metric");
    expect(player.finishTime).toBeGreaterThan(20);
    expect([...mem.keys()]).toEqual([]);
    expect(vi.mocked(set.setMedalAward!)).toHaveBeenCalledWith(null);
    expect(vi.mocked(set.setGhostSplits!)).toHaveBeenCalledWith([]);
    expect(trackRaceEnd).not.toHaveBeenCalled();
  });

  it("posts nothing to the app for a finished metric race", () => {
    native();
    const { requestNativeBest } = race("metric");
    expect(posted).toEqual([]);
    expect(requestNativeBest).not.toHaveBeenCalled();
  });

  it("writes a legacy finish exactly where build 74 wrote it", () => {
    const { player } = race("legacy");
    expect(player.finishTime).toBeLessThan(30);
    expect(Object.keys(JSON.parse(mem.get(BEST_TIMES_STORAGE_KEY)!))).toEqual(["easy-medium"]);
    expect(Object.keys(JSON.parse(mem.get(GHOST_STORAGE_KEY)!))).toEqual(["legacy-race-v1:standard:r1|simple|easy|medium|-"]);
    expect(Object.keys(JSON.parse(mem.get(RACE_MEDALS_STORAGE_KEY)!))).toEqual(["legacy-race-v1:standard:r1|easy|medium"]);
    expect(mem.has(RACE_HOME_STORAGE_KEY)).toBe(true);
    expect(trackRaceEnd).toHaveBeenCalledTimes(1);
  });

  it("posts a legacy native snapshot without a context, as build 74 did", () => {
    native();
    race("legacy");
    const saved = posted.find(m => m.type === "race-finished")!;
    expect(saved).toBeDefined();
    expect(saved.race).not.toHaveProperty("raceContext");
  });
});

describe("records of a finished metric race with switch A on (mocked)", () => {
  beforeEach(() => { flag.on = true; });

  it("keys the best time, the ghost and the home row on the metric class, and awards no medal", () => {
    const { set } = race("metric");
    expect(Object.keys(JSON.parse(mem.get(BEST_TIMES_STORAGE_KEY)!))).toEqual([metricBestKey]);
    expect(raceComparisonKey74({ difficulty: "easy", windStrength: "medium", mode: "simple", raceContext: physicalRaceContext("short") })).toBe(metricBestKey);
    const ghostRow = mem.get(GHOST_STORAGE_KEY)!;
    expect(Object.keys(JSON.parse(ghostRow))).toEqual([metricGhostKey]);
    expect(readGhostStore({ getItem: () => ghostRow })[metricGhostKey].samples.at(-1)!.lap).toBe(2);
    expect(isGhostStoreText74(ghostRow)).toBe(true);
    // No metric thresholds yet (step 10): no medal, and the medal row is untouched.
    expect(mem.has(RACE_MEDALS_STORAGE_KEY)).toBe(false);
    expect(vi.mocked(set.setMedalAward!)).toHaveBeenCalledWith(null);
    expect(isRaceHomeStoreText74(mem.get(RACE_HOME_STORAGE_KEY)!)).toBe(true);
    expect(trackRaceEnd).toHaveBeenCalledTimes(1);
  });

  it("posts the native snapshot and the PB command with the metric context", () => {
    native();
    const { requestNativeBest, pendingNativeBests } = race("metric");
    const saved = posted.find(m => m.type === "race-finished")!;
    expect(saved?.race?.raceContext).toEqual(physicalRaceContext("short"));
    expect(validateNativeRace(saved.race)).not.toBeNull();
    expect(requestNativeBest).toHaveBeenCalledWith("race-1");
    expect(pendingNativeBests.request("race-1")?.comparison.raceContext).toEqual(physicalRaceContext("short"));
  });
});
