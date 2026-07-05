// ---------------------------------------------------------------------------
// V3 wind dynamics: steady / shift / gust modulation of the true wind.
//
// The user's sliders always express the BASE wind (baseTws knots, baseDir
// compass degrees). The dynamics layer modulates around that base:
//
// - 'steady': no modulation. Any residual offset (e.g. after switching
//   modes mid-gust) relaxes smoothly back to neutral instead of snapping.
// - 'shift': slow sinusoidal wander of the wind DIRECTION, +-12 deg over
//   a ~50 s period. The boat holds its compass course, so the felt TWA
//   gets headed/lifted exactly like a real oscillating breeze.
// - 'gust': episodic gusts. Every 15-30 s the wind SPEED ramps up by
//   30-45% over ~2 s, holds ~4-6 s, then decays over ~3 s back to base.
//
// Everything is deterministic: no Math.random anywhere. Gust scheduling
// draws from a seeded LCG stored in the state; the shift sinusoid is a
// pure function of the accumulated wind clock `t`. Same seed + same step
// sequence = same wind, which keeps the runtime replayable and testable.
// ---------------------------------------------------------------------------

export type WindMode = 'steady' | 'shift' | 'gust';

export interface GustEpisode {
  /** Wind-clock time (s) at which the ramp began. */
  startAt: number;
  /** TWS multiplier at the top of the gust (1.30..1.45). */
  peakFactor: number;
  /** Seconds the gust holds at peak before decaying (4..6). */
  hold: number;
}

export interface WindState {
  /** BASE true wind speed in knots - the user's slider value. */
  baseTws: number;
  /** BASE true wind direction, compass degrees - the world reference. */
  baseDir: number;
  /** Wind clock: seconds accumulated since runtime creation. Drives the
   *  shift sinusoid phase and the gust schedule. */
  t: number;
  /** LCG state (uint32) for gust randomness. Deterministic per seed. */
  seed: number;
  /** Current TWS multiplier applied to baseTws. 1 = neutral. */
  twsFactor: number;
  /** Current direction offset in degrees added to baseDir. 0 = neutral. */
  dirOffset: number;
  /** Active gust episode, or null between gusts. */
  gust: GustEpisode | null;
  /** Wind-clock time the next gust is allowed to start. */
  nextGustAt: number;
}

// Shift: +-12 deg sinusoidal wander with a ~50 s period (inside the asked
// 40-60 s window). SLEW caps how fast dirOffset may move so that entering
// shift mode mid-phase converges onto the sinusoid instead of snapping;
// 2.5 deg/s comfortably exceeds the sinusoid's own max slope
// (12 * 2*PI / 50 ~= 1.5 deg/s), so once caught up it tracks exactly.
export const SHIFT_AMPLITUDE_DEG = 12;
export const SHIFT_PERIOD_S = 50;
const SHIFT_SLEW_DEG_PER_S = 2.5;

// Gust envelope: ramp 2 s -> hold 4-6 s at 1.30-1.45x -> decay 3 s.
export const GUST_RAMP_S = 2;
export const GUST_DECAY_S = 3;
const GUST_MIN_HOLD_S = 4;
const GUST_MAX_HOLD_S = 6;
export const GUST_MIN_FACTOR = 1.3;
export const GUST_MAX_FACTOR = 1.45;
const GUST_MIN_INTERVAL_S = 15;
const GUST_MAX_INTERVAL_S = 30;
// While NOT in gust mode the scheduler keeps nextGustAt dragged along at
// t + ARM_DELAY, so flipping the selector to "Gusts" delivers the first
// gust within a few seconds instead of a dead 15-30 s wait.
const GUST_ARM_DELAY_S = 4;

// How fast a leftover TWS factor relaxes to 1 when no gust drives it
// (mode switch mid-gust): 0.45 of excess decays in ~1.3 s.
const TWS_RELAX_PER_S = 0.35;

// Classic Numerical-Recipes LCG. Math.imul keeps it in uint32 land.
function lcgNext(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

function rand01(seed: number): number {
  return seed / 4294967296;
}

function approach(current: number, target: number, maxStep: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

export const DEFAULT_WIND_SEED = 0x5eed5a11;

export function createWindState(args: {
  baseTws: number;
  baseDir: number;
  seed?: number;
}): WindState {
  return {
    baseTws: args.baseTws,
    baseDir: args.baseDir,
    t: 0,
    seed: (args.seed ?? DEFAULT_WIND_SEED) >>> 0,
    twsFactor: 1,
    dirOffset: 0,
    gust: null,
    nextGustAt: GUST_ARM_DELAY_S,
  };
}

/**
 * Advance the wind modulation by dt seconds. Pure: same (state, mode, dt)
 * always yields the same next state. The caller applies the result as
 * effective TWS = baseTws * twsFactor, effective dir = baseDir + dirOffset.
 */
export function stepWind(prev: WindState, mode: WindMode, dt: number): WindState {
  const t = prev.t + dt;

  if (mode === 'shift') {
    const target =
      SHIFT_AMPLITUDE_DEG * Math.sin((2 * Math.PI * t) / SHIFT_PERIOD_S);
    return {
      ...prev,
      t,
      dirOffset: approach(prev.dirOffset, target, SHIFT_SLEW_DEG_PER_S * dt),
      twsFactor: approach(prev.twsFactor, 1, TWS_RELAX_PER_S * dt),
      gust: null,
      nextGustAt: Math.min(prev.nextGustAt, t + GUST_ARM_DELAY_S),
    };
  }

  if (mode === 'gust') {
    let { seed, gust, nextGustAt } = prev;
    let twsFactor = 1;
    if (!gust && t >= nextGustAt) {
      const s1 = lcgNext(seed);
      const s2 = lcgNext(s1);
      seed = s2;
      gust = {
        startAt: t,
        peakFactor:
          GUST_MIN_FACTOR + (GUST_MAX_FACTOR - GUST_MIN_FACTOR) * rand01(s1),
        hold: GUST_MIN_HOLD_S + (GUST_MAX_HOLD_S - GUST_MIN_HOLD_S) * rand01(s2),
      };
    }
    if (gust) {
      const e = t - gust.startAt;
      const over = gust.peakFactor - 1;
      if (e < GUST_RAMP_S) {
        twsFactor = 1 + over * (e / GUST_RAMP_S);
      } else if (e < GUST_RAMP_S + gust.hold) {
        twsFactor = gust.peakFactor;
      } else if (e < GUST_RAMP_S + gust.hold + GUST_DECAY_S) {
        twsFactor =
          gust.peakFactor - over * ((e - GUST_RAMP_S - gust.hold) / GUST_DECAY_S);
      } else {
        // Gust over: draw the next start time and go quiet.
        seed = lcgNext(seed);
        nextGustAt =
          t +
          GUST_MIN_INTERVAL_S +
          (GUST_MAX_INTERVAL_S - GUST_MIN_INTERVAL_S) * rand01(seed);
        gust = null;
        twsFactor = 1;
      }
    }
    return {
      ...prev,
      t,
      seed,
      twsFactor,
      dirOffset: approach(prev.dirOffset, 0, SHIFT_SLEW_DEG_PER_S * dt),
      gust,
      nextGustAt,
    };
  }

  // steady: relax any residual modulation back to neutral; keep the gust
  // scheduler armed just behind `t` so a later switch to gust mode fires
  // its first gust promptly.
  return {
    ...prev,
    t,
    twsFactor: approach(prev.twsFactor, 1, TWS_RELAX_PER_S * dt),
    dirOffset: approach(prev.dirOffset, 0, SHIFT_SLEW_DEG_PER_S * dt),
    gust: null,
    nextGustAt: Math.min(prev.nextGustAt, t + GUST_ARM_DELAY_S),
  };
}
