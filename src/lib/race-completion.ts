import { SAILING_STEP_SECONDS } from "@/features/sailing-lab/runtime/fixed-clock";
import { raceAutopilotTurn, resolveCollisions, stepBoat, updateLap, windAt, type RaceBoat, type RaceCourse } from "./race-physics";
import { evaluateRaceRules, type RaceRulesState } from "./race-rules";
import type { NativeRaceSnapshot } from "./race-native";

const MAX_RACE_SECONDS = 300;
const FLEET_FINISH_SECONDS = 15;

/** Resolve the existing finish window immediately. Finished boats are frozen;
 * remaining bots still have to sail the course with the same 30 Hz engine.
 * A boat that cannot reach the line before the cutoff remains unfinished. */
export function resolveFinishedFleet<T extends RaceBoat & { speedMul?: number }>(frame: {
  boats: readonly T[]; course: RaceCourse; time: number; windStrengthMul: number;
  rules: RaceRulesState; rulesEnabled: boolean; penaltiesEnabled: boolean;
}) {
  const boats = frame.boats.map(boat => ({ ...boat, pos: { ...boat.pos },
    ...(boat.physics ? { physics: { ...boat.physics } } : {}), ...(boat.trim ? { trim: { ...boat.trim } } : {}),
    ...(boat.autopilot ? { autopilot: { ...boat.autopilot,
      ...(boat.autopilot.dip ? { dip: { ...boat.autopilot.dip } } : {}),
      ...(boat.autopilot.finishLoop ? { finishLoop: { ...boat.autopilot.finishLoop } } : {}) } } : {}) }));
  let time = frame.time, rules = frame.rules, steps = 0;
  const player = boats.find(boat => boat.isPlayer);
  const cutoff = Math.min(MAX_RACE_SECONDS, (player?.finishTime ?? time) + FLEET_FINISH_SECONDS);
  if (player?.lapDone !== 2) return { boats, rules, time, steps };
  while (steps < FLEET_FINISH_SECONDS / SAILING_STEP_SECONDS && time + SAILING_STEP_SECONDS <= cutoff + 1e-8 && boats.some(boat => boat.lapDone < 2)) {
    time += SAILING_STEP_SECONDS; steps += 1;
    const wind = windAt(time);
    const previousPositions = Object.fromEntries(boats.map(boat => [boat.id, { ...boat.pos }]));
    for (const boat of boats) if (!boat.isPlayer && boat.lapDone < 2) {
      const turn = raceAutopilotTurn(boat, frame.course, wind.dir);
      stepBoat(boat, SAILING_STEP_SECONDS, wind.dir, wind.gust, { turn }, { windStrengthMul: frame.windStrengthMul, speedMul: boat.speedMul, steering: "legacy" });
    }
    rules = evaluateRaceRules(rules, { boats, course: frame.course, windDir: wind.dir, time, racing: true,
      enabled: frame.rulesEnabled, penalties: frame.penaltiesEnabled, previousPositions }).state;
    resolveCollisions(boats, SAILING_STEP_SECONDS);
    for (const boat of boats) if (!boat.isPlayer && boat.lapDone < 2) updateLap(boat, previousPositions[boat.id], frame.course, time);
  }
  return { boats, rules, time, steps };
}

/** Pending saves belong to completed race IDs, never to the next menu/run.
 * Native persistence is idempotent, so retrying until a matching ack is safe. */
export function createPendingRaceSaves() {
  const pending = new Map<string, NativeRaceSnapshot>();
  return {
    add(snapshot: NativeRaceSnapshot) {
      if (pending.has(snapshot.id)) return;
      pending.set(snapshot.id, JSON.parse(JSON.stringify(snapshot)) as NativeRaceSnapshot);
    },
    get: (id: string) => pending.get(id),
    acknowledge: (id: string) => pending.delete(id),
    values: () => [...pending.values()],
  };
}
