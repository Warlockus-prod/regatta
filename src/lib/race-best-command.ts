import { BEST_TIMES_STORE_MAX_CHARS, planBestRecordUpdate, type BestRecord } from "./best-times";
import { PHYSICAL_RACE_EMISSION_ENABLED } from "./race-context";
import { raceComparisonKey, readRaceComparison, type RaceComparison } from "./race-record-class";
import { matchesRegisteredRaceCourse } from "./race-result-eligibility";
import type { RaceCourse } from "./race-physics";

export const NATIVE_BEST_COMMAND_MAX_CHARS = 8192;
export const NATIVE_BEST_PENDING_LIMIT = 32;
export type NativeBestReason = "invalid-input" | "unsupported" | "disabled" | "limit"
  | "storage-read" | "storage-write" | "storage-invalid" | "storage-unavailable" | "timeout" | "cancelled";
export interface NativeBestCommand {
  schema: 1;
  id: string;
  requestId: string;
  comparison: RaceComparison;
  rawFinishTimeSec: number;
  penaltySeconds: number;
  finishTimeSec: number;
  course: RaceCourse;
}
export type NativeBestInput = Omit<NativeBestCommand, "requestId">;
export type NativeBestReply = {
  schema: 1; id: string; requestId: string; comparisonKey: string;
} & ({ status: "saved"; newRecord: true; currentBest: BestRecord }
  | { status: "unchanged"; newRecord: false; currentBest: BestRecord }
  | { status: "failed"; newRecord: false; currentBest: BestRecord | null; reason: NativeBestReason });

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const id = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const finite = (value: unknown, low: number, high: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;
const reasons: readonly NativeBestReason[] = ["invalid-input", "unsupported", "disabled", "limit", "storage-read", "storage-write", "storage-invalid", "storage-unavailable", "timeout", "cancelled"];
const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every(key => keys.includes(key));
function best(value: unknown): BestRecord | null {
  return object(value) && finite(value.timeSec, Number.MIN_VALUE, Number.MAX_VALUE) && finite(value.ts, 0, Number.MAX_SAFE_INTEGER)
    ? { timeSec: value.timeSec, ts: value.ts } : null;
}

/** New commands require explicit provenance; historical absence is not authority. */
export function readNativeBestCommand(raw: unknown): NativeBestCommand | null {
  try { if (JSON.stringify(raw).length > NATIVE_BEST_COMMAND_MAX_CHARS) return null; } catch { return null; }
  if (!object(raw) || raw.schema !== 1 || !id(raw.id) || !id(raw.requestId) || !object(raw.comparison)
    || !onlyKeys(raw, ["schema", "id", "requestId", "comparison", "rawFinishTimeSec", "penaltySeconds", "finishTimeSec", "course"])
    || !onlyKeys(raw.comparison, ["raceContext", "mode", "difficulty", "windStrength"])
    || raw.comparison.raceContext == null || !["simple", "pro"].includes(String(raw.comparison.mode))) return null;
  const comparison = readRaceComparison(raw.comparison);
  if (!comparison.ok || !finite(raw.rawFinishTimeSec, .01, 3600) || !finite(raw.penaltySeconds, 0, 3600)
    || !finite(raw.finishTimeSec, .01, 7200) || Math.abs(raw.rawFinishTimeSec + raw.penaltySeconds - raw.finishTimeSec) > 1e-7
    || !matchesRegisteredRaceCourse(comparison.value.raceContext, raw.course)) return null;
  // Keep only the validated envelope. The course is checked again at each boundary.
  return { schema: 1, id: raw.id, requestId: raw.requestId, comparison: comparison.value,
    rawFinishTimeSec: raw.rawFinishTimeSec, penaltySeconds: raw.penaltySeconds,
    finishTimeSec: raw.finishTimeSec, course: raw.course as NativeBestCommand["course"] };
}

export function nativeBestFailure(command: NativeBestCommand, reason: NativeBestReason, currentBest: BestRecord | null = null): NativeBestReply {
  return { schema: 1, id: command.id, requestId: command.requestId, comparisonKey: raceComparisonKey(command.comparison)!,
    status: "failed", newRecord: false, currentBest: best(currentBest), reason };
}
function successfulReply(command: NativeBestCommand, currentBest: BestRecord, newRecord: boolean): NativeBestReply {
  const envelope = { schema: 1 as const, id: command.id, requestId: command.requestId, comparisonKey: raceComparisonKey(command.comparison)!, currentBest: best(currentBest)! };
  return newRecord ? { ...envelope, status: "saved", newRecord: true } : { ...envelope, status: "unchanged", newRecord: false };
}

export type NativeBestPlan = { kind: "write"; serialized: string; replyAfterWrite: NativeBestReply }
  | { kind: "settled"; reply: NativeBestReply }
  | { kind: "rejected"; reason: "invalid-input" };

/** A receipt lives in the same atomic row as the PB. Retrying after a lost ACK
 * can confirm that write without another history entry or a second PB write. */
export function planNativeBestCommand(store: unknown, command: NativeBestCommand, now: number): NativeBestPlan {
  const valid = readNativeBestCommand(command);
  if (!valid) return { kind: "rejected", reason: "invalid-input" };
  if (!PHYSICAL_RACE_EMISSION_ENABLED && valid.comparison.raceContext.model === "physical-cruiser-v1") {
    return { kind: "settled", reply: nativeBestFailure(valid, "disabled") };
  }
  const key = raceComparisonKey(valid.comparison)!;
  const stored = object(store) ? store[key] : undefined;
  const current = best(stored);
  if (object(stored) && stored.nativeReceipt !== undefined) {
    const receipt = stored.nativeReceipt;
    if (!object(receipt) || receipt.schema !== 1 || !id(receipt.raceId) || !current
      || !finite(receipt.rawFinishTimeSec, .01, 3600) || !finite(receipt.penaltySeconds, 0, 3600)
      || Math.abs(receipt.rawFinishTimeSec + receipt.penaltySeconds - current.timeSec) > 1e-7) {
      return { kind: "settled", reply: nativeBestFailure(valid, "storage-invalid", current) };
    }
    if (receipt.raceId === valid.id) return { kind: "settled", reply: current.timeSec === valid.finishTimeSec
      && receipt.rawFinishTimeSec === valid.rawFinishTimeSec && receipt.penaltySeconds === valid.penaltySeconds
      ? successfulReply(valid, current, true) : nativeBestFailure(valid, "invalid-input", current) };
  }
  const plan = planBestRecordUpdate(store, valid.comparison, valid.finishTimeSec, now);
  if (plan.status === "unchanged") return { kind: "settled", reply: successfulReply(valid, plan.currentBest, false) };
  if (plan.status !== "candidate") {
    const reason = reasons.includes(plan.reason as NativeBestReason) ? plan.reason as NativeBestReason : "storage-invalid";
    return { kind: "settled", reply: nativeBestFailure(valid, reason, plan.currentBest) };
  }
  const updated = JSON.parse(plan.serialized) as Record<string, unknown>;
  updated[key] = { ...plan.currentBest, nativeReceipt: { schema: 1, raceId: valid.id,
    rawFinishTimeSec: valid.rawFinishTimeSec, penaltySeconds: valid.penaltySeconds } };
  const serialized = JSON.stringify(updated);
  if (serialized.length > BEST_TIMES_STORE_MAX_CHARS) return { kind: "settled", reply: nativeBestFailure(valid, "limit", plan.previousBest) };
  return { kind: "write", serialized, replyAfterWrite: successfulReply(valid, plan.currentBest, true) };
}

/** A reply has authority only for its pending attempt and comparison bucket. */
export function readNativeBestReply(raw: unknown, command: NativeBestCommand): NativeBestReply | null {
  if (!object(raw) || raw.schema !== 1 || raw.id !== command.id || raw.requestId !== command.requestId
    || raw.comparisonKey !== raceComparisonKey(command.comparison)
    || !onlyKeys(raw, ["schema", "id", "requestId", "comparisonKey", "status", "newRecord", "currentBest", ...(raw.status === "failed" ? ["reason"] : [])])
    || (object(raw.currentBest) && !onlyKeys(raw.currentBest, ["timeSec", "ts"]))) return null;
  const current = best(raw.currentBest);
  if (raw.status === "saved" && raw.newRecord === true && current?.timeSec === command.finishTimeSec) return successfulReply(command, current, true);
  if (raw.status === "unchanged" && raw.newRecord === false && current && current.timeSec <= command.finishTimeSec) return successfulReply(command, current, false);
  if (raw.status === "failed" && raw.newRecord === false && (raw.currentBest === null || current)
    && reasons.includes(raw.reason as NativeBestReason)) return nativeBestFailure(command, raw.reason as NativeBestReason, current);
  return null;
}

/** Failed attempts remain retryable. Foreign, stale and duplicate replies do
 * not consume another result; pending work is finite and never silently evicted. */
export function createPendingNativeBestCommands() {
  const pending = new Map<string, { input: NativeBestInput; attempt: number; command: NativeBestCommand | null; waiting: boolean }>();
  return {
    add(input: NativeBestInput): boolean {
      if (pending.has(input.id) || pending.size >= NATIVE_BEST_PENDING_LIMIT) return false;
      const command = readNativeBestCommand({ schema: input.schema, id: input.id, requestId: "validation", comparison: input.comparison,
        rawFinishTimeSec: input.rawFinishTimeSec, penaltySeconds: input.penaltySeconds, finishTimeSec: input.finishTimeSec, course: input.course });
      if (!command) return false;
      const valid: NativeBestInput = { schema: 1, id: command.id, comparison: command.comparison,
        rawFinishTimeSec: command.rawFinishTimeSec, penaltySeconds: command.penaltySeconds,
        finishTimeSec: command.finishTimeSec, course: command.course };
      pending.set(input.id, { input: JSON.parse(JSON.stringify(valid)) as NativeBestInput, attempt: 0, command: null, waiting: false });
      return true;
    },
    request(raceId: string): NativeBestCommand | null {
      const entry = pending.get(raceId);
      if (!entry || entry.waiting || entry.attempt >= 10_000) return null;
      entry.attempt += 1;
      entry.command = { ...entry.input, requestId: `${raceId.slice(0, 70)}_pb_${entry.attempt}` };
      entry.waiting = true;
      return JSON.parse(JSON.stringify(entry.command)) as NativeBestCommand;
    },
    settle(raw: unknown): NativeBestReply | null {
      if (!object(raw) || typeof raw.id !== "string") return null;
      const entry = pending.get(raw.id);
      if (!entry?.waiting || !entry.command) return null;
      const reply = readNativeBestReply(raw, entry.command);
      if (!reply) return null;
      entry.waiting = false;
      if (reply.status !== "failed") pending.delete(raw.id);
      return reply;
    },
    waiting(raceId: string): NativeBestCommand | null {
      const entry = pending.get(raceId);
      return entry?.waiting && entry.command ? JSON.parse(JSON.stringify(entry.command)) as NativeBestCommand : null;
    },
    has: (raceId: string) => pending.has(raceId),
    size: () => pending.size,
  };
}
