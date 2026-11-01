// Contract smoke for /api/log POST.
// Contract: always returns 204 (No Content) even on bad input - the
// client-side reporter must never fail or break the user session.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookieStore: { value: undefined as string | undefined },
  db: { insertEvent: vi.fn() },
  log: { logError: vi.fn(), logWarn: vi.fn(), logInfo: vi.fn() },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'regatta_sid' && mocks.cookieStore.value
      ? { value: mocks.cookieStore.value }
      : undefined),
  }),
}));

vi.mock('@/lib/db', () => mocks.db);
vi.mock('@/lib/log', () => mocks.log);
vi.mock('fast-geoip', () => ({ default: { lookup: async () => null } }));

import { POST } from './route';
import { __resetRateLimitsForTests } from '@/lib/rate-limit';

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
  for (const fn of Object.values(mocks.log)) fn.mockReset();
  __resetRateLimitsForTests();
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

  it('refuses bodies over 16 KB without touching the DB', async () => {
    const huge = 'x'.repeat(20_000);
    const res = await POST(makeReq({ level: 'info', evt: 'page.view', message: huge }));
    expect(res.status).toBe(413);
    expect(mocks.db.insertEvent).not.toHaveBeenCalled();
  });

  it('caps string columns so one event cannot store an unbounded row', async () => {
    const long = 'p'.repeat(5_000);
    await POST(makeReq({ level: 'info', evt: 'page.view', path: long, referrer: long, viewport: long }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    expect(arg.path.length).toBe(256);
    expect(arg.referrer.length).toBe(512);
    expect(arg.viewport.length).toBe(32);
  });

  it('truncates long allow-listed meta strings to 512 chars', async () => {
    const big = 'x'.repeat(10_000);
    await POST(makeReq({ level: 'info', evt: 'page.view', message: big }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    // message is allow-listed but truncated to 512 chars, so the object stays
    // well under the 4KB cap and is still stored.
    expect(arg.meta).toBeDefined();
    expect((arg.meta.message as string).length).toBe(512);
  });
});

describe('POST /api/log - event allow-list', () => {
  it('drops an unknown event name without storing it', async () => {
    const res = await POST(makeReq({ level: 'info', evt: 'totally.made.up', path: '/' }));
    expect(res.status).toBe(204);
    expect(mocks.db.insertEvent).not.toHaveBeenCalled();
  });

  it('drops a forged server-side event (race.finish is written by its own route)', async () => {
    await POST(makeReq({ level: 'info', evt: 'race.finish', finishTimeSec: 1 }));
    expect(mocks.db.insertEvent).not.toHaveBeenCalled();
  });

  it('drops a request with no evt at all', async () => {
    await POST(makeReq({ level: 'info', path: '/' }));
    expect(mocks.db.insertEvent).not.toHaveBeenCalled();
  });

  it('stores embed + client on page.view', async () => {
    await POST(makeReq({ level: 'info', evt: 'page.view', path: '/sternik', embed: true, client: 'app' }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    expect(arg.evt).toBe('page.view');
    expect(arg.meta.embed).toBe(true);
    expect(arg.meta.client).toBe('app');
  });

  it('drops an invalid client value but keeps the event', async () => {
    await POST(makeReq({ level: 'info', evt: 'page.view', path: '/', client: 'android-tv', embed: 'yes' }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    expect(arg.meta.client).toBeUndefined();
    expect(arg.meta.embed).toBeUndefined();
  });

  it('stores a validated exam.finish result', async () => {
    await POST(makeReq({
      level: 'info', evt: 'exam.finish', path: '/sternik/egzamin',
      base: 'sternik', score: 66, total: 75, passed: true, timedOut: false, durationSec: 3120, client: 'web',
    }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    expect(arg.evt).toBe('exam.finish');
    expect(arg.meta).toMatchObject({ base: 'sternik', score: 66, total: 75, passed: true, timedOut: false, durationSec: 3120 });
  });

  it('drops out-of-range or wrongly typed exam fields', async () => {
    await POST(makeReq({
      level: 'info', evt: 'exam.finish', base: 'ppl', score: -1, total: '75', passed: 'true', durationSec: 1.5,
    }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    for (const key of ['base', 'score', 'total', 'passed', 'durationSec']) {
      expect(arg.meta?.[key]).toBeUndefined();
    }
  });

  it('only keeps the fields that belong to the event', async () => {
    await POST(makeReq({ level: 'info', evt: 'page.view', path: '/', score: 10, lessonId: 'x' }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    expect(arg.meta.score).toBeUndefined();
    expect(arg.meta.lessonId).toBeUndefined();
  });

  it('stores lesson.complete, radio.task.complete and app_store.click fields', async () => {
    await POST(makeReq({ level: 'info', evt: 'lesson.complete', course: 'sails', lessonId: 'telltales' }));
    await POST(makeReq({ level: 'info', evt: 'radio.task.complete', taskId: 'mayday-fire', score: 85 }));
    await POST(makeReq({ level: 'info', evt: 'app_store.click', ct: 'web_home' }));
    await POST(makeReq({ level: 'info', evt: 'app_store.click', ct: 'Web Home!' }));
    const metas = mocks.db.insertEvent.mock.calls.map((c) => c[0].meta);
    expect(metas[0]).toMatchObject({ course: 'sails', lessonId: 'telltales' });
    expect(metas[1]).toMatchObject({ taskId: 'mayday-fire', score: 85 });
    expect(metas[2]).toMatchObject({ ct: 'web_home' });
    expect(metas[3]?.ct).toBeUndefined();
  });

  it('stores the race funnel steps with validated fields and drops the rest', async () => {
    const race = { raceNo: 1, mode: 'simple', difficulty: 'easy', wind: 'medium', client: 'web', embed: false };
    await POST(makeReq({ level: 'info', evt: 'race.countdown', path: '/game', ...race, nickname: 'Ala' }));
    await POST(makeReq({ level: 'info', evt: 'race.first_tack', ...race, atSec: 14 }));
    await POST(makeReq({ level: 'info', evt: 'race.first_mark', ...race, atSec: 9999 }));
    await POST(makeReq({
      level: 'info', evt: 'race.end', ...race,
      finished: true, position: 2, totalBoats: 4, durationSec: 201, tacks: 7, samples: [[0, 0]],
    }));
    await POST(makeReq({ level: 'info', evt: 'race.replay', ...race, source: 'result' }));
    const calls = mocks.db.insertEvent.mock.calls.map((c) => c[0]);
    expect(calls.map((c) => c.evt)).toEqual(['race.countdown', 'race.first_tack', 'race.first_mark', 'race.end', 'race.replay']);
    for (const c of calls) expect(c.meta).toMatchObject({ raceNo: 1, mode: 'simple', difficulty: 'easy', wind: 'medium', client: 'web' });
    expect(calls[0].meta.nickname).toBeUndefined();
    expect(calls[1].meta.atSec).toBe(14);
    expect(calls[2].meta.atSec).toBeUndefined();
    expect(calls[3].meta).toMatchObject({ finished: true, position: 2, totalBoats: 4, durationSec: 201, tacks: 7 });
    expect(calls[3].meta.samples).toBeUndefined();
    expect(calls[4].meta.source).toBe('result');
  });

  it('drops out-of-range race fields but keeps the event', async () => {
    await POST(makeReq({
      level: 'info', evt: 'race.end', raceNo: 0, mode: 'arcade', difficulty: 'insane', wind: 'storm',
      finished: 'yes', position: 65, totalBoats: 0, tacks: 1.5, missionId: '../etc',
    }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    expect(arg.evt).toBe('race.end');
    for (const key of ['raceNo', 'mode', 'difficulty', 'wind', 'finished', 'position', 'totalBoats', 'tacks', 'missionId']) {
      expect(arg.meta?.[key]).toBeUndefined();
    }
  });
});

describe('POST /api/log - js error reports', () => {
  const reporterBody = {
    level: 'error', evt: 'js.uncaught', path: '/radio',
    msg: "TypeError: undefined is not an object (evaluating 'a.b')",
    src: 'https://weektoregatta.com/_next/static/chunks/app.js',
    line: 12, col: 34,
    stack: 'b@https://weektoregatta.com/_next/static/chunks/app.js:12:34',
  };

  it('keeps msg, src, line and col in the server log and in the stored meta', async () => {
    await POST(makeReq(reporterBody));
    expect(mocks.log.logError).toHaveBeenCalledTimes(1);
    const [name, fields] = mocks.log.logError.mock.calls[0];
    expect(name).toBe('client.js.uncaught');
    const expected = { msg: reporterBody.msg, src: reporterBody.src, line: 12, col: 34 };
    expect(fields).toMatchObject(expected);
    expect(mocks.db.insertEvent.mock.calls[0][0].meta).toMatchObject(expected);
  });

  it('drops errors thrown by browser extensions, logging nothing', async () => {
    await POST(makeReq({ ...reporterBody, src: 'chrome-extension://abcdef/frame_ant.js' }));
    await POST(makeReq({
      level: 'error', evt: 'js.rejection', reason: 'Error: x',
      stack: 'Error: x | at chrome-extension://abcdef/frame_ant.js:1:2 | at https://weektoregatta.com/a.js:1:1',
    }));
    await POST(makeReq({ level: 'error', evt: 'js.uncaught', msg: 'Script error.', src: '', line: 0, col: 0 }));
    expect(mocks.db.insertEvent).not.toHaveBeenCalled();
    expect(mocks.log.logError).not.toHaveBeenCalled();
  });

  it('keeps an error whose stack only mentions an extension further down', async () => {
    await POST(makeReq({
      level: 'error', evt: 'js.rejection', reason: 'Error: ours',
      stack: 'Error: ours | at https://weektoregatta.com/a.js:1:1 | at chrome-extension://abc/x.js:1:1',
    }));
    expect(mocks.db.insertEvent).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/log - automation and abuse', () => {
  it('does not store events from HeadlessChrome or our Playwright runs', async () => {
    await POST(makeReq({ level: 'info', evt: 'page.view', path: '/' }, {
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/147.0.0.0 Safari/537.36',
    }));
    await POST(makeReq({ level: 'info', evt: 'page.view', path: '/' }, {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36 RegattaE2E',
    }));
    expect(mocks.db.insertEvent).not.toHaveBeenCalled();
    expect(mocks.log.logInfo).not.toHaveBeenCalled();
  });

  it('drops the 121st event per minute from one session without storing or logging it', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.7' };
    for (let i = 0; i < 120; i++) {
      const res = await POST(makeReq({ level: 'info', evt: 'page.view', path: `/p${i}` }, headers));
      expect(res.status).toBe(204);
    }
    expect(mocks.db.insertEvent).toHaveBeenCalledTimes(120);
    mocks.log.logInfo.mockClear();
    const res = await POST(makeReq({ level: 'info', evt: 'exam.finish', base: 'src', score: 10, total: 10, passed: true }, headers));
    expect(res.status).toBe(204);
    expect(mocks.db.insertEvent).toHaveBeenCalledTimes(120);
    expect(mocks.log.logInfo).not.toHaveBeenCalled();
  });

  it('caps one IP even when every request carries a fresh session cookie', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.8' };
    for (let i = 0; i < 361; i++) {
      mocks.cookieStore.value = `sid-${i}`;
      await POST(makeReq({ level: 'info', evt: 'exam.finish', base: 'src', score: 10, total: 10, passed: true }, headers));
    }
    expect(mocks.db.insertEvent).toHaveBeenCalledTimes(360);
  });

  it('ignores a session id in the body: only the cookie names the visitor', async () => {
    mocks.cookieStore.value = undefined;
    await POST(makeReq({ level: 'info', evt: 'page.view', path: '/', sessionId: 'forged-visitor' }));
    const arg = mocks.db.insertEvent.mock.calls[0][0];
    expect(arg.sessionId).toBeUndefined();
    expect(arg.meta.sessionId).toBeUndefined();
  });

  it('truncates an IPv4-mapped IPv6 address as IPv4 and treats junk as unknown', async () => {
    await POST(makeReq({ level: 'info', evt: 'page.view' }, { 'x-forwarded-for': '::ffff:203.0.113.9' }));
    await POST(makeReq({ level: 'info', evt: 'page.view' }, { 'x-forwarded-for': 'not-an-ip' }));
    expect(mocks.db.insertEvent.mock.calls[0][0].ip).toBe('203.0.113.0');
    expect(mocks.db.insertEvent.mock.calls[1][0].ip).toBe('unknown');
  });

  it('stores the page view id on page.view and page.engaged', async () => {
    await POST(makeReq({ level: 'info', evt: 'page.view', path: '/', viewId: 'k3x9a1b2c3' }));
    await POST(makeReq({ level: 'info', evt: 'page.engaged', path: '/', viewId: 'k3x9a1b2c3', msOnPage: 42_000 }));
    await POST(makeReq({ level: 'info', evt: 'page.view', path: '/', viewId: '<script>' }));
    const metas = mocks.db.insertEvent.mock.calls.map((c) => c[0].meta);
    expect(metas[0].viewId).toBe('k3x9a1b2c3');
    expect(metas[1]).toMatchObject({ viewId: 'k3x9a1b2c3', msOnPage: 42_000 });
    expect(metas[2].viewId).toBeUndefined();
  });

  it('warns once per process when the geoip database gives no answer', async () => {
    vi.resetModules();
    const fresh = await import('./route');
    const geoWarnings = () => mocks.log.logWarn.mock.calls.filter((c) => c[0] === 'geoip.unavailable');
    await fresh.POST(makeReq({ level: 'info', evt: 'page.view' }, { 'x-forwarded-for': '81.2.69.160' }));
    await fresh.POST(makeReq({ level: 'info', evt: 'page.view' }, { 'x-forwarded-for': '5.173.0.10' }));
    expect(geoWarnings()).toHaveLength(1);
  });
});
