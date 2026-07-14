'use client';

import { useEffect } from 'react';

// Registers /sw.js (see public/sw.js for what it does and does not cache).
//
// Deliberately silent and deliberately late: registration waits for `load` so it
// never competes with the first paint, and every failure is swallowed. A browser
// with no service-worker support, a private window, or an http:// origin simply
// gets the site as it always was - the cache is an enhancement, never a
// dependency.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;   // dev has its own HMR wiring; a cache in front of it only lies

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
