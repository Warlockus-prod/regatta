/**
 * First-launch flag for the language nudge.
 *
 * Storage shape:
 *   key   = `regatta.firstLaunch.v1`
 *   value = `'done'` once the user has completed the first-launch pass
 *           (either via auto-resolve from device locale or explicit pick
 *           in the nudge modal). Absence means we still owe them the
 *           nudge.
 *
 * The bump suffix (`v1`) reserves room for a future re-prompt if the
 * onboarding story changes (e.g. v2 = post-feature-flag retest).
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'regatta.firstLaunch.v1';
const DONE_VALUE = 'done';

export interface FirstLaunchState {
  /** True after the storage read finishes (regardless of value). */
  ready: boolean;
  /** True when the flag is set; false until the user finishes the nudge. */
  done: boolean;
  /** Mark the flag as done. Idempotent, fire-and-forget. */
  markDone: () => void;
}

/**
 * Hook for the first-launch flag. Hydrates once on mount, then keeps an
 * in-memory mirror so consumers re-render off of the live value. Writes
 * are fire-and-forget; if persistence fails the rest of the session
 * still respects the in-memory choice.
 */
export function useFirstLaunch(): FirstLaunchState {
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        setDone(raw === DONE_VALUE);
      })
      .catch(() => {
        /* ignore - keep done=false */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markDone = useCallback(() => {
    setDone(true);
    AsyncStorage.setItem(STORAGE_KEY, DONE_VALUE).catch(() => {
      /* ignore - keep in-memory state */
    });
  }, []);

  return { ready, done, markDone };
}
