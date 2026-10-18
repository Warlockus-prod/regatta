// Contract: every admin handler refuses a request without valid Basic Auth
// on its own, even when src/proxy.ts is not in front of it (these tests call
// the handlers directly, which is exactly a proxy bypass).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const db = vi.hoisted(() => ({
  getMetricsRange: vi.fn(() => ({ ok: true })),
  updateFeedbackStatus: vi.fn(() => true),
}));
vi.mock('@/lib/db', () => db);
vi.mock('@/lib/log', () => ({ logError: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn() }));

import { GET as statsRange } from './stats-range/route';
import { POST as feedbackPost } from './feedback/route';
import { checkAdminAuth, isCrossOriginMutation, requireAdmin } from '@/lib/admin-auth';

const PASS = 'test-admin-pass:with-colon';
const good = 'Basic ' + btoa('admin:' + PASS);

function req(url: string, init: { method?: string; auth?: string; headers?: Record<string, string>; body?: unknown } = {}): Request {
  const headers: Record<string, string> = { host: 'localhost', ...(init.headers ?? {}) };
  if (init.auth) headers.authorization = init.auth;
  return new Request('http://localhost' + url, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = PASS;
  db.getMetricsRange.mockClear();
  db.updateFeedbackStatus.mockClear();
});
afterEach(() => {
  if (saved === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = saved;
});

describe('checkAdminAuth', () => {
  it('accepts only admin:<ADMIN_PASSWORD>', () => {
    expect(checkAdminAuth(good)).toBe('ok');
    expect(checkAdminAuth(null)).toBe('missing');
    expect(checkAdminAuth('Bearer x')).toBe('missing');
    expect(checkAdminAuth('Basic ' + btoa('admin:nope'))).toBe('wrong');
    expect(checkAdminAuth('Basic ' + btoa('root:' + PASS))).toBe('wrong');
    expect(checkAdminAuth('Basic %%%')).toBe('wrong');
  });

  it('is unreachable when ADMIN_PASSWORD is unset', () => {
    delete process.env.ADMIN_PASSWORD;
    expect(checkAdminAuth(good)).toBe('unconfigured');
    expect(checkAdminAuth('Basic ' + btoa('admin:'))).toBe('unconfigured');
  });

  it('flags cross-origin mutations only', () => {
    const h = (o: Record<string, string>) => new Headers({ host: 'weektoregatta.com', ...o });
    expect(isCrossOriginMutation('POST', h({ origin: 'https://evil.example' }))).toBe(true);
    expect(isCrossOriginMutation('POST', h({ 'sec-fetch-site': 'cross-site' }))).toBe(true);
    expect(isCrossOriginMutation('POST', h({ origin: 'https://weektoregatta.com' }))).toBe(false);
    expect(isCrossOriginMutation('GET', h({ origin: 'https://evil.example' }))).toBe(false);
  });

  it('requireAdmin returns null when authorized and a 401/403/503 response otherwise', () => {
    expect(requireAdmin(req('/api/admin/x', { auth: good }))).toBeNull();
    expect(requireAdmin(req('/api/admin/x'))?.status).toBe(401);
    expect(requireAdmin(req('/api/admin/x', { method: 'POST', auth: good, headers: { origin: 'https://evil.example' } }))?.status).toBe(403);
    delete process.env.ADMIN_PASSWORD;
    expect(requireAdmin(req('/api/admin/x', { auth: good }))?.status).toBe(503);
  });
});

describe('admin handlers check auth themselves', () => {
  it('GET /api/admin/stats-range: 401 without auth, data with auth', async () => {
    const denied = await statsRange(req('/api/admin/stats-range'));
    expect(denied.status).toBe(401);
    expect(db.getMetricsRange).not.toHaveBeenCalled();

    const ok = await statsRange(req('/api/admin/stats-range', { auth: good }));
    expect(ok.status).toBe(200);
    expect(db.getMetricsRange).toHaveBeenCalledTimes(1);
  });

  it('POST /api/admin/feedback: 401 without auth, 403 cross-origin, 200 with auth', async () => {
    const body = { id: 1, status: 'fixed' };
    expect((await feedbackPost(req('/api/admin/feedback', { method: 'POST', body }))).status).toBe(401);
    expect((await feedbackPost(req('/api/admin/feedback', {
      method: 'POST', body, auth: good, headers: { origin: 'https://evil.example' },
    }))).status).toBe(403);
    expect(db.updateFeedbackStatus).not.toHaveBeenCalled();

    const ok = await feedbackPost(req('/api/admin/feedback', { method: 'POST', body, auth: good }));
    expect(ok.status).toBe(200);
    expect(db.updateFeedbackStatus).toHaveBeenCalledWith(1, 'fixed');
  });
});
