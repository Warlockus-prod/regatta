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
 *  - The WebView hosts (SectionWebView, SimWebView, OfflineRadioCourse) inject
 *    `webAnalyticsGuardScript(enabled)` so the embedded web pages skip their
 *    own analytics too, and key the WebView on the choice so a change reloads
 *    the page.
 *
 * Every mounted hook shares the choice: `setEnabled` in Settings updates all
 * of them at once, not only the instance that called it.
 *
 * "Clear all data" in Settings keeps this row (see `ANALYTICS_CONSENT_KEY`):
 * wiping it would silently turn an opted-out user's analytics back on at the
 * next launch.
 *
 * The disclosure copy and the ASC App Privacy label ("Data Collected:
 * Analytics / Product Interaction, not linked to identity, not used for
 * tracking", NSPrivacyTracking=false) must stay consistent with this default.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** AsyncStorage key of the choice. Exported so "Clear all data" can keep it. */
export const ANALYTICS_CONSENT_KEY = 'regatta.analytics.v1';

/** Anonymous analytics is ON unless the user has explicitly turned it off. */
export const DEFAULT_ANALYTICS_ENABLED = true;

/**
 * Runs in an embedded web page before its own scripts. The web pages skip
 * their own analytics when either the global or the sessionStorage flag is
 * set; the sessionStorage copy survives in-section link navigations. That
 * check ships with the website (src/lib/client-log.ts), not with the app.
 */
export const WEB_NO_ANALYTICS_SCRIPT =
  "window.__REGATTA_NO_ANALYTICS__=true;try{sessionStorage.setItem('regatta.noanalytics.v1','1')}catch(e){}";

/** Script to prepend to `injectedJavaScriptBeforeContentLoaded` for a choice. */
export function webAnalyticsGuardScript(enabled: boolean): string {
  return enabled ? '' : WEB_NO_ANALYTICS_SCRIPT;
}

const listeners = new Set<(enabled: boolean) => void>();

export async function readAnalyticsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (raw == null) return DEFAULT_ANALYTICS_ENABLED;
    const parsed = JSON.parse(raw) as { enabled?: unknown };
    return parsed?.enabled !== false;
  } catch {
    return DEFAULT_ANALYTICS_ENABLED;
  }
}

async function writeEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify({ enabled }));
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
    // A choice made while the first read is in flight wins over the read.
    let chosen = false;
    const onChange = (next: boolean) => {
      if (!alive) return;
      chosen = true;
      setEnabledState(next);
      setReady(true);
    };
    listeners.add(onChange);
    void readAnalyticsEnabled().then((v) => {
      if (!alive || chosen) return;
      setEnabledState(v);
      setReady(true);
    });
    return () => {
      alive = false;
      listeners.delete(onChange);
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    // Every mounted hook, this one included, gets the new value.
    for (const onChange of Array.from(listeners)) onChange(next);
    void writeEnabled(next);
  }, []);

  return { enabled, ready, setEnabled };
}
