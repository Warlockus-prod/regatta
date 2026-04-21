import { getBoatParams, tick, type Controls } from '@/lib/sailing-physics';
import { DEFAULT_COURSE, distance, type Vec2 } from '../race/course';
import { crossedLine, type RaceState } from '../race/race-state';
import {
  CONTROL_RATES,
  HEADING_TURN_RATE_DEG_PER_S,
  SPEED_TO_UNITS_PER_S,
  type RuntimeState,
} from './runtime-types';

// ---------------------------------------------------------------------------
// V2 step. Structurally identical to V3's step; the coaching extras live in
// the hook and the scene, so the stepper itself is pure physics + control
// interpolation. PR-7 may lift this into a shared module.
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function approach(current: number, target: number, maxStep: number): number {
  if (!isFinite(maxStep)) return target;
  const delta = target - current;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

export function interpolateControls(live: Controls, target: Controls, dt: number): Controls {
  return {
    mainSheet: clamp(approach(live.mainSheet, target.mainSheet, CONTROL_RATES.mainSheet * dt), 0, 1),
    jibSheet: clamp(approach(live.jibSheet, target.jibSheet, CONTROL_RATES.jibSheet * dt), 0, 1),
    mainTwist: clamp(approach(live.mainTwist, target.mainTwist, CONTROL_RATES.mainTwist * dt), 0, 1),
    jibTwist: clamp(approach(live.jibTwist, target.jibTwist, CONTROL_RATES.jibTwist * dt), 0, 1),
    reef: clamp(approach(live.reef, target.reef, CONTROL_RATES.reef * dt), 0, 1),
    jibFurl: clamp(approach(live.jibFurl, target.jibFurl, CONTROL_RATES.jibFurl * dt), 0, 1),
    jibSide: target.jibSide,
  };
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function approachHeading(current: number, target: number, maxStep: number): number {
  const c = normalizeAngle(current);
  const t = normalizeAngle(target);
  let delta = t - c;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  if (Math.abs(delta) <= maxStep) return t;
  return normalizeAngle(c + Math.sign(delta) * maxStep);
}

// ---------------------------------------------------------------------------
// Position integration: boat moves forward at boatSpeed * SPEED_TO_UNITS_PER_S
// along its current heading. Compass convention: heading 0 = north = -z, 90 =
// east = +x, so (vx, vz) = (sin h, -cos h) * speed.
// ---------------------------------------------------------------------------

function integratePosition(prev: Vec2, heading: number, boatSpeed: number, dt: number): Vec2 {
  const h = (heading * Math.PI) / 180;
  const speed = boatSpeed * SPEED_TO_UNITS_PER_S;
  return {
    x: prev.x + Math.sin(h) * speed * dt,
    z: prev.z - Math.cos(h) * speed * dt,
  };
}

// ---------------------------------------------------------------------------
// Race progression: walk the countdown, flip to `racing` at 0, detect mark
// rounding by proximity (boat enters mark radius), detect finish by
// re-crossing the start line from the upwind side once all marks are done.
// ---------------------------------------------------------------------------

function progressRace(
  race: RaceState,
  prevPos: Vec2,
  currPos: Vec2,
  newSimTime: number,
): RaceState {
  let phase = race.phase;
  let startedAt = race.startedAt;
  let finishedAt = race.finishedAt;
  let nextMarkIndex = race.nextMarkIndex;
  let roundedMarks = race.roundedMarks;
  let finishedLine = race.finishedLine;

  if (phase === 'prestart') {
    const remaining = race.countdownSec - (newSimTime - race.countdownStartedAt);
    if (remaining <= 0) {
      phase = 'racing';
      startedAt = newSimTime;
    }
  }

  if (phase === 'racing') {
    const course = DEFAULT_COURSE;
    // Mark rounding: whichever mark is next, if boat is within its radius
    // we consider it rounded. Real rounding requires leaving the mark on
    // the correct side, but for PR-4 proximity is enough.
    if (nextMarkIndex < course.marks.length) {
      const mark = course.marks[nextMarkIndex];
      if (distance(currPos, mark.pos) <= mark.radius) {
        roundedMarks = [...roundedMarks, nextMarkIndex];
        nextMarkIndex += 1;
      }
    }
    // Finish: all marks rounded AND boat crosses the start line. The pins
    // stay pinned; crossing from north (z<0) to south (z>0) means finish.
    if (!finishedLine && nextMarkIndex >= course.marks.length) {
      if (crossedLine(prevPos, currPos, course.startLine.a, course.startLine.b)) {
        finishedLine = true;
        finishedAt = newSimTime;
        phase = 'finished';
      }
    }
  }

  return {
    ...race,
    phase,
    startedAt,
    finishedAt,
    nextMarkIndex,
    roundedMarks,
    finishedLine,
  };
}

export function stepRuntime(
  prev: RuntimeState,
  target: Controls,
  targetHeading: number,
  params: ReturnType<typeof getBoatParams>,
  dt: number,
): RuntimeState {
  const live = interpolateControls(prev.live, target, dt);
  const newHeading = approachHeading(
    prev.boat.heading,
    targetHeading,
    HEADING_TURN_RATE_DEG_PER_S * dt,
  );
  const steeredBoat = { ...prev.boat, heading: newHeading };
  const result = tick(steeredBoat, live, params, dt);
  const newSimTime = prev.simTime + dt;
  // Only move the boat through the world while we are actually racing.
  // During the countdown the boat can still sail around for positioning,
  // though; race shell PR-4 leaves boat-moves-during-prestart in for now.
  const newPosition = integratePosition(prev.position, newHeading, result.state.boatSpeed, dt);
  const newRace = progressRace(prev.race, prev.position, newPosition, newSimTime);
  return {
    simTime: newSimTime,
    boat: result.state,
    live,
    target,
    targetHeading,
    lastDiag: result.diag,
    position: newPosition,
    race: newRace,
  };
}
