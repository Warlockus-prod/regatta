// Admin Basic-Auth, shared by src/proxy.ts and every admin handler.
//
// The proxy gates /stats and /api/admin/*, but a proxy can be bypassed or
// misconfigured (matcher change, a new route outside the prefix, a framework
// bug), so each admin handler and the /stats page call `requireAdmin()` as
// well: default-deny inside the handler. Edge-safe: no Node APIs, the proxy
// runs on the Edge runtime.

export const ADMIN_USER = 'admin';

export type AdminAuthResult = 'ok' | 'unconfigured' | 'missing' | 'wrong' | 'cross-origin';

/**
 * Constant-time string compare. The Edge runtime has no
 * `crypto.timingSafeEqual`, so we roll a manual length-padded XOR: walk a
 * fixed number of iterations regardless of where the first mismatch is, and
 * fold the length difference into the accumulator. This avoids leaking the
 * admin password length or a matching prefix via response-time differences.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  // Seed with the length delta so unequal-length inputs can never compare equal.
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    // charCodeAt past the end returns NaN; (NaN | 0) === 0, giving a stable
    // padded value so the loop count never depends on input length.
    const ca = a.charCodeAt(i) | 0;
    const cb = b.charCodeAt(i) | 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

/**
 * CSRF guard: admin mutations must be same-origin. A browser auto-attaches
 * the Basic-Auth credentials to cross-site requests once an admin has authed
 * in that browser, so without this a malicious page could silently drive
 * admin POSTs. Reads (GET/HEAD/OPTIONS) are exempt. A real cross-site browser
 * request always carries Origin or Sec-Fetch-Site, so we block when either
 * marks it cross-origin and otherwise allow.
 */
export function isCrossOriginMutation(method: string, headers: Headers): boolean {
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return false;
  const secFetchSite = headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite !== 'same-origin') return true;
  const origin = headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== headers.get('host')) return true;
    } catch {
      return true;
    }
  }
  return false;
}

/** Checks the Basic-Auth header against ADMIN_PASSWORD (read per call). */
export function checkAdminAuth(authorization: string | null): AdminAuthResult {
  // No fallback: without ADMIN_PASSWORD admin is unreachable.
  const pass = process.env.ADMIN_PASSWORD ?? '';
  if (!pass) return 'unconfigured';
  if (!authorization || !authorization.startsWith('Basic ')) return 'missing';
  let decoded: string;
  try {
    decoded = atob(authorization.slice(6));
  } catch {
    return 'wrong';
  }
  // basic-auth value is `user:pass`; the password itself may contain ':',
  // so split only on the first colon.
  const sep = decoded.indexOf(':');
  const user = sep === -1 ? decoded : decoded.slice(0, sep);
  const given = sep === -1 ? '' : decoded.slice(sep + 1);
  // Evaluate BOTH comparisons before combining, so the response time does not
  // reveal which field was wrong.
  const okUser = timingSafeEqualStr(user, ADMIN_USER);
  const okPass = timingSafeEqualStr(given, pass);
  return okUser && okPass ? 'ok' : 'wrong';
}

/** Full admin check for a request: CSRF guard, then credentials. */
export function adminAuthForRequest(method: string, headers: Headers): AdminAuthResult {
  if (isCrossOriginMutation(method, headers)) return 'cross-origin';
  return checkAdminAuth(headers.get('authorization'));
}

/** The HTTP response for a failed check (plain text, same as the proxy). */
export function adminDeniedResponse(result: Exclude<AdminAuthResult, 'ok'>): Response {
  switch (result) {
    case 'cross-origin':
      return new Response('Cross-origin admin request blocked', { status: 403 });
    case 'unconfigured':
      return new Response('Admin auth not configured', { status: 503 });
    case 'missing':
      return new Response('Auth required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Regatta admin"' },
      });
    case 'wrong':
      return new Response('Wrong credentials', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Regatta admin"' },
      });
  }
}

/**
 * Call first in every admin route handler:
 *   const denied = requireAdmin(req); if (denied) return denied;
 * Returns null when the request is authorized.
 */
export function requireAdmin(req: Request): Response | null {
  const result = adminAuthForRequest(req.method, req.headers);
  return result === 'ok' ? null : adminDeniedResponse(result);
}
