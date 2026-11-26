import Constants from 'expo-constants';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Dimensions, Platform } from 'react-native';
import { useI18n } from '../i18n/context';
import { useAnalyticsConsent } from '../persistence/analytics-consent';
import {
  appUserAgent,
  ForegroundSession,
  normalizeScreenPath,
  screenViewBody,
  sendFirstParty,
  type AppContextInfo,
} from './first-party';

/**
 * Reports native screens and foreground time to the site's /api/log (see
 * first-party.ts). Mounted once inside AnalyticsProvider, next to the
 * navigator. Renders nothing. Sends nothing until the consent choice is read,
 * and nothing at all when the user turned "Anonymous analytics" off.
 */
export function FirstPartyActivity() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const { enabled, ready } = useAnalyticsConsent();
  const session = useRef<ForegroundSession | null>(null);
  const ctxRef = useRef<AppContextInfo>({ language: lang, appVersion: '', viewport: '' });
  const allowed = ready && enabled;
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;

  const appVersion = Constants.expoConfig?.version ?? 'unknown';
  const ua = appUserAgent(appVersion, Platform.OS === 'ios' && Platform.isPad, Platform.Version);
  const { width, height } = Dimensions.get('window');
  ctxRef.current = {
    language: lang,
    appVersion,
    viewport: `${Math.round(width)}x${Math.round(height)}`,
  };

  if (session.current === null) session.current = new ForegroundSession(Date.now());

  useEffect(() => {
    if (!allowed) return;
    const path = normalizeScreenPath(pathname);
    if (session.current?.enterScreen(path)) sendFirstParty(screenViewBody(path, ctxRef.current), ua);
  }, [allowed, pathname, ua]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const s = session.current;
      if (!s) return;
      if (state === 'active') {
        s.resume(Date.now());
      } else if (state === 'background') {
        const body = s.end(Date.now(), ctxRef.current);
        if (body && allowedRef.current) sendFirstParty(body, ua);
      }
    });
    return () => sub.remove();
  }, [ua]);

  return null;
}
