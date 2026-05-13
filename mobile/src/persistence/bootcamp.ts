/**
 * Bootcamp progress: persists which lesson IDs the user has opened, in
 * AsyncStorage. v1 pattern: tapping "Open" on a lesson detail counts as
 * completion. Future versions may add explicit complete / uncomplete
 * controls and per-lesson notes.
 *
 * Storage shape:
 *   key   = `regatta.progress.bootcamp.v1`
 *   value = JSON-encoded string[] of lesson IDs
 *
 *   key   = `regatta.progress.bootcamp.lastViewed.v1`
 *   value = JSON-encoded string (the last opened lesson id) or absent
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'regatta.progress.bootcamp.v1';
const LAST_VIEWED_KEY = 'regatta.progress.bootcamp.lastViewed.v1';

async function readCompletedIds(): Promise<Set<string>> {
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

async function readLastViewedId(): Promise<string | null> {
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
  /** Set of completed lesson IDs. Empty until hydration completes. */
  completedIds: Set<string>;
  /** True after the first hydration pass (storage read finished). */
  ready: boolean;
  /** Mark a lesson id complete. Idempotent, safe to call repeatedly. */
  markCompleted: (id: string) => void;
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
  const [lastViewedLessonId, setLastViewedLessonId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([readCompletedIds(), readLastViewedId()]).then(([ids, lastId]) => {
      if (cancelled) return;
      setCompletedIds(ids);
      setLastViewedLessonId(lastId);
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
      ready,
      markCompleted,
      isCompleted,
      lastViewedLessonId,
      markLastViewed,
    }),
    [
      completedIds,
      ready,
      markCompleted,
      isCompleted,
      lastViewedLessonId,
      markLastViewed,
    ],
  );
}
