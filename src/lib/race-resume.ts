/**
 * Race-setup resume.
 *
 * The /game route can be interrupted in many ways: user reloads the page
 * mid-race, the tab is killed, mobile browser unloads in the background.
 * Restoring the *exact* live race state (boat positions, log samples,
 * accumulated tacks) is technically possible but high-risk: any schema
 * skew between the saved blob and current code crashes the restore
 * silently.
 *
 * This module takes the safer path: persist only the *intent* (which
 * difficulty + wind + mission the user chose) and the
 * timestamp of the last interaction. On reload, if the saved intent is
 * fresh (under 30 minutes old), the briefing screen offers a "Resume"
 * button that re-opens with those settings pre-filled. The user loses
 * their position log but doesn't lose the click-path that got them
 * into a race in the first place.
 *
 * Schema is versioned via the `v` field. If the shape ever changes
 * incompatibly, unsupported saves remain on disk for a compatible reader.
 */

import { PHYSICAL_RACE_EMISSION_ENABLED, readRaceContext, type RaceContext } from "./race-context";
import { recordDiagnostic } from "./diagnostics-controls";
import type { DiagnosticOutcome, DiagnosticReason } from "./diagnostics";
import { dailySettings } from "./daily-challenge";

const STORAGE_KEY = "regatta.race-resume.v1";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
export const RACE_RESUME_MAX_CHARS = 16_000;

export type Difficulty = 'easy' | 'medium' | 'hard';
export type WindStrength = 'light' | 'medium' | 'heavy';

export interface SavedRaceSetup {
  v: 1;
  difficulty: Difficulty;
  windStrength: WindStrength;
  /** Mission ID if a mission race was being set up; null for free-sail. */
  missionId: string | null;
  /** Last `gameState` value from the GameClient state machine. Useful so
   *  the resume offer can say "you were halfway through a race" vs
   *  "you were on the briefing screen". */
  phase: 'menu' | 'briefing' | 'countdown' | 'racing' | 'finished';
  /** Date.now() at last save - used to age out stale records. */
  ts: number;
  mode?: "simple" | "pro";
  /** Missing/null is historical absence, never an inferred physical course. */
  raceContext?: RaceContext | null;
  /** Additive daily identity; older intents have no daily provenance. */
  dailyDay?: string | null;
}

export type InspectedRaceSetup = { kind: "missing" | "unsupported" | "invalid" }
  | { kind: "ready" | "expired"; setup: SavedRaceSetup };

function isDifficulty(s: unknown): s is Difficulty {
  return s === 'easy' || s === 'medium' || s === 'hard';
}
function isWindStrength(s: unknown): s is WindStrength {
  return s === 'light' || s === 'medium' || s === 'heavy';
}
function isPhase(s: unknown): s is SavedRaceSetup['phase'] {
  return s === 'menu' || s === 'briefing' || s === 'countdown' || s === 'racing' || s === 'finished';
}

/** Pure inspection checks future metadata before the old TTL can erase it. */
export function inspectRaceSetup(raw: string | null, now: number): InspectedRaceSetup {
  if (raw === null) return { kind: "missing" };
  if (typeof raw !== "string" || raw.length > RACE_RESUME_MAX_CHARS || !Number.isFinite(now) || now < 0) return { kind: "invalid" };
  let parsed: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return { kind: "invalid" };
    parsed = value as Record<string, unknown>;
  } catch { return { kind: "invalid" }; }
  if (parsed.v !== 1) return { kind: typeof parsed.v === "number" && Number.isInteger(parsed.v) && parsed.v > 1 ? "unsupported" : "invalid" };
  const context = readRaceContext(parsed.raceContext);
  if (!context.ok) return { kind: context.reason };
  if (parsed.mode !== undefined && parsed.mode !== "simple" && parsed.mode !== "pro") {
    return { kind: typeof parsed.mode === "string" && parsed.mode.length > 0 ? "unsupported" : "invalid" };
  }
  if (context.context.model === "physical-cruiser-v1" && (parsed.mode === undefined || parsed.missionId != null
    || parsed.dailyDay != null || Object.prototype.hasOwnProperty.call(parsed, "daily"))) return { kind: "invalid" };
  if (!isDifficulty(parsed.difficulty) || !isWindStrength(parsed.windStrength) || !isPhase(parsed.phase)
    || (parsed.missionId !== null && typeof parsed.missionId !== "string")
    || typeof parsed.ts !== "number" || !Number.isFinite(parsed.ts) || parsed.ts < 0) return { kind: "invalid" };
  if (parsed.dailyDay !== undefined && parsed.dailyDay !== null) {
    if (typeof parsed.dailyDay !== "string" || parsed.missionId !== null) return { kind: "invalid" };
    try {
      const daily = dailySettings(parsed.dailyDay);
      if (parsed.difficulty !== daily.difficulty || parsed.windStrength !== daily.windStrength) return { kind: "invalid" };
    } catch { return { kind: "invalid" }; }
  }
  const setup: SavedRaceSetup = { v: 1, difficulty: parsed.difficulty, windStrength: parsed.windStrength,
    missionId: parsed.missionId, phase: parsed.phase, ts: parsed.ts,
    ...(parsed.mode === undefined ? {} : { mode: parsed.mode }),
    ...(parsed.raceContext === undefined ? {} : { raceContext: parsed.raceContext === null ? null : context.context }),
    ...(parsed.dailyDay === undefined ? {} : { dailyDay: parsed.dailyDay as string | null }) };
  return { kind: now - setup.ts > MAX_AGE_MS ? "expired" : "ready", setup };
}

function diagnostic(action: "read" | "write" | "clear", outcome: DiagnosticOutcome, reason?: DiagnosticReason): void {
  try { recordDiagnostic({ type: "storage.operation", surface: "race", target: "preferences", action, outcome, source: "system", ...(reason ? { reason } : {}) }); }
  catch { /* A recorder failure cannot change the setup or exit decision. */ }
}

function readStored(): { ok: true; raw: string | null } | { ok: false } {
  if (typeof window === "undefined") { diagnostic("read", "failed", "storage-unavailable"); return { ok: false }; }
  try { return { ok: true, raw: window.localStorage.getItem(STORAGE_KEY) }; }
  catch { diagnostic("read", "failed", "storage-read"); return { ok: false }; }
}

function protectedReason(inspected: InspectedRaceSetup): DiagnosticReason | null {
  if (inspected.kind === "unsupported") return "unsupported";
  if (inspected.kind === "invalid") return "storage-invalid";
  if ((inspected.kind === "ready" || inspected.kind === "expired") && !PHYSICAL_RACE_EMISSION_ENABLED
    && inspected.setup.raceContext?.model === "physical-cruiser-v1") return "disabled";
  return null;
}

/** A true result confirms only the synchronous web storage operation, not a
 * native persistence ACK. Explicit new Start may replace a protected intent. */
export function saveRaceSetup(setup: Omit<SavedRaceSetup, "v" | "ts">, options: { replaceUnsupported?: boolean } = {}): boolean {
  const now = Date.now();
  let candidate: InspectedRaceSetup;
  try {
    candidate = inspectRaceSetup(JSON.stringify({ ...setup, v: 1, ts: now }), now);
  } catch { diagnostic("write", "rejected", "invalid-input"); return false; }
  if (candidate.kind !== "ready") { diagnostic("write", "rejected", candidate.kind === "unsupported" ? "unsupported" : "invalid-input"); return false; }
  const candidateReason = protectedReason(candidate);
  if (candidateReason) { diagnostic("write", "rejected", candidateReason); return false; }
  const read = readStored();
  if (!read.ok) return false;
  const previous = inspectRaceSetup(read.raw, now);
  const reason = protectedReason(previous);
  if (reason && options.replaceUnsupported !== true) { diagnostic("write", "rejected", reason); return false; }
  const serialized = JSON.stringify(candidate.setup);
  if (previous.kind === "ready" && JSON.stringify(previous.setup) === serialized) { diagnostic("write", "noop", "unchanged"); return true; }
  try { window.localStorage.setItem(STORAGE_KEY, serialized); }
  catch { diagnostic("write", "failed", "storage-write"); return false; }
  diagnostic("write", "accepted");
  return true;
}

export function loadRaceSetup(): SavedRaceSetup | null {
  const read = readStored();
  if (!read.ok) return null;
  const inspected = inspectRaceSetup(read.raw, Date.now());
  const reason = protectedReason(inspected);
  if (reason) { diagnostic("read", "rejected", reason); return null; }
  if (inspected.kind === "ready") { diagnostic("read", "accepted"); return inspected.setup; }
  if (inspected.kind === "expired") {
    try { window.localStorage.removeItem(STORAGE_KEY); }
    catch { diagnostic("clear", "failed", "storage-write"); return null; }
    diagnostic("clear", "accepted", "timeout");
  } else { diagnostic("read", "noop", "not-found"); }
  return null;
}

/** Implicit finish/cleanup cannot delete a future, invalid or disabled save. */
export function clearRaceSetup(options: { discardUnsupported?: boolean } = {}): boolean {
  const read = readStored();
  if (!read.ok) return false;
  const inspected = inspectRaceSetup(read.raw, Date.now());
  const reason = protectedReason(inspected);
  if (reason && options.discardUnsupported !== true) { diagnostic("clear", "rejected", reason); return false; }
  if (inspected.kind === "missing") { diagnostic("clear", "noop", "not-found"); return true; }
  try { window.localStorage.removeItem(STORAGE_KEY); }
  catch { diagnostic("clear", "failed", "storage-write"); return false; }
  diagnostic("clear", "accepted");
  return true;
}
