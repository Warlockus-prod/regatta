import { type BoatState, type Controls, type TickDiagnostics } from '@/lib/sailing-physics';

// ---------------------------------------------------------------------------
// V3 live-runtime state.
//
// The UI still holds the user-facing UiState (angles in degrees, percents,
// enums). The runtime holds the engine-facing controls (0..1 + jibSide),
// split into `live` (what the boat is currently doing) and `target` (where
// the user last set the sliders to). `live` interpolates toward `target`
// with per-control rate limits each tick, which is what gives V3 its
// "something changed, boat responds over time" feel instead of the old
// snap-to-settle jump.
// ---------------------------------------------------------------------------

export interface RuntimeState {
  /** Seconds since the last reset. Useful for telemetry and drills later. */
  simTime: number;
  /** Authoritative boat state the engine mutates each tick. */
  boat: BoatState;
  /** Controls actually applied to the last tick (interpolated). */
  live: Controls;
  /** Controls the user last requested. `live` walks toward this. */
  target: Controls;
  /** Compass heading the boat is steering toward (degrees, 0-360). The
   *  actual `boat.heading` rotates toward this at HEADING_TURN_RATE each
   *  tick. Derived from the user's TWA/tack intent by the hook. */
  targetHeading: number;
  /** Diagnostics from the last tick - the UI reads this for AWA/forces/AoA. */
  lastDiag: TickDiagnostics;
}

/** Max rate of change per second for each control while interpolating live
 *  toward target. Chosen to feel responsive without being teleporty.
 *
 * - Sheet on a winch: roughly 1.5-2 s from fully eased to hard-in (0.6/s).
 * - Twist (mast bend, traveler): similar.
 * - Reef: slow (~3 s full swing) because real reefing involves stopping,
 *   easing, tying down.
 * - Furl: between sheet and reef.
 * - JibSide: instant (wing-on-wing switch is atomic).
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
 * Max turn rate of the boat, degrees per second. A 40ft cruiser can round up
 * at roughly this rate with helm hard over; we keep it deliberately modest
 * so a tack through the wind takes ~4 seconds, which feels like a real tack
 * rather than a snap rotation. PR-3 does not model rudder hydrodynamics -
 * the heading just approaches the target at this rate.
 */
export const HEADING_TURN_RATE_DEG_PER_S = 45;
