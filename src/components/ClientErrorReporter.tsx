'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
// Bundle dedupe, not a feature: this component is mounted once in the root
// layout, so this side-effect import puts the next/dynamic runtime (loadable,
// preload-chunks, async storage, about 4.4 KB) in the shared layout chunk.
// Without it Turbopack copied that runtime into each of the ~20 route chunks
// that call dynamic() (about 80 KB in total, scripts/check-bundle-size.mjs).
// Pinned by src/components/bundle-dedupe.test.ts.
import 'next/dynamic';
import { isBrowserNoise } from '@/lib/analytics-events';
import { clientError, clientInfo, flushBufferedLogs } from '@/lib/client-log';
import { detectShell } from '@/lib/funnel';

/**
 * Mounted once in the root layout - attaches listeners for uncaught errors
 * and unhandled promise rejections, sending them to /api/log.
 *
 * Also logs a `page.view` event on every client-side navigation so the
 * /stats dashboard actually reflects what the user browsed. Previously
 * fired once on layout mount (i.e. one event per session), which made
 * per-route analytics garbage.
 *
 * UTM + ms_since_start (2026-04-25): First page.view of a session also
 * captures utm_source/medium/campaign from the URL querystring. The values
 * are cached in sessionStorage and re-emitted on subsequent page.views so
 * the server-side session-upsert can store them stickily. ms_since_start
 * is the ms between the session's first page.view and the current event,
 * enabling time-on-page bucketing in /stats.
 *
 * embed + client (2026-10-18): page.view says whether the page runs inside
 * the iOS app (?embed=1 WebView, client 'app') or a normal browser ('web'),
 * so app traffic no longer looks like web traffic in /stats.
 *
 * Noise (2026-10-19): errors thrown by browser extensions and opaque
 * cross-origin "Script error." reports are not sent (isBrowserNoise), and
 * clientLog() sends nothing from automated browsers.
 */

const SESSION_START_KEY = 'regatta.session-start-ms.v1';
const UTM_KEY = 'regatta.utm.v1';
// page.engaged needs this much visible time, and is clamped to the cap so a
// tab left open over a weekend does not report days of reading.
const MIN_ENGAGED_MS = 5_000;
const MAX_ENGAGED_MS = 30 * 60 * 1000;

/** Random id that ties one page.view to its page.engaged. */
function newViewId(): string {
  return (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 20);
}

function getSessionStartMs(): number {
  try {
    const v = sessionStorage.getItem(SESSION_START_KEY);
    if (v) return parseInt(v, 10);
    const now = Date.now();
    sessionStorage.setItem(SESSION_START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function captureUtm(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  try {
    // Re-parse every call in case the user arrived via a new utm link
    // mid-session. First-value-wins logic is enforced server-side via
    // COALESCE in the sessions upsert.
    const params = new URLSearchParams(window.location.search);
    const incoming = {
      utm_source: params.get('utm_source') ?? undefined,
      utm_medium: params.get('utm_medium') ?? undefined,
      utm_campaign: params.get('utm_campaign') ?? undefined,
    };
    if (incoming.utm_source || incoming.utm_medium || incoming.utm_campaign) {
      // Cache so subsequent page.views in the same SPA session keep
      // echoing the same attribution.
      sessionStorage.setItem(UTM_KEY, JSON.stringify(incoming));
      return incoming;
    }
    const cached = sessionStorage.getItem(UTM_KEY);
    if (cached) return JSON.parse(cached);
    return {};
  } catch {
    return {};
  }
}

export default function ClientErrorReporter() {
  const pathname = usePathname();

  // Error + online handlers - mount once.
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const report = {
        msg: e.message,
        src: e.filename,
        line: e.lineno,
        col: e.colno,
        stack: e.error?.stack?.split('\n').slice(0, 3).join(' | '),
      };
      if (isBrowserNoise(report)) return;
      clientError('js.uncaught', report);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const report = {
        reason: String(e.reason).slice(0, 500),
        stack: (e.reason as Error | undefined)?.stack?.split('\n').slice(0, 3).join(' | '),
      };
      if (isBrowserNoise(report)) return;
      clientError('js.rejection', report);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    // Replay any logs queued while offline on a previous page load.
    flushBufferedLogs();
    // Also flush when network comes back during this session.
    const onOnline = () => flushBufferedLogs();
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // Page-view per navigation. usePathname() is reactive so this fires on
  // every route change in the SPA, including the initial load.
  useEffect(() => {
    const startMs = getSessionStartMs();
    const utm = captureUtm();
    const pageStart = Date.now();
    const viewId = newViewId();
    let maxScrollPct = 0;

    // Language: prefer the user's i18n cookie/localStorage (the UI language
    // they actually picked) over `navigator.language` (their OS locale).
    // Both are normalised to a 2-letter iso code so /stats can group cleanly.
    let language: string | undefined;
    try {
      const fromStorage = window.localStorage?.getItem('regatta.lang.v1');
      const fromCookie = document.cookie.match(/regatta_lang=([a-z]{2})/)?.[1];
      const navLang = navigator.language?.slice(0, 2).toLowerCase();
      language = fromStorage || fromCookie || navLang;
    } catch {
      language = navigator.language?.slice(0, 2).toLowerCase();
    }

    clientInfo('page.view', {
      path: pathname,
      referrer: document.referrer || null,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      viewportBucket: bucketViewport(window.innerWidth),
      ua: navigator.userAgent.slice(0, 200),
      language,
      msSinceStart: pageStart - startMs,
      viewId,
      ...detectShell(),
      ...utm,
    });

    // Track scroll depth on every scroll event (cheap: one max() per tick).
    // Only the deepest point reached is reported, in the page.engaged summary.
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.round(((window.scrollY) / scrollable) * 100));
      if (pct > maxScrollPct) maxScrollPct = pct;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Engagement summary: ONE page.engaged per view, sent the first time the
    // page is hidden (tab switch, app to background, close), unloaded, or left
    // by a client-side navigation, once the view has at least MIN_ENGAGED_MS
    // of visible time. msOnPage counts only time the tab was visible, clamped
    // to MAX_ENGAGED_MS. A hidden tab used to keep counting, and a 30 s timer
    // plus the 60 s dedup reported 30-90 s stays as 30 s and longer ones twice.
    let visibleMs = 0;
    let visibleSince: number | null = document.visibilityState === 'visible' ? pageStart : null;
    let engagedSent = false;
    const pauseClock = () => {
      if (visibleSince !== null) {
        visibleMs += Date.now() - visibleSince;
        visibleSince = null;
      }
    };
    const flushEngagement = () => {
      pauseClock();
      if (engagedSent || visibleMs < MIN_ENGAGED_MS) return;
      engagedSent = true;
      clientInfo('page.engaged', {
        path: pathname,
        viewId,
        msOnPage: Math.min(visibleMs, MAX_ENGAGED_MS),
        maxScrollPct,
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushEngagement();
      else if (visibleSince === null) visibleSince = Date.now();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushEngagement);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushEngagement);
      // Client-side navigations fire neither pagehide nor visibilitychange.
      flushEngagement();
    };
  }, [pathname]);

  return null;
}

/**
 * Bucket viewport width into a small set of strings for /stats grouping.
 * Avoids the long tail of unique viewport sizes when only the rough
 * device class matters (mobile / tablet / laptop / desktop / wide).
 */
function bucketViewport(width: number): string {
  if (width < 480) return 'mobile-sm';
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'laptop';
  if (width < 1920) return 'desktop';
  return 'wide';
}
