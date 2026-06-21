/**
 * First-launch flag for the language nudge + onboarding tour.
 *
 * Storage shape:
 *   key   = `regatta.firstLaunch.v1`
 *   value = one of:
 *     - absent       : pristine first launch, owe the user the nudge + tour
 *     - 'in-tour'    : language step finished, but the rest of the tour
 *                      did not complete (e.g. app killed mid-tour). Resume.
 *     - 'done'       : the user has finished the onboarding pass. Skip
 *                      the tour entirely on subsequent launches.
 *
 * The bump suffix (`v1`) reserves room for a future re-prompt if the
 * onboarding story changes (e.g. v2 = post-feature-flag retest).
 *
 * Backward compatibility: prior builds wrote only `'done'` here. Any
 * stored value other than `'in-tour'` or `'done'` is treated as `null`
 * (pristine). A bare `'done'` from an older build correctly skips the
 * tour, matching the existing user expectation that they already
 * completed onboarding.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'regatta.firstLaunch.v1';

export type FirstLaunchStage = 'pending' | 'in-tour' | 'done';

const IN_TOUR_VALUE = 'in-tour';
const DONE_VALUE = 'done';

export interface FirstLaunchState {
  /** True after the storage read finishes (regardless of value). */
  ready: boolean;
  /** Tri-state: pending = not yet shown, in-tour = mid-flow, done = finished. */
  stage: FirstLaunchStage;
  /**
   * Convenience boolean: true once the entire onboarding pass is complete.
   * Equivalent to `stage === 'done'`. Existing call sites used this name.
   */
  done: boolean;
  /**
   * Mark the language step finished. Subsequent launches resume directly
   * at Screen 2 (welcome). Idempotent, fire-and-forget.
   */
  markInTour: () => void;
  /**
   * Mark the entire onboarding pass complete. Idempotent, fire-and-forget.
   * Backward-compatible name preserved from sprint 1.
   */
  markDone: () => void;
}

/**
 * Hook for the first-launch flag. Hydrates once on mount, then keeps an
 * in-memory mirror so consumers re-render off of the live value. Writes
 * are fire-and-forget; if persistence fails the rest of the session
 * still respects the in-memory choice.
 */
export function useFirstLaunch(): FirstLaunchState {
  const [stage, setStage] = useState<FirstLaunchStage>('pending');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw === DONE_VALUE) {
          setStage('done');
        } else if (raw === IN_TOUR_VALUE) {
          setStage('in-tour');
        } else {
          setStage('pending');
        }
      })
      .catch(() => {
        /* ignore - keep stage='pending' */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markInTour = useCallback(() => {
    setStage((prev) => (prev === 'done' ? prev : 'in-tour'));
    AsyncStorage.setItem(STORAGE_KEY, IN_TOUR_VALUE).catch(() => {
      /* ignore - keep in-memory state */
    });
  }, []);

  const markDone = useCallback(() => {
    setStage('done');
    AsyncStorage.setItem(STORAGE_KEY, DONE_VALUE).catch(() => {
      /* ignore - keep in-memory state */
    });
  }, []);

  // Stable returned object so consumers do not re-render on unrelated
  // ancestor renders.
  return useMemo(
    () => ({
      ready,
      stage,
      done: stage === 'done',
      markInTour,
      markDone,
    }),
    [ready, stage, markInTour, markDone],
  );
}
