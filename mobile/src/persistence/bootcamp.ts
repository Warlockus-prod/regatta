/**
 * Bootcamp progress in AsyncStorage.
 *
 * The v1 key kept its old name ("completed") but was written when a lesson's
 * practice opened or any quiz result was recorded, so it only proves the
 * lesson was VIEWED. Whether a lesson is passed is decided in
 * `src/bootcamp/status.ts` from real evidence: a passed quiz, or for lessons
 * without a quiz the learner's explicit "done" mark stored below.
 *
 * Storage shape:
 *   key   = `regatta.progress.bootcamp.v1`
 *   value = JSON-encoded string[] of viewed lesson IDs (legacy name)
 *
 *   key   = `regatta.progress.bootcamp.lastViewed.v1`
 *   value = JSON-encoded string (the last opened lesson id) or absent
 *
 *   key   = `regatta.progress.bootcamp.done.v1`
 *   value = JSON-encoded string[] of lessons the learner marked as done
 *
 * Every read and write goes through `serial` (./serial.ts), and updates are
 * read-merge-write on the stored value, never a write of the in-memory copy:
 * a lesson opened before the hook finished reading can no longer replace the
 * stored history with a single ID.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serial } from './serial';

const STORAGE_KEY = 'regatta.progress.bootcamp.v1';
const LAST_VIEWED_KEY = 'regatta.progress.bootcamp.lastViewed.v1';
const DONE_KEY = 'regatta.progress.bootcamp.done.v1';

/** Every bootcamp progress key, for resets. */
export const BOOTCAMP_PROGRESS_KEYS = [STORAGE_KEY, LAST_VIEWED_KEY, DONE_KEY] as const;

async function readSetRaw(key: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function writeSetRaw(key: string, ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    /* ignore - keep in-memory state */
  }
}

async function readLastViewedRaw(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_VIEWED_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function readCompletedIds(): Promise<Set<string>> {
  return serial(() => readSetRaw(STORAGE_KEY));
}

export function readDoneIds(): Promise<Set<string>> {
  return serial(() => readSetRaw(DONE_KEY));
}

export function readLastViewedId(): Promise<string | null> {
  return serial(readLastViewedRaw);
}

/** Add one viewed lesson to the stored set; resolves with the stored set. */
export function addViewedId(id: string): Promise<Set<string>> {
  return serial(async () => {
    const stored = await readSetRaw(STORAGE_KEY);
    if (!stored.has(id)) {
      stored.add(id);
      await writeSetRaw(STORAGE_KEY, stored);
    }
    return stored;
  });
}

/** Set or clear one done mark; resolves with the stored set. */
export function setDoneMark(id: string, done: boolean): Promise<Set<string>> {
  return serial(async () => {
    const stored = await readSetRaw(DONE_KEY);
    if (stored.has(id) !== done) {
      if (done) stored.add(id); else stored.delete(id);
      await writeSetRaw(DONE_KEY, stored);
    }
    return stored;
  });
}

export function writeLastViewedId(id: string): Promise<void> {
  return serial(async () => {
    try {
      await AsyncStorage.setItem(LAST_VIEWED_KEY, JSON.stringify(id));
    } catch {
      /* ignore - keep in-memory state */
    }
  });
}

const union = (a: Set<string>, b: Set<string>): Set<string> => {
  if ([...b].every((id) => a.has(id))) return a;
  return new Set([...a, ...b]);
};

export interface BootcampProgress {
  /**
   * Viewed lesson IDs (legacy name: the v1 key calls them completed).
   * Empty until hydration completes. Not proof of passing, see status.ts.
   */
  completedIds: Set<string>;
  /** Lessons the learner explicitly marked as done (lessons without a quiz). */
  doneIds: Set<string>;
  /** True after the first hydration pass (storage read finished). */
  ready: boolean;
  /** Record that a lesson was viewed. Idempotent, safe to call repeatedly. */
  markCompleted: (id: string) => void;
  /** Explicit "done" mark, or clear it. */
  setDone: (id: string, done: boolean) => void;
  /** Synchronous check against the live in-memory set. */
  isCompleted: (id: string) => boolean;
  /**
   * The lesson id the user opened most recently, or null if none yet.
   * Stays in sync with `markLastViewed`.
   */
  lastViewedLessonId: string | null;
  /** Record a lesson id as the most recently opened. */
  markLastViewed: (id: string) => void;
}

/**
 * Hook for the bootcamp progress set: an in-memory mirror of the stored
 * values. Actions update the mirror at once and merge into storage in the
 * queue; hydration merges with actions taken before it finished instead of
 * replacing them. Screens that must show changes made on another screen
 * re-read through `useLearningSnapshot` (src/home) on focus.
 */
export function useBootcampProgress(): BootcampProgress {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [lastViewedLessonId, setLastViewedLessonId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const touched = useRef({ lastViewed: false, done: false });

  useEffect(() => {
    let cancelled = false;
    Promise.all([readCompletedIds(), readLastViewedId(), readDoneIds()]).then(([ids, lastId, done]) => {
      if (cancelled) return;
      setCompletedIds((prev) => union(ids, prev));
      if (!touched.current.lastViewed) setLastViewedLessonId(lastId);
      if (!touched.current.done) setDoneIds(done);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const markCompleted = useCallback((id: string) => {
    setCompletedIds((prev) => union(prev, new Set([id])));
    void addViewedId(id).then((stored) => setCompletedIds((prev) => union(prev, stored)));
  }, []);

  const setDone = useCallback((id: string, done: boolean) => {
    touched.current.done = true;
    setDoneIds((prev) => {
      if (prev.has(id) === done) return prev;
      const next = new Set(prev);
      if (done) next.add(id); else next.delete(id);
      return next;
    });
    void setDoneMark(id, done).then((stored) => setDoneIds(stored));
  }, []);

  const isCompleted = useCallback(
    (id: string) => completedIds.has(id),
    [completedIds],
  );

  const markLastViewed = useCallback((id: string) => {
    touched.current.lastViewed = true;
    setLastViewedLessonId(id);
    void writeLastViewedId(id);
  }, []);

  // Stable returned object: re-renders only when one of the inputs flips,
  // not on every render of the consumer's parent.
  return useMemo(
    () => ({
      completedIds,
      doneIds,
      ready,
      markCompleted,
      setDone,
      isCompleted,
      lastViewedLessonId,
      markLastViewed,
    }),
    [
      completedIds,
      doneIds,
      setDone,
      ready,
      markCompleted,
      isCompleted,
      lastViewedLessonId,
      markLastViewed,
    ],
  );
}
