import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Language detection at the edge.
// Writes a `regatta_lang` cookie on the first visit so SSR can render in the
// user's preferred language (RU / EN / PL). Without this, every SSR pass
// defaults to RU and the client then flashes the real language ~80ms later.
//
// The cookie is a tiny hint, not an auth token - we still respect client-side
// localStorage override when the user explicitly picks a language.
// ============================================================================

const COOKIE_NAME = 'regatta_lang';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

function pickLangFromAccept(accept: string | null): 'ru' | 'en' | 'pl' {
  if (!accept) return 'ru';
  // Parse the highest-preference tag naively (accept-language values are
  // ordered by q-factor by the browser, so the first token is good enough).
  const first = accept.split(',')[0]?.trim().toLowerCase() ?? '';
  if (first.startsWith('ru')) return 'ru';
  if (first.startsWith('pl')) return 'pl';
  if (first.startsWith('en')) return 'en';
  // Fallback: scan the whole header for any known prefix
  const lower = accept.toLowerCase();
  if (lower.includes('pl')) return 'pl';
  if (lower.includes('ru')) return 'ru';
  return 'en';
}

function isValidLang(v: string | undefined): v is 'ru' | 'en' | 'pl' {
  return v === 'ru' || v === 'en' || v === 'pl';
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const existing = req.cookies.get(COOKIE_NAME)?.value;
  if (!isValidLang(existing)) {
    const picked = pickLangFromAccept(req.headers.get('accept-language'));
    res.cookies.set(COOKIE_NAME, picked, {
      maxAge: MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
    });
  }
  return res;
}

// Run on every page request but skip Next internals / static assets / API.
export const config = {
  matcher: '/((?!_next/|api/|.*\\..*).*)',
};
