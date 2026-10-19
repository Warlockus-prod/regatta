import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// ============================================================================
// The service worker cannot be imported (it is a classic worker that references
// `self`), but its cache-policy predicates are pure. We pull them out and run
// them, because the one bug that must never come back is silent: caching /stats,
// the admin dashboard behind basic auth, and replaying it to anyone on the device.
//
// An allowlist is a list of what you trust; a blocklist is a list of the leaks
// you happened to think of, and /stats was not on the first one. This test exists
// so the allowlist stays an allowlist.
// ============================================================================

const src = readFileSync(
  fileURLToPath(new URL('../../../public/sw.js', import.meta.url)),
  'utf8',
);

/** Pull a named top-level `function name(...) {...}` out of the worker source. */
function extract(name: string): (...args: unknown[]) => boolean {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in sw.js`);
  let depth = 0;
  let i = src.indexOf('{', start);
  const bodyStart = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) break;
  }
  const body = src.slice(bodyStart, i + 1);
  const sig = src.slice(start, bodyStart);
  const ctx = vm.createContext({ URL });
  return vm.runInContext(`(${sig}${body})`, ctx) as (...a: unknown[]) => boolean;
}

const isCacheableDoc = extract('isCacheableDoc');
const isImmutableAsset = extract('isImmutableAsset');

const u = (path: string) => new URL(`https://weektoregatta.com${path}`);

describe('the service worker never caches what it must not', () => {
  it('caches course documents', () => {
    for (const p of ['/radio', '/radio/teoria', '/radio/pozycja', '/radio/symulator', '/sternik', '/sternik/ustny', '/offline']) {
      expect(`${p}: ${isCacheableDoc(u(p))}`).toBe(`${p}: true`);
    }
  });

  it('NEVER caches the admin dashboard', () => {
    // The whole reason the allowlist exists. If this ever goes true, an admin's
    // authenticated /stats page can be served to the next person on the device.
    expect(isCacheableDoc(u('/stats'))).toBe(false);
  });

  it('does not cache other non-course routes', () => {
    for (const p of ['/', '/game', '/leaderboard', '/multiplayer', '/simulator', '/privacy']) {
      expect(`${p}: ${isCacheableDoc(u(p))}`).toBe(`${p}: false`);
    }
  });

  it('treats only fingerprinted paths as immutable', () => {
    expect(isImmutableAsset(u('/_next/static/chunks/abc123.js'))).toBe(true);
    expect(isImmutableAsset(u('/fonts/geist.woff2'))).toBe(true);
    // a corrected exam diagram in /public is NOT immutable - it must be re-fetchable
    expect(isImmutableAsset(u('/sternik/diagram.png'))).toBe(false);
  });

  it('the precache list holds no authenticated or dynamic route', () => {
    const m = src.match(/const PRECACHE = \[([\s\S]*?)\]/);
    expect(m).toBeTruthy();
    const list = m![1];
    expect(list).not.toMatch(/stats|api|multiplayer|leaderboard/);
    expect(list).toContain("'/radio/teoria'");
  });

  it('bails out of /api before any cache logic', () => {
    // structural: the fetch handler returns early for /api/ so a POST-less GET to
    // an endpoint is never served from cache
    expect(src).toMatch(/pathname\.startsWith\('\/api\/'\)\)\s*return/);
  });
});

// ============================================================================
// A cached document is not a working page: offline, /sternik/test rendered and
// its buttons did nothing, because the precache stored HTML and no scripts. The
// precache now follows the references in each file; the extractor is pure, so
// it runs here against the shapes Next/Turbopack actually emits.
// ============================================================================

const assetRefs = extract('assetRefs') as unknown as (text: string, base: string, kind: 'html' | 'js' | 'css') => string[];
const refs = (text: string, base: string, kind: 'html' | 'js' | 'css') => [...assetRefs(text, base, kind)].sort();
const O = 'https://weektoregatta.com';

describe('the offline precache finds what a page needs to run', () => {
  it('a document: script and style tags, font preloads, and the escaped RSC payload', () => {
    const html = [
      '<link rel="preload" href="/_next/static/media/797e433ab948586e-s.p.woff2" as="font" crossorigin="">',
      '<link rel="stylesheet" href="/_next/static/chunks/0d2b8f1c9a.css" data-precedence="next">',
      '<script src="/_next/static/chunks/turbopack-1a2b3c.js" async=""></script>',
      '<script>self.__next_f.push([1,"2:I[12345,[\\"/_next/static/chunks/5e6f7a.js\\",\\"/_next/static/chunks/8b9c0d.js\\"],\\"default\\"]"])</script>',
      // never: another origin, a non-asset path, an API route
      '<script src="https://www.googletagmanager.com/_next/static/chunks/x.js"></script>',
      '<a href="/radio/teoria">x</a><img src="/sternik/clouds/cumulus.webp">',
    ].join('\n');
    expect(refs(html, `${O}/sternik/test`, 'html')).toEqual([
      `${O}/_next/static/chunks/0d2b8f1c9a.css`,
      `${O}/_next/static/chunks/5e6f7a.js`,
      `${O}/_next/static/chunks/8b9c0d.js`,
      `${O}/_next/static/chunks/turbopack-1a2b3c.js`,
      `${O}/_next/static/media/797e433ab948586e-s.p.woff2`,
    ]);
  });

  it('a script: the chunks it import()s, written relative to /_next/', () => {
    // The theory chapter check is loaded on demand; its chunk appears in no
    // document, only inside the page's own chunk.
    const js = 'e.v(t=>Promise.all(["static/chunks/c0ffee12.js","static/chunks/beef34.css"].map(t=>e.l(t))).then(()=>t(98765)));'
      + 'var a="/_next/static/chunks/abs5678.js";';
    expect(refs(js, `${O}/_next/static/chunks/page-1.js`, 'js')).toEqual([
      `${O}/_next/static/chunks/abs5678.js`,
      `${O}/_next/static/chunks/beef34.css`,
      `${O}/_next/static/chunks/c0ffee12.js`,
    ]);
  });

  it('a stylesheet: its fonts, resolved against the stylesheet, data: URIs skipped', () => {
    const css = '@font-face{font-family:Geist;src:url(../media/geist.p.woff2) format("woff2")}'
      + '.x{background:url("data:image/svg+xml,%3Csvg%3E")}'
      + '.y{background:url(https://example.com/a.woff2)}';
    expect(refs(css, `${O}/_next/static/chunks/0d2b8f1c9a.css`, 'css')).toEqual([
      `${O}/_next/static/media/geist.p.woff2`,
    ]);
  });

  it('only course pages ask for the precache; the language message alone does not download it', () => {
    // A visit to /game used to trigger 14 background SSR renders.
    expect(src).toMatch(/data\.type === 'lang'\) event\.waitUntil\(persistLang\(l\)\)/);
    expect(src).toMatch(/data\.type === 'precache'\) event\.waitUntil\(precacheOnce\(l\)\)/);
  });
});
