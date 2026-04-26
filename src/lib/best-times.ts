/**
 * Best-time records per (difficulty + windStrength) bucket.
 *
 * Stored in localStorage as a flat object so future code can extend with
 * per-mission records or per-month resets without a schema migration.
 *
 * Anonymous, device-local. Server-side leaderboard already exists in
 * /api/leaderboard for shared rankings; this file is just for the user's
 * own "your record on this device" badge in the briefing + finish modal.
 */

const STORAGE_KEY = 'regatta.best-times.v1';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type WindStrength = 'light' | 'medium' | 'heavy';

export interface BestRecord {
  /** Best finish time in seconds. */
  timeSec: number;
  /** When the record was set (Date.now()). */
  ts: number;
}

type Store = Record<string, BestRecord>;

function bucketKey(difficulty: Difficulty, windStrength: WindStrength): string {
  return `${difficulty}-${windStrength}`;
}

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded or storage disabled; silent fail
  }
}

/** Read the existing record for a bucket, or null if none. */
export function getBestRecord(
  difficulty: Difficulty,
  windStrength: WindStrength,
): BestRecord | null {
  const store = readStore();
  return store[bucketKey(difficulty, windStrength)] ?? null;
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
): {
  isNewRecord: boolean;
  /** Previous best, null if there wasn't one. */
  previousBest: BestRecord | null;
  /** Currently saved best (= new record if isNewRecord, else old). */
  currentBest: BestRecord;
} {
  if (!isFinite(finishTimeSec) || finishTimeSec <= 0) {
    const cur = getBestRecord(difficulty, windStrength) ?? {
      timeSec: finishTimeSec,
      ts: Date.now(),
    };
    return { isNewRecord: false, previousBest: cur, currentBest: cur };
  }

  const store = readStore();
  const key = bucketKey(difficulty, windStrength);
  const previousBest = store[key] ?? null;
  const isNewRecord = !previousBest || finishTimeSec < previousBest.timeSec;
  const currentBest: BestRecord = isNewRecord
    ? { timeSec: finishTimeSec, ts: Date.now() }
    : previousBest;

  if (isNewRecord) {
    store[key] = currentBest;
    writeStore(store);
  }

  return { isNewRecord, previousBest, currentBest };
}

/** Format a time in seconds as M:SS for badge display. */
export function formatRecordTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '-';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
