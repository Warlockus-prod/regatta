import type { BoatParams, Controls } from "../../../lib/sailing-physics";
import { SAILING_STEP_SECONDS } from "./fixed-clock";
import { SESSION_MODEL, sessionInput, stepSailingSession, type SailingSession, type SessionInput } from "./session";
import { isSessionInput } from "./input";
import { isMainTrimState } from "../rig/main-trim";

type RecordValue = Record<string, unknown>;
const object = (v: unknown): v is RecordValue => v !== null && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const unit = (v: unknown) => num(v, 0, 1);
const oneOf = (v: unknown, values: readonly unknown[]) => values.includes(v);
const fields = (v: unknown, ranges: Record<string, [number, number]>) => object(v) && Object.entries(ranges).every(([key, [min, max]]) => num(v[key], min, max));
function controls(v: unknown): v is Controls {
  return object(v) && ["mainSheet", "jibSheet", "mainTwist", "jibTwist", "reef", "jibFurl"].every(key => unit(v[key]))
    && (v.mainHoisted === undefined || typeof v.mainHoisted === "boolean") && v.jibSide === 1;
}
function steering(v: unknown) {
  return object(v) && ((v.mode === "course-assist" && num(v.heading, 0, 360))
    || (v.mode === "helm" && num(v.rudder, -1, 1) && typeof v.lowSpeedAssist === "boolean"));
}
const windMode = (v: unknown) => oneOf(v, ["steady", "shift", "gust"]);
function response(v: unknown) {
  return object(v) && ["fill", "luff", "attachment"].every(key => unit(v[key])) && num(v.airSpeed, 0, 160)
    && oneOf(v.status, ["calm", "inIrons", "luffing", "stalled", "drawing", "transferring"]);
}
/** Validate every field later read by the integrator. No partial repairs of a
 * corrupt snapshot: mixing a fresh rig with an old boat manufactures a state.
 */
function validSession(s: unknown): s is SailingSession {
  if (!object(s) || s.model !== SESSION_MODEL || !num(s.ticks, 0, 3e8) || !Number.isSafeInteger(s.ticks)
    || !num(s.simTime, 0, 1e7) || Math.abs(s.simTime - s.ticks * SAILING_STEP_SECONDS) > 1e-7) return false;
  if (!controls(s.live) || !controls(s.target) || !steering(s.steering) || !windMode(s.windMode)) return false;
  if (s.mainTrim !== undefined && !isMainTrimState(s.mainTrim)) return false;
  if (!fields(s.boat, { trueWindDir: [0, 360], trueWindSpeed: [0, 90], heading: [0, 360], boatSpeed: [0, 60], heel: [-90, 90], leeway: [-90, 90] })
    || !fields(s.position, { east: [-1e9, 1e9], north: [-1e9, 1e9] })
    || !num(s.mainIncidence, -180, 180) || !num(s.jibIncidence, -180, 180)) return false;
  if (!object(s.rig) || !oneOf(s.rig.lee, [-1, 1]) || !oneOf(s.rig.maneuver, ["sailing", "tacking", "gybing"])
    || !fields(s.rig, { main: [-90, 90], jib: [-90, 90], elapsed: [0, 10] })) return false;
  if (isMainTrimState(s.mainTrim) && (Math.abs(s.mainTrim.pose.yaw - Number(s.rig.main)) > 1e-8
    || Math.abs(s.mainTrim.twist - s.live.mainTwist) > 1e-8)) return false;
  if (!object(s.wind) || !fields(s.wind, { baseTws: [0, 60], baseDir: [0, 360], t: [0, 1e7], seed: [0, 4294967295], twsFactor: [1, 1.5], dirOffset: [-12, 12], nextGustAt: [0, 1e7 + 30] })
    || !Number.isInteger(s.wind.seed)) return false;
  if (s.wind.gust !== null && !fields(s.wind.gust, { startAt: [0, 1e7], peakFactor: [1.3, 1.45], hold: [4, 6] })) return false;
  if (object(s.wind.gust) && Number(s.wind.gust.startAt) > Number(s.wind.t)) return false;
  if (!object(s.lastDiag) || !fields(s.lastDiag, { aws: [0, 160], awa: [-180, 180], mainAoA: [0, 180], jibAoA: [0, 180], slotHealth: [0, 1], drive: [-1e7, 1e7], side: [-1e7, 1e7], vmg: [-60, 60] })
    || typeof s.lastDiag.mainStalled !== "boolean" || typeof s.lastDiag.jibStalled !== "boolean") return false;
  return response(s.main) && response(s.jib);
}

export type SnapshotResult = { ok: true; session: SailingSession } | { ok: false; reason: "corrupt" | "incompatible" };
export function readSessionSnapshot(raw: string): SnapshotResult {
  if (raw.length > 32_768) return { ok: false, reason: "corrupt" };
  try {
    const envelope: unknown = JSON.parse(raw);
    if (!object(envelope)) return { ok: false, reason: "corrupt" };
    if (envelope.version !== 1 || (object(envelope.session) && envelope.session.model !== SESSION_MODEL)) return { ok: false, reason: "incompatible" };
    if (!validSession(envelope.session)) return { ok: false, reason: "corrupt" };
    return { ok: true, session: envelope.session };
  } catch { return { ok: false, reason: "corrupt" }; }
}
export function writeSessionSnapshot(session: SailingSession): string {
  if (!validSession(session)) throw new RangeError("Invalid sailing session snapshot");
  return JSON.stringify({ version: 1, session });
}

export interface SessionEvent { atTick: number; input: SessionInput }
/** Events carry the full intent at a tick boundary, never wall-clock time.
 * View changes are deliberately absent: they cannot change the simulation.
 */
export function replaySession(initial: SailingSession, events: readonly SessionEvent[], untilTick: number, params: BoatParams): SailingSession {
  if (!validSession(initial) || !Number.isSafeInteger(untilTick) || untilTick < initial.ticks || untilTick - initial.ticks > 108_000 || events.length > 10_000) throw new RangeError("Invalid replay range");
  let previous = initial.ticks;
  for (const event of events) {
    if (!Number.isSafeInteger(event.atTick) || event.atTick < previous || event.atTick >= untilTick || !isSessionInput(event.input)) throw new RangeError("Invalid replay event");
    previous = event.atTick;
  }
  let state = initial, input = sessionInput(initial), index = 0;
  while (state.ticks < untilTick) {
    while (index < events.length && events[index].atTick === state.ticks) input = events[index++].input;
    state = stepSailingSession(state, input, params);
  }
  return state;
}
