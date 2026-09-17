import type { UiState } from "../../simulator-v3/ui/shared";
import type { TrimObservation, TrimStudy } from "../lessons/trim-study";
import { isMainTrimCommand } from "../rig/main-trim";
import { readSessionSnapshot, writeSessionSnapshot } from "./snapshot";
import type { SailingSession } from "./session";

export const CHECKPOINT_LIMIT = 65_536;
export interface TrainerCheckpoint {
  savedAt: number;
  session: SailingSession;
  ui: UiState;
  study: TrimStudy | null;
}
export type CheckpointResult = { ok: true; checkpoint: TrainerCheckpoint }
  | { ok: false; reason: "corrupt" | "incompatible" };
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const number = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const member = (v: unknown, values: readonly unknown[]) => values.includes(v);

function validUi(v: unknown): v is UiState {
  if (!object(v)) return false;
  const ranges: Record<string, [number, number]> = {
    twa: [0, 180], windSpeed: [0, 60], mainAngle: [0, 90], jibAngle: [0, 90],
    jibFurlPct: [0, 100], mainTwistPct: [0, 100], jibTwistPct: [0, 100],
  };
  return Object.entries(ranges).every(([key, [min, max]]) => number(v[key], min, max))
    && member(v.tack, ["port", "starboard"]) && member(v.windMode, ["steady", "shift", "gust"])
    && member(v.reefLevel, [0, 1, 2]) && member(v.view, ["top", "rear", "side", "3d"])
    && member(v.sailsRaised, ["both", "main", "jib"]) && typeof v.showOptimal === "boolean"
    && (v.mainTrim === undefined || isMainTrimCommand(v.mainTrim));
}

function observation(v: unknown, time: number): v is TrimObservation {
  if (!object(v)) return false;
  const ranges: Record<string, [number, number]> = {
    time: [0, time], yaw: [-85, 85], rise: [0, 12], twist: [0, 20], speed: [0, 60], heel: [0, 90],
    length: [6.4, 32], traveler: [-.8, .8], targetLength: [6.4, 32], targetTraveler: [-.8, .8],
  };
  return Object.entries(ranges).every(([key, [min, max]]) => number(v[key], min, max))
    && typeof v.ready === "boolean" && typeof v.environment === "string" && v.environment.length < 2048;
}

function validStudy(v: unknown, session: SailingSession): v is TrimStudy {
  if (!object(v) || !session.mainTrim || !member(v.phase, ["baseline", "ease", "compare", "explain", "complete"])
    || !number(v.stableFor, 0, 3) || !member(v.issue, [null, "wait", "setup", "environment", "ease", "compare", "answer"])) return false;
  for (const key of ["last", "baseline", "eased", "compared"]) {
    if (v[key] !== null && !observation(v[key], session.simTime)) return false;
  }
  const stage = ["baseline", "ease", "compare", "explain", "complete"].indexOf(String(v.phase));
  const rows = [v.baseline, v.eased, v.compared] as (TrimObservation | null)[];
  if (rows.some((row, i) => Boolean(row) !== (i < Math.min(stage, 3)))) return false;
  const [base, eased, compared] = rows;
  if (base && (!base.ready || Math.abs(base.length - 9) > .05 || Math.abs(base.traveler) > .01)) return false;
  if (eased && base && (!eased.ready || eased.environment !== base.environment || eased.time <= base.time
    || Math.abs(eased.length - base.length - 2) > .05 || Math.abs(eased.traveler) > .01
    || Math.abs(eased.yaw) < Math.abs(base.yaw) + 2 || eased.twist < base.twist + 1)) return false;
  if (compared && base && eased && (!compared.ready || compared.environment !== base.environment || compared.time <= eased.time
    || Math.abs(compared.length - base.length - 2) > .05 || compared.traveler * -Math.sign(base.yaw) < .1
    || Math.abs(compared.yaw - base.yaw) > 1 || compared.rise < base.rise + 1 || compared.twist < base.twist + 1)) return false;
  return true;
}

/** Checkpoints are local study records, not signed examination results.
 * Reject incompatible/corrupt data without deleting it or resetting the boat.
 * Sampling continuity is deliberately lost across a restore/background gap.
 */
export function readTrainerCheckpoint(raw: string): CheckpointResult {
  if (raw.length > CHECKPOINT_LIMIT) return { ok: false, reason: "corrupt" };
  try {
    const data: unknown = JSON.parse(raw);
    if (!object(data)) return { ok: false, reason: "corrupt" };
    if (data.version !== 1) return { ok: false, reason: "incompatible" };
    if (typeof data.snapshot !== "string" || !number(data.savedAt, 0, 1e15) || !validUi(data.ui)) return { ok: false, reason: "corrupt" };
    const restored = readSessionSnapshot(data.snapshot);
    if (!restored.ok) return restored;
    const session = restored.session;
    if (session.steering.mode !== "course-assist" || Boolean(session.mainTrim) !== Boolean(data.ui.mainTrim)
      || (data.study !== null && !validStudy(data.study, session))) return { ok: false, reason: "corrupt" };
    return { ok: true, checkpoint: { savedAt: data.savedAt, session, ui: data.ui,
      study: data.study === null ? null : { ...data.study, stableFor: 0, last: null, issue: null } } };
  } catch { return { ok: false, reason: "corrupt" }; }
}

export function writeTrainerCheckpoint(checkpoint: TrainerCheckpoint): string {
  const raw = JSON.stringify({ version: 1, savedAt: checkpoint.savedAt,
    snapshot: writeSessionSnapshot(checkpoint.session), ui: checkpoint.ui, study: checkpoint.study });
  if (!readTrainerCheckpoint(raw).ok) throw new RangeError("Invalid trainer checkpoint");
  return raw;
}
