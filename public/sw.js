/* eslint-disable no-restricted-globals */
// ============================================================================
// Offline for the course, and for nothing else.
//
// The course already ran entirely in the browser: the question bank is static
// data, the ICOM simulator is a pure reducer, and its sound is synthesized in
// WebAudio with no audio files at all. There was never a technical reason for
// any of it to need a network - only the absence of a cache. So: a cache.
//
// What still needs the network, and always will:
//   /api/radio-voice, /api/radio-transcribe   - transcription runs on a server
//   /api/radio-tts                            - so does speech synthesis
//   /api/ai-chat, /api/sternik-chat           - model calls
//   /api/leaderboard, /api/race-result, ...   - server state by definition
// Those are never cached and never faked. A cached answer to "grade my MAYDAY"
// would be a lie, and this is a safety trainer.
//
// FOUR THINGS THE FIRST VERSION OF THIS FILE GOT WRONG. A service worker is the
// stickiest bug surface on a website - it survives redeploys and the user has no
// way to clear it - so they are worth stating plainly.
//
// 1. IT CACHED EVERYTHING, INCLUDING /stats.
//    /stats is the admin dashboard behind basic auth: visitor feedback, country
//    and device breakdowns. Caching it by URL meant the SW stored the rendered
//    page after the admin authenticated, and would then replay it - with no auth
//    challenge - to anyone else on that device the moment a fetch failed. Now only
//    an ALLOWLIST of course routes is cached. Everything else goes to the network
//    and stays there.
//
// 2. IT CACHED PAGES BY URL, AND THE PAGE DEPENDS ON A COOKIE.
//    Every route renders in the language of the regatta_lang cookie, so /radio is
//    seven different documents. Cached by URL alone, a Polish learner who had once
//    browsed in Russian would be served the Russian document - <html lang="ru">,
//    Cyrillic title - on the Polish site. The whole point of this section is that
//    the Polish site is Polish. Cache entries are now keyed by language, and if the
//    language cannot be determined, nothing is cached at all.
//
// 3. cache.addAll IS ATOMIC.
//    One 404 in the precache list rejected the whole thing, the catch swallowed it,
//    and the user ended up with an installed service worker and an EMPTY cache -
//    including no /offline page. The comment said "one 404 must not kill the
//    install"; the code said otherwise. Each entry is now stored on its own.
//
// 4. THE CACHE NEVER DIED.
//    VERSION was a constant, so dead /_next/static chunks accumulated forever and
//    a corrected diagram in /public would be served stale for good. The version now
//    comes from the ?v= on the script URL, which changes every deploy: a new SW
//    installs, activate() deletes every cache that is not its own.
// ============================================================================

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const HTML_CACHE = `regatta-html-${VERSION}`;
const ASSET_CACHE = `regatta-assets-${VERSION}`;
const META_CACHE = `regatta-meta-${VERSION}`;

/** The pages worth having on a boat with no signal. */
const PRECACHE = [
  '/radio',
  '/radio/obsluga',
  '/radio/symulator',
  '/radio/rozmowa',
  '/radio/pozycja',
  '/radio/zadania',
  '/radio/sciaga',
  '/radio/test',
  '/sternik',
  '/sternik/teoria',
  '/sternik/test',
  '/sternik/ustny',
  '/offline',
];

/**
 * Only these documents may be cached. An allowlist, not a blocklist: a blocklist
 * is a list of the leaks you thought of, and /stats was not on the first one.
 */
function isCacheableDoc(url) {
  const p = url.pathname;
  return p === '/offline'
    || p === '/radio' || p.startsWith('/radio/')
    || p === '/sternik' || p.startsWith('/sternik/');
}

/** Fingerprinted and immutable: the filename changes when the content does. */
function isImmutableAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/');
}

function isAsset(url) {
  return /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);
}

// --- language ---------------------------------------------------------------
//
// The service worker cannot read document.cookie, so the page tells it which
// language it is rendering in (the <html lang> the server actually produced). It
// is persisted in a cache entry, because a service worker is killed and restarted
// freely and any variable it held is gone.

let lang = null;

async function persistLang(next) {
  lang = next;
  const c = await caches.open(META_CACHE);
  await c.put('/__lang', new Response(next));
}

async function currentLang() {
  if (lang) return lang;
  const c = await caches.open(META_CACHE);
  const hit = await c.match('/__lang');
  if (!hit) return null;
  lang = (await hit.text()) || null;
  return lang;
}

/** Cache entries are per language. /radio in Polish is not /radio in Russian. */
function keyFor(url, l) {
  return new Request(`${url.origin}${url.pathname}?__lang=${l}`);
}

/**
 * Precache the course in the language the page is currently in. Done per entry,
 * never with addAll: one renamed route must not take the whole cache with it.
 * credentials:'same-origin' so the request carries regatta_lang and the server
 * renders the language we are about to key it under.
 */
async function precache(l) {
  const c = await caches.open(HTML_CACHE);
  await Promise.allSettled(PRECACHE.map(async (path) => {
    const url = new URL(path, self.location.origin);
    const res = await fetch(url.href, { credentials: 'same-origin' });
    if (res.ok && !res.redirected) await c.put(keyFor(url, l), res.clone());
  }));
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'lang' || typeof data.lang !== 'string') return;
  const next = data.lang.slice(0, 5);
  event.waitUntil((async () => {
    const before = await currentLang();
    await persistLang(next);
    if (before !== next) await precache(next);
  })());
});

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());   // nothing to precache yet: we do not know the language
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k.startsWith('regatta-') && ![HTML_CACHE, ASSET_CACHE, META_CACHE].includes(k))
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;   // straight to the network, always

  if (isImmutableAsset(url)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && !res.redirected) {
        const copy = res.clone();
        caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })));
    return;
  }

  // Everything else in /public is NOT fingerprinted, so cache-first would freeze a
  // corrected exam diagram in place forever. Network first, cache as the fallback.
  if (isAsset(url)) {
    event.respondWith(fetch(req).then((res) => {
      if (res.ok && !res.redirected) {
        const copy = res.clone();
        caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || Response.error())));
    return;
  }

  if (req.mode !== 'navigate' && req.destination !== 'document') return;
  if (!isCacheableDoc(url)) return;   // /stats and friends: never ours to hold

  // Network-first. A stale COURSE is worse than no course - somebody could revise
  // last month's procedure for an exam they take tomorrow.
  event.respondWith((async () => {
    const l = await currentLang();
    try {
      const res = await fetch(req);
      if (res.ok && !res.redirected && l) {
        const copy = res.clone();
        const c = await caches.open(HTML_CACHE);
        await c.put(keyFor(url, l), copy);
      }
      return res;
    } catch {
      // No network. Only ever serve a document we stored for THIS language.
      if (!l) return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      const c = await caches.open(HTML_CACHE);
      const hit = await c.match(keyFor(url, l))
        || await c.match(keyFor(new URL('/offline', self.location.origin), l));
      return hit || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
