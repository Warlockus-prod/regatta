import Constants from 'expo-constants';
import PostHog, { PostHogProvider } from 'posthog-react-native';
import { type ReactNode, useEffect, useMemo } from 'react';
import { useI18n } from '../i18n/context';
import { useAnalyticsConsent } from '../persistence/analytics-consent';
import { AnalyticsClientContext } from './context';
import { analyticsEnabled, posthogApiKey, posthogHost } from './config';

/**
 * Mounts PostHog for the whole app.
 *
 * Layout, outside-in:
 *  - AnalyticsClientContext provides the client (or null) to `useAnalytics()`.
 *  - PostHogProvider drives autocapture: SCREEN views (expo-router routes) are
 *    captured automatically; touch autocapture is intentionally OFF so we never
 *    record arbitrary on-screen text - product events are explicit instead.
 *
 * When `analyticsEnabled` is false (no project key configured) we render a
 * pass-through with a null client, so the app behaves identically with or
 * without analytics wired up.
 *
 * Place this INSIDE I18nProvider (so it can stamp the active language onto
 * every event) and ABOVE the navigator (so screen autocapture sees route
 * changes).
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const { enabled: analyticsConsent, ready: consentReady } = useAnalyticsConsent();

  const client = useMemo(() => {
    if (!analyticsEnabled) return null;
    return new PostHog(posthogApiKey, {
      host: posthogHost,
      // Application Installed / Updated / Opened / Backgrounded - gives
      // retention and session framing with zero manual instrumentation.
      captureAppLifecycleEvents: true,
    });
    // Build once. The key/host are build-time constants; rebuilding the client
    // on every render would drop the in-memory event queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Super properties: attach language + app version to every captured event so
  // the funnels are segmentable. Re-runs when the user switches language.
  useEffect(() => {
    if (!client) return;
    void client.register({
      app_language: lang,
      app_version: Constants.expoConfig?.version ?? 'unknown',
    });
  }, [client, lang]);

  // Honor the user's opt-out. PostHog persists its own opt-out state, so a
  // returning opted-out user is suppressed even before this runs; we re-assert
  // the stored choice once it is read so the two layers always agree.
  useEffect(() => {
    if (!client || !consentReady) return;
    try {
      if (analyticsConsent) client.optIn();
      else client.optOut();
    } catch {
      /* best-effort; never break mount over an analytics toggle */
    }
  }, [client, consentReady, analyticsConsent]);

  if (!client) {
    return (
      <AnalyticsClientContext.Provider value={null}>{children}</AnalyticsClientContext.Provider>
    );
  }

  return (
    <AnalyticsClientContext.Provider value={client}>
      <PostHogProvider
        client={client}
        autocapture={{ captureScreens: true, captureTouches: false }}
        debug={__DEV__}
      >
        {children}
      </PostHogProvider>
    </AnalyticsClientContext.Provider>
  );
}
