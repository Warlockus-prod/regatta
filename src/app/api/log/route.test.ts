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

function makeReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/log', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
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

describe('POST /api/log - privacy + meta hardening', () => {
  it('truncates the IPv4 host octet before storing', async () => {
    await POST(makeReq(
      { level: 'info', evt: 'page.view', path: '/start' },
      { 'x-forwarded-for': '203.0.113.42' },
    ));
    expect(mocks.db.insertEvent).toHaveBeenCalledTimes(1);
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    expect(arg.ip).toBe('203.0.113.0');
  });

  it('truncates an IPv6 address to its first three hextets', async () => {
    await POST(makeReq(
      { level: 'info', evt: 'page.view' },
      { 'x-forwarded-for': '2001:db8:1:2:3:4:5:6' },
    ));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    expect(arg.ip).toBe('2001:db8:1::');
  });

  it('only persists allow-listed primitive meta fields, dropping junk', async () => {
    await POST(makeReq({
      level: 'info',
      evt: 'page.view',
      path: '/start',
      referrer: 'https://example.com',
      secretToken: 'should-not-be-stored',
      nested: { evil: true },
    }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    expect(arg.meta).toBeDefined();
    expect(arg.meta.path).toBe('/start');
    expect(arg.meta.referrer).toBe('https://example.com');
    expect(arg.meta.secretToken).toBeUndefined();
    expect(arg.meta.nested).toBeUndefined();
  });

  it('drops oversized meta rather than storing an unbounded blob', async () => {
    const huge = 'x'.repeat(20_000);
    await POST(makeReq({ level: 'info', evt: 'page.view', message: huge }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    // message is allow-listed but truncated to 512 chars, so the object stays
    // well under the 4KB cap and is still stored.
    expect(arg.meta).toBeDefined();
    expect((arg.meta.message as string).length).toBe(512);
  });
});
