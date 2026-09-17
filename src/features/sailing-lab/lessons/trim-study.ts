import type { SailingSession } from "../runtime/session";
import { VANG_LIMITS } from "../rig/vang";

export type TrimStudyPhase = "baseline" | "ease" | "compare" | "explain" | "complete";
export type TrimStudyIssue = "wait" | "setup" | "environment" | "ease" | "compare" | "answer";
export interface TrimObservation {
  time: number;
  yaw: number;
  rise: number;
  twist: number;
  speed: number;
  heel: number;
  length: number;
  traveler: number;
  targetLength: number;
  targetTraveler: number;
  environment: string;
  ready: boolean;
}
export interface TrimStudy {
  phase: TrimStudyPhase;
  stableFor: number;
  last: TrimObservation | null;
  baseline: TrimObservation | null;
  eased: TrimObservation | null;
  compared: TrimObservation | null;
  issue: TrimStudyIssue | null;
}
export const newTrimStudy = (): TrimStudy => ({ phase: "baseline", stableFor: 0, last: null, baseline: null, eased: null, compared: null, issue: null });

export function observeTrim(s: SailingSession): TrimObservation | null {
  const rig = s.mainTrim;
  if (!rig) return null;
  return {
    time: s.simTime, yaw: rig.pose.yaw, rise: rig.pose.rise, twist: rig.twist * 20,
    speed: s.boat.boatSpeed, heel: Math.abs(s.boat.heel), length: rig.command.workingLength,
    traveler: rig.command.traveler, targetLength: rig.target.workingLength, targetTraveler: rig.target.traveler,
    environment: JSON.stringify([s.model, s.steering, s.wind.baseTws, s.wind.baseDir, s.windMode, s.target,
      ...((rig.target.vangSpan ?? VANG_LIMITS.max) !== VANG_LIMITS.max || (rig.target.outhaulEase ?? .5) !== .5
        ? [rig.target.vangSpan ?? VANG_LIMITS.max, rig.target.outhaulEase ?? .5] : [])]),
    ready: s.windMode === "steady" && s.live.mainHoisted !== false && s.live.reef === 0
      && rig.slack < .01 && Math.abs(rig.command.workingLength - rig.target.workingLength) < .005
      && Math.abs(rig.command.traveler - rig.target.traveler) < .005
      && Math.abs((rig.command.vangSpan ?? VANG_LIMITS.max) - VANG_LIMITS.max) < .0001
      && Math.abs((rig.target.vangSpan ?? VANG_LIMITS.max) - VANG_LIMITS.max) < .0001
      && Math.abs((rig.command.outhaulEase ?? .5) - .5) < .0001
      && Math.abs((rig.target.outhaulEase ?? .5) - .5) < .0001,
      // The first study isolates sheet/car: additional controls must stay at
      // their baseline and fully settle, including after a restored intent.
  };
}

/** Sample simulation time, not wall time. Pause cannot earn hold time; long
 * gaps discard continuity. A new session cannot reuse old observations.
 */
export function advanceTrimStudy(study: TrimStudy, session: SailingSession): TrimStudy {
  const next = observeTrim(session), prev = study.last;
  if (!next || (prev && next.time < prev.time)) return newTrimStudy();
  if (study.phase === "complete" || study.phase === "explain") return study;
  const dt = prev ? next.time - prev.time : 0;
  if (prev && dt === 0) return study;
  const steady = prev && dt > 0 && dt <= .25 && next.ready && prev.ready
    && next.environment === prev.environment
    && next.targetLength === prev.targetLength && next.targetTraveler === prev.targetTraveler
    && Math.abs(next.yaw - prev.yaw) / dt < .15
    && Math.abs(next.twist - prev.twist) / dt < .15
    && Math.abs(next.speed - prev.speed) / dt < .05;
  return { ...study, last: next, stableFor: steady ? Math.min(3, study.stableFor + dt) : 0 };
}

/** A click only requests an observation. Success depends on settled geometry
 * with unchanged wind/course/other sails and the requested control sequence.
 */
export function recordTrimStudy(study: TrimStudy, session: SailingSession): TrimStudy {
  if (study.phase === "complete" || study.phase === "explain") return study;
  const now = observeTrim(session), base = study.baseline;
  const fail = (issue: TrimStudyIssue) => ({ ...study, issue });
  if (!now || !study.last || session.simTime < study.last.time || !now.ready
    || study.stableFor < 3 || now.environment !== study.last.environment
    || now.targetLength !== study.last.targetLength || now.targetTraveler !== study.last.targetTraveler
    || now.time - study.last.time > .25) return fail("wait");
  if (study.phase === "baseline") {
    if (Math.abs(now.length - 9) > .05 || Math.abs(now.traveler) > .01
      || Math.abs(now.yaw) < 10 || Math.abs(now.yaw) > 25) return fail("setup");
    return { ...study, phase: "ease", baseline: now, stableFor: 0, issue: null };
  }
  if (!base || now.environment !== base.environment) return fail("environment");
  if (study.phase === "ease") {
    if (Math.abs(now.length - (base.length + 2)) > .05 || Math.abs(now.traveler - base.traveler) > .01
      || Math.abs(now.yaw) < Math.abs(base.yaw) + 2 || now.twist < base.twist + 1) return fail("ease");
    return { ...study, phase: "compare", eased: now, stableFor: 0, issue: null };
  }
  const windward = -Math.sign(base.yaw);
  if (now.traveler * windward < .1 || Math.abs(now.length - (base.length + 2)) > .05
    || Math.abs(now.yaw - base.yaw) > 1 || now.rise < base.rise + 1
    || now.twist < base.twist + 1) return fail("compare");
  return { ...study, phase: "explain", compared: now, issue: null };
}

export function explainTrimStudy(study: TrimStudy, answer: "angle-only" | "shape") {
  if (study.phase !== "explain") return study;
  return answer === "shape" ? { ...study, phase: "complete" as const, issue: null }
    : { ...study, issue: "answer" as const };
}
