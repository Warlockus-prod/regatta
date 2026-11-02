// Helm assist, the controller (package 13, ADR-0022): what the race's helm
// assists steer to on each tick. Pure: no React, no physics; the race loop
// turns the heading it returns into its own steering (the legacy race's turn
// input, the metric race's course assist in Simple or the rudder law in Pro).
//
// - Course hold (Simple arrows, the wheel or slider in course mode) keeps a
//   heading; the race keeps it as before (GameClient's autopilot refs).
// - Angle hold ("Hold angle", R-10) keeps the signed angle to the wind.
// - BEST VMG keeps the best angle of the leg (helm-angles.ts), survives a tack.
// - The tack or gybe button turns to the mirrored angle, through the wind for
//   a tack and through dead downwind for a gybe, never into the no-go zone,
//   then hands back to the hold that was on.
// - Out of irons: a held boat stopped head to wind bears away to close-hauled.
// Any manual rudder (Pro arrows and keys, the wheel or slider in rudder mode)
// switches every assist off; Simple arrows move the course or the held angle.

import { legTarget, sideOf, type HelmLeg, type PolarAngles, type SpeedAt } from "./helm-angles";

export const HELM_ASSIST = {
  /** Simple arrows held: the course moves this fast, degrees per second. */
  arrowRateDegPerSec: 30,
  /** Simple arrow tap (or key press): one course step, degrees. */
  arrowStepDeg: 2,
  /** A button turn is done within this many degrees of its target angle. */
  turnDoneDeg: 4,
  /** A turn that has not got there in this time is given up (stalled in irons). */
  turnTimeoutSec: 20,
  /** The turn steers at most this far ahead of the boat, so the controller
   * always turns the right way round (through the wind or through the run). */
  turnLeadDeg: 60,
  /** In irons: inside the no-go zone and slower than this, knots. */
  ironsBelowKn: 1,
  /** A held boat that stays in irons this long is borne away, seconds. */
  ironsAfterSec: 3,
} as const;

export type HelmHold = "off" | "wind" | "vmg";
export type HelmTurnKind = "tack" | "gybe";
/** What a finished turn hands back to. */
export type HelmResume = "off" | "course" | "wind" | "vmg";

export interface HelmTurn {
  readonly kind: HelmTurnKind;
  /** Signed true wind angle the turn ends on. */
  readonly targetTwa: number;
  /** Direction of the heading change: 1 clockwise (to starboard), -1 anticlockwise. */
  readonly dir: 1 | -1;
  readonly elapsed: number;
  readonly resume: HelmResume;
}

export interface HelmUsage {
  /** Turns the button finished. */
  readonly buttonTurns: number;
  /** Seconds sailed with BEST VMG on (a button turn that resumes it included). */
  readonly bestVmgSec: number;
  /** Seconds sailed with the angle hold on. */
  readonly angleHoldSec: number;
}

export interface HelmAssistState {
  readonly hold: HelmHold;
  /** The held angle of the angle hold, signed. */
  readonly windTwa: number;
  readonly turn: HelmTurn | null;
  /** BEST VMG's leg memory (hysteresis). */
  readonly leg: HelmLeg | null;
  readonly ironsFor: number;
  readonly usage: HelmUsage;
}

/** The boat's polar as the assist reads it. */
export interface HelmProfile {
  readonly angles: PolarAngles;
  readonly speedAt: SpeedAt;
  /** Half-angle of this boat's no-go zone (classic 30, cruiser NO_GO_HALF_DEG). */
  readonly noGoDeg: number;
}

export const NO_HELM_USAGE: HelmUsage = Object.freeze({ buttonTurns: 0, bestVmgSec: 0, angleHoldSec: 0 });

export function createHelmAssist(): HelmAssistState {
  return { hold: "off", windTwa: 0, turn: null, leg: null, ironsFor: 0, usage: NO_HELM_USAGE };
}

const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const norm360 = (d: number) => ((d % 360) + 360) % 360;
/** Signed TWA as the race measures it (race-physics.ts calcTWA). */
export const twaOf = (heading: number, windDir: number) => wrap180(heading - windDir);

/** A tack below 90 degrees off the wind, a gybe from 90 on. */
export function turnKindAt(twa: number): HelmTurnKind {
  return Math.abs(twa) < 90 ? "tack" : "gybe";
}

/**
 * The target of the tack or gybe button: the mirrored angle on the other
 * side. A tack never ends inside the no-go zone: from a pinch (or from irons)
 * it goes to the best upwind angle, at least the zone's edge. A tack turns
 * through head to wind, a gybe through dead downwind.
 */
export function tackTarget(twa: number, profile: Pick<HelmProfile, "angles" | "noGoDeg">, markTwa = 1): { kind: HelmTurnKind; targetTwa: number; dir: 1 | -1 } {
  const kind = turnKindAt(twa), side = sideOf(twa, markTwa), a = Math.abs(twa);
  if (kind === "tack") {
    const floor = profile.noGoDeg;
    const abs = a >= floor ? a : Math.max(floor, profile.angles.upwind.twa);
    return { kind, targetTwa: -side * Math.round(abs), dir: (-side) as 1 | -1 };
  }
  return { kind, targetTwa: -side * Math.round(Math.min(180, a)), dir: side };
}

/** Degrees still to turn along the turn's direction (0 when there or past it). */
export function remainingTurn(twa: number, turn: Pick<HelmTurn, "targetTwa" | "dir">): number {
  const r = norm360(turn.dir * (turn.targetTwa - twa));
  return r > 300 ? 0 : r;
}

/** In irons (inside the zone, no way on): the angle to bear away to, on the
 * side the bow already falls off to; null when the boat is not in irons. */
export function ironsEscape(twa: number, speedKn: number, profile: Pick<HelmProfile, "angles" | "noGoDeg">, markTwa = 1): number | null {
  if (!(Math.abs(twa) < profile.noGoDeg) || !(speedKn < HELM_ASSIST.ironsBelowKn)) return null;
  return sideOf(twa, markTwa) * Math.max(profile.noGoDeg, profile.angles.upwind.twa);
}

/** Switch the hold (the "Hold angle" and BEST VMG buttons). The angle hold
 * keeps the angle the boat sails now. A turn in progress keeps going and
 * hands over to the new hold. */
export function setHelmHold(state: HelmAssistState, hold: HelmHold, twa: number): HelmAssistState {
  return { ...state, hold, windTwa: hold === "wind" ? Math.round(twa) : state.windTwa, leg: hold === "vmg" ? state.leg : null,
    turn: state.turn ? { ...state.turn, resume: hold } : null };
}

/** The tack or gybe button. Ignored while a turn is under way. */
export function requestHelmTurn(state: HelmAssistState, input: { twa: number; courseHold: number | null; profile: HelmProfile; markTwa?: number }): HelmAssistState {
  if (state.turn) return state;
  const plan = tackTarget(input.twa, input.profile, input.markTwa);
  const resume: HelmResume = state.hold !== "off" ? state.hold : input.courseHold !== null ? "course" : "off";
  return { ...state, turn: { ...plan, elapsed: 0, resume }, ironsFor: 0 };
}

export interface HelmTick {
  readonly dt: number;
  readonly heading: number;
  readonly windDir: number;
  readonly speedKn: number;
  /** Manual rudder this tick, -1..1 (Pro arrows and keys, the wheel or slider
   * in rudder mode); 0 = none. Any non-zero value switches the assists off. */
  readonly manual: number;
  /** Simple arrows held: -1 left, 1 right, 0 none. */
  readonly arrows: number;
  /** Simple: a one-shot course step this tick (an arrow tap), degrees. */
  readonly nudgeDeg: number;
  /** The held course (Simple arrows, the wheel or slider in course mode). */
  readonly courseHold: number | null;
  /** Signed TWA of the bearing to the next mark. */
  readonly markTwa: number;
  readonly profile: HelmProfile;
}

export type HelmEvent = "turn-done" | "turn-cancelled" | "vmg-off" | "irons";

export interface HelmTickResult {
  readonly state: HelmAssistState;
  readonly courseHold: number | null;
  /** Heading the assist steers to; null: the manual rudder steers. */
  readonly heading: number | null;
  readonly event: HelmEvent | null;
}

function resumeAfter(state: HelmAssistState, turn: HelmTurn, windDir: number, courseHold: number | null): { state: HelmAssistState; courseHold: number | null } {
  const next = { ...state, turn: null };
  if (turn.resume === "course") return { state: { ...next, hold: "off" }, courseHold: norm360(windDir + turn.targetTwa) };
  if (turn.resume === "wind") return { state: { ...next, hold: "wind", windTwa: turn.targetTwa }, courseHold: null };
  if (turn.resume === "vmg") return { state: { ...next, hold: "vmg", leg: null }, courseHold: null };
  return { state: { ...next, hold: "off" }, courseHold };
}

/** One tick of the helm assist. */
export function stepHelmAssist(state: HelmAssistState, input: HelmTick): HelmTickResult {
  const dt = Number.isFinite(input.dt) && input.dt > 0 ? input.dt : 0;
  const twa = twaOf(input.heading, input.windDir);
  let s = state, course = input.courseHold, event: HelmEvent | null = null;
  if (input.manual !== 0 && Number.isFinite(input.manual)) {
    if (s.hold === "vmg" || s.turn?.resume === "vmg") event = "vmg-off";
    else if (s.turn) event = "turn-cancelled";
    return { state: { ...s, hold: "off", turn: null, leg: null, ironsFor: 0 }, courseHold: null, heading: null, event };
  }
  const delta = (Number.isFinite(input.nudgeDeg) ? input.nudgeDeg : 0) + Math.sign(input.arrows || 0) * HELM_ASSIST.arrowRateDegPerSec * dt;
  if (delta !== 0) {
    if (s.turn) { s = { ...s, turn: null }; event = "turn-cancelled"; }
    if (s.hold === "wind") s = { ...s, windTwa: wrap180(s.windTwa + delta) };
    else {
      if (s.hold === "vmg") { s = { ...s, hold: "off", leg: null }; event = "vmg-off"; }
      course = norm360((course ?? input.heading) + delta);
    }
  }
  const inIrons = Math.abs(twa) < input.profile.noGoDeg && input.speedKn < HELM_ASSIST.ironsBelowKn;
  s = { ...s, ironsFor: inIrons ? s.ironsFor + dt : 0 };
  const vmgOn = s.hold === "vmg" || s.turn?.resume === "vmg";
  s = { ...s, usage: { ...s.usage, bestVmgSec: s.usage.bestVmgSec + (vmgOn ? dt : 0), angleHoldSec: s.usage.angleHoldSec + (s.hold === "wind" ? dt : 0) } };
  if (s.turn) {
    const turn = { ...s.turn, elapsed: s.turn.elapsed + dt };
    const left = remainingTurn(twa, turn);
    if (left <= HELM_ASSIST.turnDoneDeg) {
      const done = resumeAfter(s, turn, input.windDir, course);
      s = { ...done.state, usage: { ...done.state.usage, buttonTurns: done.state.usage.buttonTurns + 1 } };
      course = done.courseHold; event = "turn-done";
    } else if (turn.elapsed > HELM_ASSIST.turnTimeoutSec) {
      const given = resumeAfter(s, turn, input.windDir, course);
      // A stalled turn keeps the hold it was going back to, from where the boat is.
      s = given.state; course = turn.resume === "course" ? norm360(input.heading) : given.courseHold;
      if (s.hold === "wind") s = { ...s, windTwa: Math.round(twa) };
      event = "turn-cancelled";
    } else {
      return { state: { ...s, turn }, courseHold: course, heading: norm360(input.heading + turn.dir * Math.min(left, HELM_ASSIST.turnLeadDeg)), event };
    }
  }
  if (s.ironsFor >= HELM_ASSIST.ironsAfterSec && (s.hold === "wind" || course !== null)) {
    const out = ironsEscape(twa, input.speedKn, input.profile, input.markTwa);
    if (out !== null) {
      if (s.hold === "wind") s = { ...s, windTwa: out };
      else course = norm360(input.windDir + out);
      s = { ...s, ironsFor: 0 }; event ??= "irons";
    }
  }
  if (s.hold === "vmg") {
    const target = legTarget(input.profile.speedAt, input.profile.angles, input.markTwa, twa, s.leg);
    return { state: { ...s, leg: target.leg }, courseHold: null, heading: norm360(input.windDir + target.twa), event };
  }
  if (s.hold === "wind") return { state: s, courseHold: null, heading: norm360(input.windDir + s.windTwa), event };
  return { state: s, courseHold: course, heading: course, event };
}

/** What the race cockpit shows of the helm, published by the race loop at the HUD rate. */
export interface HelmView {
  hold: HelmHold;
  /** The button turn under way: its kind and the course it ends on. */
  turning: { kind: HelmTurnKind; heading: number } | null;
  /** The held course (Simple arrows, course mode), null when none. */
  course: number | null;
  /** The helm the boat gets, -1..1, whatever steers it (wheel, keys, arrows, assists). */
  rudder: number;
  /** Speed made good on this leg (VMG on a beat or a run, VMC on a reach), its
   * best by the polar and the trend over the last two seconds. */
  vmg: { kn: number; targetKn: number; leg: HelmLeg; trend: -1 | 0 | 1 } | null;
}

export const NO_HELM_VIEW: HelmView = { hold: "off", turning: null, course: null, rudder: 0, vmg: null };

/** Heading error to a turn input of the race's helm, -1..1 (the legacy race's
 * heading hold: full helm from 12 degrees off). */
export function helmTurnToward(heading: number, target: number, fullAtDeg = 12): number {
  const diff = wrap180(target - heading);
  return Math.max(-1, Math.min(1, diff / fullAtDeg));
}
