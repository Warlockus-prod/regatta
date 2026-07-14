'use client';

import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

// Registers /sw.js (see public/sw.js for what it does and does not cache) and
// tells it which language this page is in.
//
// That second job is not optional. The worker cannot read document.cookie, and
// every route on this site renders in the language of the regatta_lang cookie -
// so without being told, the worker would cache /radio under a single key and
// later serve a Russian document to a Polish learner. It caches nothing until it
// knows the language.
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

export default function ServiceWorkerRegistrar() {
  const { lang } = useI18n();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;   // dev has HMR; a cache in front of it only lies

    const tellLang = () => {
      navigator.serviceWorker.ready
        .then((reg) => reg.active?.postMessage({ type: 'lang', lang }))
        .catch(() => {});
    };

    const register = () => {
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(VERSION)}`)
        .then(tellLang)
        .catch(() => {});
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, [lang]);

  return null;
}
