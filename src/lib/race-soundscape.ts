/**
 * Race soundscape mapping (M3-2, ADR-0019): what the boat is doing -> how
 * loud and how bright each procedural bed is. Pure numbers, no audio: the
 * runtime (race-soundscape-audio.ts) applies them on the shared context.
 *
 * - Wind bed: bandpass hiss from the apparent wind. More wind is never
 *   quieter and never darker.
 * - Water rush: lowpass noise from the boat speed. More speed is never
 *   quieter.
 * - Hull slaps: short low thumps; their rate and level grow with speed and
 *   heel. A boat that barely drifts makes none.
 * - Sail flogging: pulsed bandpass noise when the bow is in the no-go zone
 *   (both modes), or when the sails luff in Pro, where the player holds the
 *   sheets. In Simple the crew trims, so a luff reading there is ignored.
 * - Paused, muted or a reading that is not a number: silence.
 */

import type { CoachKey } from "@/features/sailing-lab/runtime/trim-coach";

export type RaceSoundMode = "simple" | "pro";

export interface RaceSoundscapeInput {
  apparentWindKn: number;
  boatSpeedKn: number;
  heelDeg: number;
  /** The trim coach reads a luff on the main, the jib or both. */
  luffing: boolean;
  /** The bow points inside the no-go zone, the sails cannot fill. */
  inIrons: boolean;
  mode: RaceSoundMode;
  paused: boolean;
  muted: boolean;
}

export interface RaceSoundscapeTargets {
  /** True when every bed must fade out (paused, muted, no reading). */
  silent: boolean;
  windGain: number;
  windFilterHz: number;
  waterGain: number;
  waterFilterHz: number;
  /** Hull slaps per second; 0 means none. */
  slapRateHz: number;
  slapGain: number;
  /** Flogging pulses per second; 0 means none. */
  flogRateHz: number;
  flogGain: number;
}

/** The mapping's numbers, one place to tune them. Gains sit under the 0.5 race master. */
export const RACE_SOUNDSCAPE = {
  wind: { maxKn: 35, base: 0.02, perKn: 0.0075, max: 0.28, filterBaseHz: 380, filterPerKn: 30 },
  water: { maxKn: 12, perKn: 0.026, max: 0.22, filterBaseHz: 260, filterPerKn: 55 },
  slap: { minKn: 0.4, rateBase: 0.3, ratePerKn: 0.1, ratePerHeelDeg: 0.015, maxRate: 2,
    gainBase: 0.03, gainPerKn: 0.01, gainPerHeelDeg: 0.0015, maxGain: 0.14, maxHeelDeg: 60 },
  flog: { minWindKn: 1, rateBase: 3, ratePerKn: 0.25, maxRate: 9, gainBase: 0.04, gainPerKn: 0.008, maxGain: 0.2,
    /** A luff flutters, a boat in irons slats: the luff is softer. */
    luffShare: 0.6 },
} as const;

export function createSilentTargets(): RaceSoundscapeTargets {
  return { silent: true, windGain: 0, windFilterHz: RACE_SOUNDSCAPE.wind.filterBaseHz, waterGain: 0,
    waterFilterHz: RACE_SOUNDSCAPE.water.filterBaseHz, slapRateHz: 0, slapGain: 0, flogRateHz: 0, flogGain: 0 };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function silence(out: RaceSoundscapeTargets): RaceSoundscapeTargets {
  out.silent = true;
  out.windGain = 0; out.windFilterHz = RACE_SOUNDSCAPE.wind.filterBaseHz;
  out.waterGain = 0; out.waterFilterHz = RACE_SOUNDSCAPE.water.filterBaseHz;
  out.slapRateHz = 0; out.slapGain = 0; out.flogRateHz = 0; out.flogGain = 0;
  return out;
}

/**
 * Fills `out` (reused by the race loop, so a tick allocates nothing) with the
 * targets for this moment and returns it.
 */
export function mapRaceSoundscape(input: RaceSoundscapeInput, out: RaceSoundscapeTargets = createSilentTargets()): RaceSoundscapeTargets {
  const { apparentWindKn, boatSpeedKn, heelDeg } = input;
  if (input.paused || input.muted || !Number.isFinite(apparentWindKn) || !Number.isFinite(boatSpeedKn) || !Number.isFinite(heelDeg)) return silence(out);
  const W = RACE_SOUNDSCAPE.wind, V = RACE_SOUNDSCAPE.water, S = RACE_SOUNDSCAPE.slap, F = RACE_SOUNDSCAPE.flog;
  const aws = clamp(apparentWindKn, 0, W.maxKn);
  const speed = clamp(boatSpeedKn, 0, V.maxKn);
  const heel = Math.min(Math.abs(heelDeg), S.maxHeelDeg);
  out.silent = false;
  out.windGain = Math.min(W.base + W.perKn * aws, W.max);
  out.windFilterHz = W.filterBaseHz + W.filterPerKn * aws;
  out.waterGain = Math.min(V.perKn * speed, V.max);
  out.waterFilterHz = V.filterBaseHz + V.filterPerKn * speed;
  const slapping = speed >= S.minKn;
  out.slapRateHz = slapping ? Math.min(S.rateBase + S.ratePerKn * speed + S.ratePerHeelDeg * heel, S.maxRate) : 0;
  out.slapGain = slapping ? Math.min(S.gainBase + S.gainPerKn * speed + S.gainPerHeelDeg * heel, S.maxGain) : 0;
  const luff = input.mode === "pro" && input.luffing;
  const flogging = (input.inIrons || luff) && aws >= F.minWindKn;
  out.flogRateHz = flogging ? Math.min(F.rateBase + F.ratePerKn * aws, F.maxRate) : 0;
  out.flogGain = flogging ? Math.min(F.gainBase + F.gainPerKn * aws, F.maxGain) * (input.inIrons ? 1 : F.luffShare) : 0;
  return out;
}

/** A luff reading of the shared trim coach (race-trim-coach.ts). */
export function coachLuffing(key: CoachKey | null): boolean {
  return key === "luffMain" || key === "luffJib" || key === "luffBoth";
}

/**
 * Whether the soundscape may sound in this race phase: while the boat is
 * raced (countdown and race, the finish hold included, when the loop no
 * longer updates and the beds keep their last level), not paused, sound on.
 * The results (end of the finish hold), the replay, the menu and the briefing
 * are silent.
 */
export function raceSoundscapeLive(phase: string, paused: boolean, soundOn: boolean): boolean {
  return (phase === "racing" || phase === "countdown") && !paused && soundOn;
}
