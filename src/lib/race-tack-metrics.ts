// The tack measurement of one race log (M4-1), split out of
// race-skill-metrics.ts in M4-3 so the replay's event ribbon
// (race-replay-teaching.ts) reads the same numbers without importing the
// local coach (fallback-coach.ts) into the light shared replay route
// /r/<code>. Each tack: its angle and the speed given away (knots), over the
// live tack cue's windows (useRaceLoop.ts, race-cues.ts watchTurn): the best
// speed of the 3 s before against the slowest from 1 s before up to 4 s
// after. Speed only, never time or distance (M0-13).

export interface SkillSample {
  t: number; x: number; y: number; heading: number; twa: number; speed: number; lap: number; windDir?: number;
}

export interface SkillEvent { type: string; t: number }

export interface TackMetric {
  t: number;
  /** Heading change through the wind, degrees; null when the log is too thin. */
  angleDeg: number | null;
  /** Best speed going in minus the slowest coming out, knots. */
  speedLossKn: number | null;
}

export const TACK_WINDOWS = {
  /** Best speed going into a tack: samples in [t - this, t] (the cue's 3 s). */
  tackBeforeSec: 3,
  /** The boat settles up to this long before it crosses the wind (the cue's 1 s). */
  tackSettleSec: 1,
  /** Slowest speed coming out of a tack: samples in [t - settle, t + this]
   * (the cue's TURN_COST.timeoutSec). */
  tackAfterSec: 4,
} as const;

export const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export const mean = (xs: readonly number[]) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;

function tackMetric(samples: readonly SkillSample[], t: number): TackMetric {
  const W = TACK_WINDOWS;
  const after = samples.find((s) => s.t >= t);
  const side = after ? Math.sign(after.twa) : 0;
  const into = samples.filter((s) => s.t >= t - W.tackBeforeSec && s.t <= t);
  const out = samples.filter((s) => s.t >= t - W.tackSettleSec && s.t <= t + W.tackAfterSec);
  const before = into.length ? Math.max(...into.map((s) => s.speed)) : null;
  const slowest = out.length ? Math.min(...out.map((s) => s.speed)) : null;
  const oldSide = mean(samples.filter((s) => s.t >= t - 8 && s.t <= t - 3 && side !== 0 && Math.sign(s.twa) === -side).map((s) => Math.abs(s.twa)));
  const newSide = mean(samples.filter((s) => s.t >= t + 2 && s.t <= t + 6 && side !== 0 && Math.sign(s.twa) === side).map((s) => Math.abs(s.twa)));
  return {
    t,
    angleDeg: oldSide === null || newSide === null ? null : oldSide + newSide,
    speedLossKn: before === null || slowest === null ? null : Math.max(0, before - slowest),
  };
}

export const usableSkillSamples = (samples: readonly SkillSample[]) =>
  samples.filter((s) => finite(s.t) && finite(s.x) && finite(s.y) && finite(s.heading) && finite(s.twa) && finite(s.speed));

/** Every logged tack with its angle and speed loss, in log order. The tacks
 * bar (race-skill-metrics.ts) shows their average, the replay ribbon (M4-3,
 * race-replay-teaching.ts) each tack's own loss. */
export function measureTacks(samples: readonly SkillSample[], events: readonly SkillEvent[]): TackMetric[] {
  const clean = usableSkillSamples(samples);
  return events.filter((e) => e.type === "tack" && finite(e.t)).map((e) => tackMetric(clean, e.t));
}
