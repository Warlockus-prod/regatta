import { Platform } from 'react-native';
import { appUserAgent, parseRelayedLog, sendFirstParty } from './first-party';

/**
 * App version for the user agent. Read lazily: the WebView hosts import this
 * file, and loading expo-constants eagerly would tie every host (and its
 * tests) to that native module just for a version label.
 */
function appVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const constants = require('expo-constants') as { default?: { expoConfig?: { version?: string } } };
    return constants.default?.expoConfig?.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/** User agent of this app build for first-party requests. */
export function currentAppUserAgent(): string {
  return appUserAgent(appVersion(), Platform.OS === 'ios' && Platform.isPad, Platform.Version);
}

/**
 * WebView onMessage hook for the offline course bundles: forwards a relayed
 * activity event to /api/log when anonymous analytics is on. Returns true when
 * the message was a relayed event (handled, even if not sent), so the caller
 * stops looking at it.
 */
export function relayWebLog(raw: string, analyticsOn: boolean): boolean {
  const body = parseRelayedLog(raw);
  if (!body) return false;
  if (analyticsOn) sendFirstParty(body, currentAppUserAgent());
  return true;
}
