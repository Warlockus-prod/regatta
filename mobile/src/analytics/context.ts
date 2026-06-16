import { createContext, useContext } from 'react';
import type PostHog from 'posthog-react-native';

/**
 * Holds the live PostHog client (or null when analytics is disabled).
 *
 * We keep our OWN context rather than leaning on `usePostHog()` so that:
 *  - `useAnalytics()` is safe to call with no provider mounted (it just gets
 *    null and no-ops) - no native module is imported at runtime by call sites,
 *    which keeps Jest screen tests free of the PostHog native dependency;
 *  - the same client instance backs both our manual `capture()` calls and the
 *    `PostHogProvider` that drives screen autocapture.
 *
 * The import is type-only, so this file pulls in NOTHING from
 * posthog-react-native at runtime.
 */
export const AnalyticsClientContext = createContext<PostHog | null>(null);

export function useAnalyticsClient(): PostHog | null {
  return useContext(AnalyticsClientContext);
}
