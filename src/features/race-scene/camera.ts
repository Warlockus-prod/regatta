// The race cameras' pure parts (ADR-0008, M2-1). Pure math, no three.js, so
// the framing and the gestures are tested on their own. Positions are scene
// metres relative to the player (the player stays at the origin, the world
// moves under it).
//
// - The tactical camera ("Above"): high above the water and tilted, upwind at
//   the top of the screen like the race map, following the player with a look
//   ahead towards the next mark.
// - The order a tap on the scene steps through the four cameras; the default
//   is the race camera (package 8, owner decision R-9, replacing decision #5),
//   the free orbit around the yacht one tap away, a double tap back to it.
// - What counts as a tap (and not the start of a drag or a pinch).
// - The chase camera ("Behind"): follows the boat's course and comes back
//   behind the stern a moment after a manual orbit or zoom ends.
// - The race camera ("Race"): higher and further back than Behind, the
//   horizon in the top quarter and the boat in the lower third, its distance
//   from the hull length and the speed, turning slowly through a tack.

import type { RaceCamera } from "@/features/race-3d/pose";

export interface TacticalInput {
  /** The player's race position in metres (X east, Z south). */
  player: { x: number; z: number };
  /** The next mark or finish, in race metres; null once finished. */
  target: { x: number; z: number } | null;
  /** True wind direction, degrees the wind comes from (0 = north). */
  windFrom: number;
  /** A phone held upright sees much less across, so the camera stands further back. */
  portrait: boolean;
}

export interface CameraPose {
  position: [number, number, number];
  look: [number, number, number];
  fov: number;
}

const DEG = Math.PI / 180;
/** Degrees below the horizon the camera looks down. */
export const TACTICAL_PITCH = 54;
/**
 * How far ahead of the boat the view centres, towards the next target (m).
 * The race controls and hints fill the bottom third of the screen, so the
 * view centres near the boat and the boat sits just below the middle (about
 * 56% down on a phone, 60% on a wide screen); the upper half of the picture
 * already reaches 150-200 m ahead.
 */
const LOOK_AHEAD = { portrait: [6, 14], landscape: [8, 18] } as const;

/** Where the view centres, relative to the player: part of the way to the next target. */
export function lookAhead(input: TacticalInput): { x: number; z: number } {
  const [near, far] = input.portrait ? LOOK_AHEAD.portrait : LOOK_AHEAD.landscape;
  const upwind = { x: Math.sin(input.windFrom * DEG), z: -Math.cos(input.windFrom * DEG) };
  if (!input.target) return { x: upwind.x * near, z: upwind.z * near };
  const dx = input.target.x - input.player.x;
  const dz = input.target.z - input.player.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return { x: 0, z: 0 };
  const ahead = Math.min(far, Math.max(near, d * 0.35), d);
  return { x: (dx / d) * ahead, z: (dz / d) * ahead };
}

/**
 * The camera pose: downwind of the view centre, looking upwind and down at
 * TACTICAL_PITCH, far enough back that a phone shows the boat, its wake and
 * the nearest rivals.
 */
export function tacticalPose(input: TacticalInput): CameraPose {
  const look = lookAhead(input);
  const range = input.portrait ? 150 : 165;
  const fov = input.portrait ? 58 : 44;
  const back = range * Math.cos(TACTICAL_PITCH * DEG);
  const up = range * Math.sin(TACTICAL_PITCH * DEG);
  // Downwind of the view centre: the wind blows towards windFrom + 180.
  const downwind = { x: -Math.sin(input.windFrom * DEG), z: Math.cos(input.windFrom * DEG) };
  return {
    position: [look.x + downwind.x * back, up, look.z + downwind.z * back],
    look: [look.x, 0, look.z],
    fov,
  };
}

/** Exponential smoothing factor for a time constant of `tau` seconds over `dt`. */
export function follow(dt: number, tau: number): number {
  return 1 - Math.exp(-Math.min(dt, 0.1) / tau);
}

// ---------------------------------------------------------------------------
// M2-1: one-tap camera switch.

/** The order a tap on the scene (or the camera button) steps through. The
 * first entry is the default camera: the race view (R-9); the free orbit
 * around the yacht is the next tap. */
export const RACE_CAMERA_CYCLE = ["race", "orbit", "stern", "high"] as const satisfies readonly RaceCamera[];

/** The camera after `current` in the cycle; an unknown value starts it over. */
export function nextRaceCamera(current: string): RaceCamera {
  const index = (RACE_CAMERA_CYCLE as readonly string[]).indexOf(current);
  return RACE_CAMERA_CYCLE[(index + 1) % RACE_CAMERA_CYCLE.length];
}

/** A tap moves less than this, in CSS pixels (a drag that comes back still moved). */
export const TAP_SLOP_PX = 10;
/** A tap is shorter than this; a longer press is a look around, not a switch. */
export const TAP_MAX_MS = 350;
/** A second tap this soon after the first is a double tap: back to the race view (R-9). */
export const DOUBLE_TAP_MS = 320;

export interface TapTracker {
  /** `primary`: the first finger (PointerEvent.isPrimary) or the main mouse button. */
  down(id: number, x: number, y: number, t: number, primary: boolean): void;
  move(id: number, x: number, y: number): void;
  /** True when the gesture that ends here was a tap. */
  up(id: number, x: number, y: number, t: number): boolean;
  cancel(id: number): void;
  /** When the last tap ended (ms, the events' clock); read by sceneTapHandlers for a double tap. */
  lastTap: number;
}

/**
 * Tells a tap on the scene from the start of a drag (orbit) or a pinch (zoom).
 * Any second finger spoils the gesture; so does moving further than
 * TAP_SLOP_PX at any moment, or holding longer than TAP_MAX_MS.
 */
export function createTapTracker(): TapTracker {
  let gesture: { id: number; x: number; y: number; t: number; travel: number; spoiled: boolean } | null = null;
  const move = (id: number, x: number, y: number) => {
    if (!gesture || gesture.id !== id) return;
    gesture.travel = Math.max(gesture.travel, Math.hypot(x - gesture.x, y - gesture.y));
  };
  return {
    lastTap: -Infinity,
    down(id, x, y, t, primary) {
      if (primary) gesture = { id, x, y, t, travel: 0, spoiled: false };
      else if (gesture) gesture.spoiled = true;
    },
    move,
    up(id, x, y, t) {
      if (!gesture || gesture.id !== id) return false;
      move(id, x, y);
      const tap = !gesture.spoiled && gesture.travel <= TAP_SLOP_PX && t - gesture.t <= TAP_MAX_MS;
      gesture = null;
      return tap;
    },
    cancel(id) { if (gesture?.id === id) gesture = null; },
  };
}

// ---------------------------------------------------------------------------
// M2-1: the chase camera ("Behind").

/** Seconds the followed course lags the boat's heading: a tack swings the view, it does not cut. */
export const CHASE_FOLLOW_TAU = 0.6;
/** Seconds after a manual orbit or zoom ends before the camera heads back behind the boat. */
export const CHASE_RETURN_DELAY = 1.5;
/** Seconds of the way back (about 95% after three of them). */
export const CHASE_RETURN_TAU = 0.45;

export interface ChaseState {
  /** The course the camera stands behind, degrees (0 = north); null before the first frame. */
  yaw: number | null;
  /** Seconds since the last manual gesture ended (Infinity: none yet). */
  idle: number;
}
export const CHASE_START: ChaseState = { yaw: null, idle: Infinity };

/** Turn `from` towards `to` by the share `k` along the shorter way round, degrees in [0, 360). */
export function turnToward(from: number, to: number, k: number): number {
  const d = ((((to - from) % 360) + 540) % 360) - 180;
  return (((from + d * k) % 360) + 360) % 360;
}

/** How a following camera turns with the course: the time constant, the
 * fastest turn (deg/s) and whether reduced motion follows the course as it is. */
export interface FollowTune { tau: number; maxRate: number; instant: boolean }
export const CHASE_TUNE: FollowTune = { tau: CHASE_FOLLOW_TAU, maxRate: Infinity, instant: true };
/** The race camera turns through a 90 degree tack in about three seconds and
 * never faster than 35 deg/s, so a tack does not swing the picture. Under
 * reduced motion it keeps that slow turn: following the course as it is would
 * move the picture more, not less. */
export const RACE_TUNE: FollowTune = { tau: 1.6, maxRate: 35, instant: false };

/**
 * One frame of a following camera (Behind, Race). `held` while the player
 * orbits or pinches: the camera is theirs (blend 0) and the clock for the
 * return restarts. The followed course keeps tracking the heading meanwhile,
 * so the camera comes back behind the boat where it sails now. `blend` is the
 * share of the way from the current camera to the follow pose this frame.
 * With reduced motion there are no eased swoops: the return is one cut after
 * the same delay, and the chase camera follows the course as it is.
 */
export function chaseStep(state: ChaseState, input: { heading: number; dt: number; held: boolean; reducedMotion: boolean }, tune: FollowTune = CHASE_TUNE): { state: ChaseState; blend: number } {
  const dt = Math.max(0, input.dt);
  const course = ((input.heading % 360) + 360) % 360;
  let yaw = course;
  if (state.yaw !== null && !(input.reducedMotion && tune.instant)) {
    const d = ((((course - state.yaw) % 360) + 540) % 360) - 180;
    const limit = tune.maxRate * dt;
    yaw = turnToward(state.yaw, state.yaw + Math.max(-limit, Math.min(limit, d * follow(dt, tune.tau))), 1);
  }
  if (input.held) return { state: { yaw, idle: 0 }, blend: 0 };
  const idle = state.idle + dt;
  const blend = idle < CHASE_RETURN_DELAY ? 0 : input.reducedMotion ? 1 : follow(dt, CHASE_RETURN_TAU);
  return { state: { yaw, idle }, blend };
}

// ---------------------------------------------------------------------------
// Package 8: the race camera ("Race", owner decision R-9).

/** Where the race camera puts things, as shares of the canvas height from
 * the top, and how far it stands from the boat in hull lengths (more at
 * speed, so the bow wave and the water ahead stay in view). On an upright
 * phone the coach line floats over the lowest ~12% of the canvas, so the
 * picture that shows has the horizon about a quarter down and the deck at
 * about 73%, as in the reference the owner liked
 * (docs/design/race-game-logic-2026-11-01.md 1.1). */
export const RACE_VIEW = { horizon: 0.22, boat: 0.64, hulls: 5.2, hullsPerKnot: 0.12, maxHulls: 7, deck: 2 } as const;

export interface RaceViewInput {
  /** The followed course, degrees (0 = north). */
  heading: number;
  aspect: number;
  /** Hull length of the boat sailed, metres. */
  hull: number;
  /** Boat speed, knots (the race's own figure). */
  speedKn: number;
}

/** Vertical lens of the race camera: wider upright, where the picture is narrow. */
export const raceViewFov = (aspect: number) => (aspect < 1 ? 58 : 42);

/** Camera distance to the boat, metres: hull lengths at rest, more with speed, capped. */
export function raceViewDistance(hull: number, speedKn: number): number {
  const h = Number.isFinite(hull) && hull > 0 ? hull : 13;
  const v = Number.isFinite(speedKn) ? Math.max(0, speedKn) : 0;
  return h * Math.min(RACE_VIEW.maxHulls, RACE_VIEW.hulls + RACE_VIEW.hullsPerKnot * v);
}

/**
 * The race pose: behind the boat on the followed course and high enough that
 * the horizon sits RACE_VIEW.horizon from the top and the deck RACE_VIEW.boat
 * from the top of the picture. The camera looks at a point above the boat
 * on that line of sight, so an orbit turns round the boat. `distance`
 * (metres) overrides the fitted one, e.g. the player's own zoom.
 */
export function raceView(input: RaceViewInput, distance: number | null = null): CameraPose {
  const fov = raceViewFov(input.aspect);
  const t = Math.tan(fov * DEG / 2);
  // ndc y of the horizon and of the deck; a far horizon is level, so the axis pitches down by its angle.
  const pitch = Math.atan((1 - 2 * RACE_VIEW.horizon) * t);
  const dip = pitch + Math.atan((2 * RACE_VIEW.boat - 1) * t);
  const range = distance !== null && Number.isFinite(distance) && distance > 0 ? distance : raceViewDistance(input.hull, input.speedKn);
  const back = range * Math.cos(dip);
  const up = RACE_VIEW.deck + range * Math.sin(dip);
  const yaw = (Number.isFinite(input.heading) ? input.heading : 0) * DEG;
  const bx = -Math.sin(yaw) * back, bz = Math.cos(yaw) * back;
  return { position: [bx, up, bz], look: [0, up - back * Math.tan(pitch), 0], fov };
}
