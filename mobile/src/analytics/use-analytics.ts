import { useCallback, useMemo } from 'react';
import { useAnalyticsClient } from './context';
import type { AnalyticsEventName, AnalyticsProps } from './events';

/**
 * Drop `undefined` values so the payload satisfies PostHog's JSON property type
 * (which allows `null` but not `undefined`), and so events carry only the keys
 * that actually have a value.
 */
function clean(props?: AnalyticsProps): Record<string, string | number | boolean | null> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export interface Analytics {
  /** Capture a product event. No-op when analytics is disabled. */
  capture: (event: AnalyticsEventName, properties?: AnalyticsProps) => void;
  /** Associate the current anonymous id with a stable id + person properties. */
  identify: (distinctId: string, properties?: AnalyticsProps) => void;
  /** Manually record a screen view (autocapture already does this for routes). */
  screen: (name: string, properties?: AnalyticsProps) => void;
}

/**
 * Defensive accessor for analytics. Every method is wrapped so a failure (or a
 * missing client when analytics is off) can never break a user flow, and call
 * sites never need a null check.
 */
export function useAnalytics(): Analytics {
  const client = useAnalyticsClient();

  const capture = useCallback<Analytics['capture']>(
    (event, properties) => {
      try {
        client?.capture(event, clean(properties));
      } catch {
        /* analytics is best-effort; never throw into a user flow */
      }
    },
    [client],
  );

  const identify = useCallback<Analytics['identify']>(
    (distinctId, properties) => {
      try {
        client?.identify(distinctId, clean(properties));
      } catch {
        /* ignore */
      }
    },
    [client],
  );

  const screen = useCallback<Analytics['screen']>(
    (name, properties) => {
      try {
        client?.screen(name, clean(properties));
      } catch {
        /* ignore */
      }
    },
    [client],
  );

  return useMemo(() => ({ capture, identify, screen }), [capture, identify, screen]);
}
