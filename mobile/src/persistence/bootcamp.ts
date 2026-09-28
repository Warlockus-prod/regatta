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
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'regatta.progress.bootcamp.v1';
const LAST_VIEWED_KEY = 'regatta.progress.bootcamp.lastViewed.v1';
const DONE_KEY = 'regatta.progress.bootcamp.done.v1';

/** Every bootcamp progress key, for resets. */
export const BOOTCAMP_PROGRESS_KEYS = [STORAGE_KEY, LAST_VIEWED_KEY, DONE_KEY] as const;

export async function readCompletedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function writeCompletedIds(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore - keep in-memory state */
  }
}

export async function readDoneIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DONE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function writeDoneIds(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(DONE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore - keep in-memory state */
  }
}

export async function readLastViewedId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_VIEWED_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeLastViewedId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_VIEWED_KEY, JSON.stringify(id));
  } catch {
    /* ignore - keep in-memory state */
  }
}

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
 * Hook for the bootcamp progress set. Hydrates from AsyncStorage on
 * mount, then keeps an in-memory mirror that consumers re-render off of.
 * Writes are fire-and-forget; if persistence fails the user's action
 * still reflects in the UI for the rest of the session.
 */
export function useBootcampProgress(): BootcampProgress {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [lastViewedLessonId, setLastViewedLessonId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([readCompletedIds(), readLastViewedId(), readDoneIds()]).then(([ids, lastId, done]) => {
      if (cancelled) return;
      setCompletedIds(ids);
      setLastViewedLessonId(lastId);
      setDoneIds(done);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const markCompleted = useCallback((id: string) => {
    setCompletedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      void writeCompletedIds(next);
      return next;
    });
  }, []);

  const setDone = useCallback((id: string, done: boolean) => {
    setDoneIds((prev) => {
      if (prev.has(id) === done) return prev;
      const next = new Set(prev);
      if (done) next.add(id); else next.delete(id);
      void writeDoneIds(next);
      return next;
    });
  }, []);

  const isCompleted = useCallback(
    (id: string) => completedIds.has(id),
    [completedIds],
  );

  const markLastViewed = useCallback((id: string) => {
    setLastViewedLessonId((prev) => {
      if (prev === id) return prev;
      void writeLastViewedId(id);
      return id;
    });
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
