// Contract for POST /api/feedback: whatever JSON arrives, the answer is a
// clean 200 or 4xx, never a 500. Optional fields are strings clipped to a
// length or dropped, the category comes from an allow-list ('other' as the
// fallback), and the message is 2-4000 characters. fs is mocked so the test
// never writes /tmp/regatta-feedback.jsonl.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insertFeedback: vi.fn((_f: Record<string, unknown>) => 1 as number | null),
  fs: { mkdir: vi.fn(async () => undefined), appendFile: vi.fn(async () => undefined) },
}));

vi.mock('fs', () => ({ promises: mocks.fs, default: { promises: mocks.fs } }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'fb-sid' }) }) }));
vi.mock('@/lib/db', () => ({ insertFeedback: mocks.insertFeedback }));
vi.mock('@/lib/log', () => ({ logInfo: vi.fn(), logError: vi.fn(), logWarn: vi.fn() }));

import { POST } from './route';
import { __resetRateLimitsForTests } from '@/lib/rate-limit';

function post(body: unknown): Promise<Response> {
  return POST(new Request('http://localhost/api/feedback', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.88' },
  }));
}

function stored(): Record<string, unknown> {
  return mocks.insertFeedback.mock.calls[0][0];
}

beforeEach(() => {
  __resetRateLimitsForTests();
  mocks.insertFeedback.mockClear();
  mocks.fs.mkdir.mockClear();
  mocks.fs.appendFile.mockClear();
});

describe('POST /api/feedback', () => {
  it('200 for a normal report, stored in SQLite and the jsonl file', async () => {
    const res = await post({ kind: 'bug', message: 'The map is blank', expected: 'A map', actual: 'Nothing', path: '/radio', viewport: '390x844', language: 'pl' });
    expect(res.status).toBe(200);
    expect(stored()).toMatchObject({ kind: 'bug', message: 'The map is blank', expected: 'A map', actual: 'Nothing', path: '/radio', viewport: '390x844', language: 'pl' });
    expect(mocks.fs.appendFile).toHaveBeenCalledTimes(1);
  });

  it('non-string optional fields give 200 with the field dropped, not a 500', async () => {
    const res = await post({
      message: 'hello there', expected: 5, actual: { a: 1 }, contact: ['x'], path: [], section: true,
      viewport: 1, language: null, ua: 7, appVersion: {}, releaseId: [1], category: {},
    });
    expect(res.status).toBe(200);
    const row = stored();
    for (const k of ['expected', 'actual', 'contact', 'path', 'viewport', 'language', 'ua']) expect(row[k]).toBeUndefined();
    expect(row.category).toBe('other');
  });

  it('clips oversized optional values', async () => {
    const res = await post({
      message: 'hello there', viewport: 'v'.repeat(500_000), language: 'l'.repeat(100), contact: 'c'.repeat(1000),
      expected: 'e'.repeat(5000), path: 'p'.repeat(1000), ua: 'u'.repeat(1000),
    });
    expect(res.status).toBe(200);
    const row = stored();
    expect(String(row.viewport).length).toBeLessThanOrEqual(20);
    expect(String(row.language).length).toBeLessThanOrEqual(8);
    expect(String(row.contact).length).toBe(200);
    expect(String(row.expected).length).toBe(2000);
    expect(String(row.path).length).toBe(200);
    expect(String(row.ua).length).toBe(300);
    const line = String((mocks.fs.appendFile.mock.calls[0] as unknown[])[1]);
    expect(line.length).toBeLessThan(10_000);
  });

  it('keeps a known category and replaces an unknown one with other', async () => {
    await post({ message: 'hello there', category: 'idea' });
    expect(stored().category).toBe('idea');
    mocks.insertFeedback.mockClear();
    await post({ message: 'hello there', category: 'x'.repeat(10_000) });
    expect(stored().category).toBe('other');
  });

  it.each([
    ['a 1-character message', { message: 'x' }],
    ['a 4001-character message', { message: 'x'.repeat(4001) }],
    ['a non-string message', { message: 12345 }],
    ['an array body', [{ message: 'hello there' }]],
    ['a null body', null],
    ['a JSON string body', '"hello there"'],
  ])('400 for %s, nothing stored', async (_label, body) => {
    expect((await post(body)).status).toBe(400);
    expect(mocks.insertFeedback).not.toHaveBeenCalled();
  });

  it('400 for invalid JSON', async () => {
    expect((await post('{nope')).status).toBe(400);
  });
});
