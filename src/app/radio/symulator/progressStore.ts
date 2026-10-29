// Scenario progress of the radio trainer. Key and JSON format are unchanged
// from the first release (`sternik.radio.progress.v1`): a map of scenario id to
// attempts, best, last score and best time. What is new is that a save reports
// its outcome, so the debrief can say "saved" or "not saved, retry".

export const PROGRESS_KEY = 'sternik.radio.progress.v1';

export interface ScenarioProgress {
  attempts: number;
  best: number;
  lastScore: number;
  bestTimeSec: number | null;
}
export type ProgressMap = Record<string, ScenarioProgress>;
export type SaveOutcome = 'saved' | 'failed';
type ProgressStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function loadProgress(storage: ProgressStorage): ProgressMap {
  try { return JSON.parse(storage.getItem(PROGRESS_KEY) ?? '{}') as ProgressMap; } catch { return {}; }
}

export function recordAttempt(p: ProgressMap, scenarioId: string, score: number, timeSec: number): ProgressMap {
  const prev = p[scenarioId] ?? { attempts: 0, best: 0, lastScore: 0, bestTimeSec: null };
  return {
    ...p,
    [scenarioId]: {
      attempts: prev.attempts + 1,
      best: Math.max(prev.best, score),
      lastScore: score,
      bestTimeSec: prev.bestTimeSec === null ? timeSec : Math.min(prev.bestTimeSec, timeSec),
    },
  };
}

/** Write, then read back. A quota error, blocked storage or a store that does
 * not keep the value is reported as 'failed' instead of being swallowed. */
export function saveProgress(storage: ProgressStorage, p: ProgressMap): SaveOutcome {
  try {
    const raw = JSON.stringify(p);
    storage.setItem(PROGRESS_KEY, raw);
    return storage.getItem(PROGRESS_KEY) === raw ? 'saved' : 'failed';
  } catch { return 'failed'; }
}

/** Storage access itself can throw (blocked cookies, sandboxed frames). */
export function browserStorage(): ProgressStorage | null {
  try { return window.localStorage; } catch { return null; }
}
