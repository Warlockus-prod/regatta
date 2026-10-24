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
// FIVE THINGS EARLIER VERSIONS OF THIS FILE GOT WRONG (the fifth sits next to
// precache() below). A service worker is the stickiest bug surface on a
// website - it survives redeploys and the user has no way to clear it - so they
// are worth stating plainly.
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
  '/radio/teoria',
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

/** Public learning text only. Never cache arbitrary JSON or API responses. */
const RADIO_CATALOGS = [
  "/radio-locales/aliases.json", "/radio-locales/ru.json", "/radio-locales/en.json",
  "/radio-locales/pl.json", "/radio-locales/es.json", "/radio-locales/fr.json",
  "/radio-locales/de.json", "/radio-locales/it.json",
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
  return /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
    || /^\/radio-locales\/(?:aliases|ru|en|pl|es|fr|de|it)\.json$/.test(url.pathname);
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

// --- what a page needs to run -------------------------------------------------
//
// FIFTH THING: A CACHED DOCUMENT IS NOT A WORKING PAGE.
// The first precache stored the 14 documents and nothing else. Their scripts
// were cached only if a page had already loaded them while online, so a course
// page never opened online came back offline as dead HTML: /sternik/test
// rendered, and "Szybkie 20" did nothing because its chunk was missing.
// Turbopack also loads some chunks only on import() (the theory chapter
// check), and those appear in no document at all, only inside other chunks.
// So the precache now follows references: the document names its scripts,
// styles and fonts; a script names the chunks it imports; a stylesheet names
// its fonts. ASSET_DEPTH hops, deduplicated, each file stored on its own.

/** Hops from a document: its own assets, then what those assets refer to. */
const ASSET_DEPTH = 2;

/**
 * The fingerprinted assets a fetched file refers to, as absolute URLs. Pure (it
 * uses nothing but URL), so sw.test.ts can run it against real build output.
 * kind: 'html' | 'js' | 'css'; base: the URL the text was fetched from.
 */
function assetRefs(text, base, kind) {
  const origin = new URL(base).origin;
  const found = new Set();
  const add = (ref) => {
    let url;
    try { url = new URL(ref, base); } catch { return; }
    if (url.origin !== origin) return;
    if (!url.pathname.startsWith('/_next/static/') && !url.pathname.startsWith('/fonts/')) return;
    if (!/\.(?:js|css|woff2)$/.test(url.pathname)) return;
    url.hash = '';
    found.add(url.href);
  };
  if (kind === 'css') {
    // url(...) is relative to the stylesheet: ../media/x.woff2 from /_next/static/css/
    for (const m of text.matchAll(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g)) {
      if (!m[2].startsWith('data:')) add(m[2]);
    }
    return [...found];
  }
  // Root-relative paths: <script src>, <link href>, and the RSC payload in the
  // HTML (where the quotes around them are escaped). Not when a host name runs
  // straight into the path: that is some other site's /_next/.
  for (const m of text.matchAll(/(?<![\w.\-])\/_next\/static\/[\w\-./~%@]+?\.(?:js|css|woff2)(?![\w.])/g)) add(m[0]);
  if (kind === 'js') {
    // The chunk loader's own paths are relative to /_next/: "static/chunks/x.js".
    for (const m of text.matchAll(/(?<![\w/])static\/(?:chunks|css|media)\/[\w\-./~%@]+?\.(?:js|css|woff2)(?![\w.])/g)) {
      add(`/_next/${m[0]}`);
    }
  }
  return [...found];
}

function kindOf(href) {
  const p = new URL(href).pathname;
  return p.endsWith('.js') ? 'js' : p.endsWith('.css') ? 'css' : null;
}

/**
 * Precache the course in the language the page is currently in, and everything
 * those pages need to run. Done per entry, never with addAll: one renamed route
 * or one missing chunk must not take the whole cache with it.
 * credentials:'same-origin' so the request carries regatta_lang and the server
 * renders the language we are about to key it under.
 */
async function precache(l) {
  const html = await caches.open(HTML_CACHE);
  const assets = await caches.open(ASSET_CACHE);
  const seen = new Set();
  let frontier = [];
  const queue = (refs, into) => {
    for (const ref of refs) if (!seen.has(ref)) { seen.add(ref); into.push(ref); }
  };

  let catalogStored = 0;
  await Promise.allSettled(RADIO_CATALOGS.map(async (path) => {
    const url = new URL(path, self.location.origin);
    let res = await assets.match(url.href);
    if (!res) {
      res = await fetch(url.href);
      if (!res.ok || res.redirected) return;
      await assets.put(url.href, res.clone());
    }
    catalogStored++;
  }));
  let stored = 0;
  await Promise.allSettled(PRECACHE.map(async (path) => {
    const url = new URL(path, self.location.origin);
    const res = await fetch(url.href, { credentials: 'same-origin' });
    if (!res.ok || res.redirected) return;
    await html.put(keyFor(url, l), res.clone());
    stored++;
    queue(assetRefs(await res.text(), url.href, 'html'), frontier);
  }));

  for (let depth = 1; depth <= ASSET_DEPTH && frontier.length > 0; depth++) {
    const next = [];
    await Promise.allSettled(frontier.map(async (href) => {
      // Fingerprinted, so a copy already in the cache is the right copy.
      let res = await assets.match(href);
      if (!res) {
        res = await fetch(href);
        if (!res.ok || res.redirected) return;
        await assets.put(href, res.clone());
      }
      const kind = kindOf(href);
      if (depth < ASSET_DEPTH && kind) queue(assetRefs(await res.text(), href, kind), next);
    }));
    frontier = next;
  }
  return catalogStored === RADIO_CATALOGS.length ? stored : -1;
}

// Precache is requested by course pages only (see ServiceWorkerRegistrar): a
// visitor who only plays the race game should not download 14 documents and
// their scripts in the background. Done once per language per version: the
// marker lives in the versioned META_CACHE, so a deploy (new worker, caches
// wiped) or a language switch runs it again, and nothing else does.
let precaching = null;

async function precacheOnce(l) {
  const meta = await caches.open(META_CACHE);
  const done = await meta.match('/__precached');
  if (done && (await done.text()) === l) return;
  if (precaching && precaching.lang === l) return precaching.run;
  const run = (async () => {
    // Mark done only when every course document was stored: a flaky network
    // or a 5xx during a deploy must leave the next course page free to retry.
    if ((await precache(l)) === PRECACHE.length) await meta.put('/__precached', new Response(l));
  })();
  precaching = { lang: l, run };
  try { await run; } finally { if (precaching && precaching.run === run) precaching = null; }
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data.lang !== 'string') return;
  const l = data.lang.slice(0, 5);
  if (data.type === 'lang') event.waitUntil(persistLang(l));
  else if (data.type === 'precache') event.waitUntil(precacheOnce(l));
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
