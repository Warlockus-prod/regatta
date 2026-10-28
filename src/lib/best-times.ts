/**
 * Best-time records per (mode + difficulty + windStrength) bucket.
 *
 * Stored in localStorage as a flat object so future code can extend with
 * per-mission records or per-month resets without a schema migration.
 *
 * Anonymous, device-local. Server-side leaderboard already exists in
 * /api/leaderboard for shared rankings; this file is just for the user's
 * own "your record on this device" badge in the briefing + finish modal.
 */

import { PHYSICAL_RACE_EMISSION_ENABLED } from "./race-context";
import { raceComparisonKey, readRaceComparison } from "./race-record-class";
import { recordDiagnostic } from "./diagnostics-controls";
import type { DiagnosticOutcome, DiagnosticReason } from "./diagnostics";

export const BEST_TIMES_STORAGE_KEY = "regatta.best-times.v1";
const STORAGE_KEY = BEST_TIMES_STORAGE_KEY;
export const BEST_TIMES_STORE_MAX_CHARS = 16_000;

export type Difficulty = 'easy' | 'medium' | 'hard';
export type WindStrength = 'light' | 'medium' | 'heavy';
export type BestRecordMode = "simple" | "pro";

export interface BestRecord {
  /** Best finish time in seconds. */
  timeSec: number;
  /** When the record was set (Date.now()). */
  ts: number;
}

type Store = Record<string, unknown>;
const object = (value: unknown): value is Store => value !== null && typeof value === "object" && !Array.isArray(value);
const validRecord = (value: unknown): value is BestRecord => object(value)
  && typeof value.timeSec === "number" && Number.isFinite(value.timeSec) && value.timeSec > 0
  && typeof value.ts === "number" && Number.isFinite(value.ts) && value.ts >= 0;

type ReadStore = { ok: true; store: Store } | { ok: false; reason: DiagnosticReason };
function readStore(): ReadStore {
  if (typeof window === "undefined") return { ok: false, reason: "storage-unavailable" };
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch { return { ok: false, reason: "storage-read" }; }
  if (raw === null) return { ok: true, store: {} };
  try { const store: unknown = JSON.parse(raw); return object(store) ? { ok: true, store } : { ok: false, reason: "storage-invalid" }; }
  catch { return { ok: false, reason: "storage-invalid" }; }
}

function diagnostic(action: "read" | "write", outcome: DiagnosticOutcome, reason?: DiagnosticReason): void {
  try { recordDiagnostic({ type: "storage.operation", surface: "race", target: "personal-best", action, outcome, source: "system", ...(reason ? { reason } : {}) }); }
  catch { /* A diagnostic failure cannot change the storage result. */ }
}

type FailedPlan = { status: "failed" | "rejected"; reason: DiagnosticReason; previousBest: BestRecord | null; currentBest: BestRecord | null };
export type BestRecordPlan = FailedPlan
  | { status: "unchanged"; previousBest: BestRecord; currentBest: BestRecord }
  | { status: "candidate"; previousBest: BestRecord | null; currentBest: BestRecord; serialized: string };
export interface BestRecordUpdate {
  /** Written means the synchronous web storage call returned, not native ACK. */
  status: "written" | "unchanged" | "failed" | "rejected";
  isNewRecord: boolean;
  previousBest: BestRecord | null;
  currentBest: BestRecord | null;
}

/** Pure planning supports future classes without enabling their live writes.
 * Existing entries are retained, and rejected/no-op plans never serialize them. */
export function planBestRecordUpdate(store: unknown, comparison: unknown, finishTimeSec: unknown, ts: number): BestRecordPlan {
  const key = raceComparisonKey(comparison);
  if (!key) return { status: "rejected", reason: "invalid-input", previousBest: null, currentBest: null };
  if (!object(store)) return { status: "failed", reason: "storage-invalid", previousBest: null, currentBest: null };
  const stored = store[key];
  if (stored !== undefined && !validRecord(stored)) return { status: "failed", reason: "storage-invalid", previousBest: null, currentBest: null };
  const previousBest = stored ?? null;
  if (typeof finishTimeSec !== "number" || !Number.isFinite(finishTimeSec) || finishTimeSec <= 0 || !Number.isFinite(ts) || ts < 0) {
    return { status: "rejected", reason: "invalid-input", previousBest, currentBest: previousBest };
  }
  if (previousBest && finishTimeSec >= previousBest.timeSec) return { status: "unchanged", previousBest, currentBest: previousBest };
  const currentBest = { timeSec: finishTimeSec, ts };
  try {
    const serialized = JSON.stringify({ ...store, [key]: currentBest });
    if (serialized.length > BEST_TIMES_STORE_MAX_CHARS) return { status: "failed", reason: "limit", previousBest, currentBest: previousBest };
    return { status: "candidate", previousBest, currentBest, serialized };
  } catch { return { status: "failed", reason: "storage-invalid", previousBest, currentBest: previousBest }; }
}

/** Read the existing record for a bucket, or null if none. */
export function getBestRecord(
  difficulty: Difficulty,
  windStrength: WindStrength,
  mode?: BestRecordMode,
  raceContext?: unknown,
): BestRecord | null {
  const key = raceComparisonKey({ difficulty, windStrength, mode, raceContext });
  if (!key) { diagnostic("read", "rejected", "invalid-input"); return null; }
  const read = readStore();
  if (!read.ok) { diagnostic("read", "failed", read.reason); return null; }
  const stored = read.store[key];
  if (stored === undefined) { diagnostic("read", "noop", "not-found"); return null; }
  if (!validRecord(stored)) { diagnostic("read", "failed", "storage-invalid"); return null; }
  diagnostic("read", "accepted");
  return stored;
}

/**
 * Compare a freshly finished race against the saved record. If the new
 * time is faster (or no previous record exists), persist it. Returns
 * an object describing what happened, so the UI can show a "NEW RECORD"
 * banner only when deserved.
 */
export function tryUpdateBestRecord(
  difficulty: Difficulty,
  windStrength: WindStrength,
  finishTimeSec: number,
  mode?: BestRecordMode,
  raceContext?: unknown,
): BestRecordUpdate {
  const comparison = readRaceComparison({ difficulty, windStrength, mode, raceContext });
  if (!comparison.ok) {
    diagnostic("write", "rejected", comparison.reason === "unsupported" ? "unsupported" : "invalid-input");
    return { status: "rejected", isNewRecord: false, previousBest: null, currentBest: null };
  }
  const read = readStore();
  if (!read.ok) { diagnostic("read", "failed", read.reason); return { status: "failed", isNewRecord: false, previousBest: null, currentBest: null }; }
  const plan = planBestRecordUpdate(read.store, comparison.value, finishTimeSec, Date.now());
  if (plan.status !== "candidate") {
    diagnostic("write", plan.status === "unchanged" ? "noop" : plan.status === "rejected" ? "rejected" : "failed", plan.status === "unchanged" ? "unchanged" : plan.reason);
    return { status: plan.status, isNewRecord: false, previousBest: plan.previousBest, currentBest: plan.currentBest };
  }
  if (!PHYSICAL_RACE_EMISSION_ENABLED && comparison.value.raceContext.model === "physical-cruiser-v1") {
    diagnostic("write", "rejected", "disabled");
    return { status: "rejected", isNewRecord: false, previousBest: plan.previousBest, currentBest: plan.previousBest };
  }
  try { window.localStorage.setItem(STORAGE_KEY, plan.serialized); }
  catch {
    diagnostic("write", "failed", "storage-write");
    return { status: "failed", isNewRecord: false, previousBest: plan.previousBest, currentBest: plan.previousBest };
  }
  diagnostic("write", "accepted");
  return { status: "written", isNewRecord: true, previousBest: plan.previousBest, currentBest: plan.currentBest };
}

/** Format a time in seconds as M:SS for badge display. */
export function formatRecordTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '-';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
