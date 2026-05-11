/**
 * Pre-regatta checklist progress: persists which item IDs the user has
 * ticked, in AsyncStorage. Item IDs are composite: `${sectionId}:${index}`
 * so they remain stable across content edits as long as section IDs and
 * order within a section don't change.
 *
 * Storage shape:
 *   key   = `regatta.checklist.v1`
 *   value = JSON-encoded string[] of item IDs
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'regatta.checklist.v1';

async function readCheckedIds(): Promise<Set<string>> {
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

async function writeCheckedIds(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore - keep in-memory state */
  }
}

export interface ChecklistProgress {
  /** Set of checked item IDs. Empty until hydration completes. */
  checkedIds: Set<string>;
  /** True after the first hydration pass (storage read finished). */
  ready: boolean;
  /** Toggle a single item id; updates AsyncStorage in the background. */
  toggle: (id: string) => void;
  /** Synchronous check against the live in-memory set. */
  isChecked: (id: string) => boolean;
  /** Clear every check. Used by the bottom Reset button. */
  reset: () => void;
}

/**
 * Composite item id used by both the screen and the persistence layer.
 * Stable as long as the section's id and item index don't change.
 */
export function itemKey(sectionId: string, index: number): string {
  return `${sectionId}:${index}`;
}

export function useChecklistProgress(): ChecklistProgress {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readCheckedIds().then((ids) => {
      if (cancelled) return;
      setCheckedIds(ids);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      void writeCheckedIds(next);
      return next;
    });
  }, []);

  const isChecked = useCallback(
    (id: string) => checkedIds.has(id),
    [checkedIds],
  );

  const reset = useCallback(() => {
    setCheckedIds(() => {
      const empty = new Set<string>();
      void writeCheckedIds(empty);
      return empty;
    });
  }, []);

  return { checkedIds, ready, toggle, isChecked, reset };
}
