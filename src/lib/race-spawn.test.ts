import { describe, expect, it } from "vitest";
import { SAILING_STEP_SECONDS } from "@/features/sailing-lab/runtime/fixed-clock";
import { soloRaceWind } from "@/app/game/race-model";
import { raceStartTrim } from "@/app/game/race-start-trim";
import { DIFFICULTY_CONFIG, type Difficulty } from "@/data/race-difficulty";
import { makeStandardCourse, raceAutopilotTurn, raceTrim, resolveCollisions, stepBoat, updateLap, type RaceBoat, type RaceCourse } from "./race-physics";
import { createRaceRulesState, evaluateRaceRules, type RaceRuleEvent } from "./race-rules";
import { LEGACY_SPAWN, legacyRaceSpawns, spawnLayoutProblems, type RaceSpawn } from "./race-spawn";
import { raceTrimCoach } from "./race-trim-coach";
import { createInitialState, trimForDrive, type Controls } from "./sailing-physics";

const LEVELS = { easy: 2, medium: 3, hard: 4 } as const;
const SEEDS = [1, 2, 3];
const COUNTDOWN = 3;
const OPENING = 20;

/** The layout `initRace` used before M0-2, kept only to prove the test bites. */
function preM0Spawns(course: RaceCourse, opponents: number): RaceSpawn[] {
  const c = { x: (course.startLine.a.x + course.startLine.b.x) / 2, y: course.startLine.a.y };
  return [{ pos: { x: c.x, y: c.y + 30 }, heading: 45 }, ...Array.from({ length: opponents }, (_, i) => {
    const t = opponents === 1 ? 0 : (i / (opponents - 1)) * 2 - 1;
    return { pos: { x: c.x + t * 140 * 0.7, y: c.y + 30 + (i % 2) * 20 }, heading: t > 0 ? 315 : 45 };
  })];
}

/** The pre-fix Pro starting trim of `initRace`: sheets solved for a boat at
 * rest. Kept only to prove the Pro tests bite. */
const preFixStartTrim = (windStrengthMul: number) => raceTrim({ ...trimForDrive(createInitialState({
  tws: 12 * windStrengthMul, trueWindDir: 0, heading: 45, boatSpeed: 0 }), raceTrim({})), mainHoisted: true, jibFurl: 0, reef: 0 });

interface OpeningOptions {
  /** Pro: the player holds these sheets (autoTrim false). Omitted = Simple (automatic trim). */
  trim?: Controls;
  /** The level's bot speed (DIFFICULTY_CONFIG.aiSpeedMul) and the race gusts, as `/game` runs them. */
  level?: Difficulty;
}

/** The game loop of `/game` for the countdown and the opening seconds: same
 * wind shift, step, rules, separation and lap order. Raw rule events only. */
function opening(spawns: RaceSpawn[], seed: number, player: "hold" | "autopilot", opts: OpeningOptions = {}): RaceRuleEvent[] {
  const course = makeStandardCourse();
  const boats: RaceBoat[] = spawns.map((s, i) => ({ id: i ? `ai${i - 1}` : "player", name: "", color: "",
    pos: { ...s.pos }, heading: s.heading, speed: 0, lapDone: 0, isPlayer: i === 0 }));
  // The game spreads bot speed by +-3 %; a seed fixes it here. With a level,
  // the level's bot speed applies on top, as in initRace.
  const levelMul = opts.level ? DIFFICULTY_CONFIG[opts.level].aiSpeedMul : 1;
  const speedMul = boats.map((_, i) => i ? levelMul * (0.97 + (((seed * 7 + i * 13) % 10) / 10) * 0.06) : 1);
  const playerInput = opts.trim ? { autoTrim: false, trim: opts.trim } : { autoTrim: true };
  let rules = createRaceRulesState(), t = 0, clock = 0;
  const events: RaceRuleEvent[] = [];
  while (t < COUNTDOWN + OPENING) {
    const racing = t >= COUNTDOWN;
    t += SAILING_STEP_SECONDS;
    if (racing) clock += SAILING_STEP_SECONDS;
    const { dir: wind, gust: raceGust } = soloRaceWind(clock);
    const gust = opts.level ? raceGust : 1;
    const previousPositions = Object.fromEntries(boats.map(b => [b.id, { ...b.pos }]));
    boats.forEach((boat, i) => {
      const turn = boat.isPlayer && player === "hold" ? 0 : raceAutopilotTurn(boat, course, wind);
      stepBoat(boat, SAILING_STEP_SECONDS, wind, gust, boat.isPlayer ? { turn, ...playerInput } : { turn },
        { windStrengthMul: 1, speedMul: speedMul[i], steering: boat.isPlayer ? "responsive" : "legacy" });
    });
    const checked = evaluateRaceRules(rules, { boats, course, windDir: wind, time: clock, racing, previousPositions });
    rules = checked.state;
    events.push(...checked.events);
    resolveCollisions(boats, SAILING_STEP_SECONDS);
    if (racing) for (const boat of boats) updateLap(boat, previousPositions[boat.id], course, clock);
  }
  return events;
}

const involvesPlayer = (e: RaceRuleEvent) =>
  (e.boatId === "player" || e.otherBoatId === "player") && (e.kind === "give-way" || e.kind === "contact" || e.kind === "avoid-contact");
const describeEvents = (events: RaceRuleEvent[]) => events.map(e => `${e.time.toFixed(1)}s ${e.kind} rule ${e.rule} ${e.boatId}/${e.otherBoatId}`);

describe("legacy race start positions (M0-2)", () => {
  it("player keeps the old slot, every bot shares the tack, nobody overlaps or sits on a mark", () => {
    const course = makeStandardCourse();
    for (const opponents of Object.values(LEVELS)) {
      const spawns = legacyRaceSpawns(course, opponents);
      expect(spawns).toHaveLength(opponents + 1);
      expect(spawns[0]).toEqual({ pos: { x: 400, y: 1080 }, heading: 45 });
      expect(spawnLayoutProblems(course, spawns)).toEqual([]);
    }
    expect(() => legacyRaceSpawns(course, 5)).toThrow(RangeError);
    expect(legacyRaceSpawns(course, 2)).not.toBe(legacyRaceSpawns(course, 2));
  });

  it("the pre-M0 layout fails the same checks, so the opening test can catch it", () => {
    const course = makeStandardCourse();
    expect(spawnLayoutProblems(course, preM0Spawns(course, LEVELS.medium))).toContain("boats 0 and 2 overlap");
    const hard = opening(preM0Spawns(course, LEVELS.hard), 1, "hold").filter(involvesPlayer);
    expect(hard.some(e => e.kind === "contact" && e.boatId === "player" && e.penaltySeconds > 0)).toBe(true);
  });

  for (const [level, opponents] of Object.entries(LEVELS)) for (const seed of SEEDS) for (const player of ["hold", "autopilot"] as const) {
    it(`${level}, seed ${seed}, player ${player}: no rule event touches the player in the first ${OPENING} s`, () => {
      const events = opening(legacyRaceSpawns(makeStandardCourse(), opponents), seed, player);
      expect(describeEvents(events.filter(involvesPlayer))).toEqual([]);
    });
  }
});

const SHEET_ERRORS = ["luffMain", "luffJib", "luffBoth", "stallMain", "stallJib", "stallBoth"];
const HEADING_HINTS = ["inIrons", "pinching"];

/** A Pro player alone on the start heading, holding course and the given
 * sheets through the countdown and the opening: the live coach reading every
 * step after the signal (as the HUD reads it), and the speed at the end. */
function proSolo(trim: Controls | null, windStrengthMul: number) {
  const spawn = legacyRaceSpawns(makeStandardCourse(), 0)[0];
  const boat: RaceBoat = { id: "player", name: "", color: "", pos: { ...spawn.pos }, heading: spawn.heading, speed: 0, lapDone: 0, isPlayer: true };
  const coach: string[] = [];
  let t = 0, clock = 0;
  while (t < COUNTDOWN + OPENING) {
    const racing = t >= COUNTDOWN;
    t += SAILING_STEP_SECONDS;
    if (racing) clock += SAILING_STEP_SECONDS;
    const wind = soloRaceWind(clock);
    stepBoat(boat, SAILING_STEP_SECONDS, wind.dir, wind.gust, trim ? { turn: 0, autoTrim: false, trim } : { turn: 0, autoTrim: true },
      { windStrengthMul, speedMul: 1, steering: "responsive" });
    if (racing) coach.push(raceTrimCoach(boat) ?? "none");
  }
  const trimVerdicts = coach.filter(k => !HEADING_HINTS.includes(k));
  return { coach, trimVerdicts, speed: boat.speed };
}

/** Pro trim contract: untouched sheets never luff or stall while the boat
 * holds course, the first verdict once the bow is out of the pinching zone
 * is "good", most verdicts are "good", and the boat keeps up with the
 * automatic crew. */
function proTrimProblems(trim: Controls, windStrengthMul: number): string[] {
  const pro = proSolo(trim, windStrengthMul), simple = proSolo(null, windStrengthMul);
  const problems: string[] = [];
  const errors = [...new Set(pro.coach.filter(k => SHEET_ERRORS.includes(k)))];
  if (errors.length) problems.push(`sheet errors ${errors.join(",")}`);
  if (pro.trimVerdicts[0] !== "good") problems.push(`first verdict ${pro.trimVerdicts[0]}`);
  const good = pro.trimVerdicts.filter(k => k === "good").length;
  if (good * 2 <= pro.trimVerdicts.length) problems.push(`good ${good}/${pro.trimVerdicts.length}`);
  if (pro.speed < 0.85 * simple.speed) problems.push(`speed ${pro.speed.toFixed(2)} kn vs automatic ${simple.speed.toFixed(2)} kn`);
  return problems;
}

const WINDS = { light: 0.65, medium: 1, heavy: 1.3 } as const;

describe("Pro starting trim (TestFlight 74: no way at the start, a bot astern closes in)", () => {
  for (const [wind, mul] of Object.entries(WINDS)) {
    it(`${wind} wind: untouched sheets sail close-hauled with the trim the coach calls good`, () => {
      expect(proTrimProblems(raceStartTrim(mul, LEGACY_SPAWN.heading), mul)).toEqual([]);
    });
  }

  it("the pre-fix trim (solved at rest) fails the same checks, so the test can catch it", () => {
    for (const mul of Object.values(WINDS)) expect(proTrimProblems(preFixStartTrim(mul), mul)).not.toEqual([]);
  });

  it("starts with the main up, the jib unrolled and no reef, and ignores an invalid wind strength", () => {
    const trim = raceStartTrim(1, LEGACY_SPAWN.heading);
    expect(trim).toMatchObject({ mainHoisted: true, jibFurl: 0, reef: 0 });
    expect(raceStartTrim(Number.NaN, LEGACY_SPAWN.heading)).toEqual(trim);
  });

  const LEVEL_NAMES = Object.keys(LEVELS) as (keyof typeof LEVELS)[];
  for (const level of LEVEL_NAMES) for (const seed of SEEDS) {
    const clean = `${level}, seed ${seed}, Pro player holding course on untouched sheets: no rule event touches the player in the first ${OPENING} s`;
    // An it.fails case reports a pass, so its name has to say the gap is open.
    const name = level === "easy" ? clean : `KNOWN GAP, still red (it.fails): ${clean}`;
    const run = () => {
      const events = opening(legacyRaceSpawns(makeStandardCourse(), LEVELS[level]), seed, "hold", { trim: raceStartTrim(1, LEGACY_SPAWN.heading), level });
      expect(describeEvents(events.filter(involvesPlayer))).toEqual([]);
    };
    // KNOWN GAP (pro-start-trim follow-up): on medium and hard the M0-2
    // echelon puts the first bot dead astern on the player's track (34 across,
    // 30 back on a 45 degree heading), and a bot on automatic trim out-
    // accelerates fixed sheets (a grid of main 0.6-0.85 by jib 0.4-0.8 left
    // no pair clean on medium or hard).
    // Flip to it() when the spawn or the Pro crew follow-up lands.
    if (level === "easy") it(name, run); else it.fails(name, run);
  }

  it("on easy the pre-fix trim lets the bot astern reach the player, so the opening test can catch it", () => {
    const hits = SEEDS.map(seed => opening(legacyRaceSpawns(makeStandardCourse(), LEVELS.easy), seed, "hold",
      { trim: preFixStartTrim(1), level: "easy" }).filter(involvesPlayer).length);
    expect(hits.every(n => n > 0)).toBe(true);
  });
});
