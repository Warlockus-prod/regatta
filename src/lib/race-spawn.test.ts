import { describe, expect, it } from "vitest";
import { SAILING_STEP_SECONDS } from "@/features/sailing-lab/runtime/fixed-clock";
import { makeStandardCourse, raceAutopilotTurn, resolveCollisions, stepBoat, updateLap, type RaceBoat, type RaceCourse } from "./race-physics";
import { createRaceRulesState, evaluateRaceRules, type RaceRuleEvent } from "./race-rules";
import { legacyRaceSpawns, spawnLayoutProblems, type RaceSpawn } from "./race-spawn";

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

/** The game loop of `/game` for the countdown and the opening seconds: same
 * wind shift, step, rules, separation and lap order. Raw rule events only. */
function opening(spawns: RaceSpawn[], seed: number, player: "hold" | "autopilot"): RaceRuleEvent[] {
  const course = makeStandardCourse();
  const boats: RaceBoat[] = spawns.map((s, i) => ({ id: i ? `ai${i - 1}` : "player", name: "", color: "",
    pos: { ...s.pos }, heading: s.heading, speed: 0, lapDone: 0, isPlayer: i === 0 }));
  // The game spreads bot speed by +-3 %; a seed fixes it here.
  const speedMul = boats.map((_, i) => i ? 0.97 + (((seed * 7 + i * 13) % 10) / 10) * 0.06 : 1);
  let rules = createRaceRulesState(), t = 0, clock = 0;
  const events: RaceRuleEvent[] = [];
  while (t < COUNTDOWN + OPENING) {
    const racing = t >= COUNTDOWN;
    t += SAILING_STEP_SECONDS;
    if (racing) clock += SAILING_STEP_SECONDS;
    const wind = (Math.sin(clock * 2 * Math.PI / 22) * 6 + Math.sin(clock * 2 * Math.PI / 7) * 2 + 360) % 360;
    const previousPositions = Object.fromEntries(boats.map(b => [b.id, { ...b.pos }]));
    boats.forEach((boat, i) => {
      const turn = boat.isPlayer && player === "hold" ? 0 : raceAutopilotTurn(boat, course, wind);
      stepBoat(boat, SAILING_STEP_SECONDS, wind, 1, boat.isPlayer ? { turn, autoTrim: true } : { turn },
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
