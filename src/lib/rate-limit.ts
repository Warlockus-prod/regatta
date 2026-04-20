/**
 * In-memory sliding-window rate limiter keyed by string (sid or IP).
 *
 * For a multi-replica deploy this would need Redis/Upstash; Regatta runs a
 * single container so in-memory is fine.
 *
 * Atomicity note: JavaScript is single-threaded per Node event loop, and the
 * read-filter-check-push sequence inside `rateLimit()` happens synchronously
 * with no await between, so two concurrent request handlers cannot both see
 * `hits.length < limit` and both push. In-process limits are atomic.
 *
 * Defense in depth (added 2026-04-20 Tech Risk #7 closure):
 * 1. Per-sid / per-IP limit (existing).
 * 2. Global cap `rateLimitGlobal()` - caps total requests per endpoint across
 *    ALL users. Protects the ANTHROPIC_API_KEY wallet from denial-of-wallet
 *    even if per-user limits are defeated.
 * 3. Combined `rateLimitWithGlobal()` applies both checks and returns the
 *    stricter failure.
 */

interface Bucket {
  hits: number[];   // timestamps (ms)
}

const STORE = new Map<string, Bucket>();
const GLOBAL_STORE = new Map<string, Bucket>();

// Periodic prune to avoid unbounded growth
let lastPrune = 0;
function pruneIfStale(nowMs: number, windowMs: number) {
  if (nowMs - lastPrune < 60_000) return;
  lastPrune = nowMs;
  for (const [key, bucket] of STORE) {
    bucket.hits = bucket.hits.filter((t) => nowMs - t < windowMs * 2);
    if (bucket.hits.length === 0) STORE.delete(key);
  }
  for (const [key, bucket] of GLOBAL_STORE) {
    bucket.hits = bucket.hits.filter((t) => nowMs - t < windowMs * 2);
    if (bucket.hits.length === 0) GLOBAL_STORE.delete(key);
  }
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
  /** Which layer caused the rejection, when ok === false. */
  rejectedBy?: 'per-key' | 'global';
}

function checkBucket(store: Map<string, Bucket>, key: string, limit: number, now: number, windowMs: number): RateResult {
  let bucket = store.get(key);
  if (!bucket) { bucket = { hits: [] }; store.set(key, bucket); }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    return { ok: false, remaining: 0, resetMs: windowMs - (now - bucket.hits[0]) };
  }
  bucket.hits.push(now);
  return { ok: true, remaining: limit - bucket.hits.length, resetMs: 0 };
}

/**
 * Returns whether this key is allowed to make a request right now.
 * If ok === false, wait `resetMs` milliseconds before retrying.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  pruneIfStale(now, windowMs);
  return checkBucket(STORE, key, limit, now, windowMs);
}

/**
 * Combined per-key + global rate-limit.
 *
 * Use this for endpoints that burn real money per request (AI calls).
 * `globalKey` groups all users for the same endpoint - pass e.g. `'coach'`.
 * If either limit is hit, the request is rejected. The returned RateResult
 * describes which layer rejected.
 *
 * Example:
 *   const rl = rateLimitWithGlobal({
 *     key: 'coach:' + sid,
 *     perKeyLimit: 30, perKeyWindowMs: HOUR,
 *     globalKey: 'coach',
 *     globalLimit: 200, globalWindowMs: HOUR,
 *   });
 *
 * Ordering: per-key checked FIRST. If it fails, we return WITHOUT incrementing
 * the global counter - so a single misbehaving user doesn't burn the global
 * budget for everyone else.
 */
export function rateLimitWithGlobal(args: {
  key: string;
  perKeyLimit: number;
  perKeyWindowMs: number;
  globalKey: string;
  globalLimit: number;
  globalWindowMs: number;
}): RateResult {
  const now = Date.now();
  pruneIfStale(now, Math.max(args.perKeyWindowMs, args.globalWindowMs));

  const perKey = checkBucket(STORE, args.key, args.perKeyLimit, now, args.perKeyWindowMs);
  if (!perKey.ok) {
    return { ...perKey, rejectedBy: 'per-key' };
  }

  // Per-key passed - now check global. If global fails, we've already
  // incremented per-key, which is mildly annoying but harmless (this one
  // user will still be within their quota).
  const global = checkBucket(GLOBAL_STORE, args.globalKey, args.globalLimit, now, args.globalWindowMs);
  if (!global.ok) {
    return { ...global, rejectedBy: 'global' };
  }

  // Return the stricter remaining (usually per-key, but surface whichever is lower)
  return {
    ok: true,
    remaining: Math.min(perKey.remaining, global.remaining),
    resetMs: 0,
  };
}

export function rateLimitHeaders(res: RateResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, res.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(res.resetMs / 1000)),
  };
}
