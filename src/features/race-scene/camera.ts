// The tactical camera of the race scene (ADR-0008): high above the water and
// tilted, upwind at the top of the screen like the race map, following the
// player with a look ahead towards the next mark. Pure math, no three.js, so
// the framing is tested on its own. Positions are scene metres relative to
// the player (the player stays at the origin, the world moves under it).

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
