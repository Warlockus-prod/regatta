'use client';

import { useEffect } from 'react';
import { clientError, clientInfo, flushBufferedLogs } from '@/lib/client-log';

/**
 * Mounted once in the root layout - attaches listeners for uncaught errors
 * and unhandled promise rejections, sending them to /api/log.
 *
 * Also logs a lightweight "page-view" event for each navigation so we can
 * see in the server logs which pages are actually being used.
 */
export default function ClientErrorReporter() {
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

    clientInfo('page.view', {
      path: window.location.pathname,
      referrer: document.referrer || null,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      ua: navigator.userAgent.slice(0, 200),
    });

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return null;
}
