import { NextResponse, type NextRequest } from 'next/server';

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

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Issue session cookie for regular navigations (skip static assets & api)
  if (
    !pathname.startsWith('/stats') &&
    !pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api/')
  ) {
    const res = NextResponse.next();
    ensureSessionCookie(res, req);
    return res;
  }

  if (!pathname.startsWith('/stats') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
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
  const [user, pass] = decoded.split(':');
  if (user !== BASIC_USER || pass !== BASIC_PASS) {
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
