import { describe, expect, it } from "vitest";
import { SAILING_STEP_SECONDS } from "@/features/sailing-lab/runtime/fixed-clock";
import { raceAutopilotTurn, resolveCollisions, stepBoat, updateLap, type RaceBoat } from "@/lib/race-physics";
import { legacyRaceSpawns } from "@/lib/race-spawn";
import { raceSetupWindMultiplier } from "@/lib/race-setup";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext, raceClassId } from "@/lib/race-context";
import { makeCourse, soloRaceWind } from "@/app/game/race-model";
import { DIFFICULTY_CONFIG, type Difficulty } from "./race-difficulty";
import { MEDAL_BRONZE_LIMIT_SEC, RACE_MEDAL_THRESHOLDS, type MedalWind } from "./race-medals";

// Contract (M4-5): every medal course has gold faster than silver faster than
// bronze; a harder fleet never makes silver or gold easier in the same wind;
// and the provisional numbers are what the bots of that course sail today
// (gold = median time of the fastest bot, silver = median time of the slowest
// bot that sailed at race pace, over five fixed fleet spreads; bronze = the
// race limit).

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const WINDS: MedalWind[] = ["light", "medium", "heavy"];
/** Fixed stand-ins for the random 0.97-1.03 spread between bots (GameClient initRace). */
const SPREADS = [[0.97, 1.03, 1, 0.985], [1, 1, 1, 1], [1.03, 0.97, 1.015, 0.99], [0.985, 1.015, 0.97, 1.03], [1.01, 0.99, 1.02, 0.98]];

/** One bot-only solo race: the same course, start slots, wind and 30 Hz engine as /game. */
function botFinishTimes(difficulty: Difficulty, wind: MedalWind, spread: readonly number[]): number[] {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const course = makeCourse();
  const slots = legacyRaceSpawns(course, cfg.opponents).slice(1);
  const boats: (RaceBoat & { speedMul: number })[] = slots.map((s, i) => ({ id: `ai${i}`, name: "", color: "#fff", pos: { ...s.pos },
    heading: s.heading, speed: 0, isPlayer: false, lapDone: 0, speedMul: cfg.aiSpeedMul * spread[i] }));
  const windMul = raceSetupWindMultiplier(wind);
  let t = 0;
  while (t < MEDAL_BRONZE_LIMIT_SEC && boats.some(b => b.lapDone < 2)) {
    t += SAILING_STEP_SECONDS;
    const w = soloRaceWind(t);
    const previous = Object.fromEntries(boats.map(b => [b.id, { ...b.pos }]));
    for (const b of boats) if (b.lapDone < 2) stepBoat(b, SAILING_STEP_SECONDS, w.dir, w.gust, { turn: raceAutopilotTurn(b, course, w.dir) },
      { windStrengthMul: windMul, speedMul: b.speedMul, steering: "legacy" });
    resolveCollisions(boats, SAILING_STEP_SECONDS);
    for (const b of boats) if (b.lapDone < 2) updateLap(b, previous[b.id], course, t);
  }
  return boats.map(b => b.finishTime ?? Infinity);
}
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
/** A bot more than this much slower than the race winner was tangled or stuck, not sailing at race pace. */
const RACE_PACE = 1.3;

function botThresholds(difficulty: Difficulty, wind: MedalWind) {
  const races = SPREADS.map(spread => botFinishTimes(difficulty, wind, spread));
  const fastest = races.map(times => Math.min(...times));
  // Bots that did not finish or got stuck (collisions at the mark) do not set
  // the silver pace: only the boats within RACE_PACE of their race's winner.
  const slowestAtPace = races.map((times, i) => Math.max(...times.filter(t => Number.isFinite(t) && t <= fastest[i] * RACE_PACE)));
  return { goldSec: Math.floor(median(fastest)), silverSec: Math.min(MEDAL_BRONZE_LIMIT_SEC - 1, Math.floor(median(slowestAtPace))) };
}

/** Bot thresholds per wind, then a harder fleet is never easier than the one
 * below it (the player's boat is the same on every level). */
function derivedThresholds(wind: MedalWind) {
  const out: Partial<Record<Difficulty, { goldSec: number; silverSec: number; bronzeSec: number }>> = {};
  let below: { goldSec: number; silverSec: number } | null = null;
  for (const difficulty of DIFFICULTIES) {
    const bots = botThresholds(difficulty, wind);
    const t: { goldSec: number; silverSec: number } = below ? { goldSec: Math.min(bots.goldSec, below.goldSec), silverSec: Math.min(bots.silverSec, below.silverSec) } : bots;
    out[difficulty] = { ...t, bronzeSec: MEDAL_BRONZE_LIMIT_SEC };
    below = t;
  }
  return out as Record<Difficulty, { goldSec: number; silverSec: number; bronzeSec: number }>;
}
const derivedByWind = new Map<MedalWind, ReturnType<typeof derivedThresholds>>();
const derived = (difficulty: Difficulty, wind: MedalWind) => {
  if (!derivedByWind.has(wind)) derivedByWind.set(wind, derivedThresholds(wind));
  return derivedByWind.get(wind)![difficulty];
};

const legacy = RACE_MEDAL_THRESHOLDS[raceClassId(LEGACY_RACE_CONTEXT)]!;

describe("provisional medal thresholds (M4-5)", () => {
  for (const difficulty of DIFFICULTIES) for (const wind of WINDS) {
    it(`${difficulty} fleet, ${wind} wind: gold < silver < bronze, as the bots sail it`, () => {
      const t = legacy[difficulty][wind];
      expect(t.goldSec).toBeGreaterThan(0);
      expect(t.goldSec).toBeLessThan(t.silverSec);
      expect(t.silverSec).toBeLessThan(t.bronzeSec);
      expect(t.bronzeSec).toBe(MEDAL_BRONZE_LIMIT_SEC);
      expect(t).toEqual(derived(difficulty, wind));
    });
  }

  for (const wind of WINDS) it(`${wind} wind: a harder fleet never makes silver or gold easier`, () => {
    const [easy, medium, hard] = DIFFICULTIES.map(d => legacy[d][wind]);
    expect(medium.silverSec).toBeLessThanOrEqual(easy.silverSec);
    expect(hard.silverSec).toBeLessThanOrEqual(medium.silverSec);
    expect(medium.goldSec).toBeLessThanOrEqual(easy.goldSec);
    expect(hard.goldSec).toBeLessThanOrEqual(medium.goldSec);
  });

  it("has no thresholds for the physical trial classes, so they never award a medal", () => {
    for (const profile of PHYSICAL_RACE_PROFILES) expect(RACE_MEDAL_THRESHOLDS[raceClassId(physicalRaceContext(profile))]).toBeUndefined();
  });
});
