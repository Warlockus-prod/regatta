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
