import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRaceRulesState, type RaceRuleEvent } from "@/lib/race-rules";
import { createRaceStartupGate } from "@/lib/race-startup";
import { createPendingRaceSaves } from "@/lib/race-completion";
import { createPendingNativeBestCommands } from "@/lib/race-best-command";
import { raceTrim, type RaceBoat } from "@/lib/race-physics";
import { raceScale } from "@/lib/race-scale";
import { KNOT_METRES_PER_SECOND } from "@/lib/sailing-kinematics";
import type { PhysicalFleetFrame, PhysicalFleetStep } from "@/lib/race-physical-fleet";
import type { PhysicalRaceImpact } from "@/lib/race-physical-response";
import { planPhysicalRaceGuidance } from "@/lib/race-guidance-physical";
import { physicalRaceContext } from "@/lib/race-context";
import { physicalRaceGates } from "@/lib/race-physical-progress";
import type { RaceGuidance } from "@/lib/race-guidance";
import type { RaceSoundscape } from "@/lib/race-soundscape-audio";
import { finishHoldStore } from "./race-finish-hold";
import { makeCourse, type Boat } from "./race-model";
import type { RaceLoopInput } from "./useRaceLoop";

// Contract (M5 step 2, ADR-0015): the solo race loop gives the metric race
// (?race=short) the same scale model as its judge: the HUD shows the speed
// over the path really covered at real speed, the judge looks ahead in real
// seconds, and a hull impact of the player raises the contact cue (red frame,
// thud, haptic, diagnostics tally) exactly once per contact episode, however
// long the hulls rest or push against each other.
//
// The physical fleet is replaced by a scripted one (moves each boat in a
// straight line at real speed unless held, and reports the impacts the
// script asks for), so each wiring is tested on its own; the fleet itself is
// tested in src/lib/race-physical-*.test.ts.
const effects = vi.hoisted(() => ({ cleanups: [] as (void | (() => void))[], haptic: vi.fn() }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: (fn: () => void | (() => void)) => { effects.cleanups.push(fn()); } }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/sounds", () => ({ playTack: vi.fn(), playMarkRound: vi.fn(), playFinish: vi.fn(), playNoGo: vi.fn(), readRaceSound: () => true }));
vi.mock("@/lib/race-haptics", () => ({ raceHaptic: effects.haptic }));
vi.mock("@/lib/funnel", () => ({ trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn() }));
vi.mock("@/lib/race-resume", () => ({ clearRaceSetup: vi.fn() }));
// M5 step 5: spies over the real legacy resolver and the metric fleet resolver.
vi.mock("@/lib/race-completion", async original => {
  const real = await original<typeof import("@/lib/race-completion")>();
  return { ...real, resolveFinishedFleet: vi.fn(real.resolveFinishedFleet) };
});
vi.mock("@/lib/race-physical-completion", async original => {
  const real = await original<typeof import("@/lib/race-physical-completion")>();
  return { ...real, createPhysicalFleetResolver: vi.fn(real.createPhysicalFleetResolver) };
});
import { useRaceLoop } from "./useRaceLoop";
import { resolveFinishedFleet } from "@/lib/race-completion";
import { createPhysicalFleetResolver } from "@/lib/race-physical-completion";
import type { RaceResultRow } from "./race-model";
import { MISSED_MARK_NOTICE, STUCK_NOTICE } from "./race-copy";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";

let frame: ((now: number) => void) | null = null;
beforeEach(() => {
  effects.cleanups = []; effects.haptic.mockReset(); frame = null;
  vi.stubGlobal("document", { hidden: false, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("performance", { now: () => 0 });
  vi.stubGlobal("requestAnimationFrame", (callback: (now: number) => void) => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => { for (const cleanup of effects.cleanups) cleanup?.(); vi.unstubAllGlobals(); finishHoldStore.set(null); });

const ref = <T,>(current: T) => ({ current });
const M = 0.6;
const unitsPerKnotSecond = KNOT_METRES_PER_SECOND / M;
const hit = (boatId: string, otherBoatId: string, closingMetresPerSecond: number): PhysicalRaceImpact => ({ kind: "hull", boatId, otherBoatId,
  closingMetresPerSecond, firstHitFraction: 0, boat: { centreMetres: { x: 0, y: 0 }, velocityMetresPerSecond: { x: 0, y: 0 } },
  otherBoat: { centreMetres: { x: 0, y: 0 }, velocityMetresPerSecond: { x: 0, y: 0 } } });

interface Script {
  /** Boats other than the player, as [id, x, y, heading, speed]. */
  others?: [string, number, number, number, number][];
  player?: { x: number; y: number; heading: number; speed: number };
  /** Boats that the scripted fleet holds in place this tick (the rest move straight at real speed). */
  held?: (tick: number) => readonly string[];
  /** Where the scripted fleet puts a boat this tick, instead of moving it (windDir: the frame's wind). */
  place?: (tick: number, boat: RaceBoat, windDir: number) => void;
  impacts?: (tick: number) => PhysicalRaceImpact[];
  /** The scripted fleet finishes this boat on this tick (M5 step 5). */
  finish?: (tick: number, boat: RaceBoat) => boolean;
  frames?: number;
  rules?: boolean;
  /** Penalty seconds already on the boats at the start (M5 step 5: a penalised player). */
  penalties?: Record<string, number>;
  /** Rule penalties on (default: as `rules`). */
  penaltiesOn?: boolean;
  /** Race clock at the first frame, seconds after the gun (default 20). */
  clock?: number;
}

function sail({ others = [["ai0", 422, 950, 90, 0]], player = { x: 400, y: 950, heading: 90, speed: 2 }, held = () => ["player", "ai0", "ai1"],
  place, impacts = () => [], finish = () => false, frames = 30, rules = false, penalties = {}, penaltiesOn = rules, clock = 20 }: Script = {}) {
  const course = makeCourse("short");
  const boats: Boat[] = [
    { id: "player", name: "You", color: "#fff", pos: { x: player.x, y: player.y }, heading: player.heading, speed: player.speed, isPlayer: true, lapDone: 0, speedMul: 1, started: true },
    ...others.map(([id, x, y, heading, speed]) => ({ id, name: id, color: "#888", pos: { x, y }, heading, speed, isPlayer: false, lapDone: 0, speedMul: 1, started: true })),
  ];
  let tick = 0;
  const frames_: PhysicalFleetFrame[] = [];
  // The real metric route hint planner travels with the fleet module (M5 step 6).
  const fleet = { planPhysicalRaceGuidance, stepPhysicalRaceFleet: (f: PhysicalFleetFrame): PhysicalFleetStep => {
    tick += 1; frames_.push(f);
    const hold = held(tick);
    const next = f.entries.map(({ boat }) => {
      const b = { ...boat, pos: { ...boat.pos } };
      if (!hold.includes(b.id)) {
        const r = b.heading * Math.PI / 180;
        b.pos.x += Math.sin(r) * b.speed * unitsPerKnotSecond * f.dt; b.pos.y -= Math.cos(r) * b.speed * unitsPerKnotSecond * f.dt;
      }
      place?.(tick, b, f.windDir);
      const finished = b.lapDone < 2 && finish(tick, b);
      if (finished) { b.lapDone = 2; b.finishTime = f.raceTime; b.roundPhase = 2; }
      return { boat: b, finished };
    });
    return { boats: next.map(n => n.boat), navigation: new Map(), motions: new Map(), contacts: [], initialContacts: [], impacts: impacts(tick),
      progress: next.map(({ boat: b, finished }) => ({ boatId: b.id, stage: b.lapDone === 2 ? "complete" as const : "round-east" as const, event: finished ? "finish" as const : null })) };
  } };
  const gate = createRaceStartupGate(); gate.reset("race-1"); gate.rendered("race-1");
  const set = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn()) }) as unknown as RaceLoopInput["set"];
  const tally = { missedMarkNotices: 0, contacts: 0 };
  const ruleEvents: RaceRuleEvent[] = [];
  const logEvents: { type: string }[] = [];
  const refs = {
    boatsRef: ref(boats), courseRef: ref(course), physicalRef: ref("short"), physicalNavRef: ref(undefined), fleetRef: ref(fleet), keysRef: ref(new Set<string>()),
    rudderRef: ref(0), autopilotOnRef: ref(false), autopilotHeadingRef: ref(0),
    racePrefsRef: ref({ mode: "simple", guidance: false, trimHints: false, rules, penalties: penaltiesOn, windDisplay: "compass", miniMap: false }),
    trimRef: ref(raceTrim({ mainHoisted: true })), windDirRef: ref(0), windGustRef: ref(1), windStrengthRef: ref(1), raceClockRef: ref(clock), hudRefreshRef: ref(0),
    ruleStateRef: ref({ ...createRaceRulesState(), penalties: { ...penalties } }), ruleEventsRef: ref(ruleEvents), startedAtRef: ref(0), copyRef: ref({ ruleMessage: () => "" }),
    ghostTrackRef: ref(null), ghostBoatsRef: ref([]), markTimesRef: ref(new Map()), logSamplesRef: ref([]),
    logEventsRef: ref(logEvents), lastSampleTimeRef: ref(0), wasInNoGoRef: ref(false),
    lastTackSignRef: ref(0), speedLogRef: ref([]), turnRef: ref(null), standingsKeyRef: ref(""), shownRankRef: ref(0), pendingRankRef: ref(null),
    raceIdRef: ref("race-1"), pendingNativeSaves: ref(createPendingRaceSaves()), pendingNativeBests: ref(createPendingNativeBestCommands()),
    guidanceStateRef: ref(null), rafRef: ref(null), simulationClockRef: ref(null), startupGate: ref(gate), pausedRef: ref(false), langRef: ref("en"),
    raceSetupRef: ref({ source: "hub", briefingShown: true, race: "trial" }), raceTallyRef: ref(tally),
  } as unknown as RaceLoopInput["refs"];
  const soundscape = { update: vi.fn(), winch: vi.fn(), thud: vi.fn(), setLive: vi.fn(), silence: vi.fn(), dispose: vi.fn() } satisfies RaceSoundscape;
  const showContact = vi.fn(), showNotice = vi.fn();
  const input: RaceLoopInput = { gameState: "racing", difficulty: "easy", windStrength: "medium", selectedMission: null, lang: "en", tp: (_ru, en) => en, paused: false, sceneReady: true,
    showEvent: vi.fn(), showNotice, showContact, requestNativeBest: vi.fn(), soundscape, refs, set };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useRaceLoop(input);
  // 100 ms frames: three 30 Hz ticks each.
  let now = 100, driven = 0;
  const drive = (n: number) => { for (let i = 1; frame && i <= n; i++, now += 100) { const step = frame; frame = null; step(now); driven += 1; } return driven; };
  drive(frames);
  const speeds = (set.setPlayerSpeed as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([v]) => v as number);
  return { showContact, showNotice, soundscape, tally, ruleEvents, logEvents, speeds, ticks: () => tick, fleetFrames: frames_,
    set, refs, drive, pendingFrame: () => frame !== null,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    rerender: (gameState: RaceLoopInput["gameState"]) => useRaceLoop({ ...input, gameState }) };
}

describe("the metric race's contact cue", () => {
  it("fires once for a 3 s resting contact, however many ticks the hulls push", () => {
    const { showContact, soundscape, tally, ticks } = sail({ impacts: () => [hit("player", "ai0", 0.3)], frames: 30 });
    expect(ticks()).toBeGreaterThanOrEqual(89);
    expect(showContact).toHaveBeenCalledTimes(1);
    expect(soundscape.thud).toHaveBeenCalledTimes(1);
    expect(effects.haptic.mock.calls).toEqual([["contact"]]);
    expect(tally.contacts).toBe(1);
  });

  it("stays one contact while the hulls rest alongside without new impacts", () => {
    // One impact, then 3 s at the touching distance (22 units, 13.2 m).
    const { showContact, tally } = sail({ impacts: t => t === 1 ? [hit("ai0", "player", 0.6)] : [], frames: 30 });
    expect(showContact).toHaveBeenCalledTimes(1);
    expect(tally.contacts).toBe(1);
  });

  it("stays one contact when a hull pushing alongside reports an impact only now and then", () => {
    // 6 s alongside at the touching distance, an impact every 2 s (beyond the 1.5 s cue cooldown).
    const { showContact, tally } = sail({ impacts: t => t % 60 === 1 ? [hit("player", "ai0", 0.3)] : [], frames: 60 });
    expect(showContact).toHaveBeenCalledTimes(1);
    expect(tally.contacts).toBe(1);
  });

  it("fires again for a new contact after the hulls part", () => {
    // Impacts for 0.5 s, apart (40 units) for 2 s, then a second impact.
    const touching = (t: number) => t <= 15 || t > 75;
    const { showContact, tally } = sail({ frames: 30, impacts: t => touching(t) ? [hit("player", "ai0", 0.4)] : [],
      place: (t, b) => { if (b.id === "ai0") b.pos.x = touching(t) ? 422 : 440; } });
    expect(showContact).toHaveBeenCalledTimes(2);
    expect(tally.contacts).toBe(2);
  });

  it("ignores a touch below 0.1 m/s and impacts between two other boats", () => {
    const slow = sail({ impacts: () => [hit("player", "ai0", 0.05)], frames: 10 });
    expect(slow.showContact).not.toHaveBeenCalled();
    const others = sail({ others: [["ai0", 422, 950, 90, 0], ["ai1", 444, 950, 90, 0]], player: { x: 300, y: 950, heading: 90, speed: 2 },
      impacts: () => [hit("ai0", "ai1", 1)], frames: 10 });
    expect(others.showContact).not.toHaveBeenCalled();
    expect(others.tally.contacts).toBe(0);
  });

  it("passes the impacts to the judge, so a resting hull hit is one rule contact", () => {
    // Player on port tack (heading 90, wind from the north) hits a starboard
    // boat. Both are stopped and 22.5 units apart, beyond the judge's own
    // touching tolerance (hull + 0.1 = 22.1), so only the reported impact can
    // make the contact: without it the judge sees none.
    const contactsWith = (impacts: Script["impacts"]) => sail({ rules: true, player: { x: 400, y: 950, heading: 90, speed: 0 },
      others: [["ai0", 422.5, 950, 270, 0]], impacts, frames: 30 }).ruleEvents.filter(e => e.kind === "contact");
    expect(contactsWith(() => [hit("player", "ai0", 0.5)])).toEqual([expect.objectContaining({ rule: "10", boatId: "player", otherBoatId: "ai0", penaltySeconds: 5 })]);
    expect(contactsWith(() => [])).toEqual([]);
  });
});

// M5 step 6: the metric race gets its own route hint planner (the legacy one
// refuses every metric course) and the missed-mark notice at its own scale.
describe("the metric race's route hint and missed-mark notice", () => {
  it("publishes the metric planner's route hint towards the credited round-east gate", () => {
    const { set } = sail({ others: [], player: { x: 400, y: 950, heading: 45, speed: 4 }, held: () => [], frames: 10 });
    const published = (set.setRouteGuidance as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([g]) => g as RaceGuidance | null);
    expect(published.length).toBeGreaterThan(3);
    const east = physicalRaceGates(physicalRaceContext("short"), makeCourse("short"))!.rounding[0];
    for (const g of published) {
      expect(g).not.toBeNull();
      expect(g).toMatchObject({ leg: "windward", beating: true, target: { x: (east.a.x + east.b.x) / 2, y: east.a.y } });
    }
  });

  it("tells a boat back across the line before the mark, armed at two metric hull lengths", () => {
    // Line at y 1050. Heading south at 8 kn from `above` units upwind of it.
    const notices = (above: number) => sail({ others: [], player: { x: 400, y: 1050 - above, heading: 180, speed: 8 }, held: () => [], frames: 120 })
      .showNotice.mock.calls.filter(([text, source]) => text === MISSED_MARK_NOTICE.en && source === "missed-mark");
    expect(notices(50)).toHaveLength(1);
    // 42 units: beyond the legacy 40, inside the metric 44 (2 x 13.2 m).
    expect(notices(42)).toEqual([]);
  });
});

// M5 step 6 review: the loop hands the metric start jostle (16 s, raceScale
// startJostleSeconds) to all four of its readers: the live rule notice, the
// contact cue, the judge debrief and the race.summary row. A contact 11 s
// after the gun is jostle in the metric race (the legacy 10 s would not be);
// the same contact at 17 s is not.
describe("the metric race's start jostle reaches every reader", () => {
  const judgeDebriefs = (set: RaceLoopInput["set"]) => (set.setJudgeDebrief as unknown as ReturnType<typeof vi.fn>).mock.calls
    .map(([d]) => d as { items: { jostle?: true }[] });
  const debriefRows = () => vi.mocked(recordWebDiagnostic).mock.calls.map(([row]) => row)
    .filter((row): row is Extract<typeof row, { type: "race.summary"; action: "debrief" }> => row.type === "race.summary" && row.action === "debrief");
  beforeEach(() => vi.mocked(recordWebDiagnostic).mockClear());
  // Player on port tack (heading 90) and a starboard boat, both stopped hull
  // to hull, an impact on the first tick; penalties off, so every rule event
  // is penalty-free. Everybody finishes on tick 30 (1 s later).
  const contactAt = (clock: number) => sail({ rules: true, penaltiesOn: false, clock, player: { x: 400, y: 950, heading: 90, speed: 0 },
    others: [["ai0", 422.5, 950, 270, 0]], impacts: t => t === 1 ? [hit("player", "ai0", 0.5)] : [], frames: 10, finish: t => t === 30 });

  it("keeps a contact 11 s after the gun quiet and groups it as jostle in the debrief and the summary", async () => {
    const { showNotice, showContact, ruleEvents, set, tally } = contactAt(11);
    const contacts = ruleEvents.filter(e => e.boatId === "player" && e.kind === "contact");
    expect(contacts).toEqual([expect.objectContaining({ penaltySeconds: 0 })]);
    expect(contacts[0].time).toBeGreaterThan(10);
    expect(contacts[0].time).toBeLessThan(raceScale("short").startJostleSeconds);
    expect(showNotice.mock.calls.filter(([, source]) => source === "rule")).toEqual([]);
    expect(showContact).not.toHaveBeenCalled();
    expect(tally.contacts).toBe(0);
    await vi.waitFor(() => expect(judgeDebriefs(set)).toHaveLength(1));
    const items = judgeDebriefs(set)[0].items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every(item => item.jostle)).toBe(true);
    await vi.waitFor(() => expect(debriefRows()).toHaveLength(1));
    expect(debriefRows()[0]).toMatchObject({ judgeIncidents: 0 });
    expect(debriefRows()[0].startJostleEvents).toBeGreaterThanOrEqual(1);
  });

  it("tells, cues and lists the same contact 17 s after the gun", async () => {
    const { showNotice, showContact, set } = contactAt(17);
    expect(showNotice.mock.calls.filter(([, source]) => source === "rule").length).toBeGreaterThan(0);
    expect(showContact).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(judgeDebriefs(set)).toHaveLength(1));
    expect(judgeDebriefs(set)[0].items.some(item => !item.jostle)).toBe(true);
    await vi.waitFor(() => expect(debriefRows()).toHaveLength(1));
    expect(debriefRows()[0]).toMatchObject({ startJostleEvents: 0 });
    expect(debriefRows()[0].judgeIncidents).toBeGreaterThan(0);
  });
});

describe("the metric race's edge pin reads the metric water bounds", () => {
  // A gybe swing (TWA 140 to -140) of a boat held at the south bound with way
  // on, heading into it (south-ish); the heading follows the live wind.
  const gybes = (y: number) => sail({ others: [], player: { x: 700, y, heading: 180, speed: 4 }, frames: 20,
    place: (t, b, windDir) => { if (b.isPlayer) b.heading = (windDir + (t <= 30 ? 140 : 220) + 360) % 360; } })
    .logEvents.filter(e => e.type === "gybe" || e.type === "tack");

  it("does not count a swing at the metric water bound, where the fleet is holding the boat", () => {
    expect(gybes(raceScale("short").water.maxY)).toEqual([]);
  });

  it("counts the same swing 2 units beyond the legacy 20-unit clamp, which is open water in the metric race", () => {
    // Legacy maxY is 1180, metric maxY 1185.67 (course margin 8.6 m): 1182 is
    // pinned only under the legacy bounds.
    expect(raceScale("short").water.maxY).toBeGreaterThan(1183);
    expect(gybes(1182)).toEqual([expect.objectContaining({ type: "gybe" })]);
  });
});

describe("the metric race's HUD speed and judge read the metric scale", () => {
  it("shows the model speed for a boat sailing free at real speed", () => {
    const { speeds } = sail({ others: [], player: { x: 700, y: 400, heading: 180, speed: 5 }, held: () => [], frames: 20 });
    expect(speeds.length).toBeGreaterThan(5);
    expect(speeds.at(-1)).toBeCloseTo(5, 6);
  });

  it("shows under 0.3 kn within 1 s for a boat held at the water bound with 4.5 kn of model speed", () => {
    const maxY = raceScale("short").water.maxY;
    const { speeds } = sail({ others: [], player: { x: 700, y: maxY, heading: 180, speed: 4.5 }, held: () => ["player"], frames: 10 });
    expect(speeds.at(-1)).toBeLessThan(0.3);
  });

  it("looks ahead in real seconds: quiet for a crossing 60 m of track away, a give-way warning at 35 m", () => {
    // Headings 60 and 300: clear of the no-go zone however the live wind (soloRaceWind) swings.
    const crossing = (trackM: number) => {
      const east = trackM * Math.sin(Math.PI / 3) / M, south = trackM * Math.cos(Math.PI / 3) / M;
      return { player: { x: 400 - east, y: 950 + south, heading: 60, speed: 5 },
        others: [["ai0", 400 + east, 950 + south, 300, 5]] as [string, number, number, number, number][] };
    };
    const far = sail({ rules: true, held: () => [], frames: 1, ...crossing(30) });
    expect(far.ruleEvents).toEqual([]);
    const near = sail({ rules: true, held: () => [], frames: 1, ...crossing(17.5) });
    expect(near.ruleEvents).toContainEqual(expect.objectContaining({ kind: "give-way", rule: "10", boatId: "player", otherBoatId: "ai0" }));
  });
});

// M5 step 4 (ADR-0015 point 7): a player pinned against a hull who covers
// under 1 m in 6 s is told to bear away, once in 30 s; nothing pushes it free.
describe("the metric race's stuck watchdog", () => {
  const stuckNotices = (notice: ReturnType<typeof vi.fn>) => notice.mock.calls.filter(([text]) => text === STUCK_NOTICE.en);
  const stuckRows = () => vi.mocked(recordWebDiagnostic).mock.calls.filter(([row]) => row.type === "race.lifecycle" && row.action === "stuck");
  beforeEach(() => vi.mocked(recordWebDiagnostic).mockClear());

  it("tells a player held against a hull to bear away once in 7 s, as a rule notice with info tone", () => {
    // Held 22 units (13.2 m) from ai0: hull to hull, no path covered.
    const { showNotice } = sail({ frames: 70 });
    expect(stuckNotices(showNotice)).toEqual([[STUCK_NOTICE.en, "rule", "info"]]);
    expect(stuckRows()).toHaveLength(1);
  });

  it("says nothing to a player sailing free, or held in open water away from every hull", () => {
    const free = sail({ frames: 70, held: () => ["ai0"], player: { x: 400, y: 950, heading: 0, speed: 4 }, others: [["ai0", 200, 950, 0, 0]] });
    expect(stuckNotices(free.showNotice)).toEqual([]);
    const open = sail({ frames: 70, others: [["ai0", 200, 950, 0, 0]] });
    expect(stuckNotices(open.showNotice)).toEqual([]);
    expect(stuckRows()).toEqual([]);
  });
});

// M5 step 5 (ADR-0015 point 8): after the player's finish the metric fleet is
// sailed home by the fleet resolver, a deadline-bounded slice per animation
// frame, never by the legacy resolveFinishedFleet in the finish tick. The
// results appear at the finish with the bots "still racing", and their rows
// follow when the resolver is done. performance.now stands still in this
// harness, so each frame runs the resolver's tick cap (600 ticks).
describe("the metric race's fleet after the player's finish", () => {
  const results = (set: RaceLoopInput["set"]) => (set.setResults as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([rows]) => rows as RaceResultRow[]);
  // The player finishes on tick 30 (frame 10); the scripted ai0 1000 ticks later, ai1 never.
  const race = () => sail({ others: [["ai0", 422, 950, 90, 0], ["ai1", 444, 950, 90, 0]], frames: 10,
    finish: (t, b) => b.isPlayer ? t === 30 : b.id === "ai0" && t === 1030 });
  beforeEach(() => { vi.mocked(resolveFinishedFleet).mockClear(); vi.mocked(createPhysicalFleetResolver).mockClear(); });

  it("calls the fleet resolver, not resolveFinishedFleet, and shows the results before the resolution ends", () => {
    const { set, drive, pendingFrame } = race();
    expect(resolveFinishedFleet).not.toHaveBeenCalled();
    expect(createPhysicalFleetResolver).toHaveBeenCalledTimes(1);
    const handed = vi.mocked(createPhysicalFleetResolver).mock.calls[0][0];
    expect(handed.time).toBeCloseTo(21, 9);
    expect(handed).toMatchObject({ rulesEnabled: false, penaltiesEnabled: false, windStrengthMul: 1 });
    // The finish tick: the player first, both bots still racing; the plate counts them.
    const [first] = results(set);
    expect(first.map(r => [r.name, r.pending ?? false])).toEqual([["You", false], ["ai0", true], ["ai1", true]]);
    expect(first[0].time).toBeCloseTo(21, 9);
    expect(finishHoldStore.get()).toMatchObject({ raceId: "race-1", place: 1, total: 3, stillRacing: 2 });
    expect(pendingFrame()).toBe(true);
    // One more frame: 600 ticks, ai0 still on its way, nothing new to show.
    drive(1);
    expect(results(set)).toHaveLength(1);
    // The next frame finishes ai0 (one row update), the rest runs to the 720 s limit.
    drive(1);
    expect(results(set).at(-1)!.map(r => [r.name, r.pending ?? false])).toEqual([["You", false], ["ai0", false], ["ai1", true]]);
    expect(finishHoldStore.get()).toMatchObject({ stillRacing: 1 });
    drive(100);
    expect(pendingFrame()).toBe(false);
    const last = results(set).at(-1)!;
    expect(last.map(r => r.name)).toEqual(["You", "ai0", "ai1"]);
    expect(last[1].time).toBeCloseTo(21 + 1000 / 30, 6);
    expect(last[2].time).toBe(Infinity);
    expect(last.some(r => r.pending || r.estimated)).toBe(false);
    // The player's raw time was fixed at the finish tick.
    expect(last[0].time).toBe(first[0].time);
    expect(finishHoldStore.get()).toMatchObject({ stillRacing: 0 });
  });

  it("gives the bots still racing an estimate when the player leaves to the menu, and stops", () => {
    const { set, drive, rerender, pendingFrame } = race();
    drive(1);
    rerender("menu");
    const last = results(set).at(-1)!;
    expect(last.filter(r => !r.isPlayer).every(r => r.estimated === true && !r.pending)).toBe(true);
    const calls = results(set).length;
    drive(50);
    expect(results(set)).toHaveLength(calls);
    expect(pendingFrame()).toBe(false);
  });

  it("leaks nothing into the next race: a new race id stops the resolution without a row", () => {
    const { set, refs, drive, rerender, pendingFrame } = race();
    const calls = results(set).length;
    refs.raceIdRef.current = "race-2";
    drive(5);
    expect(pendingFrame(), "the resolution stopped on its next frame").toBe(false);
    // The new race's countdown (its own loop starts) leaves no row of the old fleet.
    rerender("countdown");
    expect(results(set)).toHaveLength(calls);
  });

  it("leaks nothing into the next race on Again: the new race id and the countdown in one click, before any frame", () => {
    // initRace moves the race id and the countdown's effect leaves the old
    // resolution in the same click, so only the race id guard keeps the old
    // fleet's estimated rows out of the new race's empty table.
    const { set, refs, rerender } = race();
    const calls = results(set).length;
    const coached = vi.mocked(set.setCoaching).mock.calls.length;
    refs.raceIdRef.current = "race-2";
    rerender("countdown");
    expect(results(set)).toHaveLength(calls);
    expect(vi.mocked(set.setCoaching).mock.calls).toHaveLength(coached);
  });

  it("keeps resolving on the results screen and in the replay", () => {
    const { set, drive, rerender } = race();
    rerender("finished");
    drive(1);
    rerender("replay");
    drive(100);
    expect(results(set).at(-1)!.some(r => r.pending || r.estimated)).toBe(false);
    expect(results(set).at(-1)![1].time).toBeCloseTo(21 + 1000 / 30, 6);
  });
});

// M5 step 5 review: a bot still racing can beat a penalised player (its raw
// time is later, its adjusted time earlier). The player's place, its coaching,
// the coach request and the race.summary row then wait for the settled rows;
// an unpenalised player's place is final at the finish and coached at once.
describe("the metric race's place of a penalised player", () => {
  // Package 7 (R-11): the loop offers the settled race log to the AI coach's
  // button (setAiCoachPayload) and never POSTs it by itself.
  const coachBodies = (set: RaceLoopInput["set"]) => vi.mocked(set.setAiCoachPayload!).mock.calls.map(([payload]) => payload as { position: number; totalBoats: number })
    .filter(Boolean);
  const summaries = () => vi.mocked(recordWebDiagnostic).mock.calls.map(([row]) => row)
    .filter((row): row is Extract<typeof row, { type: "race.summary"; action: "result" }> => row.type === "race.summary" && row.action === "result");
  let fetch: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.mocked(recordWebDiagnostic).mockClear();
    fetch = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetch);
  });
  // The player finishes on tick 30 (21 s); ai0 300 ticks later (31 s raw), ai1 never (DNF at 720 s).
  const race = (penalties: Record<string, number>) => sail({ others: [["ai0", 422, 950, 90, 0], ["ai1", 444, 950, 90, 0]], frames: 10, penalties,
    finish: (t, b) => b.isPlayer ? t === 30 : b.id === "ai0" && t === 330 });

  it("waits with a 30 s penalty, then coaches, offers the AI coach the log and journals the resolved 2nd place", () => {
    const { set, drive, pendingFrame } = race({ player: 30 });
    // The finish tick: rows say 1st, but ai0 can still finish inside the penalty window.
    expect(finishHoldStore.get()).toMatchObject({ place: 1 });
    expect(set.setCoaching).not.toHaveBeenCalled();
    expect(set.setCoachingLoading).toHaveBeenLastCalledWith(true);
    expect(fetch).not.toHaveBeenCalled();
    expect(summaries()).toEqual([]);
    drive(100);
    expect(pendingFrame()).toBe(false);
    expect(set.setCoaching).toHaveBeenCalledTimes(1);
    expect(coachBodies(set)).toEqual([expect.objectContaining({ position: 2, totalBoats: 3 })]);
    expect(fetch).not.toHaveBeenCalled();
    expect(summaries()).toEqual([expect.objectContaining({ place: 2, total: 3, botsFinished: 1, penaltySeconds: 30 })]);
  });

  it("coaches an unpenalised player at once: the bots still racing cannot pass", () => {
    const { set, drive } = race({});
    expect(set.setCoaching).toHaveBeenCalledTimes(1);
    expect(coachBodies(set)).toEqual([expect.objectContaining({ position: 1, totalBoats: 3 })]);
    // The race.summary row waits for the resolved fleet (botsFinished), with the same place.
    expect(summaries()).toEqual([]);
    drive(100);
    expect(set.setCoaching).toHaveBeenCalledTimes(1);
    expect(coachBodies(set)).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(summaries()).toEqual([expect.objectContaining({ place: 1, botsFinished: 1 })]);
  });

  it("journals the estimated place but asks no coach when the player leaves first, and stops the loading", () => {
    const { set, rerender } = race({ player: 30 });
    rerender("menu");
    expect(fetch).not.toHaveBeenCalled();
    expect(set.setCoachingLoading).toHaveBeenLastCalledWith(false);
    expect(summaries()).toHaveLength(1);
  });
});
