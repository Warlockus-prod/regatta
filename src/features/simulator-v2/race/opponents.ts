import {
  bearingDegFromTo,
  DEFAULT_COURSE,
  distance,
  type Course,
  type Vec2,
} from './course';
import { crossedLine } from './race-state';

// ---------------------------------------------------------------------------
// V2 AI opponents: tiny deterministic boats that follow the same course.
//
// The AI does not run the full VPP. Speed is a cheap piecewise polar curve
// in true-wind-speed space, scaled by a per-opponent "skill" multiplier.
// Heading intent walks toward the next mark at a bounded turn rate. This
// gives enough visible tactical variety for the player to overtake / fall
// behind without paying the full physics cost for every opponent.
// ---------------------------------------------------------------------------

export interface Opponent {
  id: string;
  name: string;
  color: string;
  /** Skill multiplier: 0.85 = back of pack, 1.05 = ahead of player at full trim. */
  skill: number;
  position: Vec2;
  heading: number;
  boatSpeed: number;
  nextMarkIndex: number;
  roundedMarks: number[];
  finished: boolean;
  finishedAtSimTime: number | null;
  /** Progress = marks rounded + fraction of leg to next mark. Used for rank. */
  progress: number;
}

export const DEFAULT_OPPONENTS: Array<{
  id: string;
  name: string;
  color: string;
  skill: number;
  offsetX: number;
}> = [
  { id: 'a', name: 'Aria',  color: '#ff6b6b', skill: 1.02, offsetX: -12 },
  { id: 'b', name: 'Meris', color: '#52ff8e', skill: 0.97, offsetX: 0 },
  { id: 'c', name: 'Vega',  color: '#ffcc55', skill: 0.95, offsetX: 12 },
];

export function createInitialOpponents(): Opponent[] {
  return DEFAULT_OPPONENTS.map((o) => ({
    id: o.id,
    name: o.name,
    color: o.color,
    skill: o.skill,
    position: { x: o.offsetX, z: 4 },
    heading: 0,
    boatSpeed: 0,
    nextMarkIndex: 0,
    roundedMarks: [],
    finished: false,
    finishedAtSimTime: null,
    progress: 0,
  }));
}

// Cheap polar model for AI speed. Output is fraction of "max speed" where
// max speed ~ windSpeed * 0.55. TWA is signed here; we take the absolute.
function polarFactor(absTwa: number): number {
  const t = Math.max(0, Math.min(180, absTwa));
  if (t < 30) return 0.05; // deep in irons
  if (t < 45) return 0.35 + ((t - 30) / 15) * 0.35;
  if (t < 80) return 0.8 + ((t - 45) / 35) * 0.18;
  if (t < 110) return 0.95;
  if (t < 150) return 0.95 - ((t - 110) / 40) * 0.12;
  return 0.83 - ((t - 150) / 30) * 0.18;
}

function opponentSpeed(windSpeed: number, heading: number, trueWindDir: number, skill: number): number {
  let twa = (trueWindDir - heading + 540) % 360 - 180;
  const absTwa = Math.abs(twa);
  const maxSpeed = windSpeed * 0.55;
  return maxSpeed * polarFactor(absTwa) * skill;
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function approachHeading(current: number, target: number, maxStep: number): number {
  const c = normalizeAngle(current);
  const t = normalizeAngle(target);
  let delta = t - c;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  if (Math.abs(delta) <= maxStep) return t;
  return normalizeAngle(c + Math.sign(delta) * maxStep);
}

// Tack laylines: if the direct bearing to mark is inside the no-go cone,
// the AI chooses a close-hauled heading on one of the two tacks instead.
// This keeps opponents from sailing straight into the wind.
function effectiveTargetHeading(currentHeading: number, targetBearing: number, trueWindDir: number): number {
  let relative = (targetBearing - trueWindDir + 540) % 360 - 180;
  if (Math.abs(relative) >= 35) return targetBearing;
  // Too close to wind; pick close-hauled tack nearest current heading.
  const starboardCH = normalizeAngle(trueWindDir + 40);
  const portCH = normalizeAngle(trueWindDir - 40);
  const deltaS = Math.abs(normalizeAngle(starboardCH - currentHeading + 180) - 180);
  const deltaP = Math.abs(normalizeAngle(portCH - currentHeading + 180) - 180);
  return deltaS <= deltaP ? starboardCH : portCH;
}

export const OPPONENT_TURN_RATE_DEG_PER_S = 35;
const SPEED_TO_UNITS_PER_S = 0.9;

export function stepOpponent(
  prev: Opponent,
  trueWindDir: number,
  windSpeed: number,
  course: Course,
  racing: boolean,
  prevSimTime: number,
  newSimTime: number,
  dt: number,
): Opponent {
  if (!racing || prev.finished) {
    return prev;
  }

  // Pick target point: next mark, or start line center if all rounded.
  const target: Vec2 = prev.nextMarkIndex < course.marks.length
    ? course.marks[prev.nextMarkIndex].pos
    : {
        x: (course.startLine.a.x + course.startLine.b.x) / 2,
        z: (course.startLine.a.z + course.startLine.b.z) / 2,
      };

  const bearing = bearingDegFromTo(prev.position, target);
  const effectiveTarget = effectiveTargetHeading(prev.heading, bearing, trueWindDir);
  const newHeading = approachHeading(prev.heading, effectiveTarget, OPPONENT_TURN_RATE_DEG_PER_S * dt);
  const newSpeed = opponentSpeed(windSpeed, newHeading, trueWindDir, prev.skill);

  const rad = (newHeading * Math.PI) / 180;
  const newPos = {
    x: prev.position.x + Math.sin(rad) * newSpeed * SPEED_TO_UNITS_PER_S * dt,
    z: prev.position.z - Math.cos(rad) * newSpeed * SPEED_TO_UNITS_PER_S * dt,
  };

  let nextMarkIndex = prev.nextMarkIndex;
  let roundedMarks = prev.roundedMarks;
  // Explicit annotation so control-flow analysis does not narrow `finished`
  // to `false` based on the early return above.
  let finished: boolean = prev.finished;
  let finishedAtSimTime: number | null = prev.finishedAtSimTime;

  if (nextMarkIndex < course.marks.length) {
    const mark = course.marks[nextMarkIndex];
    if (distance(newPos, mark.pos) <= mark.radius) {
      roundedMarks = [...roundedMarks, nextMarkIndex];
      nextMarkIndex += 1;
    }
  } else if (!finished) {
    if (crossedLine(prev.position, newPos, course.startLine.a, course.startLine.b)) {
      finished = true;
      finishedAtSimTime = newSimTime;
    }
  }

  // Progress: marks rounded + fraction of current leg traveled.
  let progress = roundedMarks.length;
  if (nextMarkIndex < course.marks.length) {
    const legStart = nextMarkIndex === 0
      ? {
          x: (course.startLine.a.x + course.startLine.b.x) / 2,
          z: (course.startLine.a.z + course.startLine.b.z) / 2,
        }
      : course.marks[nextMarkIndex - 1].pos;
    const legEnd = course.marks[nextMarkIndex].pos;
    const legLen = distance(legStart, legEnd);
    const distFromStart = distance(legStart, newPos);
    progress += Math.max(0, Math.min(1, distFromStart / Math.max(1, legLen)));
  } else {
    progress += 1;
    if (finished) progress += 0.5;
  }

  return {
    ...prev,
    position: newPos,
    heading: newHeading,
    boatSpeed: newSpeed,
    nextMarkIndex,
    roundedMarks,
    finished,
    finishedAtSimTime,
    progress,
  };
}

export function rankEntrants(
  player: { position: Vec2; nextMarkIndex: number; finished: boolean; name: string; id: string; color: string },
  opponents: Opponent[],
  course: Course = DEFAULT_COURSE,
): Array<{ id: string; name: string; color: string; progress: number; isPlayer: boolean; finished: boolean }> {
  const playerProgress = playerProgressFor(player, course);
  const rows = [
    {
      id: 'player',
      name: player.name,
      color: '#00d4ff',
      progress: playerProgress,
      isPlayer: true,
      finished: player.finished,
    },
    ...opponents.map((o) => ({
      id: o.id,
      name: o.name,
      color: o.color,
      progress: o.progress,
      isPlayer: false,
      finished: o.finished,
    })),
  ];
  rows.sort((a, b) => b.progress - a.progress);
  return rows;
}

function playerProgressFor(player: { position: Vec2; nextMarkIndex: number; finished: boolean }, course: Course): number {
  const rounded = Math.min(player.nextMarkIndex, course.marks.length);
  let progress = rounded;
  if (player.nextMarkIndex < course.marks.length) {
    const legStart = player.nextMarkIndex === 0
      ? {
          x: (course.startLine.a.x + course.startLine.b.x) / 2,
          z: (course.startLine.a.z + course.startLine.b.z) / 2,
        }
      : course.marks[player.nextMarkIndex - 1].pos;
    const legEnd = course.marks[player.nextMarkIndex].pos;
    const legLen = distance(legStart, legEnd);
    const distFromStart = distance(legStart, player.position);
    progress += Math.max(0, Math.min(1, distFromStart / Math.max(1, legLen)));
  } else {
    progress += 1;
    if (player.finished) progress += 0.5;
  }
  return progress;
}
