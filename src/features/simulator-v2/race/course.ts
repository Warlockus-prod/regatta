// ---------------------------------------------------------------------------
// V2 race course - hardcoded windward-leeward for PR-4. PR-5 or later can
// load different course presets. All distances are in "course units" which
// also serve as scene units directly (see step-runtime for the boat-speed
// -> units/s conversion).
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  z: number;
}

export interface CourseLine {
  a: Vec2;
  b: Vec2;
}

export interface CourseMark {
  id: string;
  label: string;
  pos: Vec2;
  radius: number;
  /** Which side the boat should leave the mark on. For PR-4 display only. */
  leaveOn: 'port' | 'starboard';
}

export interface Course {
  startLine: CourseLine;
  marks: CourseMark[];
  /** If null, finish crossing is just re-crossing the start line from the
   *  upwind side. For the default course we reuse the start line. */
  finishLine: CourseLine | null;
}

/**
 * Default PR-4 course: a classic windward-leeward.
 *
 * Wind comes from +z direction (world north-ish in the scene). The boat
 * initially points into the wind and close-hauls on starboard tack. From
 * the start line it works upwind to the windward mark, then bears off
 * and runs back down to the finish which is the same start line.
 */
export const DEFAULT_COURSE: Course = {
  startLine: {
    a: { x: -22, z: 0 },
    b: { x: 22, z: 0 },
  },
  marks: [
    {
      id: 'windward',
      label: 'W',
      pos: { x: 0, z: -260 },
      radius: 14,
      leaveOn: 'port',
    },
  ],
  finishLine: null,
};

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function bearingDegFromTo(from: Vec2, to: Vec2): number {
  // Compass bearing: 0 = north (-z), 90 = east (+x), clockwise.
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const deg = Math.atan2(dx, -dz) * (180 / Math.PI);
  return (deg + 360) % 360;
}
