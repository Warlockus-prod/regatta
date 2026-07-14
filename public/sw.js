/* eslint-disable no-restricted-globals */
// ============================================================================
// Offline for everything that does not need a model.
//
// The courses already run entirely in the browser: the question bank is static
// data, the ICOM simulator is a pure reducer, and its sound is synthesized in
// WebAudio with no audio files at all. There was never a technical reason for
// any of it to need a network - only the absence of a cache. So: a cache.
//
// What still needs the network, and always will:
//   /api/radio-voice, /api/radio-transcribe   - transcription runs on a server
//   /api/radio-tts                            - so does speech synthesis
//   /api/ai-chat, /api/sternik-chat           - model calls
//   /api/leaderboard, /api/weather, ...       - server state by definition
// Those are never cached and never faked. A cached answer to "grade my MAYDAY"
// would be a lie, and this is a safety trainer.
//
// STRATEGY, and the reason for it:
//   - HTML: network-first. A stale COURSE is worse than no course - somebody
//     could revise last month's procedure for an exam they take tomorrow. We go
//     to the network, and fall back to the cache only when there is no network.
//   - fingerprinted assets (/_next/static/**): cache-first. The filename changes
//     when the content does, so a hit is always correct and always fast.
//   - everything else: network, falling back to cache.
// ============================================================================

const VERSION = 'v1';
const HTML_CACHE = `regatta-html-${VERSION}`;
const ASSET_CACHE = `regatta-assets-${VERSION}`;

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

/** Never cached. A stale answer here is a wrong answer. */
function isLive(url) {
  return url.pathname.startsWith('/api/');
}

function isAsset(url) {
  return url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/fonts/')
    || /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(HTML_CACHE)
      .then((c) => c.addAll(PRECACHE).catch(() => {}))   // one 404 must not kill the install
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== HTML_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isLive(url)) return;   // straight to the network, always

  if (isAsset(url)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })),
    );
    return;
  }

  // documents: network first, cache as the safety net
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(HTML_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req)
        .then((hit) => hit || caches.match('/offline'))
        .then((hit) => hit || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }))),
  );
});
