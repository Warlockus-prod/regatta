// M5 step 5 (ADR-0015 point 8): the metric fleet sails to its finish after the player.
//
// Contract: after the player finishes, the player's raw time never changes,
// every bot finishes by the same 30 Hz physics as the live race (fleet step,
// soloRaceWind, judge) or is DNF at the course limit, places are
// penalty-adjusted, the result is identical however the work is sliced, and
// no advance() spends more than its deadline.
//
// The live-loop harness below steps the race as src/app/game/useRaceLoop.ts
// does for the metric race (racing clock += dt, wind soloRaceWind(clock), one
// stepPhysicalRaceFleet, then the judge with the metric scale and the
// fleet's impacts) and keeps going after the player's finish. The resolver
// started at the player's finish tick must give the bots exactly the finish
// times and penalties of that continued live race.
import { describe, expect, it } from "vitest";
import { physicalRaceContext, type PhysicalRaceProfile } from "./race-context";
import { makePhysicalRaceCourse, physicalCourseDefinition, physicalFleetSpawns } from "./race-courses";
import { stepPhysicalRaceFleet } from "./race-physical-fleet";
import { physicalBotRudder, planPhysicalBot, type PhysicalBotState } from "./race-physical-bot";
import { physicalTrialSteering } from "./race-trial";
import { createRaceRulesState, evaluateRaceRules, type RaceRulesState } from "./race-rules";
import { raceScale } from "./race-scale";
import { soloRaceWind } from "./race-solo-wind";
import type { RaceBoat, Vec2 } from "./race-physics";
import { createPhysicalFleetResolver, physicalRaceTimeUp, RESOLVER_MAX_TICKS_PER_ADVANCE, type PhysicalFleetResolverInput } from "./race-physical-completion";
import { sortRaceResults, type Boat } from "@/app/game/race-model";

const DT = 1 / 30;
type HarnessBoat = Boat;
interface Snapshot { boats: HarnessBoat[]; navigation: ReadonlyMap<string, PhysicalBotState> | undefined; rules: RaceRulesState; time: number }
interface LiveRace { atPlayerFinish: Snapshot | null; end: Snapshot; windStrengthMul: number }

/** The live metric race (useRaceLoop.ts), player steered by the bot planner
 * with the helm, run on after the player's finish until every bot finished or
 * the next tick would pass the course limit (the resolver's own stop). */
function liveRace(profile: PhysicalRaceProfile, botSpeedMuls: readonly number[], windStrengthMul = 1,
  wind: (t: number) => { dir: number; gust: number } = soloRaceWind): LiveRace {
  const context = physicalRaceContext(profile), course = makePhysicalRaceCourse(profile);
  const limit = physicalCourseDefinition(profile).maxRaceSeconds;
  const spawns = physicalFleetSpawns(1 + botSpeedMuls.length);
  let boats: HarnessBoat[] = spawns.map(({ pos, heading }, i) => ({ id: i === 0 ? "player" : `ai${i - 1}`, name: i === 0 ? "You" : `Bot ${i}`,
    color: "#fff", pos: { ...pos }, heading, speed: 0, lapDone: 0, isPlayer: i === 0, speedMul: i === 0 ? 1 : botSpeedMuls[i - 1] }));
  const plan: PhysicalBotState = { version: 1, profile, tick: 0, lap: 0 };
  let navigation: ReadonlyMap<string, PhysicalBotState> | undefined, rules = createRaceRulesState(), clock = 0;
  let atPlayerFinish: Snapshot | null = null;
  for (let tick = 1; ; tick++) {
    const racing = tick > 90;
    if (racing && (physicalRaceTimeUp(clock, limit) || boats.every(b => b.lapDone === 2))) break;
    if (racing) clock += DT;
    const w = wind(clock), player = boats[0];
    plan.tick += 1;
    const planned = player.lapDone < 2 ? planPhysicalBot(player, course, w.dir, context, plan).heading : player.heading;
    const steering = physicalTrialSteering(physicalBotRudder(player.heading, planned), false, planned);
    const previous: Record<string, Vec2> = Object.fromEntries(boats.map(b => [b.id, { ...b.pos }]));
    const stepped = stepPhysicalRaceFleet({ context, course, dt: DT, raceTime: clock, racing, windDir: w.dir, gust: w.gust, windStrengthMul,
      navigation, entries: boats.map(boat => ({ boat, speedMul: boat.speedMul, input: boat.isPlayer ? { steering, autoTrim: true } : "bot" as const })) });
    if (!stepped) throw new Error(`fleet frame rejected at tick ${tick}`);
    boats = stepped.boats as HarnessBoat[]; navigation = stepped.navigation;
    rules = evaluateRaceRules(rules, { boats, course, windDir: w.dir, time: clock, racing, enabled: true, penalties: true,
      previousPositions: previous, scale: raceScale(profile), impacts: stepped.impacts }).state;
    if (racing && !atPlayerFinish && boats[0].lapDone === 2) atPlayerFinish = structuredClone({ boats, navigation, rules, time: clock });
  }
  return { atPlayerFinish, end: { boats, navigation, rules, time: clock }, windStrengthMul };
}

const resolverFor = (profile: PhysicalRaceProfile, race: LiveRace, at: Snapshot = race.atPlayerFinish!): PhysicalFleetResolverInput<HarnessBoat> => ({
  boats: at.boats, navigation: at.navigation, course: makePhysicalRaceCourse(profile), context: physicalRaceContext(profile),
  time: at.time, windStrengthMul: race.windStrengthMul, rules: at.rules, rulesEnabled: true, penaltiesEnabled: true, step: stepPhysicalRaceFleet });

/** Run a resolver to the end in slices of `slice` ticks. */
function resolveInSlices(input: PhysicalFleetResolverInput<HarnessBoat>, slice: number) {
  const resolver = createPhysicalFleetResolver(input);
  let result = resolver.advance({ maxTicks: 0 }), calls = 0, total = 0;
  while (!result.done) { result = resolver.advance({ maxTicks: slice }); calls += 1; total += result.ticks; }
  return { resolver, result, calls, total };
}
const finishes = (boats: readonly RaceBoat[]) => Object.fromEntries(boats.map(b => [b.id, b.finishTime ?? null]));

// The inputs, each raced once in full (about 2 s on an M-series Mac in all).
// Measured 2026-11-01: short x1, bots speedMul 1.03 and 1.02: player 174.4 s,
// the bots 193.1 s and 198.7 s (18.7 s and 24.3 s behind). Medium x0.65,
// bots 1.2 and 0.5: Bot 1 537.1 s, the player 567.4 s, Bot 2 1268.9 s
// (231 s inside the 1500 s limit). The same at x0.5: Bot 1 706.0 s, the
// player 739.6 s, Bot 2 does not finish (DNF at 1500 s).
// (speedMul is clamped to 0.5..1.2 by the boat step, so the DNF comes from the light wind.)
// Re-measured 2026-11-02 on the cruiser profile (ADR-0021), which is faster in
// light air: short x1, bots 1.05 and 1.1: player 150.5 s, bots 166.8 s and
// 168.0 s (16.3 s and 17.5 s behind). Medium x0.65, bots 1.2 and 0.5: Bot 1
// 460.4 s, the player 468.3 s, Bot 2 841.8 s (the slow bot can no longer be
// put within 300 s of the 1500 s limit while a bot still beats the player:
// below x0.65 the player beats the 1.2 bot). Medium x0.33: the player 869.7 s,
// Bot 1 886.8 s, Bot 2 does not finish (DNF at 1500 s).
const shortWin = liveRace("short", [1.05, 1.1]);
const mediumMid = liveRace("medium", [1.2, 0.5], 0.65);
const mediumDnf = liveRace("medium", [1.2, 0.5], 0.33);

describe("the metric fleet resolver (ADR-0015 point 8)", () => {
  it("input 1: the player wins on short, two bots behind; the resolver gives them the live race's own times, sliced 1, 37 or 10000 ticks", () => {
    const at = shortWin.atPlayerFinish!;
    expect(at, "the player finishes").not.toBeNull();
    // Both bots are still racing at the player's finish and finish later in the live race.
    expect(at.boats.filter(b => !b.isPlayer).every(b => b.lapDone < 2)).toBe(true);
    const live = finishes(shortWin.end.boats);
    for (const slice of [1, 37, 10000]) {
      const { result } = resolveInSlices(resolverFor("short", shortWin), slice);
      expect(result.done && !result.failed).toBe(true);
      expect(finishes(result.boats), `slice ${slice}`).toEqual(live);
      expect(result.rules).toEqual(shortWin.end.rules);
      expect(result.boats).toEqual(shortWin.end.boats);
    }
    // The player's raw time is the finish tick's, never touched by the resolution.
    expect(live.player).toBe(at.boats[0].finishTime);
    const gaps = ["ai0", "ai1"].map(id => live[id]! - live.player!);
    expect(gaps.every(g => g > 15 && g < 30), `bot gaps ${gaps.map(g => g.toFixed(1))} s`).toBe(true);
  }, 60_000);

  it("input 2: the player mid-fleet on medium in light wind, one bot home long after the player, identical sliced 37 or 10000 ticks", () => {
    const at = mediumMid.atPlayerFinish!;
    expect(at).not.toBeNull();
    expect(at.boats.find(b => b.id === "ai0")!.lapDone, "a faster bot finished ahead").toBe(2);
    expect(at.boats.find(b => b.id === "ai1")!.lapDone, "the slow bot is still on its first leg").toBe(0);
    const limit = physicalCourseDefinition("medium").maxRaceSeconds;
    for (const slice of [37, 10000]) {
      const { result } = resolveInSlices(resolverFor("medium", mediumMid), slice);
      expect(result.done && !result.failed).toBe(true);
      expect(result.boats).toEqual(mediumMid.end.boats);
      expect(result.rules).toEqual(mediumMid.end.rules);
      const slow = result.boats.find(b => b.id === "ai1")!.finishTime!;
      // A long resolution: the slow bot finishes more than 300 s after the player.
      expect(slow).toBeGreaterThan(at.time + 300);
      expect(slow).toBeLessThan(limit);
      expect(sortRaceResults(result.boats, result.rules.penalties).map(r => r.name)).toEqual(["Bot 1", "You", "Bot 2"]);
    }
  }, 60_000);

  it("DNF exactly at the limit: a bot that cannot make it is unfinished when the last tick reaches 1500 s", () => {
    const limit = physicalCourseDefinition("medium").maxRaceSeconds;
    for (const slice of [37, 10000]) {
      const { result } = resolveInSlices(resolverFor("medium", mediumDnf), slice);
      expect(result.done && !result.failed).toBe(true);
      expect(result.boats).toEqual(mediumDnf.end.boats);
      expect(result.time).toBeCloseTo(limit, 6);
      expect(result.boats.find(b => b.id === "ai1")!.finishTime).toBeUndefined();
      const rows = sortRaceResults(result.boats, result.rules.penalties);
      expect(rows.map(r => [r.name, r.time === Infinity])).toEqual([["You", false], ["Bot 1", false], ["Bot 2", true]]);
    }
  }, 60_000);

  it("one limit tick for the live loop and the resolver on every course: the clock's tick round(limit / dt), summed as the loop sums it", () => {
    // The live loop ends on the tick where physicalRaceTimeUp turns true; the
    // resolver takes no tick once it is true. A bare time > limit would run
    // the live race one tick longer on medium (1500 s) and long (2400 s).
    for (const profile of ["short", "medium", "long"] as const) {
      const limit = physicalCourseDefinition(profile).maxRaceSeconds;
      let clock = 0, tick = 0;
      while (!physicalRaceTimeUp(clock, limit)) { clock += DT; tick += 1; }
      expect(tick, profile).toBe(Math.round(limit / DT));
      expect(Math.abs(clock - limit), profile).toBeLessThan(1e-6);
    }
  });

  it("input 3: the player last, nothing to resolve: done at once, no tick, nothing pending", () => {
    const course = makePhysicalRaceCourse("short"), context = physicalRaceContext("short");
    const done = (id: string, t: number): HarnessBoat => ({ id, name: id, color: "#fff", pos: { x: 400, y: 1040 }, heading: 0, speed: 3,
      lapDone: 2, finishTime: t, started: true, roundPhase: 2, isPlayer: id === "player", speedMul: 1 });
    const boats = [done("ai0", 200), done("ai1", 210), done("player", 230)];
    let stepped = 0;
    const resolver = createPhysicalFleetResolver({ boats, course, context, time: 230, windStrengthMul: 1, rules: createRaceRulesState(),
      rulesEnabled: true, penaltiesEnabled: true, step: frame => { stepped += 1; return stepPhysicalRaceFleet(frame); } });
    const result = resolver.advance({ maxTicks: 10000 });
    expect(result).toMatchObject({ done: true, failed: false, ticks: 0, time: 230 });
    expect(stepped).toBe(0);
    expect(resolver.pending().size).toBe(0);
    expect(resolver.estimate().size).toBe(0);
    expect(finishes(result.boats)).toEqual({ ai0: 200, ai1: 210, player: 230 });
  });

  it("never touches the caller's boats, navigation or rules", () => {
    const at = structuredClone(shortWin.atPlayerFinish!);
    const before = structuredClone(at);
    resolveInSlices(resolverFor("short", shortWin, at), 10000);
    expect(at).toEqual(before);
  }, 60_000);

  it("sails the live race's own wind: another wind gives the bots other times", () => {
    // Guard of the comparison above: a race on another wind (here a steady
    // breeze from 0 deg) gives other bot times, so input 1 would catch a
    // resolver on the wrong wind. Measured mutations: windAt(time, 1) turns 5
    // tests red, soloRaceWind(time - dt) 4. windAt(time) with its default
    // seed 0 is soloRaceWind(time) bit for bit (100000 sampled times), so that
    // swap cannot be told apart and is no inconsistency of the legacy resolver.
    const steady = liveRace("short", [1.03, 1.02], 1, () => ({ dir: 0, gust: 1 }));
    expect(finishes(steady.end.boats)).not.toEqual(finishes(shortWin.end.boats));
    const { result } = resolveInSlices(resolverFor("short", shortWin), 10000);
    expect(finishes(result.boats)).toEqual(finishes(shortWin.end.boats));
  }, 60_000);

  it("honours the frame deadline on a fake clock, and deadline slices give the same result", () => {
    // The fake clock moves only inside the fleet step: every tick costs 0.7 ms.
    let t = 0;
    const resolver = createPhysicalFleetResolver({ ...resolverFor("short", shortWin),
      step: frame => { t += 0.7; return stepPhysicalRaceFleet(frame); } });
    let result = resolver.advance({ maxTicks: 0 }), frames = 0;
    while (!result.done) {
      const start = t;
      result = resolver.advance({ deadlineMs: 6, now: () => t });
      frames += 1;
      expect(t - start, `frame ${frames} spent ${(t - start).toFixed(1)} ms`).toBeLessThanOrEqual(6 + 1e-9);
      // 8 ticks fit (5.6 ms); a ninth would end at 6.3 ms.
      if (!result.done) expect(result.ticks).toBe(8);
    }
    expect(frames).toBeGreaterThan(10);
    expect(result.boats).toEqual(shortWin.end.boats);
  }, 60_000);

  it("never runs more than its tick cap in one advance, even with a clock that stands still", () => {
    const resolver = createPhysicalFleetResolver(resolverFor("medium", mediumMid));
    const result = resolver.advance({ deadlineMs: 6, now: () => 0 });
    expect(result.done).toBe(false);
    expect(result.ticks).toBe(RESOLVER_MAX_TICKS_PER_ADVANCE);
  });

  it("estimates an unfinished bot later than now, monotone in now, and only from its own progress", () => {
    const resolver = createPhysicalFleetResolver(resolverFor("medium", mediumMid));
    const r = resolver.advance({ maxTicks: 3000 });
    expect(r.done).toBe(false);
    expect([...resolver.pending()]).toEqual(["ai1"]);
    const nows = [r.time, r.time + 10, r.time + 100, r.time + 300];
    const estimates = nows.map(now => resolver.estimate(now).get("ai1"));
    const finite = estimates.filter((e): e is number => typeof e === "number");
    expect(finite.length).toBeGreaterThan(0);
    estimates.forEach((e, i) => { if (typeof e === "number") expect(e).toBeGreaterThan(nows[i]); });
    for (let i = 1; i < finite.length; i++) expect(finite[i]).toBeGreaterThan(finite[i - 1]);
    // Past the limit an estimate is no finish (null), never a time beyond it.
    expect(resolver.estimate(physicalCourseDefinition("medium").maxRaceSeconds).get("ai1")).toBeNull();
    // Rows: an estimated bot is placed by its (penalty-adjusted) estimate and marked.
    const rows = sortRaceResults(r.boats, r.rules.penalties, { estimated: resolver.estimate() });
    expect(rows.find(row => row.name === "Bot 2")).toMatchObject({ estimated: true });
  }, 60_000);

  it("waits for a finished player: an unfinished player hands nothing over", () => {
    const at = structuredClone(mediumMid.atPlayerFinish!);
    const player = at.boats[0];
    delete player.finishTime; player.lapDone = 1;
    const resolver = createPhysicalFleetResolver(resolverFor("medium", mediumMid, at));
    expect(resolver.advance({ maxTicks: 100 })).toMatchObject({ done: true, ticks: 0 });
  });

  it("reports a rejected fleet frame as failed and done, so the caller falls back to estimates", () => {
    const at = shortWin.atPlayerFinish!;
    let calls = 0;
    const resolver = createPhysicalFleetResolver({ ...resolverFor("short", shortWin), step: frame => (++calls > 50 ? null : stepPhysicalRaceFleet(frame)) });
    const result = resolver.advance({ maxTicks: 10000 });
    expect(result).toMatchObject({ done: true, failed: true, ticks: 50 });
    expect(result.time).toBeCloseTo(at.time + 50 * DT, 9);
    expect(resolver.pending().size).toBe(2);
  });
});
