// M5 full-race gate (ADR-0015 "Verification", M0-13 report section 8).
//
// Contract: in the metric solo race every boat that is steered (the bots and
// a player who helms or uses course assist) finishes before the course limit,
// and no racing boat stands still (ground speed under 0.06 m/s) for more than
// 30 s, with the live race's own fleet, wind, countdown and rules.
//
// The fleet is set up as GameClient.initRace does it (the fair metric echelon
// of physicalFleetSpawns, everybody on its heading 45, speedMul from
// raceBotSpeedMul with a seeded spread instead of Math.random).
// Wind is soloRaceWind (the live loop's wind, src/app/game/useRaceLoop.ts),
// not windAt; a 3 s countdown with racing false; dt 1/30; one
// stepPhysicalRaceFleet per tick carrying the bot navigation; the race rules
// are evaluated each tick as the live loop does (metric scale and the
// fleet's impacts, M5 step 2).
//
// The player's input is the bot planner's heading (a player who sails the
// route and never yields), turned into the shared helm law:
//   helm   - physicalBotRudder through physicalTrialSteering;
//   assist - course assist on the planned heading;
//   idle   - rudder 0 (the idle player is an obstacle; only the bots are
//            required to finish and keep moving).
// Simple mode trims automatically; Pro holds the starting trim (raceStartTrim).
//
// Matrix: short and medium x easy/medium/hard x wind x0.65/1/1.3 x five input
// modes = 90 cells. Long runs only with RACE_GATE_LONG=1 (2400 s per race).
// Seeds: Simple modes spread the bots with seed 1, Pro modes with seed 7.
//
// Current measurement (M5 step 4 after review, the worktree on 2026-11-01):
// all 90 short and medium cells pass, all 45 long cells with RACE_GATE_LONG=1
// and the 4 escape cells, so KNOWN_GAPS is empty. Longest standstill of a
// steered boat in any matrix cell: 0.1 s; slowest bot finish: short 442.3 s,
// medium 811.6 s, long 1489.7 s (all wind x0.65), inside the M5 limits
// 720 / 1500 / 2400 s (five bots alone, soloRaceWind x0.65: short 410.3 s,
// medium 813.4 s, race-physical-fleet.test.ts). What closed the
// 25 short/medium and 14 long misses of step 3: the bots' irons and pin escape,
// the coasting prediction and the cone around the player, the shared crew and
// the fair echelon start (race-physical-bot.ts, race-physical-fleet.ts,
// race-courses.ts, ADR-0015 point 5).
// Step 3 (sliding contact): 25 of 90 short/medium and 14 of 45 long cells
// missed, 24 of the 25 short/medium misses a bot head to wind and pressed by
// a hull. Before step 3 (HEAD 5df78d4a): 30 of 90 and 16 of 45 missed, 27 of
// the 30 a player who sails the route without yielding and never finishes.
// The M5 design prototype counted 38 of 90 on another matrix; this file is
// the reference now. RACE_GATE_TRACE=1 prints each cell with the trace of its
// longest standstill (share of ticks pressed by a closing hull, mean |TWA|).
// The plain matrix never puts a bot in irons or against a hull that never
// moves, so it passes with the escape switched off too. The escape cells at
// the end build those starts (a player who drops sails beside a bot) and go
// red without the escape; race-physical-bot.test.ts and the "bot escape on
// the shared fleet path" tests of race-physical-fleet.test.ts pin the
// escape itself.
// A KNOWN GAP cell (none at present) is a plain it,
// not it.fails: it must still run the whole race without a rejected frame or
// a timeout, and its gate miss must include the recorded reason. A crash, a
// rejected frame, a hang or a gap that closed (no miss left, then the name
// must leave KNOWN_GAPS) all turn the cell red.
// M5 step 5: at the player's finish tick the cell also hands the fleet to the
// fleet resolver (race-physical-completion.ts), as the live game does, and
// every bot must be ranked by it ("unranked") at exactly the time the
// continued race gives it ("resolver-time"); 72 of the 90 cells hand over.
// Every steered boat that finishes must also pass every gate in order
// (start, round-east, round-north, mark, finish) and take longer than two
// legs at 8 kn, so a mark credited by a slide or a shortcut cannot count.
// M5 step 6: 12 hint cells (short and medium x three winds x Simple/Pro
// course assist, three bots) sail the player by the route hint
// (race-guidance-physical.ts) with the same verdict and the hint's tack
// limit and no rule event or penalty second for the player (no mark touch,
// no wrong rounding, no contact it answers for); measured 2026-11-02: 2
// tacks on every beat (3 on long), the player clean in all 18 cells with
// RACE_GATE_LONG=1, every boat finishes in gate order, about 18 s more for the file. Runtime about 100 s
// for the 90 cells on an idle M-series Mac (80 s before the resolver check); RACE_GATE_LONG=1 adds the 45 long
// cells, about 100 s more (each long cell 1-3.5 s).
import { describe, expect, it } from "vitest";
import { physicalRaceContext, type PhysicalRaceProfile } from "./race-context";
import { makePhysicalRaceCourse, physicalCourseDefinition, physicalFleetSpawns } from "./race-courses";
import { stepPhysicalRaceFleet } from "./race-physical-fleet";
import { physicalBotRudder, planPhysicalBot, type PhysicalBotState } from "./race-physical-bot";
import type { PhysicalRaceInput } from "./race-physical-motion";
import { physicalTrialSteering } from "./race-trial";
import { createRaceRulesState, evaluateRaceRules } from "./race-rules";
import { raceScale } from "./race-scale";
import { raceBotSpeedMul } from "./race-spawn";
import { distance, type RaceBoat, type Vec2 } from "./race-physics";
import { soloRaceWind } from "@/app/game/race-model";
import { raceStartTrim } from "@/app/game/race-start-trim";
import { PHYSICAL_RACE_BOAT } from "./race-physical-motion";
import { DIFFICULTY_CONFIG, type Difficulty } from "@/data/race-difficulty";
import { createPhysicalFleetResolver, physicalRaceTimeUp } from "./race-physical-completion";
import { sortRaceResults } from "@/app/game/race-model";
import { planPhysicalRaceGuidance, type PhysicalRaceGuidanceState } from "./race-guidance-physical";
import { classifyManoeuvre, createManoeuvreState } from "./race-manoeuvres";

/** A racing boat slower than this over the ground counts as standing still, m/s. */
const STANDSTILL_SPEED_MPS = 0.06;
/** Longest allowed standstill of a racing boat, seconds. */
const STANDSTILL_LIMIT_SECONDS = 30;
const DT = 1 / 30;
const COUNTDOWN_TICKS = 3 * 30;

type Mode = "simple-helm" | "simple-assist" | "simple-idle" | "pro-helm" | "pro-assist";
const MODES: readonly Mode[] = ["simple-helm", "simple-assist", "simple-idle", "pro-helm", "pro-assist"];
const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];
const WINDS = [0.65, 1, 1.3] as const;

/** Deterministic spread for the bots' speedMul (an LCG, never Math.random). */
function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

/** One way a cell misses the gate, as "<boat id>:<reason>". */
type GateFailure = `${string}:${"no-finish" | "standstill" | "too-fast" | "gate-order" | "unranked" | "resolver-time"}`;
const ORDERED_EVENTS = ["start", "round-east", "round-north", "mark", "finish"];
/** What held a boat during its longest standstill, so step 4 can tell an
 * irons stall from a contact pin: the share of those ticks with a closing hull
 * impact on the boat (ADR-0004 loss applied) and its mean |true wind angle|. */
interface StillTrace { pressedShare: number; meanTwaDeg: number }
interface BoatOutcome {
  id: string; steered: boolean; finishTime: number | null; longestStillSec: number; events: string[]; still: StillTrace;
}
interface GateRun {
  boats: BoatOutcome[]; limitSec: number; endSec: number; minFinishSec: number;
  /** Tick at which stepPhysicalRaceFleet returned null; null when every frame was accepted. */
  rejectedAtTick: number | null;
  /** The player's tacks between its start and its round-east gate (classifyManoeuvre). */
  playerTacksOnBeat: number;
  /** M5 step 6 review: the player's rule events with a penalty or at a mark, and its penalty seconds. */
  playerRuleEvents: string[]; playerPenaltySeconds: number;
  /** M5 step 5: the fleet resolver started at the player's finish tick (as
   * the live game does), per bot: its resolved finish (null: DNF), or
   * undefined when the player did not finish or finished last. */
  resolved?: ReadonlyMap<string, number | null>;
}

type GateBoat = RaceBoat & { speedMul: number; isPlayer: boolean };

/** A start the plain matrix never builds, for the escape cells below. */
interface GateSetup {
  /** The player drops both sails at the gun and never moves (a hull that never yields). */
  readonly stoppedPlayer?: boolean;
  /** Changes the spawned fleet before the countdown (positions in race units). */
  readonly arrange?: (boats: GateBoat[], windDir: number, metresPerUnit: number) => void;
  /** M5 step 6: the player follows the route hint (planPhysicalRaceGuidance,
   * planned at 10 Hz) by course assist, its heading set every 0.5 s, instead
   * of the bot planner. */
  readonly hint?: boolean;
}

function runGate(profile: PhysicalRaceProfile, difficulty: Difficulty, windStrengthMul: number, mode: Mode, setup: GateSetup = {}): GateRun {
  const cfg = DIFFICULTY_CONFIG[difficulty], context = physicalRaceContext(profile), course = makePhysicalRaceCourse(profile);
  const definition = physicalCourseDefinition(profile), limitSec = definition.maxRaceSeconds;
  const minFinishSec = definition.legMetres * 2 / (8 * .514444);
  const spread = seeded(mode.startsWith("pro") ? 7 : 1);
  const spawns = physicalFleetSpawns(1 + cfg.opponents);
  let boats: GateBoat[] = spawns.map(({ pos, heading }, i) => ({
    id: i === 0 ? "player" : `ai${i - 1}`, name: i === 0 ? "player" : `ai${i - 1}`, color: "#fff", pos: { ...pos },
    heading, speed: 0, lapDone: 0, isPlayer: i === 0,
    speedMul: i === 0 ? 1 : raceBotSpeedMul(cfg.aiSpeedMul, spread),
  }));
  setup.arrange?.(boats, soloRaceWind(0).dir, context.metresPerUnit);
  const pro = mode.startsWith("pro");
  // The metric race starts Pro sheets on its own boat, as GameClient does (ADR-0021).
  const startingTrim = pro ? raceStartTrim(windStrengthMul, boats[0].heading, PHYSICAL_RACE_BOAT) : undefined;
  const playerPlan: PhysicalBotState = { version: 1, profile, tick: 0, lap: 0 };
  let navigation: ReadonlyMap<string, PhysicalBotState> | undefined;
  let rules = createRaceRulesState();
  const playerRuleEvents: string[] = [];
  const still = new Map(boats.map(b => [b.id, 0]));
  const longest = new Map(boats.map(b => [b.id, 0]));
  // Per boat: the current standstill run's counters and the longest run's trace.
  const run = new Map(boats.map(b => [b.id, { pressed: 0, twa: 0, ticks: 0 }]));
  const trace = new Map(boats.map(b => [b.id, { pressedShare: 0, meanTwaDeg: 0 } as StillTrace]));
  const events = new Map(boats.map(b => [b.id, [] as string[]]));
  let rejectedAtTick: number | null = null;
  const steered = (b: GateBoat) => !b.isPlayer || mode !== "simple-idle";
  let raceClock = 0;
  let hintState: PhysicalRaceGuidanceState | null = null, hintHeading = boats[0].heading, playerTacks = 0;
  let manoeuvres = createManoeuvreState();
  let handOver: { boats: GateBoat[]; navigation: ReadonlyMap<string, PhysicalBotState> | undefined; rules: typeof rules; time: number } | null = null;
  for (let tick = 1; ; tick++) {
    const racing = tick > COUNTDOWN_TICKS;
    if (racing) raceClock += DT;
    const wind = soloRaceWind(raceClock);
    const player = boats[0];
    playerPlan.tick += 1;
    if (setup.hint && tick % 3 === 0) {
      const advice = planPhysicalRaceGuidance(player, course, context, wind.dir, hintState);
      hintState = advice.state;
      if (advice.guidance && tick % 15 === 0) hintHeading = advice.guidance.suggestedHeading;
    }
    const planned = setup.hint ? hintHeading : player.lapDone < 2 ? planPhysicalBot(player, course, wind.dir, context, playerPlan).heading : player.heading;
    const steering = mode.endsWith("assist") ? physicalTrialSteering(0, true, planned)
      : physicalTrialSteering(mode.endsWith("idle") ? 0 : physicalBotRudder(player.heading, planned), false, planned);
    const playerInput: PhysicalRaceInput = setup.stoppedPlayer
      ? { steering: physicalTrialSteering(0, false, planned), autoTrim: false, trim: { mainHoisted: false, jibFurl: 1 } }
      : pro ? { steering, autoTrim: false, trim: startingTrim } : { steering, autoTrim: true };
    const previous: Record<string, Vec2> = Object.fromEntries(boats.map(b => [b.id, { ...b.pos }]));
    const stepped = stepPhysicalRaceFleet({ context, course, dt: DT, raceTime: raceClock, racing, windDir: wind.dir, gust: wind.gust,
      windStrengthMul, navigation, entries: boats.map(boat => ({ boat, speedMul: boat.speedMul, input: boat.isPlayer ? playerInput : "bot" as const })) });
    // A rejected frame is its own verdict, never a gate miss (a known gap must not hide it).
    if (!stepped) { rejectedAtTick = tick; break; }
    for (const p of stepped.progress) if (p.event) events.get(p.boatId)!.push(p.event);
    boats = stepped.boats as GateBoat[]; navigation = stepped.navigation;
    const turned = classifyManoeuvre(manoeuvres, { twa: ((boats[0].heading - wind.dir) % 360 + 540) % 360 - 180, speedKn: boats[0].speed, pinned: false });
    manoeuvres = turned.state;
    if (turned.manoeuvre === "tack" && events.get("player")!.join() === "start") playerTacks++;    const judged = evaluateRaceRules(rules, { boats, course, windDir: wind.dir, time: raceClock, racing, previousPositions: previous,
      scale: raceScale(profile), impacts: stepped.impacts });
    rules = judged.state;
    for (const e of judged.events) if (e.boatId === "player" && (e.penaltySeconds > 0 || e.kind === "mark-touch" || e.kind === "wrong-rounding"))
      playerRuleEvents.push(`${e.kind}${e.otherBoatId ? `:${e.otherBoatId}` : ""}@${e.time.toFixed(1)}`);
    if (racing && !handOver && boats[0].lapDone >= 2) handOver = structuredClone({ boats, navigation, rules, time: raceClock });
    if (racing) for (const b of boats) {
      if (b.lapDone >= 2) continue;
      const groundMps = distance(previous[b.id], b.pos) * context.metresPerUnit / DT;
      const stillFor = groundMps < STANDSTILL_SPEED_MPS ? still.get(b.id)! + DT : 0;
      const counters = run.get(b.id)!;
      if (stillFor === 0) { counters.pressed = 0; counters.twa = 0; counters.ticks = 0; }
      else {
        counters.ticks += 1;
        if (stepped.impacts.some(hit => hit.kind === "hull" && hit.closingMetresPerSecond > 0
          && (hit.boatId === b.id || hit.otherBoatId === b.id))) counters.pressed += 1;
        counters.twa += Math.abs(((b.heading - wind.dir) % 360 + 540) % 360 - 180);
      }
      if (stillFor > longest.get(b.id)!) trace.set(b.id, { pressedShare: counters.pressed / counters.ticks, meanTwaDeg: counters.twa / counters.ticks });
      still.set(b.id, stillFor); longest.set(b.id, Math.max(longest.get(b.id)!, stillFor));
    }
    // The live loop's own limit tick (physicalRaceTimeUp), shared with the fleet resolver.
    if (boats.filter(steered).every(b => b.lapDone >= 2) || physicalRaceTimeUp(raceClock, limitSec)) break;
  }
  // M5 step 5: what the live game shows once the player has finished: the
  // fleet resolver sails the rest home from the finish tick (no deadline here).
  let resolved: Map<string, number | null> | undefined;
  if (handOver && handOver.boats.some(b => !b.isPlayer && b.lapDone < 2)) {
    const resolver = createPhysicalFleetResolver({ boats: handOver.boats, navigation: handOver.navigation, course, context,
      time: handOver.time, windStrengthMul, rules: handOver.rules, rulesEnabled: true, penaltiesEnabled: true, step: stepPhysicalRaceFleet });
    let result = resolver.advance({ maxTicks: 0 });
    while (!result.done) result = resolver.advance({ maxTicks: 100_000 });
    const rows = sortRaceResults(result.boats, result.rules.penalties);
    resolved = new Map(result.boats.filter(b => !b.isPlayer).map(b => [b.id,
      result.failed || !Number.isFinite(rows.find(r => r.name === b.name)!.time) ? null : b.finishTime!]));
  }
  return { limitSec, minFinishSec, endSec: raceClock, rejectedAtTick, resolved, playerTacksOnBeat: playerTacks,
    playerRuleEvents, playerPenaltySeconds: rules.penalties.player ?? 0, boats: boats.map(b => ({ id: b.id, steered: steered(b),
    finishTime: b.lapDone >= 2 && b.finishTime !== undefined ? b.finishTime : null, longestStillSec: longest.get(b.id)!,
    events: events.get(b.id)!, still: trace.get(b.id)! })) };
}

const cellName = (profile: PhysicalRaceProfile, difficulty: Difficulty, wind: number, mode: Mode) => `${profile} ${difficulty} x${wind} ${mode}`;

/** Cells that miss the gate, each with the miss recorded at the last
 * measurement. Empty since M5 step 4 (2026-11-01): a new miss is a red cell,
 * never an entry here unless a later step records why with its numbers. A
 * listed cell whose miss is gone turns red ("no miss left"). */
const KNOWN_GAPS = new Map<string, GateFailure>([]);

/** Every way the run misses the gate; empty when the cell passes. */
function gateFailures(run: GateRun): GateFailure[] {
  const failures: GateFailure[] = [];
  for (const b of run.boats) if (b.steered) {
    if (b.finishTime === null || b.finishTime >= run.limitSec) failures.push(`${b.id}:no-finish`);
    else {
      if (b.finishTime <= run.minFinishSec) failures.push(`${b.id}:too-fast`);
      if (b.events.join() !== ORDERED_EVENTS.join()) failures.push(`${b.id}:gate-order`);
    }
    if (b.longestStillSec > STANDSTILL_LIMIT_SECONDS) failures.push(`${b.id}:standstill`);
    // M5 step 5: every bot is ranked by the resolver, at the live race's own time.
    if (run.resolved?.has(b.id)) {
      const time = run.resolved.get(b.id)!;
      if (time === null) failures.push(`${b.id}:unranked`);
      else if (time !== b.finishTime) failures.push(`${b.id}:resolver-time`);
    }
  }
  return failures;
}

function describeRun(run: GateRun): string {
  return run.boats.map(b => `${b.id} finish=${b.finishTime?.toFixed(1) ?? "none"} still=${b.longestStillSec.toFixed(1)}s`
    + (b.longestStillSec > 0 ? ` (pressed ${(b.still.pressedShare * 100).toFixed(0)}%, |TWA| ${b.still.meanTwaDeg.toFixed(0)})` : "")
    + ` events=${b.events.join(">")}`).join("; ");
}

const profiles: PhysicalRaceProfile[] = process.env.RACE_GATE_LONG === "1" ? ["short", "medium", "long"] : ["short", "medium"];
/** Matrix cells in which the fleet resolver ranked bots after the player's finish. */
let resolvedCells = 0;
describe("metric solo race full-race gate (ADR-0015)", () => {
  for (const profile of profiles) for (const difficulty of DIFFICULTIES) for (const wind of WINDS) for (const mode of MODES) {
    const name = cellName(profile, difficulty, wind, mode);
    const recorded = KNOWN_GAPS.get(name);
    it(recorded ? `KNOWN GAP (M5 contact/bots): ${name}` : name, async () => {
      // Yield between CPU-bound races so the worker can report (as race-physical-fleet.test.ts does).
      await new Promise<void>(done => setImmediate(done));
      const run = runGate(profile, difficulty, wind, mode);
      if (run.resolved?.size) resolvedCells += 1;
      // Never hidden by a known gap: every frame of the race must be accepted.
      expect(run.rejectedAtTick, "a valid metric fleet frame was rejected at this tick").toBeNull();
      const failures = gateFailures(run);
      // RACE_GATE_TRACE=1 prints every cell's outcome, standstill trace included.
      if (process.env.RACE_GATE_TRACE === "1") console.log(`GATE ${name} | ${failures.join(",") || "pass"} | ${describeRun(run)}`);
      if (!recorded) expect(failures, describeRun(run)).toEqual([]);
      else {
        expect(failures.length, `no miss left: the gap closed, remove "${name}" from KNOWN_GAPS`).toBeGreaterThan(0);
        expect(failures, `the recorded miss ${recorded} is gone: ${describeRun(run)}`).toContain(recorded);
      }
    }, 60_000);
  }

  // Escape cells (ADR-0015 point 5): starts the plain matrix never builds, a
  // bot stopped beside a player who drops both sails at the gun and never
  // moves (the player is not steered, so only the bots are judged). Same full
  // race, rules and verdict as above. Measured 2026-11-01, longest standstill
  // of the pinned bot with the escape / with it off (afterSeconds 1e6) / with
  // the step 4 escape before review, which tacked through the wind whenever
  // away from the hull lay on the other tack:
  //   head to wind, player close astern       12.2 s / 82.7 s / 131.3 s
  //   TWA 20, player bow-on to the north-east  9.1 s / 31.9 s /  40.6 s
  //   TWA 10, player to leeward               14.3 s / 22.5 s /  28.0 s
  //   TWA 45, player to leeward               14.5 s / 24.8 s /  24.8 s
  // The first two go red without the escape and with the earlier one; the
  // last two guard the leeward choice (bear away, never a slow tack through
  // the wind). Over 35 such geometries (TWA 0/10/20/30/45, player at 0-315
  // deg every 45 deg) the worst is 19.2 s with the escape, 82.7 s without it
  // and 131.3 s with the earlier escape.
  const TOUCH_METRES = 13.3;
  /** The bot ai0 at TWA `twa` with the stopped player at `bearing` from it, touching. */
  const pinnedBy = (twa: number, bearing: number): GateSetup => ({ stoppedPlayer: true, arrange: (boats, windDir, m) => {
    const player = boats[0].pos, a = bearing * Math.PI / 180, r = TOUCH_METRES / m;
    boats[1].pos = { x: player.x - Math.sin(a) * r, y: player.y + Math.cos(a) * r };
    boats[1].heading = (windDir + twa) % 360; boats[1].speed = 0;
  } });
  const ESCAPE_CELLS: readonly { name: string; setup: GateSetup }[] = [
    { name: "a bot head to wind with a stopped player close astern", setup: pinnedBy(0, 180) },
    { name: "a bot at TWA 20 pinned bow-on by a stopped player", setup: pinnedBy(20, 45) },
    { name: "a bot at TWA 10 pinned to leeward by a stopped player", setup: pinnedBy(10, 90) },
    { name: "a bot at TWA 45 pinned to leeward by a stopped player", setup: pinnedBy(45, 90) },
  ];
  for (const cell of ESCAPE_CELLS) {
    it(`escape cell: short x1 ${cell.name}`, async () => {
      await new Promise<void>(done => setImmediate(done));
      const run = runGate("short", "easy", 1, "simple-idle", cell.setup);
      expect(run.rejectedAtTick, "a valid metric fleet frame was rejected at this tick").toBeNull();
      if (process.env.RACE_GATE_TRACE === "1") console.log(`ESCAPE ${cell.name} | ${describeRun(run)}`);
      expect(gateFailures(run), describeRun(run)).toEqual([]);
    }, 60_000);
  }

  // M5 step 6: the player sails the route hint among the bots (course assist,
  // heading every 0.5 s). Same full race, rules and verdict as the matrix,
  // plus the hint's tack limit on the beat (2 / 3 / 4 on short / medium /
  // long). Medium difficulty (three bots), Simple and Pro; long with RACE_GATE_LONG=1.
  const HINT_TACKS: Record<PhysicalRaceProfile, number> = { short: 2, medium: 3, long: 4 };
  for (const profile of profiles) for (const wind of WINDS) for (const mode of ["simple-assist", "pro-assist"] as const) {
    it(`hint cell: ${cellName(profile, "medium", wind, mode)} sailing the route hint`, async () => {
      await new Promise<void>(done => setImmediate(done));
      const run = runGate(profile, "medium", wind, mode, { hint: true });
      expect(run.rejectedAtTick, "a valid metric fleet frame was rejected at this tick").toBeNull();
      if (process.env.RACE_GATE_TRACE === "1") console.log(`HINT ${profile} x${wind} ${mode} | tacks ${run.playerTacksOnBeat} | rules ${run.playerRuleEvents.join(",") || "clean"} | ${describeRun(run)}`);
      expect(gateFailures(run), describeRun(run)).toEqual([]);
      expect(run.playerTacksOnBeat, describeRun(run)).toBeLessThanOrEqual(HINT_TACKS[profile]);
      // Following the hint costs no penalty: no mark touch, no wrong rounding, no contact the player answers for.
      expect(run.playerRuleEvents, describeRun(run)).toEqual([]);
      expect(run.playerPenaltySeconds, describeRun(run)).toBe(0);
    }, 60_000);
  }

  it("ranks bots by the fleet resolver in the cells where the player finishes first or mid-fleet", () => {
    // Measured 2026-11-01: 72 of the 90 short and medium cells (every cell
    // whose player helms or uses course assist; an idle player never finishes)
    // hand bots to the resolver, so the ranking check above is not vacuous.
    expect(resolvedCells).toBeGreaterThanOrEqual(profiles.length * 30);
  });

  it("names only real cells in the known-gap list", () => {
    const all = new Set<string>();
    for (const profile of ["short", "medium", "long"] as const) for (const difficulty of DIFFICULTIES) for (const wind of WINDS) for (const mode of MODES) all.add(cellName(profile, difficulty, wind, mode));
    for (const name of KNOWN_GAPS.keys()) expect(all.has(name), name).toBe(true);
  });
});
