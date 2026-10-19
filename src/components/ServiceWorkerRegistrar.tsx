'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

// Registers /sw.js (see public/sw.js for what it does and does not cache),
// tells it which language this page is in, and - on course pages only - asks
// it to store the course for offline use.
//
// The language is not optional. The worker cannot read document.cookie, and
// every route on this site renders in the language of the regatta_lang cookie -
// so without being told, the worker would cache /radio under a single key and
// later serve a Russian document to a Polish learner. It caches nothing until it
// knows the language.
//
// The precache request is limited to /radio and /sternik: this component sits
// in the root layout, and a visitor who only opened the race game has no use
// for 14 course documents and their scripts downloaded in the background.
//
// The ?v= is the deploy's build id. It is what makes a new worker install at all:
// browsers compare sw.js byte-for-byte, and a constant script would leave the old
// worker - and its old caches - in place forever.
//
// Deliberately silent and deliberately late: registration waits for `load` so it
// never competes with the first paint, and every failure is swallowed. A browser
// with no service-worker support, a private window, or an http:// origin simply
// gets the site as it always was - the cache is an enhancement, never a
// dependency.
const VERSION = process.env.NEXT_PUBLIC_SW_VERSION || 'dev';

function swEnabled(): boolean {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  return process.env.NODE_ENV === 'production';   // dev has HMR; a cache in front of it only lies
}

function isCoursePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/radio' || pathname.startsWith('/radio/')
    || pathname === '/sternik' || pathname.startsWith('/sternik/');
}

export default function ServiceWorkerRegistrar() {
  const { lang } = useI18n();
  const pathname = usePathname();

  // Register once per page load.
  useEffect(() => {
    if (!swEnabled()) return;
    const register = () => {
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(VERSION)}`)
        .catch(() => {});
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  // Tell the active worker the language on every route, and ask for the
  // offline course only on course routes. `ready` waits for the registration
  // above, so this is safe to run before it has finished.
  useEffect(() => {
    if (!swEnabled()) return;
    const course = isCoursePath(pathname);
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((reg) => {
        if (cancelled) return;
        reg.active?.postMessage({ type: 'lang', lang });
        if (course) reg.active?.postMessage({ type: 'precache', lang });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lang, pathname]);

  return null;
}
