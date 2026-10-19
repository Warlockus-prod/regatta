// Pure logic of the native trainer's wheel mode (app/simulator/index.tsx).
//
// Every number comes from the web's src/features/trainer-controls/mapping.ts,
// imported as is (metro watches that folder): one helm turn = 90 degrees of
// course, one sheet turn = 25% of the sheet, clockwise sheets in, a click
// every 5 degrees of course or 5% of sheet. The native trainer's sheet value
// runs the other way (1 = sheeted in), so it is converted here and nowhere
// else. Nothing in this file touches the physics.

import {
  COURSE_TICK_DEG,
  SHEET_TICK,
  SHEET_TRAVEL_PER_TURN,
  WHEEL_DEG_PER_COURSE_DEG,
  angleDelta,
  applyHeadingDelta,
  clamp,
  ticksCrossed,
  wheelToCourseDelta,
  wheelToEaseDelta,
  type Sensitivity,
} from '../../../src/features/trainer-controls/mapping';

export { COURSE_TICK_DEG, SHEET_TICK };

/** Touches nearer than this share of the radius to the hub do not turn the wheel (the angle jumps there). */
export const HUB_DEAD_ZONE = 0.22;
/** Smallest wheel drawn; also the minimum touch target. */
export const SMALL_WHEEL = 64;
/** Room under a wheel for its two-line caption. */
export const CAPTION_H = 40;
/** A sheet wheel shown in the middle goes back to its corner after this long without a turn. */
export const COLLAPSE_MS = 4000;

export type TickKind = 'tick' | 'stop' | 'center' | 'turn';
export type Slot = 'helm' | 'main' | 'jib';
export type Box = [cx: number, cy: number, d: number];

export interface WheelSettings {
  sensitivity: Sensitivity;
  jibSheetSide: 'left' | 'right';
}

/** Reads the fields the web keeps in the shared record (mobile/src/persistence/controls.ts passes them through). */
export function wheelSettings(prefs: Record<string, unknown>): WheelSettings {
  const s = prefs.sensitivity;
  return {
    sensitivity: s === 0.5 || s === 2 ? s : 1,
    jibSheetSide: prefs.jibSheetSide === 'right' ? 'right' : 'left',
  };
}

/** Pointer angle (degrees, screen atan2) and distance as a share of the radius, for a touch at x,y inside a wheel of diameter d. */
export function wheelPolar(x: number, y: number, d: number): { a: number; dist: number } {
  const r = d / 2;
  const dx = x - r;
  const dy = y - r;
  return { a: (Math.atan2(dy, dx) * 180) / Math.PI, dist: Math.hypot(dx, dy) / r };
}

/** One move of a finger on a wheel: the signed wheel degrees turned (clockwise positive) and the new reference angle. */
export function trackTurn(lastDeg: number, x: number, y: number, d: number): { last: number; delta: number } {
  const p = wheelPolar(x, y, d);
  if (p.dist < HUB_DEAD_ZONE) return { last: p.a, delta: 0 };
  return { last: p.a, delta: angleDelta(lastDeg, p.a) };
}

export const normalizeDeg = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * Which way the boat crossed the wind between two headings (true wind FROM
 * windFromDeg, all screen degrees): a tack through head to wind, a gybe
 * through dead downwind, null when it stayed on the same tack.
 */
export function crossedWind(prevHeadingDeg: number, nextHeadingDeg: number, windFromDeg: number): 'tack' | 'gybe' | null {
  const before = angleDelta(windFromDeg, prevHeadingDeg);
  const after = angleDelta(windFromDeg, nextHeadingDeg);
  if (before === 0 || after === 0 || Math.sign(before) === Math.sign(after)) return null;
  return Math.abs(after) < 90 ? 'tack' : 'gybe';
}

/** Helm in course mode: the course after a wheel turn and the click it earns. */
export function turnHelmCourse(
  state: { headingDeg: number; acc: number },
  wheelDeg: number,
  sensitivity: Sensitivity,
  windFromDeg: number,
): { headingDeg: number; acc: number; tick: TickKind | null } {
  const d = wheelToCourseDelta(wheelDeg, sensitivity);
  const acc = state.acc + d;
  const headingDeg = applyHeadingDelta(state.headingDeg, d);
  const crossed = crossedWind(state.headingDeg, headingDeg, windFromDeg);
  const tick: TickKind | null = crossed ? 'turn' : ticksCrossed(state.acc, acc, COURSE_TICK_DEG) ? 'tick' : null;
  return { headingDeg, acc, tick };
}

/** Wheel degrees for a keyboard or VoiceOver step of the helm: always 5 degrees of course, whatever the sensitivity. */
export function helmStepWheelDeg(steps: number, sensitivity: Sensitivity): number {
  return (steps * COURSE_TICK_DEG * WHEEL_DEG_PER_COURSE_DEG) / sensitivity;
}

/** Native sheet value (1 = sheeted in) to the shared ease (0 = sheeted in, 1 = eased out), and back. */
export const sheetToEase = (sheet: number) => clamp(1 - sheet, 0, 1);
export const easeToSheet = (ease: number) => clamp(1 - ease, 0, 1);

/** A sheet wheel turn: clockwise sheets in, like a winch. */
export function turnSheetEase(ease: number, wheelDeg: number, sensitivity: Sensitivity): { ease: number; tick: TickKind | null } {
  const next = clamp(ease + wheelToEaseDelta(wheelDeg, sensitivity), 0, 1);
  if (next === ease) return { ease, tick: null };
  if (next === 0 || next === 1) return { ease: next, tick: 'stop' };
  return { ease: next, tick: ticksCrossed(ease, next, SHEET_TICK) ? 'tick' : null };
}

/** A VoiceOver step on a sheet: increment eases 5%, decrement sheets in 5%. */
export function stepSheetEase(ease: number, steps: number): { ease: number; tick: TickKind | null } {
  const next = clamp(Math.round((ease + steps * SHEET_TICK) * 100) / 100, 0, 1);
  if (next === ease) return { ease, tick: null };
  return { ease: next, tick: next === 0 || next === 1 ? 'stop' : 'tick' };
}

/** Drawn rotation of a sheet wheel: a full turn per quarter of travel. */
export const sheetRotation = (ease: number) => -(ease / SHEET_TRAVEL_PER_TURN) * 360;

/** VoiceOver adjustable actions: swipe up = +1 step, swipe down = -1 step. */
export function a11yStep(actionName: string): 1 | -1 | 0 {
  if (actionName === 'increment') return 1;
  if (actionName === 'decrement') return -1;
  return 0;
}

/**
 * Where each wheel sits in a deck of w x h (the web's WheelDeck "bottom"
 * layout): the helm big in the middle, the sheets small in the lower corners.
 * An expanded sheet takes the middle and the helm takes that sheet's corner.
 */
export function deckLayout(
  w: number,
  h: number,
  jibSheetSide: 'left' | 'right',
  expanded: 'main' | 'jib' | null,
): Record<Slot, Box> {
  const small = SMALL_WHEEL;
  const big = Math.max(116, Math.min(176, h - CAPTION_H - 8, w - 2 * small - 40));
  const center: Box = [w / 2, (h - CAPTION_H) / 2 + 2, big];
  const left: Box = [small / 2 + 14, h - CAPTION_H - small / 2 - 2, small];
  const right: Box = [w - small / 2 - 14, h - CAPTION_H - small / 2 - 2, small];
  const leftK = jibSheetSide === 'left' ? 'jib' : 'main';
  const rightK = leftK === 'jib' ? 'main' : 'jib';
  const pos = { helm: center, [leftK]: left, [rightK]: right } as Record<Slot, Box>;
  if (expanded) {
    pos[expanded] = center;
    pos.helm = expanded === leftK ? left : right;
  }
  return pos;
}
