'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { clientError, clientInfo, flushBufferedLogs } from '@/lib/client-log';

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
 */

const SESSION_START_KEY = 'regatta.session-start-ms.v1';
const UTM_KEY = 'regatta.utm.v1';

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
      clientError('js.uncaught', {
        msg: e.message,
        src: e.filename,
        line: e.lineno,
        col: e.colno,
        stack: e.error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      clientError('js.rejection', {
        reason: String(e.reason).slice(0, 500),
        stack: (e.reason as Error | undefined)?.stack?.split('\n').slice(0, 3).join(' | '),
      });
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
    let maxScrollPct = 0;
    let scrollTimer: number | null = null;

    clientInfo('page.view', {
      path: pathname,
      referrer: document.referrer || null,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      viewportBucket: bucketViewport(window.innerWidth),
      ua: navigator.userAgent.slice(0, 200),
      msSinceStart: pageStart - startMs,
      ...utm,
    });

    // Track scroll depth - sample at most every 200ms while user scrolls,
    // then emit ONE summary event when navigating away or after 30 s of
    // idle. We don't need every wheel tick - just the deepest the user
    // got.
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.round(((window.scrollY) / scrollable) * 100));
      if (pct > maxScrollPct) maxScrollPct = pct;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Engagement summary - on unload or after 30 s. Fires only if the page
    // got more than a brief glance (>= 5 s) so we don't log on instant
    // bounces. Includes maxScrollPct + ms_on_page so /stats can compute
    // engagement-time and scroll-depth distributions per route.
    const flushEngagement = () => {
      const msOnPage = Date.now() - pageStart;
      if (msOnPage < 5000) return;
      clientInfo('page.engaged', {
        path: pathname,
        msOnPage,
        maxScrollPct,
      });
    };

    const onPageHide = () => flushEngagement();
    window.addEventListener('pagehide', onPageHide);
    // Late-snapshot in case the user just sits on the page for a minute
    scrollTimer = window.setTimeout(flushEngagement, 30_000);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onPageHide);
      if (scrollTimer !== null) window.clearTimeout(scrollTimer);
      // Try one last engagement flush for SPA route changes (the pagehide
      // event doesn't fire on Next.js client-side navigations).
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
