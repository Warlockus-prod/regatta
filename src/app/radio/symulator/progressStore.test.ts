import { describe, expect, it } from 'vitest';
import { loadProgress, PROGRESS_KEY, recordAttempt, saveProgress } from './progressStore';

function memory() {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
}

describe('radio progress persistence', () => {
  it('keeps the original key and record format', () => {
    expect(PROGRESS_KEY).toBe('sternik.radio.progress.v1');
    const store = memory();
    store.setItem(PROGRESS_KEY, JSON.stringify({ 'mob-mayday': { attempts: 2, best: 80, lastScore: 70, bestTimeSec: 40 } }));
    const next = recordAttempt(loadProgress(store), 'mob-mayday', 90, 50);
    expect(next['mob-mayday']).toEqual({ attempts: 3, best: 90, lastScore: 90, bestTimeSec: 40 });
    expect(saveProgress(store, next)).toBe('saved');
    expect(JSON.parse(store.data.get(PROGRESS_KEY)!)).toEqual(next);
  });
  it('reports a failed save instead of swallowing it', () => {
    const quota = { getItem: () => null, setItem: () => { throw new DOMException('full', 'QuotaExceededError'); } };
    expect(saveProgress(quota, recordAttempt({}, 'a', 50, 10))).toBe('failed');
    // A store that accepts the call but does not keep the value is not "saved".
    const forgetful = { getItem: () => null, setItem: () => undefined };
    expect(saveProgress(forgetful, recordAttempt({}, 'a', 50, 10))).toBe('failed');
  });
  it('a retry after a failure saves the same attempt once', () => {
    const store = memory();
    let broken = true;
    const flaky = { getItem: store.getItem, setItem: (k: string, v: string) => { if (broken) throw new Error('blocked'); store.setItem(k, v); } };
    const next = recordAttempt({}, 'a', 60, 12);
    expect(saveProgress(flaky, next)).toBe('failed');
    broken = false;
    expect(saveProgress(flaky, next)).toBe('saved');
    expect(loadProgress(store).a.attempts).toBe(1);
  });
});
