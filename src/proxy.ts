import { NextResponse, type NextRequest } from 'next/server';
import {
  LANG_SHORTCUT_PATHS,
  isLang,
  pickLangFromAccept,
  type Lang,
} from './lib/languages';
import { adminAuthForRequest, adminDeniedResponse } from './lib/admin-auth';

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
// Admin credentials are checked by src/lib/admin-auth.ts (no fallback: without
// ADMIN_PASSWORD admin answers 503). The same check runs again inside every
// admin handler and the /stats page, so this gate is not the only one.

const SESSION_COOKIE = 'regatta_sid';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const LANG_COOKIE = 'regatta_lang';
const LANG_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Secure in production so the cookies never travel over plain http (nginx
// redirects :80 to https anyway). `next dev` stays http-friendly. The CI
// pre-deploy E2E runs `next start` (production) on http://localhost, which
// still works: browsers treat localhost as a secure context and keep Secure
// cookies there.
const SECURE_COOKIES = process.env.NODE_ENV === 'production';

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
    secure: SECURE_COOKIES,
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
    secure: SECURE_COOKIES,
  });
}

// Short lang shortcuts for shareable links. `/pl` / `/en` / `/ru` all
// redirect to `/` but set the lang cookie first, so the recipient's browser
// settings no longer matter - the home page renders in the chosen language
// for ANY visitor. Useful for share links ("here's the sailing trainer -
// https://weektoregatta.com/pl"). The recipient's URL bar ends up clean (`/`)
// after the redirect; the cookie carries the language forward.
function setLangCookie(res: NextResponse, value: Lang) {
  res.cookies.set({
    name: LANG_COOKIE,
    value,
    maxAge: LANG_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: SECURE_COOKIES,
  });
}

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Short lang shortcuts: /pl /en /ru - redirect to /?lang=xx with cookie pinned.
  // The lang MUST stay in the redirect target URL (not a bare /): link-preview
  // crawlers (Telegram/WhatsApp/etc.) send no cookie and run no JS, so the only
  // way they land in the right language is if the URL carries it. On the
  // follow-up request the ?lang= branch below sets the SSR header and the client
  // strips ?lang= after consuming it, leaving a clean URL bar for humans.
  const shortcutLang = LANG_SHORTCUT_PATHS[pathname];
  if (shortcutLang) {
    const target = new URL('/', req.url);
    target.searchParams.set('lang', shortcutLang);
    const redirect = NextResponse.redirect(target);
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
    // Resolve the language for THIS request (URL ?lang= > existing cookie >
    // Accept-Language) and forward it to the server render via a request header.
    // Server components (layout generateMetadata + <html lang>) read this header,
    // so the SSR output - including the OpenGraph tags a link-preview crawler
    // scrapes - matches the URL on the very FIRST request, without depending on a
    // cookie the crawler never sends or JS it never runs. Set (not append) so any
    // inbound spoofed x-regatta-lang is overwritten.
    const existingCookie = req.cookies.get(LANG_COOKIE)?.value;
    const effectiveLang: Lang = explicitLang
      ?? (isLang(existingCookie) ? existingCookie : pickLangFromAccept(req.headers.get('accept-language')));
    const reqHeaders = new Headers(req.headers);
    reqHeaders.set('x-regatta-lang', effectiveLang);
    const res = NextResponse.next({ request: { headers: reqHeaders } });
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

  // CSRF guard for admin mutations, then Basic Auth (src/lib/admin-auth.ts).
  const auth = adminAuthForRequest(req.method, req.headers);
  if (auth !== 'ok') {
    const denied = adminDeniedResponse(auth);
    return new NextResponse(denied.body, { status: denied.status, headers: denied.headers });
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
