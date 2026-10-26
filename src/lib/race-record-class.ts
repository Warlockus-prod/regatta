import {
  LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext,
  raceClassId, readRaceContext, type RaceClassId, type RaceContext,
} from "./race-context";

export type RaceResultMode = "simple" | "pro";
export type RaceResultDifficulty = "easy" | "medium" | "hard";
export type RaceResultWind = "light" | "medium" | "heavy";
export type RaceComparison = Readonly<{
  raceContext: RaceContext;
  mode: RaceResultMode;
  difficulty: RaceResultDifficulty;
  windStrength: RaceResultWind;
}>;
type Rejected = { ok: false; reason: "invalid" | "unsupported" };
export type ReadRaceComparison = { ok: true; value: RaceComparison } | Rejected;
export type RaceResultSelection =
  | { kind: "legacy-unclassified" }
  | { kind: "classified"; raceContext: RaceContext; classId: RaceClassId; mode: RaceResultMode };
export type ReadRaceResultSelection = { ok: true; value: RaceResultSelection } | Rejected;

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
function readMode(value: unknown, legacyDefault: boolean): { ok: true; mode: RaceResultMode } | Rejected {
  if (value === "simple" || value === "pro") return { ok: true, mode: value };
  if (value === undefined && legacyDefault) return { ok: true, mode: "simple" };
  return { ok: false, reason: typeof value === "string" && value.length > 0 ? "unsupported" : "invalid" };
}

/** Local PB compatibility only: the old call signature defaulted to Simple.
 * Saved-record and global eligibility must use explicit metadata instead. */
export function readRaceComparison(raw: unknown): ReadRaceComparison {
  if (!object(raw)) return { ok: false, reason: "invalid" };
  const context = readRaceContext(raw.raceContext);
  if (!context.ok) return context;
  const mode = readMode(raw.mode, context.context.model === "legacy-race-v1");
  if (!mode.ok) return mode;
  if (raw.difficulty !== "easy" && raw.difficulty !== "medium" && raw.difficulty !== "hard") return { ok: false, reason: "invalid" };
  if (raw.windStrength !== "light" && raw.windStrength !== "medium" && raw.windStrength !== "heavy") return { ok: false, reason: "invalid" };
  return { ok: true, value: { raceContext: context.context, mode: mode.mode, difficulty: raw.difficulty, windStrength: raw.windStrength } };
}

/** A rejected comparison never reads or overwrites a historical PB bucket. */
export function raceComparisonKey(raw: unknown): string | null {
  const read = readRaceComparison(raw);
  if (!read.ok) return null;
  const { raceContext, mode, difficulty, windStrength } = read.value;
  return raceContext.model === "legacy-race-v1"
    ? `${mode === "pro" ? "pro:" : ""}${difficulty}-${windStrength}`
    : `ctx:${raceClassId(raceContext)}:${mode}:${difficulty}:${windStrength}`;
}

const registered: readonly RaceContext[] = [LEGACY_RACE_CONTEXT, ...PHYSICAL_RACE_PROFILES.map(physicalRaceContext)];
/** Closed query lookup. A supplied class ID is never result write authority. */
export function raceContextForClassId(raw: unknown): RaceContext | null {
  return typeof raw === "string" ? registered.find(context => raceClassId(context) === raw) ?? null : null;
}

/** Global history has no inferred mode/model. Eligibility also requires a
 * separate raw canonical geometry check before any classified write. */
export function readRaceResultSelection(raw: unknown): ReadRaceResultSelection {
  if (!object(raw)) return { ok: false, reason: "invalid" };
  const context = readRaceContext(raw.raceContext);
  if (!context.ok) return context;
  if (raw.raceContext === undefined || raw.raceContext === null) {
    if (raw.classId !== undefined) return { ok: false, reason: "invalid" };
    if (raw.mode !== undefined) {
      const mode = readMode(raw.mode, false);
      if (!mode.ok) return mode;
    }
    return { ok: true, value: { kind: "legacy-unclassified" } };
  }
  const mode = readMode(raw.mode, false);
  if (!mode.ok) return mode;
  const classId = raceClassId(context.context);
  if (raw.classId !== undefined && raw.classId !== classId) return { ok: false, reason: "invalid" };
  return { ok: true, value: { kind: "classified", raceContext: context.context, classId, mode: mode.mode } };
}
