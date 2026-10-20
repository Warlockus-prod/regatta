import { outhaulDepthFactor } from "../../../lib/sailing-physics/mainsail-shape";
import type { SailingSession } from "../runtime/session";
import { VANG_LIMITS } from "../rig/vang";
import { getBoatParams, twaFromCompass } from "../../../lib/sailing-physics";

export type TrimTask = "twist" | "depth";
export const trimTasks = {
  twist: { twa: 60, windSpeed: 16, tack: "port" as const, jibAngle: 20, length: 9.5, outhaul: .5 },
  depth: { twa: 80, windSpeed: 18, tack: "starboard" as const, jibAngle: 32, length: 18, outhaul: .8 },
};
interface Sample {
  time: number; yaw: number; twist: number; depth: number; speed: number;
  environment: string; command: string; ready: boolean; initial: boolean;
}
export interface TrimAssessment {
  task: TrimTask;
  phase: "baseline" | "perform" | "explain" | "complete";
  baseline: Sample | null;
  last: Sample | null;
  result: Sample | null;
  stableFor: number;
  issue: "wait" | "environment" | "goal" | "answer" | null;
}
export const newTrimAssessment = (task: TrimTask): TrimAssessment => ({ task, phase: "baseline", baseline: null, last: null, result: null, stableFor: 0, issue: null });

function sample(session: SailingSession, task: TrimTask): Sample | null {
  const rig = session.mainTrim;
  if (!rig) return null;
  const spec = trimTasks[task];
  const command = rig.command, target = rig.target;
  const vang = command.vangSpan ?? VANG_LIMITS.max;
  const outhaul = command.outhaulEase ?? .5;
  const params = getBoatParams();
  const jibAngle = params.jibMinOff + (1 - session.target.jibSheet) * (params.jibMaxOff - params.jibMinOff);
  const signedTwa = spec.tack === "starboard" ? spec.twa : -spec.twa;
  return {
    time: session.simTime, yaw: rig.pose.yaw, twist: rig.twist * 20,
    // Same lower-section factor used by the cloth renderer and force model.
    // This is a normalized shape index, not measured centimetres or tension.
    depth: outhaulDepthFactor(outhaul, .2), speed: session.boat.boatSpeed,
    environment: JSON.stringify([session.model, session.steering, session.wind.baseTws, session.wind.baseDir, session.windMode, session.target]),
    command: JSON.stringify([target.workingLength, target.traveler, target.vangSpan ?? VANG_LIMITS.max, target.outhaulEase ?? .5]),
    ready: session.windMode === "steady" && session.live.mainHoisted !== false && session.live.reef === 0
      && Math.abs(command.workingLength - target.workingLength) < .005
      && Math.abs(command.traveler - target.traveler) < .005
      && Math.abs(vang - (target.vangSpan ?? VANG_LIMITS.max)) < .0001
      && Math.abs(outhaul - (target.outhaulEase ?? .5)) < .0001,
    initial: session.wind.baseTws === spec.windSpeed && session.steering.mode === "course-assist"
      && Math.abs(twaFromCompass(session.wind.baseDir, session.steering.heading) - signedTwa) < .1
      && Math.abs(twaFromCompass(session.wind.baseDir, session.boat.heading) - signedTwa) < .1
      && Math.abs(jibAngle - spec.jibAngle) < .01 && session.target.jibFurl === 0 && session.target.jibSide === 1
      && session.target.reef === 0 && session.target.mainHoisted !== false
      && Math.abs(command.workingLength - spec.length) < .005
      && Math.abs(command.traveler) < .005 && Math.abs(outhaul - spec.outhaul) < .0001
      && Math.abs(vang - VANG_LIMITS.max) < .0001,
  };
}

function goal(task: TrimTask, base: Sample, now: Sample) {
  if (base.environment !== now.environment || Math.abs(now.yaw - base.yaw) > 1) return false;
  return task === "twist"
    ? now.twist >= base.twist + 1 && Math.abs(now.depth - base.depth) < .005
    : now.depth <= base.depth * .85 && Math.abs(now.twist - base.twist) <= .5;
}

/** Observe actual settled outcomes, not a prescribed slider value. Background
 * gaps, pause, new sessions and environment changes cannot earn hold time.
 * Completion requires an explicit record and a causal explanation as well.
 */
export function advanceTrimAssessment(state: TrimAssessment, session: SailingSession): TrimAssessment {
  if (state.phase === "complete" || state.phase === "explain") return state;
  const now = sample(session, state.task), prev = state.last;
  if (!now || (prev && now.time < prev.time)) return newTrimAssessment(state.task);
  const dt = prev ? now.time - prev.time : 0;
  if (prev && dt === 0) return state;
  const steady = prev && dt > 0 && dt <= .25 && now.ready && prev.ready
    && now.command === prev.command && now.environment === prev.environment
    && Math.abs(now.yaw - prev.yaw) / dt < .15
    && Math.abs(now.twist - prev.twist) / dt < .15
    && Math.abs(now.speed - prev.speed) / dt < .05;
  const valid = state.phase === "baseline" ? now.initial : state.baseline && goal(state.task, state.baseline, now);
  const stableFor = steady && valid ? Math.min(3, state.stableFor + dt) : 0;
  if (state.phase === "baseline" && stableFor === 3) {
    return { ...state, phase: "perform", baseline: now, last: now, stableFor: 0, issue: null };
  }
  return { ...state, last: now, stableFor };
}

export function recordTrimAssessment(state: TrimAssessment, session: SailingSession): TrimAssessment {
  if (state.phase !== "perform") return state;
  const now = sample(session, state.task), base = state.baseline, last = state.last;
  if (!now || !base || !last || !now.ready || now.time < last.time || now.time - last.time > .25
    || now.command !== last.command || now.environment !== last.environment) return { ...state, issue: "wait" };
  if (base.environment !== now.environment) return { ...state, issue: "environment" };
  if (!goal(state.task, base, now)) return { ...state, issue: "goal" };
  if (state.stableFor < 3) return { ...state, issue: "wait" };
  return { ...state, phase: "explain", result: now, issue: null };
}

export function explainTrimAssessment(state: TrimAssessment, causal: boolean): TrimAssessment {
  if (state.phase !== "explain") return state;
  return causal ? { ...state, phase: "complete", issue: null } : { ...state, issue: "answer" };
}
