// Only completed, explicitly recorded simulator exercises belong here.
// This is local learning evidence, never certification of real-world skill.
//
// Envelope `version: 1` is kept on purpose: the native bridge parser
// (`parseStorageRequest`) and already shipped app builds accept only that
// envelope, and they ignore unknown fields. Measured assessment attempts live
// in the optional `attempts` map, each record versioned on its own
// (`ATTEMPT_RECORD_VERSION`). A legacy timestamp-only completion still reads as
// completed: one earlier attempt without measurements.
export const PRACTICE_RESULTS_KEY = "regatta.sailing.practice.v1";
export const practiceIds = ["mainsheet", "twist", "depth", "line-bench"] as const;
export type PracticeId = typeof practiceIds[number];
export const assessmentIds = ["twist", "depth"] as const;
export type AssessmentId = typeof assessmentIds[number];
export const ATTEMPT_RECORD_VERSION = 2;
/** Settled shape in the learning model: top opening (deg), lower-depth index, boom angle (deg). */
export interface ShapeMeasure { twist: number; depth: number; boom: number }
export interface AssessmentAttempt { at: number; baseline: ShapeMeasure; result: ShapeMeasure }
export interface AssessmentRecord { version: typeof ATTEMPT_RECORD_VERSION; count: number; last: AssessmentAttempt; previous?: AssessmentAttempt }
export interface PracticeResults {
  version: 1;
  completed: Partial<Record<PracticeId, number>>;
  attempts?: Partial<Record<AssessmentId, AssessmentRecord>>;
}
export const emptyPracticeResults = (): PracticeResults => ({ version: 1, completed: {} });
const MAX_ATTEMPTS = 100_000;
const validTime = (at: unknown): at is number => typeof at === "number" && Number.isSafeInteger(at) && at > 0;

function readMeasure(value: unknown): ShapeMeasure | null {
  const v = value as Partial<ShapeMeasure> | null;
  if (!v || typeof v !== "object") return null;
  const { twist, depth, boom } = v;
  if (![twist, depth, boom].every(n => typeof n === "number" && Number.isFinite(n) && Math.abs(n) < 1000)) return null;
  if (depth! <= 0) return null;
  return { twist: twist!, depth: depth!, boom: boom! };
}
function readAttempt(value: unknown): AssessmentAttempt | null {
  const v = value as Partial<AssessmentAttempt> | null;
  if (!v || typeof v !== "object" || !validTime(v.at)) return null;
  const baseline = readMeasure(v.baseline), result = readMeasure(v.result);
  return baseline && result ? { at: v.at, baseline, result } : null;
}
/** Strict: a damaged or future-format record is dropped, the plain completion stays. */
export function readAssessmentRecord(value: unknown): AssessmentRecord | null {
  const v = value as Partial<AssessmentRecord> | null;
  if (!v || typeof v !== "object" || v.version !== ATTEMPT_RECORD_VERSION) return null;
  if (typeof v.count !== "number" || !Number.isSafeInteger(v.count) || v.count < 1 || v.count > MAX_ATTEMPTS) return null;
  const last = readAttempt(v.last);
  if (!last) return null;
  const previous = v.previous === undefined ? null : readAttempt(v.previous);
  if (v.previous !== undefined && (!previous || previous.at > last.at || v.count < 2)) return null;
  return previous ? { version: ATTEMPT_RECORD_VERSION, count: v.count, last, previous } : { version: ATTEMPT_RECORD_VERSION, count: v.count, last };
}

export function readPracticeResults(raw: string | null): PracticeResults {
  const result = emptyPracticeResults();
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.version !== 1 || !value.completed || typeof value.completed !== "object") return result;
    for (const id of practiceIds) {
      const at = value.completed[id];
      if (validTime(at)) result.completed[id] = at;
    }
    if (value.attempts && typeof value.attempts === "object") {
      for (const id of assessmentIds) {
        const record = readAssessmentRecord(value.attempts[id]);
        if (!record) continue;
        (result.attempts ??= {})[id] = record;
        result.completed[id] = Math.max(result.completed[id] ?? 0, record.last.at);
      }
    }
  } catch { /* Do not invent successful attempts from damaged storage. */ }
  return result;
}

const newer = (a: AssessmentRecord | undefined, b: AssessmentRecord | undefined) =>
  !a ? b : !b ? a : b.last.at > a.last.at || (b.last.at === a.last.at && b.count > a.count) ? b : a;

/** Union of two stores. Attempt records are not added together: the record with
 * the latest attempt wins, so retrying the same write never counts twice. */
export function mergePracticeResults(a: PracticeResults, b: PracticeResults): PracticeResults {
  const result = emptyPracticeResults();
  for (const id of practiceIds) {
    const at = Math.max(a.completed[id] ?? 0, b.completed[id] ?? 0);
    if (at) result.completed[id] = at;
  }
  for (const id of assessmentIds) {
    const record = newer(a.attempts?.[id], b.attempts?.[id]);
    if (record) (result.attempts ??= {})[id] = record;
  }
  return result;
}

export interface PracticeSummary { completed: boolean; attempts: number; record: AssessmentRecord | null }
/** Legacy timestamp-only completions read as completed with one unmeasured attempt. */
export function practiceSummary(results: PracticeResults, id: PracticeId): PracticeSummary {
  const record = (id === "twist" || id === "depth" ? results.attempts?.[id] : undefined) ?? null;
  const completed = Boolean(results.completed[id] || record);
  return { completed, attempts: record?.count ?? (completed ? 1 : 0), record };
}

/** Next store after one more verified attempt. Reusing the same `at` is a retry
 * of an uncertain write and returns the store unchanged. */
export function addAssessmentAttempt(results: PracticeResults, id: AssessmentId, attempt: AssessmentAttempt): PracticeResults {
  const existing = results.attempts?.[id];
  if (existing?.last.at === attempt.at) return results;
  const before = practiceSummary(results, id).attempts;
  const record: AssessmentRecord = existing
    ? { version: ATTEMPT_RECORD_VERSION, count: before + 1, last: attempt, previous: existing.last }
    : { version: ATTEMPT_RECORD_VERSION, count: before + 1, last: attempt };
  return {
    version: 1,
    completed: { ...results.completed, [id]: Math.max(results.completed[id] ?? 0, attempt.at) },
    attempts: { ...results.attempts, [id]: record },
  };
}

export interface PracticeStore { read(): Promise<string | null>; write(raw: string): Promise<unknown> }
/** Read, append, write, then read back: "saved" means the stored record now
 * holds this attempt, not only that the write call returned. */
export async function saveMeasuredAttempt(id: AssessmentId, attempt: AssessmentAttempt, storage: PracticeStore): Promise<PracticeSummary> {
  const stored = readPracticeResults(await storage.read());
  await storage.write(JSON.stringify(addAssessmentAttempt(stored, id, attempt)));
  const summary = practiceSummary(readPracticeResults(await storage.read()), id);
  if (summary.record?.last.at !== attempt.at) throw new Error("Attempt not confirmed in storage");
  return summary;
}

export const lessonPracticeIds = (id: string): PracticeId[] => id === "mainsheet" ? ["mainsheet"] : id === "outhaul" ? ["twist", "depth"] : id === "winch-clutch" ? ["line-bench"] : [];
