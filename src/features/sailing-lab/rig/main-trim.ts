import { apparentWind, twaFromCompass, type BoatParams, type BoatState, type Controls } from "../../../lib/sailing-physics";
import { computeSailForce } from "../../../lib/sailing-physics/forces";
import { reefAreaFraction } from "../../../lib/sailing-physics/sail-plan";
import { approach, clamp } from "../runtime/math";
import { mainsheetGeometry, validateBoomPose, type BoomPose } from "./layout";
import { RIG_PASSPORT as P } from "./passport";
import { vangGeometry, vangRiseLimit, VANG_LIMITS } from "./vang";

export interface MainTrimCommand {
  workingLength: number; traveler: number;
  /** Maximum vang endpoint separation, metres. Missing means fully eased. */
  vangSpan?: number;
  /** 0 hauled, 1 eased; a setting, never measured line tension. */
  outhaulEase?: number;
}
export interface MainTrimState {
  pose: BoomPose;
  command: MainTrimCommand;
  target: MainTrimCommand;
  twist: number;
  /** Relative teaching-model reaction, not a certified rope load. */
  sheetLoad: number;
  slack: number;
  residual: number;
  vangSlack?: number;
}
export const MAIN_TRIM_LIMITS = { minLength: 6.4, maxLength: 32, traveler: .8 } as const;
const rad = Math.PI / 180;
// Overdamped educational dynamics, not measured spar inertia. Four substeps
// and a bounded nonlinear projection make the inextensible rope unilateral.
const yawMobility = 1 / 2200, riseMobility = 1 / 7000;
const finite = (v: unknown, low: number, high: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= low && v <= high;
export function isMainTrimCommand(v: unknown): v is MainTrimCommand {
  if (!v || typeof v !== "object") return false;
  const c = v as MainTrimCommand;
  return finite(c.workingLength, MAIN_TRIM_LIMITS.minLength, MAIN_TRIM_LIMITS.maxLength)
    && finite(c.traveler, -.8, .8)
    && (c.vangSpan === undefined || finite(c.vangSpan, VANG_LIMITS.min, VANG_LIMITS.max))
    && (c.outhaulEase === undefined || finite(c.outhaulEase, 0, 1));
}
export function isMainTrimState(v: unknown): v is MainTrimState {
  if (!v || typeof v !== "object") return false;
  const s = v as MainTrimState;
  const fieldsValid = Boolean(s.pose) && finite(s.pose.yaw, -85, 85) && finite(s.pose.rise, 0, 12)
    && isMainTrimCommand(s.command) && isMainTrimCommand(s.target)
    && finite(s.twist, 0, 1) && finite(s.sheetLoad, 0, 1) && finite(s.slack, 0, 32)
    && finite(s.residual, 0, .002);
  if (!fieldsValid) return false;
  const error = mainsheetGeometry(s.pose, s.command.traveler).workingLength - s.command.workingLength;
  const vangSlack = (s.command.vangSpan ?? VANG_LIMITS.max) - vangGeometry(s.pose).span;
  return Math.abs(s.twist - twistFromRise(s.pose.rise)) < 1e-8
    && Math.abs(s.slack - Math.max(0, -error)) < 1e-7
    && Math.abs(s.residual - Math.max(0, error)) < 1e-7 && vangSlack >= -1e-7
    && (s.vangSlack === undefined ? s.command.vangSpan === undefined
      : finite(s.vangSlack, 0, 1) && Math.abs(s.vangSlack - Math.max(0, vangSlack)) < 1e-7);
}

/** Phenomenological leech compliance: raising the clew permits greater twist.
 * It is deliberately bounded and documented, not claimed to be a cloth FEM.
 * The SAME value is passed to sectional forces and the rendered sail.
 */
export const twistFromRise = (rise: number) => clamp(.04 + rise * .075, 0, 1);

function bounded(pose: BoomPose, maxRise = 12): BoomPose {
  return { yaw: clamp(pose.yaw, -85, 85), rise: clamp(pose.rise, 0, maxRise) };
}
/** Constraint gradient in metres/radian, derived from the shared attachment.
 * At a hard stop, do not project into a forbidden DOF and lose convergence.
 */
function gradient(pose: BoomPose, car: number) {
  const step = .001;
  const derivative = (key: "yaw" | "rise") => {
    const a = bounded({ ...pose, [key]: pose[key] - step });
    const b = bounded({ ...pose, [key]: pose[key] + step });
    return (mainsheetGeometry(b, car).workingLength - mainsheetGeometry(a, car).workingLength) / ((b[key] - a[key]) * rad);
  };
  const yaw = derivative("yaw"), rise = derivative("rise");
  return { yaw: (pose.yaw <= -85 && yaw > 0) || (pose.yaw >= 85 && yaw < 0) ? 0 : yaw,
    rise: (pose.rise <= 0 && rise > 0) || (pose.rise >= 12 && rise < 0) ? 0 : rise };
}
function constrain(candidate: BoomPose, command: MainTrimCommand) {
  const maxRise = command.vangSpan === undefined ? 12 : vangRiseLimit(command.vangSpan);
  let pose = bounded(candidate, maxRise), reaction = 0;
  for (let iteration = 0; iteration < 32; iteration++) {
    const excess = mainsheetGeometry(pose, command.traveler).workingLength - command.workingLength;
    if (excess <= 1e-7) break;
    const g = gradient(pose, command.traveler);
    const denom = yawMobility * g.yaw ** 2 + riseMobility * g.rise ** 2;
    if (denom < 1e-12) break;
    const multiplier = excess / denom;
    // Limit each nonlinear correction; the next iteration re-evaluates the
    // geometry rather than treating a long traveler move as a linear spring.
    const factor = Math.min(1, 8 * rad / Math.max(Math.abs(multiplier * yawMobility * g.yaw), Math.abs(multiplier * riseMobility * g.rise)));
    pose = bounded({ yaw: pose.yaw - multiplier * yawMobility * g.yaw * factor / rad,
      rise: pose.rise - multiplier * riseMobility * g.rise * factor / rad }, maxRise);
    reaction += multiplier * factor;
  }
  const residual = Math.max(0, mainsheetGeometry(pose, command.traveler).workingLength - command.workingLength);
  if (residual > .002) throw new RangeError("Main sheet constraint did not converge");
  return { pose, reaction, residual };
}

export function createMainTrim(pose: BoomPose, command: MainTrimCommand): MainTrimState {
  validateBoomPose(pose);
  if (!isMainTrimCommand(command)) throw new RangeError("Invalid main trim command");
  const solved = constrain(pose, command);
  return { pose: solved.pose, command: { ...command }, target: { ...command },
    twist: twistFromRise(solved.pose.rise), sheetLoad: 0, residual: solved.residual,
    vangSlack: Math.max(0, (command.vangSpan ?? VANG_LIMITS.max) - vangGeometry(solved.pose).span),
    slack: Math.max(0, command.workingLength - mainsheetGeometry(solved.pose, command.traveler).workingLength) };
}

export function stepMainTrim(previous: MainTrimState, target: MainTrimCommand, boat: BoatState, controls: Controls, params: BoatParams, dt: number): MainTrimState {
  if (!isMainTrimState(previous) || !isMainTrimCommand(target) || !finite(dt, 0, 1 / 30 + 1e-10)) throw new RangeError("Invalid main trim step");
  if (dt === 0) return previous;
  const aw = apparentWind(boat.trueWindSpeed, twaFromCompass(boat.trueWindDir, boat.heading), boat.boatSpeed, boat.leeway);
  let pose = previous.pose, command = previous.command, totalReaction = 0, residual = 0;
  const h = dt / 4;
  for (let i = 0; i < 4; i++) {
    // A teaching assistant handles the tail/car. These are response limits,
    // not a simulated winch, clutch or claim about a safe handling speed.
    command = { workingLength: approach(command.workingLength, target.workingLength, h), traveler: approach(command.traveler, target.traveler, .25 * h),
      ...((command.vangSpan !== undefined || target.vangSpan !== undefined) ? { vangSpan: approach(command.vangSpan ?? VANG_LIMITS.max, target.vangSpan ?? VANG_LIMITS.max, .05 * h) } : {}),
      ...((command.outhaulEase !== undefined || target.outhaulEase !== undefined) ? { outhaulEase: approach(command.outhaulEase ?? .5, target.outhaulEase ?? .5, .3 * h) } : {}),
    };
    const force = computeSailForce(aw.vec, aw.aws * .514444, {
      area: controls.mainHoisted === false ? 0 : params.mainArea * reefAreaFraction(controls.reef) * Math.cos(pose.rise * rad),
      angleOff: Math.abs(pose.yaw), side: pose.yaw === 0 ? (aw.awa >= 0 ? -1 : 1) : pose.yaw > 0 ? 1 : -1,
      twist: twistFromRise(pose.rise),
      outhaulEase: command.outhaulEase,
    });
    // Horizontal sail force about the gooseneck. Internal leech pull lifts
    // the clew under load; a 0.42 resultant ratio is a synthetic compliance
    // parameter, not a measured leech tension. Gravity
    // and the named lower support keep an unloaded boom down, not blown out.
    const yawTorque = 1.7 * (force.side * Math.cos(pose.yaw * rad) + force.drive * Math.sin(pose.yaw * rad));
    const leechLift = .42 * Math.hypot(force.side, force.drive);
    const riseTorque = P.boom.length * Math.cos(pose.rise * rad) * (leechLift - 40 * 9.81 / 2);
    const dy = yawTorque * yawMobility * h / rad, dr = riseTorque * riseMobility * h / rad;
    // One common limiter preserves the torque ratio. Independently clipping
    // pitch/yaw manufactured excessive down-pull and pinned the boom at zero.
    const rateFactor = Math.min(1, 90 * h / Math.max(1e-12, Math.abs(dy)), 15 * h / Math.max(1e-12, Math.abs(dr)));
    const candidate = bounded({ yaw: pose.yaw + dy * rateFactor, rise: pose.rise + dr * rateFactor });
    const result = constrain(candidate, command);
    pose = result.pose; residual = result.residual; totalReaction += result.reaction;
  }
  return { pose, command, target: { ...target }, twist: twistFromRise(pose.rise),
    sheetLoad: clamp(totalReaction / dt / 1200, 0, 1), residual,
    vangSlack: Math.max(0, (command.vangSpan ?? VANG_LIMITS.max) - vangGeometry(pose).span),
    slack: Math.max(0, command.workingLength - mainsheetGeometry(pose, command.traveler).workingLength) };
}
