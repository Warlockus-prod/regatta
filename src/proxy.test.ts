// Contract for src/proxy.ts: in production the session and language cookies
// carry Secure; in dev they do not (plain http). The admin gate still answers
// 401/403 through the shared src/lib/admin-auth.ts check.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

type ProxyFn = (req: NextRequest) => Response;

async function loadProxy(nodeEnv: string): Promise<ProxyFn> {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', nodeEnv);
  return (await import('./proxy')).proxy as unknown as ProxyFn;
}

function setCookies(res: Response): string[] {
  return res.headers.getSetCookie();
}

afterEach(() => vi.unstubAllEnvs());

describe('proxy cookies', () => {
  it('sets Secure on regatta_sid and regatta_lang in production', async () => {
    const proxy = await loadProxy('production');
    const res = proxy(new NextRequest('https://weektoregatta.com/rules'));
    const cookies = setCookies(res);
    const sid = cookies.find((c) => c.startsWith('regatta_sid='));
    const lang = cookies.find((c) => c.startsWith('regatta_lang='));
    expect(sid).toMatch(/;\s*Secure/i);
    expect(lang).toMatch(/;\s*Secure/i);
  });

  it('sets Secure on the /pl shortcut redirect cookie in production', async () => {
    const proxy = await loadProxy('production');
    const res = proxy(new NextRequest('https://weektoregatta.com/pl'));
    expect(setCookies(res).find((c) => c.startsWith('regatta_lang='))).toMatch(/;\s*Secure/i);
  });

  it('omits Secure in development', async () => {
    const proxy = await loadProxy('development');
    const res = proxy(new NextRequest('http://localhost:3000/rules'));
    const sid = setCookies(res).find((c) => c.startsWith('regatta_sid='));
    expect(sid).toBeDefined();
    expect(sid).not.toMatch(/Secure/i);
  });
});

describe('proxy admin gate', () => {
  it('401 without credentials, 403 for a cross-origin admin POST', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'pw-for-test');
    const proxy = await loadProxy('production');
    expect(proxy(new NextRequest('https://weektoregatta.com/stats')).status).toBe(401);
    const post = new NextRequest('https://weektoregatta.com/api/admin/feedback', {
      method: 'POST',
      headers: { origin: 'https://evil.example', host: 'weektoregatta.com', authorization: 'Basic ' + btoa('admin:pw-for-test') },
    });
    expect(proxy(post).status).toBe(403);
    const ok = new NextRequest('https://weektoregatta.com/stats', {
      headers: { authorization: 'Basic ' + btoa('admin:pw-for-test') },
    });
    expect(proxy(ok).status).toBe(200);
  });
});

// The language chain: /xx shortcut, then ?lang= > regatta_lang cookie >
// Accept-Language > RU. The proxy forwards the resolved language to the
// server render as the x-regatta-lang request header; Next exposes a
// forwarded request header on the proxy response as
// x-middleware-request-<name>. This chain broke twice before (943ac9e,
// 7ca1abf), so each link is pinned here.
describe('proxy language chain', () => {
  const forwardedLang = (res: Response) => res.headers.get('x-middleware-request-x-regatta-lang');
  const langCookie = (res: Response) => setCookies(res).find((c) => c.startsWith('regatta_lang='));

  it('/pl redirects (307) to /?lang=pl and pins the cookie', async () => {
    const proxy = await loadProxy('production');
    const res = proxy(new NextRequest('https://weektoregatta.com/pl'));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location') ?? '');
    expect(location.pathname).toBe('/');
    expect(location.searchParams.get('lang')).toBe('pl');
    expect(langCookie(res)).toMatch(/^regatta_lang=pl;/);
  });

  it('?lang=de beats a ru cookie, is forwarded and overwrites the cookie', async () => {
    const proxy = await loadProxy('production');
    const res = proxy(new NextRequest('https://weektoregatta.com/rules?lang=de', {
      headers: { cookie: 'regatta_lang=ru', 'accept-language': 'pl-PL' },
    }));
    expect(forwardedLang(res)).toBe('de');
    expect(langCookie(res)).toMatch(/^regatta_lang=de;/);
  });

  it('ignores an unknown ?lang= value', async () => {
    const proxy = await loadProxy('production');
    const withCookie = proxy(new NextRequest('https://weektoregatta.com/rules?lang=xx', {
      headers: { cookie: 'regatta_lang=pl' },
    }));
    expect(forwardedLang(withCookie)).toBe('pl');
    expect(langCookie(withCookie)).toBeUndefined();
    const noCookie = proxy(new NextRequest('https://weektoregatta.com/rules?lang=xx', {
      headers: { 'accept-language': 'it-IT,it;q=0.9' },
    }));
    expect(forwardedLang(noCookie)).toBe('it');
    expect(langCookie(noCookie)).toMatch(/^regatta_lang=it;/);
  });

  it('overwrites a spoofed inbound x-regatta-lang with exactly the cookie language', async () => {
    const proxy = await loadProxy('production');
    const res = proxy(new NextRequest('https://weektoregatta.com/rules', {
      headers: { cookie: 'regatta_lang=pl', 'x-regatta-lang': 'en' },
    }));
    expect(forwardedLang(res)).toBe('pl');
  });

  it('uses Accept-Language when there is no cookie, and RU when there is no header', async () => {
    const proxy = await loadProxy('production');
    const fromHeader = proxy(new NextRequest('https://weektoregatta.com/rules', {
      headers: { 'accept-language': 'fr-FR,fr;q=0.9' },
    }));
    expect(forwardedLang(fromHeader)).toBe('fr');
    expect(langCookie(fromHeader)).toMatch(/^regatta_lang=fr;/);
    const bare = proxy(new NextRequest('https://weektoregatta.com/rules'));
    expect(forwardedLang(bare)).toBe('ru');
    expect(langCookie(bare)).toMatch(/^regatta_lang=ru;/);
  });

  it('sets no cookies and forwards no language on /api/*', async () => {
    const proxy = await loadProxy('production');
    for (const url of ['https://weektoregatta.com/api/log', 'https://weektoregatta.com/api/leaderboard?lang=pl']) {
      const res = proxy(new NextRequest(url, { headers: { 'accept-language': 'pl-PL' } }));
      expect(setCookies(res)).toEqual([]);
      expect(forwardedLang(res)).toBeNull();
    }
  });
});
