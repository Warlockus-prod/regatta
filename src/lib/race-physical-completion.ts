// M5 (ADR-0015 point 8): the metric fleet sails to its finish after the player.
//
// Contract: after the player finishes, the player's raw time never changes,
// every bot finishes by the same 30 Hz fleet step as the live race (the same
// stepPhysicalRaceFleet, the race's own wind soloRaceWind and the same judge)
// or stays unfinished (DNF) at the course limit, the result is identical
// however the work is sliced, and one advance() with a deadline never spends
// more than that deadline.
//
// The legacy resolveFinishedFleet (race-completion.ts) is not used for the
// metric race and stays as it is. Its windAt(time) has the default seed 0 and
// gives the same numbers as soloRaceWind(time); this module still names the
// live race's wind itself.
import type { PhysicalRaceContext } from "./race-context";
import { physicalCourseDefinition } from "./race-courses";
import type { PhysicalBotState } from "./race-physical-bot";
import { SAILING_STEP_SECONDS } from "@/features/sailing-lab/runtime/fixed-clock";
import type { PhysicalFleetFrame, PhysicalFleetStep } from "./race-physical-fleet";
import type { PhysicalRaceCrew, PhysicalRaceInput } from "./race-physical-motion";
import { distance, type RaceBoat, type RaceCourse, type Vec2 } from "./race-physics";
import { evaluateRaceRules, type RaceRulesState } from "./race-rules";
import { raceScale } from "./race-scale";
import { soloRaceWind } from "./race-solo-wind";

// The live loop's fixed step (1/30 s, the fleet's PHYSICAL_FLEET_HZ), taken
// from the clock module so the bot module stays out of the legacy race's bundle.
const DT = SAILING_STEP_SECONDS;
/** Below this mean speed made good along the course, m/s, no estimate is made. */
const MIN_ESTIMATE_VMG_MPS = 0.05;
/** A hard cap on ticks per advance(), whatever the clock says (20 race seconds). */
export const RESOLVER_MAX_TICKS_PER_ADVANCE = 600;

/** The metric race's time limit, one predicate for the live loop and this
 * resolver: after the tick at race time `time`, no further 1/30 s tick fits
 * in `limitSec`, so this tick is the last one. The clock sums 1/30 s and
 * drifts below the exact multiple (1500 s ends at 1499.99999999929), so a bare
 * `time > limitSec` would let the live race run one tick past the resolver
 * on the medium and long courses. */
export function physicalRaceTimeUp(time: number, limitSec: number): boolean {
  return time + DT > limitSec + 1e-8;
}

type ResolverBoat = RaceBoat & { speedMul?: number };
export interface PhysicalFleetResolverInput<T extends ResolverBoat> {
  /** The fleet at the player's finish tick (copied; the caller's objects are never touched). */
  readonly boats: readonly T[];
  /** The bots' navigation memory after that tick. */
  readonly navigation?: ReadonlyMap<string, PhysicalBotState>;
  readonly course: RaceCourse;
  readonly context: PhysicalRaceContext;
  /** Race time of the player's finish tick, seconds. */
  readonly time: number;
  readonly windStrengthMul: number;
  readonly rules: RaceRulesState;
  readonly rulesEnabled: boolean;
  readonly penaltiesEnabled: boolean;
  /** The lazily loaded fleet step (src/lib/race-physical-fleet.ts), so this
   * module does not pull the fleet into the legacy race's bundle. */
  readonly step: (frame: PhysicalFleetFrame) => PhysicalFleetStep | null;
}
export interface PhysicalFleetResolution<T extends ResolverBoat> {
  /** All boats finished, the limit was reached, or a fleet frame was rejected. */
  readonly done: boolean;
  /** A fleet frame was rejected: the remaining boats are unresolved (use estimate()). */
  readonly failed: boolean;
  readonly boats: readonly T[];
  readonly rules: RaceRulesState;
  /** Race time of the last resolved tick, seconds. */
  readonly time: number;
  /** Ticks resolved by this advance() call. */
  readonly ticks: number;
}
export interface PhysicalFleetResolver<T extends ResolverBoat> {
  /** Resolve up to maxTicks ticks (default RESOLVER_MAX_TICKS_PER_ADVANCE),
   * stopping before deadlineMs of now() would be exceeded. */
  advance(budget?: { maxTicks?: number; deadlineMs?: number; now?: () => number }): PhysicalFleetResolution<T>;
  /** For every unfinished bot: its estimated raw finish if it sails on from
   * race time `now` at its mean speed made good so far, or null (no progress,
   * or later than the course limit). */
  estimate(now?: number): ReadonlyMap<string, number | null>;
  /** Boat ids still being resolved (unfinished bots), empty once done. */
  pending(): ReadonlySet<string>;
}

const structuredCopy = <V,>(value: V): V => JSON.parse(JSON.stringify(value)) as V;
/** A copy that shares no object with the caller's boat, crew state included
 * (stepPhysicalBoat keeps the held sheets and sail positions on the boat). */
function copyBoat<T extends ResolverBoat>(boat: T): T {
  const crew = boat as T & PhysicalRaceCrew;
  return { ...boat, pos: { ...boat.pos }, ...(boat.physics ? { physics: { ...boat.physics } } : {}),
    ...(boat.trim ? { trim: { ...boat.trim } } : {}),
    ...(crew.live ? { live: structuredCopy(crew.live) } : {}), ...(crew.rig ? { rig: structuredCopy(crew.rig) } : {}),
    ...(boat.autopilot ? { autopilot: { ...boat.autopilot,
      ...(boat.autopilot.dip ? { dip: { ...boat.autopilot.dip } } : {}),
      ...(boat.autopilot.finishLoop ? { finishLoop: { ...boat.autopilot.finishLoop } } : {}) } } : {}) };
}

/** The finished player's entry: never stepped (a finished boat leaves the
 * water in the metric fleet), but the frame still needs a valid input. */
const FROZEN_INPUT: PhysicalRaceInput = { steering: { mode: "helm", rudder: 0, lowSpeedAssist: true }, autoTrim: true };

export function createPhysicalFleetResolver<T extends ResolverBoat>(input: PhysicalFleetResolverInput<T>): PhysicalFleetResolver<T> {
  const limit = physicalCourseDefinition(input.context.profile).maxRaceSeconds;
  const scale = raceScale(input.context.profile), m = input.context.metresPerUnit;
  let boats: T[] = input.boats.map(copyBoat);
  let navigation: ReadonlyMap<string, PhysicalBotState> | undefined = input.navigation
    ? new Map([...input.navigation].map(([id, state]) => [id, structuredCopy(state)])) : undefined;
  let rules = input.rules, time = input.time, failed = false;
  // Only a finished player hands the race over; an unfinished one would need its own input.
  const handedOver = boats.some(b => b.isPlayer) && boats.every(b => !b.isPlayer || b.lapDone === 2);
  const finished = () => !handedOver || failed || boats.every(b => b.isPlayer || b.lapDone === 2);
  const atLimit = () => physicalRaceTimeUp(time, limit);
  const done = () => finished() || atLimit();

  const tick = (): boolean => {
    time += DT;
    const wind = soloRaceWind(time);
    const previousPositions: Record<string, Vec2> = Object.fromEntries(boats.map(b => [b.id, { ...b.pos }]));
    const stepped = input.step({ context: input.context, course: input.course, dt: DT, raceTime: time, racing: true,
      windDir: wind.dir, gust: wind.gust, windStrengthMul: input.windStrengthMul, navigation,
      entries: boats.map(boat => ({ boat, speedMul: boat.speedMul, input: boat.isPlayer ? FROZEN_INPUT : "bot" as const })) });
    if (!stepped) { time -= DT; failed = true; return false; }
    // The fleet returns fresh copies with the same fields (speedMul, name, colour kept).
    boats = stepped.boats as T[]; navigation = stepped.navigation;
    rules = evaluateRaceRules(rules, { boats, course: input.course, windDir: wind.dir, time, racing: true, scale,
      enabled: input.rulesEnabled, penalties: input.penaltiesEnabled, previousPositions, impacts: stepped.impacts }).state;
    return true;
  };

  const windward = input.course.marks.find(mark => mark.type === "windward")?.pos ?? input.course.marks[0].pos;
  const line = input.course.finishLine, finishCentre = { x: (line.a.x + line.b.x) / 2, y: (line.a.y + line.b.y) / 2 };
  const startCentre = { x: (input.course.startLine.a.x + input.course.startLine.b.x) / 2, y: (input.course.startLine.a.y + input.course.startLine.b.y) / 2 };
  const totalUnits = distance(startCentre, windward) + distance(windward, finishCentre);
  const homeUnits = distance(windward, finishCentre);
  /** Remaining path, race units: to the windward gate, then the finish lane
   * (a boat still to start first goes back to the line). */
  const remainingUnits = (boat: RaceBoat) => boat.lapDone >= 1 ? distance(boat.pos, finishCentre)
    : boat.started ? distance(boat.pos, windward) + homeUnits
    : distance(boat.pos, startCentre) + totalUnits;

  return {
    advance(budget = {}) {
      const maxTicks = Math.min(budget.maxTicks ?? RESOLVER_MAX_TICKS_PER_ADVANCE, Number.MAX_SAFE_INTEGER);
      const now = budget.now ?? (() => performance.now());
      const deadline = budget.deadlineMs;
      const started = deadline === undefined ? 0 : now();
      let ticks = 0, last = started, longest = 0;
      while (ticks < maxTicks && !done()) {
        if (!tick()) break;
        ticks += 1;
        if (deadline !== undefined) {
          // Stop before the next tick could overrun: the time spent plus the
          // longest tick of this call (a tick itself is never cut short).
          const at = now();
          longest = Math.max(longest, at - last); last = at;
          if (at - started + longest > deadline) break;
        }
      }
      return { done: done(), failed, boats, rules, time, ticks };
    },
    estimate(now = time) {
      const out = new Map<string, number | null>();
      for (const boat of boats) {
        if (boat.isPlayer || boat.lapDone === 2) continue;
        const remaining = remainingUnits(boat) * m;
        const covered = Math.max(0, totalUnits * m - remaining);
        const vmg = time > 0 ? covered / time : 0;
        const at = Math.max(now, time) + (vmg >= MIN_ESTIMATE_VMG_MPS ? remaining / vmg : Infinity);
        out.set(boat.id, Number.isFinite(at) && at <= limit ? at : null);
      }
      return out;
    },
    pending() {
      return new Set(done() && !failed ? [] : boats.filter(b => !b.isPlayer && b.lapDone !== 2).map(b => b.id));
    },
  };
}
