import { NextResponse, type NextRequest } from 'next/server';
import {
  LANG_SHORTCUT_PATHS,
  isLang,
  pickLangFromAccept,
  type Lang,
} from './lib/languages';

/**
 * HTTP Basic Auth for /stats admin.
 * Plus: anonymous session cookie issued on any page visit (so we can
 * correlate progress across reloads without any login / personal data).
 * Runs on Edge runtime - must not use Node APIs.
 *
 * File was src/middleware.ts before Next 16 renamed the convention to
 * "proxy". Behaviour and config shape are unchanged; only the file
 * name and the exported function name (middleware -> proxy) differ.
 * See https://nextjs.org/docs/messages/middleware-to-proxy
 */
const BASIC_USER = 'admin';
// No fallback. In production `/stats` is locked out entirely if
// ADMIN_PASSWORD is not set. Local dev can use ADMIN_PASSWORD=dev in .env.local.
// Previously had an insecure `|| 'regattA'` fallback that leaked into
// production runtime if the .env file was dropped.
const BASIC_PASS = process.env.ADMIN_PASSWORD ?? '';

const SESSION_COOKIE = 'regatta_sid';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const LANG_COOKIE = 'regatta_lang';
const LANG_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Constant-time string compare. The Edge runtime has no
 * `crypto.timingSafeEqual`, so we roll a manual length-padded XOR: walk a
 * fixed number of iterations regardless of where the first mismatch is, and
 * fold the length difference into the accumulator. This avoids leaking the
 * admin password length or a matching prefix via response-time differences.
 *
 * Note: JS short-circuits nothing here - every iteration runs - and we never
 * return early, so timing depends only on `max(a.length, b.length)`, not on
 * the contents.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
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

function ensureSessionCookie(res: NextResponse, req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)) return;
  // crypto.randomUUID is available on Edge runtime
  const sid = crypto.randomUUID();
  res.cookies.set({
    name: SESSION_COOKIE,
    value: sid,
    maxAge: SESSION_MAX_AGE,
    path: '/',
    httpOnly: false, // client can read to send with custom events
    sameSite: 'lax',
  });
}

// Writes a `regatta_lang` cookie on the first visit so SSR can render in the
// user's preferred language (RU / EN / PL). Without it, every SSR pass
// defaults to RU and the client flashes the real language ~80ms later.
function ensureLangCookie(res: NextResponse, req: NextRequest) {
  const existing = req.cookies.get(LANG_COOKIE)?.value;
  if (isLang(existing)) return;
  const picked = pickLangFromAccept(req.headers.get('accept-language'));
  res.cookies.set({
    name: LANG_COOKIE,
    value: picked,
    maxAge: LANG_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });
}

// Short lang shortcuts for shareable links. `/pl` / `/en` / `/ru` all
// redirect to `/` but set the lang cookie first, so the recipient's browser
// settings no longer matter - the home page renders in the chosen language
// for ANY visitor. Useful for share links ("here's the sailing trainer -
// https://regatta.icoffio.com/pl"). The recipient's URL bar ends up clean (`/`)
// after the redirect; the cookie carries the language forward.
function setLangCookie(res: NextResponse, value: Lang) {
  res.cookies.set({
    name: LANG_COOKIE,
    value,
    maxAge: LANG_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });
}

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Short lang shortcuts: /pl /en /ru - redirect to / with cookie pinned.
  const shortcutLang = LANG_SHORTCUT_PATHS[pathname];
  if (shortcutLang) {
    const redirect = NextResponse.redirect(new URL('/', req.url));
    setLangCookie(redirect, shortcutLang);
    return redirect;
  }

  // Explicit ?lang=xx override on any page - overwrites cookie so the
  // recipient's SSR render uses the forced lang even if they had a different
  // cookie from a previous visit. Client also strips ?lang= after consuming.
  const urlLang = searchParams.get('lang');
  const explicitLang: Lang | null = isLang(urlLang) ? urlLang : null;

  // Issue session + lang cookies for regular navigations (skip static assets & api)
  if (
    !pathname.startsWith('/stats') &&
    !pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api/')
  ) {
    const res = NextResponse.next();
    ensureSessionCookie(res, req);
    if (explicitLang) {
      // ?lang= always wins over existing cookie
      setLangCookie(res, explicitLang);
    } else {
      ensureLangCookie(res, req);
    }
    return res;
  }

  if (!pathname.startsWith('/stats') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // CSRF guard: admin mutations must be same-origin. A browser auto-attaches
  // the Basic-Auth credentials to cross-site requests once an admin has authed
  // in that browser, so without this a malicious page could silently drive
  // admin POSTs. Reads (GET/HEAD) are not state-changing and are exempt. A real
  // cross-site browser request always carries Origin or Sec-Fetch-Site, so we
  // block when either marks it cross-origin and otherwise allow.
  const method = req.method.toUpperCase();
  const isMutation = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  if (pathname.startsWith('/api/admin') && isMutation) {
    const secFetchSite = req.headers.get('sec-fetch-site');
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    let crossOrigin = false;
    if (secFetchSite && secFetchSite !== 'same-origin') crossOrigin = true;
    if (origin) {
      try {
        if (new URL(origin).host !== host) crossOrigin = true;
      } catch {
        crossOrigin = true;
      }
    }
    if (crossOrigin) {
      return new NextResponse('Cross-origin admin request blocked', { status: 403 });
    }
  }

  // Hard block: without ADMIN_PASSWORD set, admin is unreachable (503).
  // No silent fallback to a weak default.
  if (!BASIC_PASS) {
    return new NextResponse('Admin auth not configured', { status: 503 });
  }

  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Regatta admin"' },
    });
  }
  let decoded: string;
  try {
    decoded = atob(auth.slice(6));
  } catch {
    return new NextResponse('Bad auth', { status: 401 });
  }
  // basic-auth value is `user:pass`; the password itself may contain ':',
  // so split only on the first colon.
  const sep = decoded.indexOf(':');
  const user = sep === -1 ? decoded : decoded.slice(0, sep);
  const pass = sep === -1 ? '' : decoded.slice(sep + 1);
  // Evaluate BOTH comparisons (no short-circuit on the per-field check) before
  // combining, so the response time does not reveal which field was wrong.
  const okUser = timingSafeEqualStr(user, BASIC_USER);
  const okPass = timingSafeEqualStr(pass, BASIC_PASS);
  if (!(okUser && okPass)) {
    return new NextResponse('Wrong credentials', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Regatta admin"' },
    });
  }
  return NextResponse.next();
}

export const config = {
  // Match all paths except _next/static files and common public assets,
  // so session cookies are issued site-wide, and admin basic-auth still fires
  // on its own prefixes.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-.*|manifest\\.json).*)',
  ],
};
