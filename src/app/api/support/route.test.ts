// Contract for POST /api/support: every valid, non-honeypot message is
// stored in the feedback table BEFORE the Telegram push, so a Telegram outage
// or missing config loses nothing; the stored and pushed IP is truncated
// (IPv6 too); neither the message nor the contact reaches stdout; 5 an hour.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insertFeedback: vi.fn<(f: Record<string, unknown>) => number | null>(() => 1),
  log: { logInfo: vi.fn(), logError: vi.fn(), logWarn: vi.fn() },
}));

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/db', () => ({ insertFeedback: mocks.insertFeedback }));
vi.mock('@/lib/log', () => mocks.log);

import { POST } from './route';
import { __resetRateLimitsForTests } from '@/lib/rate-limit';

const fetchMock = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () => new Response('{"ok":true}', { status: 200 }));
let ipSeq = 0;
let xff = '';

function post(body: unknown): Promise<Response> {
  return POST(new Request('http://localhost/api/support', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
  }));
}

const SECRET_MESSAGE = 'My app crashes when I open the radio course';
const SECRET_CONTACT = 'sailor@example.org';

beforeEach(() => {
  __resetRateLimitsForTests();
  xff = `198.51.100.${++ipSeq}`;
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
  vi.stubEnv('TELEGRAM_CHAT_ID', '42');
  fetchMock.mockClear().mockImplementation(async () => new Response('{"ok":true}', { status: 200 }));
  mocks.insertFeedback.mockClear().mockReturnValue(1);
  for (const fn of Object.values(mocks.log)) fn.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function logged(): string {
  return JSON.stringify(Object.values(mocks.log).flatMap((fn) => fn.mock.calls));
}

describe('POST /api/support', () => {
  it('stores the message, then pushes it to Telegram', async () => {
    const res = await post({ message: SECRET_MESSAGE, contact: SECRET_CONTACT, path: '/radio', language: 'en' });
    expect(res.status).toBe(200);
    expect(mocks.insertFeedback).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'feedback', category: 'support', message: SECRET_MESSAGE, contact: SECRET_CONTACT, path: '/radio', language: 'en',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.insertFeedback.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
    expect(logged()).not.toContain(SECRET_MESSAGE);
    expect(logged()).not.toContain(SECRET_CONTACT);
  });

  it('a honeypot hit answers 200 and neither stores nor sends', async () => {
    const res = await post({ message: SECRET_MESSAGE, company: 'Spam Inc' });
    expect(res.status).toBe(200);
    expect(mocks.insertFeedback).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['no message', {}],
    ['a non-string message', { message: 42 }],
    ['a 1-character message', { message: 'x' }],
    ['a 4001-character message', { message: 'x'.repeat(4001) }],
  ])('400 for %s, nothing stored', async (_label, body) => {
    expect((await post(body)).status).toBe(400);
    expect(mocks.insertFeedback).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('400 for a body that is not JSON', async () => {
    expect((await post('{oops')).status).toBe(400);
  });

  it('a Telegram 500 still answers 200 and the message is stored', async () => {
    fetchMock.mockImplementation(async () => new Response('boom', { status: 500 }));
    expect((await post({ message: SECRET_MESSAGE })).status).toBe(200);
    expect(mocks.insertFeedback).toHaveBeenCalledTimes(1);
    expect(mocks.log.logError).toHaveBeenCalledWith('support.telegram-failed', expect.anything());
    expect(logged()).not.toContain(SECRET_MESSAGE);
  });

  it('missing Telegram config still answers 200 and the message is stored', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
    expect((await post({ message: SECRET_MESSAGE })).status).toBe(200);
    expect(mocks.insertFeedback).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('truncates an IPv6 address in the stored row and in the push', async () => {
    xff = '6.6.6.6, 2001:db8:1234:5678:9abc:def0:1234:5678';
    expect((await post({ message: SECRET_MESSAGE })).status).toBe(200);
    expect(mocks.insertFeedback.mock.calls[0][0].ip).toBe('2001:db8:1234::');
    const pushed = String(fetchMock.mock.calls[0][1]?.body);
    expect(pushed).toContain('2001:db8:1234::');
    expect(pushed).not.toContain('5678:9abc');
  });

  it('truncates an IPv4 address', async () => {
    xff = '203.0.113.77';
    await post({ message: SECRET_MESSAGE });
    expect(mocks.insertFeedback.mock.calls[0][0].ip).toBe('203.0.113.0');
  });

  it('the 6th message in an hour from one IP gets 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await post({ message: SECRET_MESSAGE + i })).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(mocks.insertFeedback).toHaveBeenCalledTimes(5);
  });
});
