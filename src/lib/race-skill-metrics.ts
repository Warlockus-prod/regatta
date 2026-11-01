// Skill metrics of one solo race (M4-1), computed from the race log the coach
// and the race.summary journal already read (samples every 0.5 s, the
// classified tacks and gybes of race-manoeuvres.ts, the mark rounding). Pure:
// the results screen, the tests and later the replay feed read one definition.
//
// What is measured, and against what:
// - start: seconds after the gun the player crossed the start line;
// - upwind and downwind VMG: speed made good along the wind (each sample's
//   own TWA) against the best VMG the HUD target speed (the force model's
//   best trim at this wind, features/race-hud/target.ts) allows;
// - tacks: their angle and the speed given away in each (knots), over the
//   live tack cue's windows (useRaceLoop.ts, race-cues.ts watchTurn): the best
//   speed of the 3 s before against the slowest from 1 s before up to 4 s
//   after. The cue may stop looking earlier, once the boat picks up, and reads
//   every frame rather than the 0.5 s log, so the two can differ a little;
// - no-go zone: seconds inside it, the coach's own definition (measureRaceLog);
// - mark rounding: seconds below the target speed around the windward mark.
// Not measured: overstanding the layline. The race draws, plans and judges no
// layline (the route hint aims at the mark, race-guidance.ts), so a number
// here would claim something the race does not know. M0-13 also showed that a
// tack in this race costs speed for about a second and no distance, so the
// tack metric reports the speed lost, never time or distance lost.

import { measureRaceLog } from "./fallback-coach";
import { TACK_WINDOWS, finite, mean, measureTacks, usableSkillSamples, type SkillEvent, type SkillSample, type TackMetric } from "./race-tack-metrics";

// The tack measurement lives in race-tack-metrics.ts (M4-3: the replay ribbon
// reads it without the coach); these re-exports keep one import for the bars.
export { measureTacks, type SkillEvent, type SkillSample, type TackMetric };

export interface SkillVec { x: number; y: number }

export interface RaceSkillInput {
  samples: readonly SkillSample[];
  events: readonly SkillEvent[];
  course: { windwardMark: SkillVec; startLine: { a: SkillVec; b: SkillVec } };
  /** HUD target speed (knots) at an absolute true wind angle 0..180. */
  targetKn: (absTwa: number) => number;
  /** Race seconds after the gun when the player crossed the start line; null if never. */
  startedAt: number | null;
}

export interface VmgMetric {
  /** Time-weighted player VMG over the best VMG the target allows. */
  ratio: number;
  playerKn: number;
  bestKn: number;
  seconds: number;
}

export interface RaceSkillMetrics {
  start: { lateSec: number | null };
  upwind: VmgMetric | null;
  downwind: VmgMetric | null;
  tacks: { count: number; list: TackMetric[]; avgAngleDeg: number | null; avgSpeedLossKn: number | null };
  gybes: number;
  noGo: { seconds: number; entries: number };
  mark: { belowTargetSec: number } | null;
  /** Always null: the race does not know the layline (see the header). */
  laylineOverstandSec: null;
}

const rad = (d: number) => d * Math.PI / 180;

export const SKILL_WINDOWS = {
  /** Samples this close to the windward mark belong to the rounding, not to a leg. */
  markZone: 60,
  /** The rounding window around the mark-rounded event, seconds each side. */
  roundingSec: 6,
  /** A VMG figure needs at least this much sailing on the leg, seconds. */
  minLegSec: 10,
  /** The tack windows (race-tack-metrics.ts). */
  ...TACK_WINDOWS,
} as const;


/** Seconds each sample stands for, as the coach weighs them (gap to the next, at most 2 s). */
function weights(samples: readonly SkillSample[]): number[] {
  return samples.map((s, i) => {
    const next = samples[i + 1];
    const dt = next ? next.t - s.t : 0.5;
    return finite(dt) && dt > 0 ? Math.min(dt, 2) : 0;
  });
}

/** Best VMG along the wind (upwind: +1, downwind: -1) the target speed table
 * at whole degrees allows. */
function bestVmg(table: readonly number[], along: 1 | -1): number {
  let best = 0;
  for (let a = 0; a <= 180; a++) best = Math.max(best, table[a] * along * Math.cos(rad(a)));
  return best;
}

/** Time-weighted VMG along the wind of the picked samples against the best the
 * target allows. Upwind and downwind VMG, not VMG towards the mark: the first
 * leg of a beat sails away from the mark's bearing by design, and the race
 * course is windward-leeward, so the wind axis is the mark's axis. */
function legVmg(samples: readonly SkillSample[], w: readonly number[], pick: (s: SkillSample) => boolean, along: 1 | -1,
  table: readonly number[]): VmgMetric | null {
  const best = bestVmg(table, along);
  let player = 0, seconds = 0;
  samples.forEach((s, i) => {
    if (!w[i] || !pick(s)) return;
    player += w[i] * Math.max(0, s.speed) * along * Math.cos(rad(s.twa));
    seconds += w[i];
  });
  if (seconds < SKILL_WINDOWS.minLegSec || !(best > 0)) return null;
  return { ratio: player / (best * seconds), playerKn: player / seconds, bestKn: best, seconds };
}

/** Start line crossing upwards after the gun, interpolated between samples. */
function crossingFromSamples(samples: readonly SkillSample[], line: { a: SkillVec; b: SkillVec }): number | null {
  const y = (line.a.y + line.b.y) / 2, minX = Math.min(line.a.x, line.b.x), maxX = Math.max(line.a.x, line.b.x);
  for (let i = 1; i < samples.length; i++) {
    const p = samples[i - 1], s = samples[i];
    if (p.t < 0 || !(p.y >= y && s.y < y)) continue;
    const f = (p.y - y) / (p.y - s.y);
    const x = p.x + (s.x - p.x) * f;
    if (x >= minX && x <= maxX) return p.t + (s.t - p.t) * f;
  }
  return null;
}

export function measureRaceSkills(input: RaceSkillInput): RaceSkillMetrics {
  const samples = usableSkillSamples(input.samples);
  const w = weights(samples);
  const table = Array.from({ length: 181 }, (_, a) => {
    const v = input.targetKn(a);
    return finite(v) && v > 0 ? v : 0;
  });
  const mark = input.course.windwardMark;
  const roundedAt = input.events.find((e) => e.type === "mark-rounded")?.t;
  const startedAt = finite(input.startedAt) ? input.startedAt : crossingFromSamples(samples, input.course.startLine);
  const far = (s: SkillSample) => Math.hypot(s.x - mark.x, s.y - mark.y) > SKILL_WINDOWS.markZone;
  const R = SKILL_WINDOWS.roundingSec;

  const upwind = legVmg(samples, w, (s) => s.lap === 0 && startedAt !== null && s.t >= startedAt && far(s)
    && (roundedAt === undefined || s.t < roundedAt - R), 1, table);
  const downwind = roundedAt === undefined ? null
    : legVmg(samples, w, (s) => s.lap === 1 && s.t > roundedAt + R && far(s), -1, table);

  const tackList = measureTacks(samples, input.events);
  const angles = tackList.map((m) => m.angleDeg).filter(finite);
  const losses = tackList.map((m) => m.speedLossKn).filter(finite);

  let markMetric: RaceSkillMetrics["mark"] = null;
  if (roundedAt !== undefined) {
    let below = 0, seen = 0;
    samples.forEach((s, i) => {
      if (s.t < roundedAt - R || s.t > roundedAt + R) return;
      const target = table[Math.min(180, Math.round(Math.abs(s.twa)))];
      below += w[i] * (target > 0 ? Math.max(0, 1 - s.speed / target) : 1);
      seen++;
    });
    if (seen) markMetric = { belowTargetSec: below };
  }

  const coach = measureRaceLog({ samples: samples.map((s) => ({ ...s })), events: input.events.map((e) => ({ type: e.type as "tack", t: e.t })) });
  return {
    start: { lateSec: startedAt === null ? null : Math.max(0, startedAt) },
    upwind,
    downwind,
    tacks: { count: tackList.length, list: tackList, avgAngleDeg: mean(angles), avgSpeedLossKn: mean(losses) },
    gybes: input.events.filter((e) => e.type === "gybe").length,
    noGo: { seconds: coach.noGoSeconds, entries: coach.noGoEntries },
    mark: markMetric,
    laylineOverstandSec: null,
  };
}

// ---------------------------------------------------------------------------
// The skill bars of the results screen: one number each, a fill 0..1 (1 is
// better) and "good" when the number reaches the threshold. The thresholds
// are first guesses from M0-13 and the HUD target; they are not tuned on
// recorded races yet.
// ---------------------------------------------------------------------------

export type SkillBarId = "start" | "upwind" | "tacks" | "no-go";

export interface SkillBar {
  id: SkillBarId;
  /** The number the label shows: seconds, a share (0..1), or knots. */
  value: number;
  /** Bar fill, 0..1, more is better. */
  fill: number;
  good: boolean;
}

export const SKILL_BAR_SCALE = {
  /** Start: full bar at or below `fullSec` after the gun, empty from `emptySec`. */
  start: { fullSec: 2, emptySec: 20, goodSec: 4 },
  /** Upwind VMG share of the best: the fill is the share itself. */
  upwind: { good: 0.85 },
  /** Speed lost per tack: empty bar from `emptyKn`. M0-13: a clean tack here loses about 0.6 kn. */
  tacks: { emptyKn: 2, goodKn: 0.8 },
  /** Seconds in the no-go zone: empty bar from `emptySec`. */
  noGo: { emptySec: 30, goodSec: 3 },
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The bars this race can fill, in screen order; a bar without data is left out. */
export function raceSkillBars(m: RaceSkillMetrics): SkillBar[] {
  const S = SKILL_BAR_SCALE;
  const bars: SkillBar[] = [];
  if (m.start.lateSec !== null) {
    const late = m.start.lateSec;
    bars.push({ id: "start", value: late, fill: clamp01(1 - (late - S.start.fullSec) / (S.start.emptySec - S.start.fullSec)), good: late <= S.start.goodSec });
  }
  // The share is shown at most 100%: the target holds the mean wind, so a gust
  // or the boat's way carried through a wind shift can lift a beat a little
  // above it, and "103% of the best" would claim more than the race measures.
  if (m.upwind) bars.push({ id: "upwind", value: clamp01(m.upwind.ratio), fill: clamp01(m.upwind.ratio), good: m.upwind.ratio >= S.upwind.good });
  if (m.tacks.avgSpeedLossKn !== null) {
    const loss = m.tacks.avgSpeedLossKn;
    bars.push({ id: "tacks", value: loss, fill: clamp01(1 - loss / S.tacks.emptyKn), good: loss <= S.tacks.goodKn });
  }
  if (m.upwind || m.noGo.seconds > 0) {
    const sec = m.noGo.seconds;
    bars.push({ id: "no-go", value: sec, fill: clamp01(1 - sec / S.noGo.emptySec), good: sec <= S.noGo.goodSec });
  }
  return bars;
}
