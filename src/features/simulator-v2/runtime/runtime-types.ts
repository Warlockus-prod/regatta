import { type BoatState, type Controls, type TickDiagnostics } from '@/lib/sailing-physics';

// ---------------------------------------------------------------------------
// V2 live-runtime state.
//
// Mirrors the V3 runtime shape but without the coaching/trim-score/ghost
// machinery. V2 auto-trims based on TWA (it is the race view, not a
// trainer), so `target` is derived from ui once per relevant change and
// `live` walks toward it each tick. The hook owns the simulation clock.
// ---------------------------------------------------------------------------

export interface RuntimeState {
  /** Seconds since the last reset. */
  simTime: number;
  /** Authoritative boat state the engine mutates each tick. */
  boat: BoatState;
  /** Controls actually applied to the last tick (interpolated). */
  live: Controls;
  /** Controls the user last requested (derived from UI + auto-trim). */
  target: Controls;
  /** Compass heading the boat is steering toward (degrees, 0-360). */
  targetHeading: number;
  /** Diagnostics from the last tick - the scene reads this for AWA/AWS. */
  lastDiag: TickDiagnostics;
}

/**
 * Max rate of change per second for each control while interpolating
 * live toward target. Same envelope as V3 - these are physical limits
 * tied to winch / reef / furling speed, not a pedagogical choice.
 */
export const CONTROL_RATES: Record<keyof Controls, number> = {
  mainSheet: 0.6,
  jibSheet: 0.6,
  mainTwist: 0.5,
  jibTwist: 0.5,
  reef: 0.3,
  jibFurl: 0.4,
  jibSide: Infinity,
};

/**
 * Boat turn rate in degrees per second. Tuned so a 90-degree tack takes
 * about 2 seconds and a full 180-degree reversal takes about 4 seconds,
 * which matches how fast a 30-40 ft cruiser rounds up with helm hard over.
 */
export const HEADING_TURN_RATE_DEG_PER_S = 45;
