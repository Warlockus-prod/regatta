import { NextResponse, type NextRequest } from 'next/server';

/**
 * HTTP Basic Auth for /stats admin.
 * User: admin, password: from env ADMIN_PASSWORD or fallback "regattA".
 * Runs on Edge runtime — must not use Node APIs.
 */
const BASIC_USER = 'admin';
const BASIC_PASS = process.env.ADMIN_PASSWORD || 'regattA';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/stats') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
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
  matcher: ['/stats/:path*', '/api/admin/:path*'],
};
