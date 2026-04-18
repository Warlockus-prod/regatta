/**
 * Simple in-memory sliding-window rate limiter keyed by string (sid or IP).
 *
 * For multi-replica deploy this would need Redis; Regatta runs a single container
 * so in-memory is fine for now.
 */

interface Bucket {
  hits: number[];   // timestamps (ms)
}

const STORE = new Map<string, Bucket>();

// Periodic prune to avoid unbounded growth
let lastPrune = 0;
function pruneIfStale(nowMs: number, windowMs: number) {
  if (nowMs - lastPrune < 60_000) return;
  lastPrune = nowMs;
  for (const [key, bucket] of STORE) {
    bucket.hits = bucket.hits.filter((t) => nowMs - t < windowMs * 2);
    if (bucket.hits.length === 0) STORE.delete(key);
  }
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Returns whether this key is allowed to make a request right now.
 * If ok === false, wait `resetMs` milliseconds before retrying.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  pruneIfStale(now, windowMs);

  let bucket = STORE.get(key);
  if (!bucket) { bucket = { hits: [] }; STORE.set(key, bucket); }
  // Drop old hits
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    return {
      ok: false,
      remaining: 0,
      resetMs: windowMs - (now - oldest),
    };
  }

  bucket.hits.push(now);
  return {
    ok: true,
    remaining: limit - bucket.hits.length,
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
