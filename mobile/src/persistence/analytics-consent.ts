/**
 * Anonymous-analytics consent (opt-out model).
 *
 * Storage shape:
 *   key   = `regatta.analytics.v1`
 *   value = JSON `{ "enabled": boolean }`. A MISSING row means the user has
 *           not chosen yet -> default ENABLED (analytics on by default).
 *
 * This hook is the single source of truth for the user's choice. It touches
 * only AsyncStorage and pulls in NO native PostHog dependency, so it is safe
 * in Jest and renders the Settings toggle without the analytics client mounted.
 *
 * Who applies it to PostHog:
 *  - `AnalyticsProvider` reads this on launch and calls `client.optIn()` /
 *    `client.optOut()` so a returning opted-out user never captures.
 *  - The Settings toggle writes here AND calls the live client directly so the
 *    change takes effect immediately, not just on the next launch.
 *
 * The disclosure copy and the ASC App Privacy label ("Data Collected:
 * Analytics / Product Interaction, not linked to identity, not used for
 * tracking", NSPrivacyTracking=false) must stay consistent with this default.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'regatta.analytics.v1';

/** Anonymous analytics is ON unless the user has explicitly turned it off. */
export const DEFAULT_ANALYTICS_ENABLED = true;

async function readEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT_ANALYTICS_ENABLED;
    const parsed = JSON.parse(raw) as { enabled?: unknown };
    return parsed?.enabled !== false;
  } catch {
    return DEFAULT_ANALYTICS_ENABLED;
  }
}

async function writeEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled }));
  } catch {
    /* ignore - keep the in-memory choice */
  }
}

export interface AnalyticsConsent {
  /** Whether anonymous analytics is currently allowed. */
  enabled: boolean;
  /** True once the stored choice has been read (use to gate applying it). */
  ready: boolean;
  /** Persist the user's choice. */
  setEnabled: (enabled: boolean) => void;
}

export function useAnalyticsConsent(): AnalyticsConsent {
  const [enabled, setEnabledState] = useState(DEFAULT_ANALYTICS_ENABLED);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void readEnabled().then((v) => {
      if (!alive) return;
      setEnabledState(v);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    void writeEnabled(next);
  }, []);

  return { enabled, ready, setEnabled };
}
