// Contract: the app reports each native route once per change and one
// app.session per foreground stretch (time clamped, flickers dropped), to the
// site's own /api/log, as an iPhone or iPad user agent, with no user text.
import {
  appUserAgent,
  FIRST_PARTY_LOG_URL,
  ForegroundSession,
  normalizeScreenPath,
  parseRelayedLog,
  screenViewBody,
  sendFirstParty,
} from '../src/analytics/first-party';

const ctx = { language: 'pl', appVersion: '1.7.2', viewport: '390x844' };

describe('normalizeScreenPath', () => {
  it('keeps only the route', () => {
    expect(normalizeScreenPath('/bootcamp/3?from=home#x')).toBe('/bootcamp/3');
    expect(normalizeScreenPath('learn//sails/')).toBe('/learn/sails');
    expect(normalizeScreenPath('')).toBe('/');
    expect(normalizeScreenPath(undefined)).toBe('/');
    expect(normalizeScreenPath(`/${'a'.repeat(300)}`)).toHaveLength(120);
  });
});

describe('ForegroundSession', () => {
  it('reports a route once per change and counts screens of the stretch', () => {
    const s = new ForegroundSession(0);
    expect(s.enterScreen('/')).toBe(true);
    expect(s.enterScreen('/')).toBe(false);
    expect(s.enterScreen('/menu')).toBe(true);
    expect(s.enterScreen('/game')).toBe(true);
    const body = s.end(95_400, ctx);
    expect(body).toMatchObject({ evt: 'app.session', durationSec: 95, screens: 3, path: '/game', client: 'app' });
  });

  it('drops flickers, clamps long stretches and restarts on return', () => {
    const s = new ForegroundSession(0);
    s.enterScreen('/');
    expect(s.end(500, ctx)).toBeNull();
    expect(s.end(10_000, ctx)).toBeNull(); // already ended
    s.resume(20_000);
    s.enterScreen('/radio');
    const body = s.end(20_000 + 10 * 60 * 60 * 1000, ctx);
    expect(body).toMatchObject({ durationSec: 4 * 60 * 60, screens: 2 });
  });

  it('does not count screens while in the background', () => {
    const s = new ForegroundSession(0);
    s.enterScreen('/');
    s.end(5_000, ctx);
    s.enterScreen('/settings');
    s.resume(6_000);
    expect(s.end(9_000, ctx)).toMatchObject({ screens: 1 });
  });
});

describe('request', () => {
  it('posts a screen.view to the site as the app', async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true });
    sendFirstParty(screenViewBody('/menu', ctx), appUserAgent('1.7.2', false, '18.1'), fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(FIRST_PARTY_LOG_URL);
    expect(init.headers['User-Agent']).toBe('WeekToRegattaApp/1.7.2 (iPhone; iOS 18.1)');
    expect(JSON.parse(init.body)).toEqual({
      evt: 'screen.view', level: 'info', path: '/menu', client: 'app', embed: false,
      language: 'pl', appVersion: '1.7.2', viewport: '390x844',
    });
    expect(appUserAgent('1.7.2', true, 18)).toContain('iPad');
  });

  it('never throws when the network fails', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('offline'));
    expect(() => sendFirstParty(screenViewBody('/', ctx), 'ua', fetcher as unknown as typeof fetch)).not.toThrow();
    const sync = jest.fn(() => { throw new Error('boom'); });
    expect(() => sendFirstParty(screenViewBody('/', ctx), 'ua', sync as unknown as typeof fetch)).not.toThrow();
  });
});

describe('parseRelayedLog (offline bundles hand their events to the app)', () => {
  const wrap = (body: unknown) => JSON.stringify({ type: 'regatta-log', body: JSON.stringify(body) });

  it('passes a flat event body through', () => {
    expect(parseRelayedLog(wrap({ evt: 'page.view', path: '/learn/sails', client: 'app', viewId: 'abc123', nested: { a: 1 } })))
      .toEqual({ evt: 'page.view', path: '/learn/sails', client: 'app', viewId: 'abc123' });
  });

  it('ignores other messages and malformed or oversized ones', () => {
    expect(parseRelayedLog(JSON.stringify({ type: 'exam-finished', base: 'src' }))).toBeNull();
    expect(parseRelayedLog('scene-ready')).toBeNull();
    expect(parseRelayedLog('{"type":"regatta-log","body":"not json"}')).toBeNull();
    expect(parseRelayedLog(wrap({ path: '/x' }))).toBeNull();
    expect(parseRelayedLog(wrap({ evt: 'DROP TABLE' }))).toBeNull();
    expect(parseRelayedLog(wrap({ evt: 'page.view', pad: 'x'.repeat(7000) }))).toBeNull();
  });
});

describe('relayWebLog (WebView hosts)', () => {
  const { relayWebLog } = require('../src/analytics/relay') as typeof import('../src/analytics/relay');
  const relayed = JSON.stringify({ type: 'regatta-log', body: JSON.stringify({ evt: 'ui.click', kind: 'tab', target: 'Teoria', client: 'app' }) });
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('forwards only with analytics on, and always claims the message', () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetcher as unknown as typeof fetch;
    expect(relayWebLog(relayed, false)).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
    expect(relayWebLog(relayed, true)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(FIRST_PARTY_LOG_URL);
    expect(fetcher.mock.calls[0][1].headers['User-Agent']).toMatch(/^WeekToRegattaApp\/.+ \((iPhone|iPad); iOS /);
    expect(relayWebLog('{"type":"radio-route","href":"/radio"}', true)).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
