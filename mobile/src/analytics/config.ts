import Constants from 'expo-constants';

/**
 * PostHog project configuration.
 *
 * The project API key and host are PUBLIC values - the key ships inside the
 * client bundle exactly like a Google Analytics measurement id, so it is NOT a
 * secret and must never be treated like one. We read it from an EXPO_PUBLIC_*
 * env var (Metro inlines those into the JS bundle at build time) with a
 * fallback to `expo.extra` in app.json.
 *
 * When no key is configured, analytics stays OFF: `analyticsEnabled` is false,
 * the provider renders a pass-through, and every `useAnalytics()` method is a
 * no-op. That keeps the app fully functional in dev, in tests, and before a
 * key has been provisioned.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as {
  posthogKey?: string;
  posthogHost?: string;
};

export const posthogApiKey: string =
  process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() || extra.posthogKey?.trim() || '';

export const posthogHost: string =
  process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() ||
  extra.posthogHost?.trim() ||
  'https://us.i.posthog.com';

/** Analytics runs only when a project key is configured. */
export const analyticsEnabled: boolean = posthogApiKey.length > 0;
