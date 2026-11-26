// Package 7 (audit K3), D1 contract: a player who does exactly what the race
// says, holding the suggested course of the route hint, does not lose to the
// whole fleet. "First race" is the easy level the home screen starts (two
// calm bots); the medium level is checked too so the contract is not only
// "slow bots lose". The driver copies the displayed heading to the same
// heading hold the player's autopilot uses (GameClient: angle / 12, clamped),
// in the solo race's own wind (soloRaceWind) at its three strengths, with the
// bots on their unchanged legacy planner and seeded difficulty speeds. It
// never moves a boat, rounds a gate or caps a speed itself.

import { describe, expect, it } from "vitest";
import { DIFFICULTY_CONFIG, type Difficulty } from "@/data/race-difficulty";
import { angleDiff, raceAutopilotTurn, resolveCollisions, stepBoat, updateLap, type RaceBoat } from "@/lib/race-physics";
import { legacyRaceSpawns, raceBotSpeedMul } from "@/lib/race-spawn";
import { soloRaceWind } from "@/lib/race-solo-wind";
import { raceUpwind } from "@/features/race-hud/target";
import { makeCourse, planRouteGuidance, type RouteGuidanceState } from "./race-model";

type Sailed = RaceBoat & { speedMul: number };

/** Deterministic 0..1 sequence for the bots' speed spread (raceBotSpeedMul). */
function seeded(seed: number): () => number {
  let x = seed >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; };
}

const WIND = { light: 0.65, medium: 1, heavy: 1.3 } as const;

/** One solo race: the player follows the hint, which beats at the race's best
 * VMG angle (planRouteGuidance with the race wind). Returns every boat's
 * finish time (Infinity: none). */
function sailRace(difficulty: Difficulty, windMul: number, seed: number): Map<string, number> {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const course = makeCourse();
  const spawns = legacyRaceSpawns(course, cfg.opponents);
  const random = seeded(seed);
  const boats: Sailed[] = spawns.map((s, i) => ({
    id: i ? `ai${i - 1}` : "player", name: i ? `Bot ${i}` : "You", color: "#888", pos: { ...s.pos }, heading: s.heading,
    speed: 0, lapDone: 0, isPlayer: i === 0, speedMul: i ? raceBotSpeedMul(cfg.aiSpeedMul, random) : 1,
  }));
  const player = boats[0];
  const dt = 1 / 30;
  let memory: RouteGuidanceState | null = null, target = player.heading;
  for (let i = 0; i < 30 * 600 && boats.some((b) => b.lapDone < 2); i++) {
    const t = i * dt, wind = soloRaceWind(t);
    // The race loop replans the hint every HUD tick (10 Hz).
    if (i % 3 === 0 && player.lapDone < 2) {
      const advice = planRouteGuidance(player, course, wind.dir, memory, null, raceUpwind(12 * windMul).twa);
      memory = advice.state;
      if (advice.guidance) target = advice.guidance.suggestedHeading;
    }
    const previous = new Map(boats.map((b) => [b.id, { ...b.pos }]));
    for (const b of boats) {
      if (b.lapDone === 2) continue;
      const turn = b.isPlayer ? Math.max(-1, Math.min(1, angleDiff(b.heading, target) / 12)) : raceAutopilotTurn(b, course, wind.dir);
      stepBoat(b, dt, wind.dir, wind.gust, b.isPlayer ? { turn, autoTrim: true } : { turn },
        { windStrengthMul: windMul, speedMul: b.speedMul, steering: b.isPlayer ? "responsive" : "legacy" });
    }
    resolveCollisions(boats, dt);
    for (const b of boats) updateLap(b, previous.get(b.id)!, course, (i + 1) * dt);
  }
  return new Map(boats.map((b) => [b.id, b.lapDone === 2 && Number.isFinite(b.finishTime) ? b.finishTime! : Infinity]));
}

const beaten = (times: Map<string, number>) => [...times].filter(([id, t]) => id !== "player" && t > times.get("player")!).length;

describe("first race: following the hints beats the fleet (package 7, K3)", () => {
  for (const [wind, mul] of Object.entries(WIND)) for (const seed of [1, 7, 42]) {
    it(`easy level, ${wind} wind, seed ${seed}: the player finishes and beats at least one bot`, () => {
      const times = sailRace("easy", mul, seed);
      expect(times.get("player")).toBeLessThan(Infinity);
      expect(beaten(times), JSON.stringify([...times])).toBeGreaterThanOrEqual(1);
    }, 30_000);
  }

  for (const [wind, mul] of Object.entries(WIND)) it(`medium level, ${wind} wind: the player beats at least one bot`, () => {
    const times = sailRace("medium", mul, 3);
    expect(times.get("player")).toBeLessThan(Infinity);
    expect(beaten(times), JSON.stringify([...times])).toBeGreaterThanOrEqual(1);
  }, 30_000);
});
