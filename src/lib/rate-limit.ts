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
 *
 * Per-IP bucket (added 2026-10-18 security audit): `regatta_sid` is a cookie
 * the client chooses, so a fresh cookie per request used to reset every
 * per-user limit. `clientKeys()` returns the session key AND the IP key;
 * every per-user check now also counts the IP, and a request passes only if
 * both buckets have room. The IP bucket is looser (IP_BUCKET_FACTOR x the
 * per-user limit) because a club wifi or a school NAT puts several real users
 * behind one address.
 *
 * Where the IP comes from in production (verified on vps2 2026-10-18): the
 * nginx stream SNI router on :443 sends PROXY protocol to the :8443 vhost,
 * which restores the peer address with `real_ip_header proxy_protocol`
 * trusted only from loopback, and then appends `$remote_addr` to
 * X-Forwarded-For. The app ports are bound to the docker bridge only and
 * :8443 is firewalled, so the LAST X-Forwarded-For hop is the real client.
 *
 * Commit order: every layer is checked first and counted only if all of them
 * pass, so a rejection by one layer never burns the budget of another.
 */

interface Bucket {
  hits: number[];   // timestamps (ms)
  /** Longest window this bucket is checked with; pruning keeps that much. */
  windowMs: number;
}

const STORE = new Map<string, Bucket>();
const GLOBAL_STORE = new Map<string, Bucket>();
const USER_DAILY_STORE = new Map<string, Bucket>();

// Periodic prune to avoid unbounded growth. Each bucket keeps its own window:
// pruning with the caller's window used to let a 60 s limiter wipe the hits
// of every hourly bucket.
let lastPrune = 0;
function pruneIfStale(nowMs: number) {
  if (nowMs - lastPrune < 60_000) return;
  lastPrune = nowMs;
  for (const store of [STORE, GLOBAL_STORE, USER_DAILY_STORE]) {
    for (const [key, bucket] of store) {
      bucket.hits = bucket.hits.filter((t) => nowMs - t < bucket.windowMs);
      if (bucket.hits.length === 0) store.delete(key);
    }
  }
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
  /** Which layer caused the rejection, when ok === false. */
  rejectedBy?: 'per-key' | 'per-ip' | 'global';
}

/**
 * Anti-spoofing client key for rate limiting. The FIRST X-Forwarded-For
 * entry is client-controlled (nginx APPENDS to the incoming header rather
 * than replacing it), so limits keyed on it can be bypassed by rotating a
 * fake header value. The LAST entry is the peer address our own nginx saw -
 * not spoofable from outside. Use this for limiter keys; keep the first hop
 * only for analytics/geo where "claimed client" is the right semantic.
 */
export function clientIpKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return 'ip:unknown';
  const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : 'ip:unknown';
}

/** Multiplier for the per-IP bucket over the per-user limit (shared NATs). */
export const IP_BUCKET_FACTOR = 3;
const MAX_SID_KEY_LEN = 64;

export interface ClientKeys {
  /** Session key when the request has a `regatta_sid`, else the IP key. */
  user: string;
  /**
   * The last-hop IP, so cookie rotation cannot reset it. Equal to `user` (so
   * no separate IP bucket) when the IP is unknown, see clientKeys().
   */
  ip: string;
}

/**
 * Both limiter keys for a request. The sid is clipped so an oversized cookie
 * cannot grow the in-memory map without bound.
 *
 * No X-Forwarded-For means the request did not come through nginx (which
 * always sets it): an internal caller such as ws-server, a health check or
 * local dev. Those must not share one `ip:unknown` bucket, or every
 * multiplayer result would compete for a single IP budget, so the IP layer is
 * skipped and only the session limit applies.
 */
export function clientKeys(req: Request, sid: string | null | undefined): ClientKeys {
  const raw = clientIpKey(req);
  const ip = raw.startsWith('ip:') ? raw : 'ip:' + raw;
  const user = sid ? 'sid:' + sid.slice(0, MAX_SID_KEY_LEN) : ip;
  return { user, ip: raw === 'ip:unknown' ? user : ip };
}

interface Check {
  store: Map<string, Bucket>;
  key: string;
  limit: number;
  windowMs: number;
  layer: NonNullable<RateResult['rejectedBy']>;
}

/** State of a bucket without counting this request. */
function peekBucket(c: Check, now: number): RateResult {
  let bucket = c.store.get(c.key);
  if (!bucket) { bucket = { hits: [], windowMs: c.windowMs }; c.store.set(c.key, bucket); }
  bucket.windowMs = Math.max(bucket.windowMs, c.windowMs);
  bucket.hits = bucket.hits.filter((t) => now - t < c.windowMs);
  if (bucket.hits.length >= c.limit) {
    return { ok: false, remaining: 0, resetMs: c.windowMs - (now - bucket.hits[0]), rejectedBy: c.layer };
  }
  return { ok: true, remaining: c.limit - bucket.hits.length - 1, resetMs: 0 };
}

/**
 * Checks every layer in order and counts the request in all of them only
 * when all pass. The first failing layer is returned (with `rejectedBy`);
 * on success `remaining` is the smallest across layers.
 */
function checkAll(checks: Check[]): RateResult {
  const now = Date.now();
  pruneIfStale(now);
  let remaining = Infinity;
  for (const c of checks) {
    const r = peekBucket(c, now);
    if (!r.ok) return r;
    remaining = Math.min(remaining, r.remaining);
  }
  for (const c of checks) c.store.get(c.key)!.hits.push(now);
  return { ok: true, remaining, resetMs: 0 };
}

/** Per-IP companion of a per-user check, or nothing when they are the same key. */
function ipCheck(keys: ClientKeys | undefined, scope: string, limit: number, windowMs: number, ipLimit?: number): Check[] {
  if (!keys || keys.ip === keys.user) return [];
  return [{
    store: STORE,
    key: scope + ':' + keys.ip,
    limit: ipLimit ?? limit * IP_BUCKET_FACTOR,
    windowMs,
    layer: 'per-ip',
  }];
}

/**
 * Returns whether this key is allowed to make a request right now.
 * If ok === false, wait `resetMs` milliseconds before retrying.
 * Prefer `rateLimitClient()` for anything keyed on a client.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  return checkAll([{ store: STORE, key, limit, windowMs, layer: 'per-key' }]);
}

/**
 * Per-user + per-IP limit for one endpoint `scope` (e.g. `'feedback'`).
 * Both buckets must have room; the IP bucket allows `ipLimit` (default
 * IP_BUCKET_FACTOR x `limit`) so a fresh `regatta_sid` per request no longer
 * resets the limit.
 */
export function rateLimitClient(keys: ClientKeys, scope: string, limit: number, windowMs: number, ipLimit?: number): RateResult {
  return checkAll([
    { store: STORE, key: scope + ':' + keys.user, limit, windowMs, layer: 'per-key' },
    ...ipCheck(keys, scope, limit, windowMs, ipLimit),
  ]);
}

/**
 * Combined per-key + per-IP + global rate-limit.
 *
 * Use this for endpoints that burn real money per request (AI calls).
 * `globalKey` groups all users for the same endpoint - pass e.g. `'coach'`.
 * Pass `client` (from `clientKeys()`) to key the per-user bucket on it and add
 * the per-IP bucket; `key` stays for callers that key on something else.
 * If any limit is hit, the request is rejected. The returned RateResult
 * describes which layer rejected.
 *
 * Example:
 *   const rl = rateLimitWithGlobal({
 *     client: clientKeys(req, sid),
 *     key: 'coach',
 *     perKeyLimit: 30, perKeyWindowMs: HOUR,
 *     globalKey: 'coach',
 *     globalLimit: 200, globalWindowMs: HOUR,
 *   });
 *
 * Ordering: per-key, then per-IP, then global. A rejected request is counted
 * nowhere, so a single misbehaving user doesn't burn the global budget for
 * everyone else.
 */
export function rateLimitWithGlobal(args: {
  /** With `client`: the endpoint scope. Without: the full per-key bucket key. */
  key: string;
  client?: ClientKeys;
  perKeyLimit: number;
  perKeyWindowMs: number;
  ipLimit?: number;
  globalKey: string;
  globalLimit: number;
  globalWindowMs: number;
}): RateResult {
  const userKey = args.client ? args.key + ':' + args.client.user : args.key;
  return checkAll([
    { store: STORE, key: userKey, limit: args.perKeyLimit, windowMs: args.perKeyWindowMs, layer: 'per-key' },
    ...ipCheck(args.client, args.key, args.perKeyLimit, args.perKeyWindowMs, args.ipLimit),
    { store: GLOBAL_STORE, key: args.globalKey, limit: args.globalLimit, windowMs: args.globalWindowMs, layer: 'global' },
  ]);
}

export function rateLimitHeaders(res: RateResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, res.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(res.resetMs / 1000)),
  };
}

// ---------------------------------------------------------------------------
// Site-wide per-user daily safety cap across ALL AI endpoints combined.
// A single user (session, or IP fallback) may make at most this many AI-backed
// requests per rolling 24h, no matter which endpoint, and a single IP at most
// USER_DAILY_AI_IP_LIMIT. Blunt wallet backstop.
// ---------------------------------------------------------------------------
export const USER_DAILY_AI_LIMIT = 100;
export const USER_DAILY_AI_IP_LIMIT = USER_DAILY_AI_LIMIT * IP_BUCKET_FACTOR;
const USER_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function checkUserDailyBudget(keys: ClientKeys): RateResult {
  const checks: Check[] = [
    { store: USER_DAILY_STORE, key: 'ai:' + keys.user, limit: USER_DAILY_AI_LIMIT, windowMs: USER_DAILY_WINDOW_MS, layer: 'per-key' },
  ];
  if (keys.ip !== keys.user) {
    checks.push({ store: USER_DAILY_STORE, key: 'ai:' + keys.ip, limit: USER_DAILY_AI_IP_LIMIT, windowMs: USER_DAILY_WINDOW_MS, layer: 'per-ip' });
  }
  return checkAll(checks);
}

/** Test hook: forget every bucket. */
export function __resetRateLimitsForTests(): void {
  STORE.clear();
  GLOBAL_STORE.clear();
  USER_DAILY_STORE.clear();
  lastPrune = 0;
}
