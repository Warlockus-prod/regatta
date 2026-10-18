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
