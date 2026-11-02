// M5 step 6: the route hint of the metric race (race-guidance-physical.ts).
//
// Contract: a boat steered by course assist to the hint's suggestedHeading
// every 0.5 s finishes each metric course with all five progress events in
// order, with at most 2 / 3 / 4 tacks on the beat of short / medium / long,
// never told a heading inside the no-go cone, and every hint target is a
// point the progress code credits for the boat's current stage. The planner
// never changes the boat or the memory it was given. Alone on the water the
// hint costs no rule event: no mark touch, no wrong rounding, no penalty.
//
// Measured 2026-11-02 after the mark guard (solo, soloRaceWind, x0.65 / x1 /
// x1.3): tacks on the beat 2 / 2 / 3 (short / medium / long) at every
// strength; the closest hint heading to the wind 45 deg (no-go 42 + 3); no
// rule event; finish short 256 / 177 / 139 s (short x1 was 187 s with a mark
// touch at 81 s before the guard), medium 560 / 367 / 295 s, long 1046 / 698
// / 554 s; the hint keeps the boat 106..409 m east on long
// (water 0..480 m); the mark-approach first race hint comes 3.3-8.0 s before
// the boat enters the three-length zone. The bots' planner alone, followed
// the same way, tacks 5 / 10 / 17 times (the M5 prototype counted 3 / 8 / 15),
// see the baseline test. RACE_GATE_TRACE=1 prints these numbers.
import { describe, expect, it } from "vitest";
import { physicalRaceContext, type PhysicalRaceProfile } from "./race-context";
import { makePhysicalRaceCourse, physicalCourseDefinition, physicalFleetSpawns } from "./race-courses";
import { passMarkToPort, physicalGuidanceCorridorMetres, planPhysicalRaceGuidance, type PhysicalRaceGuidanceState } from "./race-guidance-physical";
import { planRaceGuidance } from "./race-guidance";
import { stepPhysicalRaceFleet } from "./race-physical-fleet";
import { planPhysicalBot, type PhysicalBotState } from "./race-physical-bot";
import { advancePhysicalRaceProgress, physicalRaceGates, physicalRaceStage } from "./race-physical-progress";
import { angleDiff, bearing, calcTWA, makeStandardCourse, type RaceBoat, type RaceCourse, type Vec2 } from "./race-physics";
import { soloRaceWind } from "./race-solo-wind";
import { classifyManoeuvre, createManoeuvreState } from "./race-manoeuvres";
import { raceScale } from "./race-scale";
import { createRaceRulesState, evaluateRaceRules } from "./race-rules";
import { createFirstRaceHintState, firstRaceHintDistances, HINT_TIMING, nextFirstRaceHint, type FirstRaceHintId } from "@/features/race-hud/first-race-hints";

const DT = 1 / 30;
const TACK_LIMIT: Record<PhysicalRaceProfile, number> = { short: 2, medium: 3, long: 4 };
const EVENTS = ["start", "round-east", "round-north", "mark", "finish"];
const STAGE_EVENT = { start: "start", "round-east": "round-east", "round-north": "round-north", "round-west": "mark", finish: "finish" } as const;
const STAGE_DIRECTION: Record<keyof typeof STAGE_EVENT, Vec2> = { start: { x: 0, y: -1 }, "round-east": { x: 0, y: -1 },
  "round-north": { x: -1, y: 0 }, "round-west": { x: 0, y: 1 }, finish: { x: 0, y: 1 } };

/** The progress code credits a short travel through `target` in the stage's own direction. */
function credited(boat: RaceBoat, target: Vec2, profile: PhysicalRaceProfile, course: RaceCourse): boolean {
  const stage = physicalRaceStage(boat);
  if (stage === "complete") return true;
  const dir = STAGE_DIRECTION[stage];
  const probe: RaceBoat = { ...boat, pos: { ...target } };
  const result = advancePhysicalRaceProgress(probe, { from: { x: target.x - dir.x * .5, y: target.y - dir.y * .5 }, to: { x: target.x + dir.x * .5, y: target.y + dir.y * .5 } },
    physicalRaceContext(profile), course, 10, true);
  return result?.event === STAGE_EVENT[stage];
}

interface HintRun {
  events: string[]; tacksOnBeat: number; finishTime: number | null; minHintTwa: number; uncredited: number; samples: number;
  minX: number; maxX: number; hints: { id: FirstRaceHintId; t: number }[]; zoneAt: number | null; mutated: number;
  /** The race rules' events and penalty seconds for the player (alone, so every one is the hint's fault). */
  ruleEvents: string[]; penaltySeconds: number;
}

type Planner = "hint" | "bot";
/** A start already across the line, below the windward mark: metres east of the mark and south of it, heading and speed. */
interface BeatStart { eastMetres: number; southMetres: number; heading: number; speedKn: number }
/** One player alone on the course: course assist set to the planner's heading every 0.5 s, the plan refreshed at 10 Hz.
 * With `from`, the boat starts mid-beat and the run ends at its round-east gate. */
function sailByHint(profile: PhysicalRaceProfile, windStrengthMul = 1, planner: Planner = "hint", from?: BeatStart): HintRun {
  const context = physicalRaceContext(profile), course = makePhysicalRaceCourse(profile), scale = raceScale(profile);
  const spawn = physicalFleetSpawns(1)[0], mark = course.marks[0].pos, m = context.metresPerUnit;
  const limit = from ? 90 : physicalCourseDefinition(profile).maxRaceSeconds;
  let boat: RaceBoat = from
    ? { id: "player", name: "player", color: "#fff", pos: { x: mark.x + from.eastMetres / m, y: mark.y + from.southMetres / m }, heading: from.heading,
      speed: from.speedKn, lapDone: 0, isPlayer: true, started: true }
    : { id: "player", name: "player", color: "#fff", pos: { ...spawn.pos }, heading: spawn.heading, speed: 0, lapDone: 0, isPlayer: true };
  let state: PhysicalRaceGuidanceState | null = null, navigation: ReadonlyMap<string, PhysicalBotState> | undefined;
  const botPlan: PhysicalBotState = { version: 1, profile, tick: 0, lap: 0 };
  let assist = boat.heading, clock = 0, tacks = 0, minHintTwa = 180, uncredited = 0, samples = 0, mutated = 0;
  let minX = Infinity, maxX = -Infinity, zoneAt: number | null = null;
  let manoeuvres = createManoeuvreState(), hintState = createFirstRaceHintState(), rules = createRaceRulesState();
  const events: string[] = [], hints: HintRun["hints"] = [], ruleEvents: string[] = [];
  for (let tick = 1; clock < limit; tick++) {
    const racing = from !== undefined || tick > 90;
    if (racing) clock += DT;
    const wind = soloRaceWind(clock);
    if (planner === "bot") {
      botPlan.tick += 1;
      if (tick % 15 === 0) assist = planPhysicalBot(boat, course, wind.dir, context, botPlan).heading;
    } else if (tick % 3 === 0) {
      const boatBefore = structuredClone(boat), stateBefore = structuredClone(state);
      const advice = planPhysicalRaceGuidance(boat, course, context, wind.dir, state);
      if (JSON.stringify(boat) !== JSON.stringify(boatBefore) || JSON.stringify(state) !== JSON.stringify(stateBefore)) mutated++;
      state = advice.state;
      if (!advice.guidance) throw new Error(`no hint at ${clock.toFixed(1)} s`);
      if (boat.lapDone < 2) {
        samples++;
        minHintTwa = Math.min(minHintTwa, Math.abs(calcTWA(advice.guidance.suggestedHeading, wind.dir)));
        if (!credited(boat, advice.guidance.target, profile, course)) uncredited++;
      }
      if (tick % 15 === 0) assist = advice.guidance.suggestedHeading;
    }
    const stepped = stepPhysicalRaceFleet({ context, course, dt: DT, raceTime: clock, racing, windDir: wind.dir, gust: wind.gust,
      windStrengthMul, navigation, entries: [{ boat, input: { steering: { mode: "course-assist", heading: assist }, autoTrim: true } }] });
    if (!stepped) throw new Error(`rejected at tick ${tick}`);
    const previousPositions = { player: { ...boat.pos } };
    boat = stepped.boats[0]; navigation = stepped.navigation;
    const judged = evaluateRaceRules(rules, { boats: [boat], course, windDir: wind.dir, time: clock, racing, previousPositions, scale, impacts: stepped.impacts });
    rules = judged.state;
    for (const e of judged.events) if (e.kind !== "mark-rounded" && e.kind !== "start-clear") ruleEvents.push(`${e.kind}@${clock.toFixed(1)}`);
    for (const p of stepped.progress) if (p.event) events.push(p.event);
    const twa = calcTWA(boat.heading, wind.dir);
    const c = classifyManoeuvre(manoeuvres, { twa, speedKn: boat.speed, pinned: false });
    manoeuvres = c.state;
    if (c.manoeuvre === "tack" && events.length === 1) tacks++;
    if (racing) {
      minX = Math.min(minX, boat.pos.x * context.metresPerUnit); maxX = Math.max(maxX, boat.pos.x * context.metresPerUnit);
      if (zoneAt === null && boat.started && boat.lapDone === 0 && Math.hypot(boat.pos.x - mark.x, boat.pos.y - mark.y) < scale.markZoneUnits) zoneAt = clock;
      // The first race hints, as the live loop feeds them (metric scale, nothing seen yet).
      const due = nextFirstRaceHint(hintState, { t: clock, racing: true, tacked: c.manoeuvre === "tack", twa, windDir: wind.dir,
        boats: [boat], course, scale }, new Set());
      hintState = due.state;
      if (due.hint) hints.push({ id: due.hint.id, t: clock });
    }
    if (boat.lapDone >= 2 || from && events.length > 0) break;
  }
  return { events, tacksOnBeat: tacks, finishTime: boat.finishTime ?? null, minHintTwa, uncredited, samples, minX, maxX, hints, zoneAt, mutated,
    ruleEvents, penaltySeconds: rules.penalties.player ?? 0 };
}

const PROFILES: readonly PhysicalRaceProfile[] = ["short", "medium", "long"];
const WINDS = [0.65, 1, 1.3] as const;

describe("metric route hint followed by course assist (closed loop)", () => {
  for (const profile of PROFILES) for (const wind of WINDS) it(`${profile} x${wind}: finishes in gate order with few tacks, outside the no-go`, () => {
    const run = sailByHint(profile, wind);
    const label = JSON.stringify({ ...run, hints: undefined });
    if (process.env.RACE_GATE_TRACE === "1") console.log(`LOOP ${profile} x${wind} finish ${run.finishTime?.toFixed(1)} tacks ${run.tacksOnBeat} x ${run.minX.toFixed(0)}..${run.maxX.toFixed(0)} minTWA ${run.minHintTwa.toFixed(1)}`);
    expect(run.samples).toBeGreaterThan(100);
    expect(run.uncredited, `hint targets the progress code would not credit: ${label}`).toBe(0);
    expect(run.events, label).toEqual(EVENTS);
    expect(run.finishTime, label).not.toBeNull();
    expect(run.tacksOnBeat, label).toBeLessThanOrEqual(TACK_LIMIT[profile]);
    expect(run.minHintTwa, label).toBeGreaterThanOrEqual(raceScale(profile).noGoHalfDeg);
    expect(run.mutated, "the planner changed the boat or its memory").toBe(0);
    // Alone on the water, the hint alone answers for the race rules: no mark touch, no wrong rounding, no penalty.
    expect(run.ruleEvents, label).toEqual([]);
    expect(run.penaltySeconds, label).toBe(0);
    // The widest corridor stays well inside the 480 m water.
    expect(run.minX).toBeGreaterThan(90);
    expect(run.maxX).toBeLessThan(480 - 60);
  });

  // Baseline, one test per profile (each well inside the default timeout):
  // the hint tacks 2 / 2 / 3 times; the bots' band, followed the same way,
  // tacks well over the hint's limit on medium and long.
  const HINT_TACKS: Record<PhysicalRaceProfile, number> = { short: 2, medium: 2, long: 3 };
  for (const profile of PROFILES) it(`${profile}: tacks far less than the bots' planner followed the same way (baseline, M5 prototype 3 / 8 / 15)`, () => {
    const bot = sailByHint(profile, 1, "bot").tacksOnBeat, hint = sailByHint(profile, 1).tacksOnBeat;
    if (process.env.RACE_GATE_TRACE === "1") console.log("TACKS", profile, "bot", bot, "hint", hint);
    expect(hint).toBe(HINT_TACKS[profile]);
    if (profile !== "short") expect(bot).toBeGreaterThan(TACK_LIMIT[profile]);
  });

  // First race hints at real speed (M4-7 in the metric race): an ordinary tack
  // never reads as a no-go stall (the stall clock restarts at each crossing
  // and each side of a metric tack is shorter than noGoSec), the first tack
  // and the mark approach fire, and the approach comes while the toast can
  // still be read before the zone: 3-8 s measured (4 hull lengths).
  for (const profile of PROFILES) it(`${profile}: first race hints fire at real speed, never no-go on an ordinary tack`, () => {
    for (const wind of WINDS) {
      const run = sailByHint(profile, wind);
      const ids = run.hints.map(h => h.id);
      expect(ids, `${wind}`).not.toContain("no-go");
      expect(ids, `${wind}`).toContain("first-tack");
      expect(ids, `${wind}`).toContain("mark-approach");
      const approach = run.hints.find(h => h.id === "mark-approach")!.t;
      const lead = run.zoneAt! - approach;
      if (process.env.RACE_GATE_TRACE === "1") console.log("LEAD", profile, wind, lead.toFixed(1), run.hints.map(h => `${h.id}@${h.t.toFixed(1)}`).join(" "));
      expect(lead, `${profile} x${wind} lead ${lead.toFixed(1)} s`).toBeGreaterThanOrEqual(HINT_TIMING.readSec);
      expect(lead, `${profile} x${wind} lead ${lead.toFixed(1)} s`).toBeLessThanOrEqual(HINT_TIMING.gapSec);
    }
  });
});

// M5 step 6 review: the hint's line to the round-east gate passed 8.3 m from
// the windward mark's centre (touching is 8.1 m) when the boat came in from
// west of the mark, and a boat following it touched the mark on the default
// short course in the medium wind (rule 31, 3 s). Measured 2026-11-02 over
// 3192 starts below the mark (short, three winds, 11 x 7 positions, 7
// headings, 2 and 5 kn), starts with a mark touch or wrong rounding: 0 with
// the mark guard at markPassMetres 3 (1 at 2, 0 at 5, 10 at 0); without the
// guard 180 of the 636 starts of a smaller grid. A few starts far off the
// design line (15 of 3192, mostly x1.3 with the gate overstood on starboard)
// still sail past the narrow gate and come round again: open, ADR-0015.
describe("metric route hint never sails into the windward mark", () => {
  for (const wind of WINDS) it(`short x${wind}: from 90 starts below the mark, the gate is crossed without touching the mark`, () => {
    const misses: string[] = [];
    for (const east of [-40, -30, -20, -10, 0, 10, 20, 30, 40]) for (const south of [15, 20, 30, 40, 60]) for (const heading of [45, 315]) {
      // A start already inside touching distance plus a hull cannot be helped.
      if (Math.hypot(east, south) < 14) continue;
      const run = sailByHint("short", wind, "hint", { eastMetres: east, southMetres: south, heading, speedKn: 5 });
      if (run.events[0] !== "round-east" || run.ruleEvents.length) misses.push(`[${east},${south},${heading}] ${run.events.join(">") || "no gate"} ${run.ruleEvents.join(",")}`);
    }
    expect(misses).toEqual([]);
  });
});

describe("planPhysicalRaceGuidance on three inputs", () => {
  const profile = "short", context = physicalRaceContext(profile), course = makePhysicalRaceCourse(profile);
  const gates = physicalRaceGates(context, course)!, m = context.metresPerUnit, mark = course.marks[0].pos;
  const line = course.startLine, cx = (line.a.x + line.b.x) / 2;
  const boat = (patch: Partial<RaceBoat>): RaceBoat => ({ id: "player", name: "You", color: "#fff", pos: { x: cx, y: line.a.y + 18 / m },
    heading: 45, speed: 3, lapDone: 0, isPlayer: true, ...patch });

  it("below the line at the centre before the gun: the start line centre, sailed close-hauled", () => {
    const b = boat({ started: false });
    const { guidance } = planPhysicalRaceGuidance(b, course, context, 0);
    expect(guidance).toMatchObject({ leg: "start", target: { x: cx, y: line.a.y } });
    expect(credited(b, guidance!.target, profile, course)).toBe(true);
    expect(Math.abs(calcTWA(guidance!.suggestedHeading, 0))).toBeGreaterThanOrEqual(45);
    expect(guidance!.path).toBeDefined();
  });

  it("mid-beat 60 m east of the gate line: outside the short corridor it tacks back, inside the medium one it holds", () => {
    const east = gates.rounding[0], gateX = (east.a.x + east.b.x) / 2;
    expect(physicalGuidanceCorridorMetres(context)).toBeCloseTo(42, 9);
    // Short: corridor 42 m, so 60 m east on port tack (heading 45, sailing further out) is 18 m past its wall.
    const out = boat({ started: true, pos: { x: gateX + 60 / m, y: mark.y + 70 / m }, heading: 45, speed: 5 });
    const short = planPhysicalRaceGuidance(out, course, context, 0).guidance!;
    expect(short).toMatchObject({ leg: "windward", action: "tack", beating: true, target: { x: gateX, y: mark.y } });
    expect(short.suggestedHeading).toBeCloseTo(315, 6);
    // Medium: corridor 105 m, the same 60 m east 200 m below the mark keeps sailing out on port tack.
    const mediumContext = physicalRaceContext("medium"), mediumCourse = makePhysicalRaceCourse("medium");
    const mm = mediumCourse.marks[0].pos, mx = (physicalRaceGates(mediumContext, mediumCourse)!.rounding[0].a.x + physicalRaceGates(mediumContext, mediumCourse)!.rounding[0].b.x) / 2;
    expect(physicalGuidanceCorridorMetres(mediumContext)).toBeCloseTo(105, 9);
    const inside = planPhysicalRaceGuidance(boat({ started: true, pos: { x: mx + 60 / m, y: mm.y + 200 / m }, heading: 45, speed: 5 }), mediumCourse, mediumContext, 0).guidance!;
    expect(inside).toMatchObject({ leg: "windward", action: "hold", beating: true });
    expect(inside.suggestedHeading).toBeCloseTo(45, 6);
    // Long: corridor capped at 150 m (0.35 x 600 = 210).
    expect(physicalGuidanceCorridorMetres(physicalRaceContext("long"))).toBe(150);
  });

  it("at the rounding (roundPhase 1): the round-north gate, round the mark to port, never into the wind", () => {
    const b = boat({ started: true, roundPhase: 1, pos: { x: mark.x + 14 / m, y: mark.y - 4 / m }, heading: 0, speed: 4 });
    const { guidance } = planPhysicalRaceGuidance(b, course, context, 0);
    const north = gates.rounding[1];
    expect(guidance).toMatchObject({ leg: "round-port", target: { x: mark.x, y: (north.a.y + north.b.y) / 2 } });
    expect(credited(b, guidance!.target, profile, course)).toBe(true);
    expect(Math.abs(calcTWA(guidance!.suggestedHeading, 0))).toBeGreaterThanOrEqual(raceScale(profile).noGoHalfDeg);
    // Head to wind the hint points to the port-rounding side: bear away to the north-west, a tack onto starboard.
    expect(guidance!.suggestedHeading).toBeCloseTo(315, 6);
  });

  it("never calls a correction of a few degrees across a dead run a gybe", () => {
    // Running dead downwind (wind from 0) half a metre west of the finish lane,
    // heading 180.5: the hint corrects about 3 deg, across the run, to 177.
    const probe = boat({ started: true, roundPhase: 2, lapDone: 1, pos: { x: cx, y: line.a.y - 80 / m }, heading: 180.5, speed: 6 });
    const lane = planPhysicalRaceGuidance(probe, course, context, 0).guidance!.target.x;
    const b = { ...probe, pos: { x: lane - .5 / m, y: probe.pos.y } };
    const { guidance } = planPhysicalRaceGuidance(b, course, context, 0);
    expect(guidance!.suggestedHeading).toBeLessThan(180);
    expect(guidance!.suggestedHeading).toBeGreaterThan(176);
    expect(guidance!.action).toBe("hold");
    // A real gybe still reads as one.
    const far = planPhysicalRaceGuidance(boat({ started: true, roundPhase: 2, lapDone: 1, pos: { x: cx - 40 / m, y: line.a.y - 80 / m }, heading: 200, speed: 6 }), course, context, 0).guidance!;
    expect(far.suggestedHeading).toBeLessThan(180);
    expect(far.action).toBe("gybe");
  });

  it("bears away round the windward mark instead of fetching the gate through it (three inputs)", () => {
    const g = physicalCourseDefinition(profile), clearance = (g.hardware.boatDiameterMetres / 2 + g.hardware.buoyRadiusMetres
      + g.hardware.clearanceBufferMetres + g.guidance.markPassMetres) / m;
    const east = gates.rounding[0], gate = { x: (east.a.x + east.b.x) / 2, y: east.a.y };
    const at = (dx: number, dy: number): Vec2 => ({ x: mark.x + dx / m, y: mark.y + dy / m });
    /** Closest approach of the straight line from `p` on `heading` to the mark, metres, up to the mark's row. */
    const pass = (p: Vec2, heading: number) => {
      const ux = Math.sin(heading * Math.PI / 180), uy = -Math.cos(heading * Math.PI / 180), px = mark.x - p.x, py = mark.y - p.y;
      const t = Math.max(0, Math.min((p.y - mark.y) / -uy, px * ux + py * uy));
      return Math.hypot(px - ux * t, py - uy * t) * m;
    };
    // 1. The review's trace: 16.4 m west and 18.6 m south of the mark, the
    // fetch to the gate centre passes 8.3 m off (touching is 8.1 m): bear away.
    const west = at(-16.4, 18.6), fetch = bearing(west, gate);
    expect(pass(west, fetch)).toBeLessThan(8.5);
    const around = passMarkToPort(west, fetch, gate, mark, clearance, 0, 45);
    expect(angleDiff(fetch, around)).toBeGreaterThan(5);
    expect(pass(west, around)).toBeGreaterThanOrEqual(clearance * m - 1e-6);
    // 2. South-east of the mark the fetch is clear and stays as it was.
    const southEast = at(25, 30);
    expect(passMarkToPort(southEast, bearing(southEast, gate), gate, mark, clearance, 0, 45)).toBe(bearing(southEast, gate));
    // 3. Close-hauled on port tack (heading 315) straight at the mark from
    // the south-east: the tangent is head to wind, so it takes starboard tack.
    const intoMark = at(10, 12);
    expect(pass(intoMark, 315)).toBeLessThan(5);
    expect(passMarkToPort(intoMark, 315, null, mark, clearance, 0, 45)).toBe(45);
    // And the planner itself never hands out the line through the mark.
    const advice = planPhysicalRaceGuidance(boat({ started: true, pos: west, heading: 316, speed: 5 }), course, context, 0).guidance!;
    expect(pass(west, advice.suggestedHeading)).toBeGreaterThanOrEqual(clearance * m - 1e-6);
  });

  it("targets the finish lane on the finish line after the mark", () => {
    const b = boat({ started: true, roundPhase: 2, lapDone: 1, pos: { x: cx - 20 / m, y: line.a.y - 80 / m }, heading: 180, speed: 6 });
    const { guidance } = planPhysicalRaceGuidance(b, course, context, 0);
    expect(guidance!.leg).toBe("finish");
    expect(guidance!.target.y).toBe(line.a.y);
    expect(credited(b, guidance!.target, profile, course)).toBe(true);
  });
});

describe("planPhysicalRaceGuidance refuses what it cannot plan", () => {
  const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short");
  const b: RaceBoat = { id: "player", name: "You", color: "#fff", pos: { x: 400, y: 900 }, heading: 45, speed: 4, lapDone: 0, started: true };
  it("gives no hint on a damaged, legacy or other-profile course, or for an invalid boat", () => {
    const moved = structuredClone(course); moved.marks[0].pos.x += 5;
    expect(planPhysicalRaceGuidance(b, moved, context, 0)).toEqual({ guidance: null, state: null });
    expect(planPhysicalRaceGuidance(b, makeStandardCourse(), context, 0)).toEqual({ guidance: null, state: null });
    expect(planPhysicalRaceGuidance(b, makePhysicalRaceCourse("medium"), context, 0)).toEqual({ guidance: null, state: null });
    expect(planPhysicalRaceGuidance({ ...b, pos: { x: Number.NaN, y: 1 } }, course, context, 0).guidance).toBeNull();
    expect(planPhysicalRaceGuidance(b, course, context, Number.NaN).guidance).toBeNull();
    expect(planPhysicalRaceGuidance({ ...b, roundPhase: 3 as 2 }, course, context, 0).guidance).toBeNull();
  });

  it("never changes the boat or the memory it was given", () => {
    const first = planPhysicalRaceGuidance(b, course, context, 0);
    const boatBefore = structuredClone(b), stateBefore = structuredClone(first.state);
    planPhysicalRaceGuidance(b, course, context, 3, first.state);
    expect(b).toEqual(boatBefore);
    expect(first.state).toEqual(stateBefore);
  });

  it("leaves the legacy planner's refusal of metric courses as it was", () => {
    // The legacy planner keeps its supportedCourse: the metric buoy (2.5 units) and beat are below its limits.
    for (const p of PROFILES) expect(planRaceGuidance(b, makePhysicalRaceCourse(p), 0).guidance).toBeNull();
    expect(planRaceGuidance({ ...b, pos: { x: 450, y: 900 } }, makeStandardCourse(), 0).guidance).not.toBeNull();
  });
});

describe("first race hint distances per model", () => {
  it("keeps the legacy distances and uses the metric hull for the metric race", () => {
    expect(firstRaceHintDistances()).toEqual({ markUnits: HINT_TIMING.markUnits, crossingUnits: HINT_TIMING.crossingUnits, crossingPassUnits: HINT_TIMING.crossingPassUnits });
    expect(firstRaceHintDistances(raceScale(null))).toEqual(firstRaceHintDistances());
    const hull = raceScale("short").hullUnits;
    expect(firstRaceHintDistances(raceScale("short"))).toEqual({ markUnits: hull * 4, crossingUnits: hull * 8, crossingPassUnits: hull * 3 });
  });
});
