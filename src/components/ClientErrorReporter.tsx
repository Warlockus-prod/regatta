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
 */
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
    clientInfo('page.view', {
      path: pathname,
      referrer: document.referrer || null,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      ua: navigator.userAgent.slice(0, 200),
    });
  }, [pathname]);

  return null;
}
