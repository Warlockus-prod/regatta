// M5 step 6: the start jostle per race model (race-start-jostle.ts, race-scale.ts).
//
// Contract: the legacy race keeps its 10 s; the metric race's jostle lasts
// as long as its fleet leaves the line together, and ends before the first
// real encounter of a fleet that sails off the fair start as designed.
//
// What it measures (ADR-0015): the step brief asked for the time until the
// fleet of the fair start is two hulls apart. That never happens on the beat:
// the echelon starts 27.2 m apart (just over two hulls) and the closest pair
// stays under two hulls (min 15-25 m) for the first 60 s in every wind with
// two to four bots (measured 2026-11-02), so it would stretch the jostle over
// the whole beat. The window is therefore the time a boat of the echelon,
// sailing the route hint from its heading 45 in the medium wind, needs to
// sail two hull lengths (26.4 m): 16.0 s on short and medium (light x0.65
// 25.7 s, strong x1.3 12.0 s), pinned below. The guard on the other side:
// the fleet's first give-way, avoid-contact or contact comes later (x0.65
// 41 s, x1 27 s, x1.3 with four bots 17.7 s, measured the same day), so the
// window hides no real encounter.
import { describe, expect, it } from "vitest";
import { physicalRaceContext, type PhysicalRaceProfile } from "./race-context";
import { makePhysicalRaceCourse, physicalCourseDefinition, physicalFleetSpawns } from "./race-courses";
import { planPhysicalRaceGuidance, type PhysicalRaceGuidanceState } from "./race-guidance-physical";
import { stepPhysicalRaceFleet } from "./race-physical-fleet";
import type { PhysicalBotState } from "./race-physical-bot";
import type { RaceBoat } from "./race-physics";
import { createRaceRulesState, evaluateRaceRules, type RaceRuleEvent } from "./race-rules";
import { raceScale } from "./race-scale";
import { soloRaceWind } from "./race-solo-wind";
import { isStartJostle, isStartJostleWithin, RACE_START_JOSTLE_SECONDS } from "./race-start-jostle";

/** Seconds from the gun until the player of the fair echelon has sailed two hull lengths. */
function twoHullsOffTheLine(profile: PhysicalRaceProfile, windStrengthMul: number, bots = 3): number {
  const context = physicalRaceContext(profile), course = makePhysicalRaceCourse(profile), m = context.metresPerUnit;
  const twoHulls = 2 * physicalCourseDefinition(profile).hardware.boatDiameterMetres;
  let boats: RaceBoat[] = physicalFleetSpawns(1 + bots).map((s, i) => ({ id: i ? `ai${i - 1}` : "player", name: "x", color: "#fff",
    pos: { ...s.pos }, heading: s.heading, speed: 0, lapDone: 0, isPlayer: i === 0 }));
  let navigation: ReadonlyMap<string, PhysicalBotState> | undefined, hint: PhysicalRaceGuidanceState | null = null;
  let clock = 0, assist = boats[0].heading, sailed = 0;
  for (let tick = 1; tick < 30 * 120; tick++) {
    const racing = tick > 90;
    if (racing) clock += 1 / 30;
    const wind = soloRaceWind(clock);
    if (tick % 3 === 0) {
      const advice = planPhysicalRaceGuidance(boats[0], course, context, wind.dir, hint);
      hint = advice.state;
      if (advice.guidance && tick % 15 === 0) assist = advice.guidance.suggestedHeading;
    }
    const from = { ...boats[0].pos };
    const stepped = stepPhysicalRaceFleet({ context, course, dt: 1 / 30, raceTime: clock, racing, windDir: wind.dir, gust: wind.gust,
      windStrengthMul, navigation, entries: boats.map(boat => ({ boat, speedMul: boat.isPlayer ? 1 : .97,
        input: boat.isPlayer ? { steering: { mode: "course-assist" as const, heading: assist }, autoTrim: true } : "bot" as const })) });
    if (!stepped) throw new Error(`rejected at ${tick}`);
    boats = stepped.boats; navigation = stepped.navigation;
    if (!racing) continue;
    sailed += Math.hypot(boats[0].pos.x - from.x, boats[0].pos.y - from.y) * m;
    if (sailed >= twoHulls) return clock;
  }
  return Infinity;
}

/** The fair echelon (player on the route hint, bots on their planner) for
 * `seconds` after the gun: the closest pair of hulls and the race time of the
 * fleet's first give-way, avoid-contact or contact (null: none). */
function fairStart(profile: PhysicalRaceProfile, windStrengthMul: number, bots: number, seconds: number): { closestMetres: number; firstEncounter: number | null } {
  const context = physicalRaceContext(profile), course = makePhysicalRaceCourse(profile), m = context.metresPerUnit, scale = raceScale(profile);
  let boats: RaceBoat[] = physicalFleetSpawns(1 + bots).map((s, i) => ({ id: i ? `ai${i - 1}` : "player", name: "x", color: "#fff",
    pos: { ...s.pos }, heading: s.heading, speed: 0, lapDone: 0, isPlayer: i === 0 }));
  let navigation: ReadonlyMap<string, PhysicalBotState> | undefined, hint: PhysicalRaceGuidanceState | null = null, rules = createRaceRulesState();
  let clock = 0, assist = boats[0].heading, closestMetres = Infinity, firstEncounter: number | null = null;
  for (let tick = 1; clock < seconds; tick++) {
    const racing = tick > 90;
    if (racing) clock += 1 / 30;
    const wind = soloRaceWind(clock);
    if (tick % 3 === 0) {
      const advice = planPhysicalRaceGuidance(boats[0], course, context, wind.dir, hint);
      hint = advice.state;
      if (advice.guidance && tick % 15 === 0) assist = advice.guidance.suggestedHeading;
    }
    const previousPositions = Object.fromEntries(boats.map(b => [b.id, { ...b.pos }]));
    const stepped = stepPhysicalRaceFleet({ context, course, dt: 1 / 30, raceTime: clock, racing, windDir: wind.dir, gust: wind.gust,
      windStrengthMul, navigation, entries: boats.map(boat => ({ boat, speedMul: boat.isPlayer ? 1 : .97,
        input: boat.isPlayer ? { steering: { mode: "course-assist" as const, heading: assist }, autoTrim: true } : "bot" as const })) });
    if (!stepped) throw new Error(`rejected at ${tick}`);
    boats = stepped.boats; navigation = stepped.navigation;
    const judged = evaluateRaceRules(rules, { boats, course, windDir: wind.dir, time: clock, racing, previousPositions, scale, impacts: stepped.impacts });
    rules = judged.state;
    if (firstEncounter === null && judged.events.some(e => e.kind === "give-way" || e.kind === "avoid-contact" || e.kind === "contact")) firstEncounter = clock;
    if (!racing) continue;
    for (let a = 0; a < boats.length; a++) for (let b = a + 1; b < boats.length; b++)
      closestMetres = Math.min(closestMetres, Math.hypot(boats[a].pos.x - boats[b].pos.x, boats[a].pos.y - boats[b].pos.y) * m);
  }
  return { closestMetres, firstEncounter };
}

const ev = (time: number, kind: RaceRuleEvent["kind"] = "avoid-contact", penaltySeconds = 0): RaceRuleEvent =>
  ({ id: `e${time}`, kind, rule: "14", boatId: "player", otherBoatId: "ai0", time, penaltySeconds } as RaceRuleEvent);

describe("start jostle per race model", () => {
  it("keeps the legacy 10 s, and the one-argument form stays the legacy one", () => {
    expect(RACE_START_JOSTLE_SECONDS).toBe(10);
    expect(raceScale(null).startJostleSeconds).toBe(10);
    expect([ev(9.9), ev(10)].map(isStartJostle)).toEqual([true, false]);
  });

  it("pins the metric value to the measured fair start: no longer than two hull lengths sailed in the medium wind", () => {
    // ADR-0021: on the cruiser profile the fair echelon sails two hulls in
    // 18.6 s (was 16 s), but the strong-wind fleet's first encounter comes at
    // 16.7 s, so the window stays 16 s and ends before both (test below).
    for (const profile of ["short", "medium"] as const) {
      const t = twoHullsOffTheLine(profile, 1);
      expect(t, `${profile}: ${t.toFixed(2)} s`).toBeGreaterThan(15);
      expect(raceScale(profile).startJostleSeconds, `${profile}: ${t.toFixed(2)} s`).toBeLessThanOrEqual(t);
      expect(raceScale(profile).startJostleSeconds).toBe(16);
    }
    expect(raceScale("long").startJostleSeconds).toBe(16);
    // The wind moves it (reported, not pinned): light longer, strong shorter.
    expect(twoHullsOffTheLine("short", .65)).toBeGreaterThan(twoHullsOffTheLine("short", 1.3));
  });

  // One test per wind, each inside the default timeout.
  for (const wind of [0.65, 1, 1.3]) it(`ends before the fair start's first encounter, though the fleet is still closer than two hulls (short x${wind})`, () => {
    const metric = raceScale("short").startJostleSeconds, twoHulls = 2 * physicalCourseDefinition("short").hardware.boatDiameterMetres;
    for (const bots of [3, 4]) {
      const run = fairStart("short", wind, bots, 30);
      if (process.env.RACE_GATE_TRACE === "1") console.log("FAIR START", wind, bots, run);
      if (run.firstEncounter !== null) expect(run.firstEncounter, `${bots} bots`).toBeGreaterThan(metric);
      // Why separation cannot define the window: the pairs stay under two hulls.
      expect(run.closestMetres, `${bots} bots`).toBeLessThan(twoHulls);
    }
  });

  it("groups by the race's own jostle", () => {
    const metric = raceScale("short").startJostleSeconds;
    expect(isStartJostleWithin(ev(12), metric)).toBe(true);
    expect(isStartJostleWithin(ev(12), RACE_START_JOSTLE_SECONDS)).toBe(false);
    expect(isStartJostleWithin(ev(metric), metric)).toBe(false);
    expect(isStartJostleWithin(ev(3, "contact", 5), metric)).toBe(false);
    expect(isStartJostleWithin(ev(3, "mark-touch"), metric)).toBe(false);
  });
});
