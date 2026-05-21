// Contract smoke for /api/log POST.
// Contract: always returns 204 (No Content) even on bad input - the
// client-side reporter must never fail or break the user session.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookieStore: { value: undefined as string | undefined },
  db: { insertEvent: vi.fn() },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'regatta_sid' && mocks.cookieStore.value
      ? { value: mocks.cookieStore.value }
      : undefined),
  }),
}));

vi.mock('@/lib/db', () => mocks.db);
vi.mock('@/lib/log', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}));
vi.mock('fast-geoip', () => ({ default: { lookup: async () => null } }));

import { POST } from './route';

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/log', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  mocks.cookieStore.value = 'sid-test';
  mocks.db.insertEvent.mockReset();
});

describe('POST /api/log - always 204', () => {
  it('204 on a well-formed event', async () => {
    const res = await POST(makeReq({ level: 'info', evt: 'page.view', path: '/start' }));
    expect(res.status).toBe(204);
  });

  it('204 on invalid JSON (must never fail)', async () => {
    const res = await POST(makeReq('{not-json'));
    expect(res.status).toBe(204);
  });

  it('204 on empty body', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(204);
  });

  it('204 even without sid cookie', async () => {
    mocks.cookieStore.value = undefined;
    const res = await POST(makeReq({ level: 'info', evt: 'page.view' }));
    expect(res.status).toBe(204);
  });
});
