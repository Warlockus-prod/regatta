// Funnel helpers (src/lib/funnel.ts) and the event field contract they share
// with /api/log (src/lib/analytics-events.ts).
// Contract: every real lesson / chapter / scenario id passes the server-side
// id check (otherwise its completions are silently dropped), and an exam
// result reaches both /api/log and the iOS app shell.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIENT_EVENTS, FUNNEL_EVENTS, isBrowserNoise, isClientEvent, pickEventFields } from './analytics-events';
import { bootcampLessons } from '@/data/bootcamp';
import { sailLessons } from '@/data/sailing-lab/course';
import { THEORY_CHAPTERS } from '@/app/radio/teoria/courseData';
import { SCENARIOS } from '@/app/radio/symulator/scenarios';

interface FakeEnv {
  beacons: Array<Record<string, unknown>>;
  posted: Array<Record<string, unknown>>;
  session: Map<string, string>;
}

interface BrowserOpts {
  webView?: boolean;
  protocol?: string;
  webdriver?: boolean;
  userAgent?: string;
  /** window.__REGATTA_NO_ANALYTICS__, set by the iOS app when analytics is off. */
  noAnalytics?: boolean;
  session?: Record<string, string>;
}

function installBrowser(search: string, opts: BrowserOpts = {}): FakeEnv {
  const env: FakeEnv = { beacons: [], posted: [], session: new Map(Object.entries(opts.session ?? {})) };
  const win: Record<string, unknown> = {
    location: { search, pathname: '/sternik/egzamin', protocol: opts.protocol ?? 'https:' },
    sessionStorage: {
      getItem: (k: string) => env.session.get(k) ?? null,
      setItem: (k: string, v: string) => { env.session.set(k, v); },
    },
  };
  if (opts.webView) {
    win.ReactNativeWebView = { postMessage: (m: string) => env.posted.push(JSON.parse(m)) };
  }
  if (opts.noAnalytics) win.__REGATTA_NO_ANALYTICS__ = true;
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', {
    onLine: true,
    webdriver: opts.webdriver ?? false,
    userAgent: opts.userAgent ?? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    sendBeacon: (_url: string, blob: Blob) => {
      void blob.text().then((t) => env.beacons.push(JSON.parse(t)));
      return true;
    },
  });
  return env;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('event field contract', () => {
  it('lists every client event the web sends', () => {
    for (const evt of ['page.view', 'page.engaged', 'js.uncaught', 'js.rejection', 'exam.start',
      'exam.finish', 'lesson.complete', 'radio.task.complete', 'app_store.click']) {
      expect(isClientEvent(evt)).toBe(true);
    }
    expect(isClientEvent('race.finish')).toBe(false);
    expect(CLIENT_EVENTS).toHaveLength(9);
  });

  it('treats only the milestones as funnel events', () => {
    expect([...FUNNEL_EVENTS].sort()).toEqual(
      ['app_store.click', 'exam.finish', 'exam.start', 'lesson.complete', 'radio.task.complete'],
    );
    for (const evt of FUNNEL_EVENTS) expect(isClientEvent(evt)).toBe(true);
  });

  it('accepts a page view id only in its own short format', () => {
    expect(pickEventFields('page.view', { viewId: 'k3x9a1b2c3' })).toEqual({ viewId: 'k3x9a1b2c3' });
    expect(pickEventFields('page.engaged', { viewId: 'k3x9a1b2c3' })).toEqual({ viewId: 'k3x9a1b2c3' });
    expect(pickEventFields('page.view', { viewId: 'x'.repeat(40) })).toEqual({});
    expect(pickEventFields('exam.start', { viewId: 'k3x9a1b2c3' })).toEqual({});
  });

  it.each([
    ['bootcamp', bootcampLessons.map((l) => l.id)],
    ['sails', sailLessons.map((l) => l.id)],
    ['radio-theory', THEORY_CHAPTERS.map((c) => c.id)],
  ] as const)('accepts every %s lesson id', (course, ids) => {
    expect(ids.length).toBeGreaterThan(0);
    for (const lessonId of ids) {
      expect(pickEventFields('lesson.complete', { course, lessonId })).toEqual({ course, lessonId });
    }
  });

  it('accepts every radio simulator scenario id', () => {
    for (const s of SCENARIOS) {
      expect(pickEventFields('radio.task.complete', { taskId: s.id, score: 100 })).toEqual({ taskId: s.id, score: 100 });
    }
  });
});

describe('detectShell', () => {
  it('is web in a plain browser', async () => {
    installBrowser('');
    const { detectShell } = await import('./funnel');
    expect(detectShell()).toEqual({ embed: false, client: 'web' });
  });

  it('is app on ?embed=1 and stays app after in-section navigation drops the query', async () => {
    const env = installBrowser('?lang=pl&embed=1');
    const { detectShell } = await import('./funnel');
    expect(detectShell()).toEqual({ embed: true, client: 'app' });
    (window.location as { search: string }).search = '';
    expect(env.session.get('regatta.embed.v1')).toBe('1');
    expect(detectShell()).toEqual({ embed: true, client: 'app' });
  });

  it('is app inside a WebView even without the embed flag', async () => {
    installBrowser('', { webView: true });
    const { detectShell } = await import('./funnel');
    expect(detectShell()).toEqual({ embed: false, client: 'app' });
  });

  it('does not treat embed=10 as embed', async () => {
    installBrowser('?embed=10');
    const { detectShell } = await import('./funnel');
    expect(detectShell().embed).toBe(false);
  });
});

describe('trackExamFinish', () => {
  it('sends exam.finish to /api/log and relays the result to the app shell', async () => {
    const env = installBrowser('?embed=1', { webView: true });
    const { trackExamFinish } = await import('./funnel');
    trackExamFinish({ base: 'sternik', score: 66, total: 75, passed: true, timedOut: false, durationSec: 3000 });
    await flush();
    expect(env.beacons).toHaveLength(1);
    expect(env.beacons[0]).toMatchObject({
      evt: 'exam.finish', base: 'sternik', score: 66, total: 75, passed: true, embed: true, client: 'app',
    });
    expect(env.posted).toEqual([{ type: 'exam-finished', base: 'sternik', score: 66, total: 75, passed: true }]);
  });

  it('still relays to the app but skips /api/log on the offline file:// bundle', async () => {
    const env = installBrowser('', { webView: true, protocol: 'file:' });
    const { trackExamFinish } = await import('./funnel');
    trackExamFinish({ base: 'src', score: 7, total: 10, passed: true });
    await flush();
    expect(env.beacons).toHaveLength(0);
    expect(env.posted).toEqual([{ type: 'exam-finished', base: 'src', score: 7, total: 10, passed: true }]);
  });
});

describe('trackLessonComplete', () => {
  it('sends every completion: funnel events are never deduped (callers guard repeats)', async () => {
    const env = installBrowser('');
    const { trackLessonComplete } = await import('./funnel');
    trackLessonComplete('radio-theory', 'ch1');
    trackLessonComplete('radio-theory', 'ch2');
    trackLessonComplete('radio-theory', 'ch2');
    await flush();
    expect(env.beacons.map((b) => b.lessonId)).toEqual(['ch1', 'ch2', 'ch2']);
  });
});

// One module instance per test, like one page load: the dedup map and the
// per-page budgets live in client-log's module state.
describe('client-log within one page load', () => {
  it('sends both a sternik and an SRC exam.start', async () => {
    const env = installBrowser('');
    const { trackExamStart } = await import('./funnel');
    trackExamStart('sternik');
    trackExamStart('src');
    await flush();
    expect(env.beacons.map((b) => [b.evt, b.base])).toEqual([['exam.start', 'sternik'], ['exam.start', 'src']]);
  });

  it('sends the same radio task twice when it is completed twice', async () => {
    const env = installBrowser('');
    const { trackRadioTaskComplete } = await import('./funnel');
    trackRadioTaskComplete('mayday-fire', 80);
    trackRadioTaskComplete('mayday-fire', 95);
    await flush();
    expect(env.beacons.map((b) => b.score)).toEqual([80, 95]);
  });

  it('still sends exam.finish after 100 page views and 100 errors', async () => {
    const env = installBrowser('');
    const { clientInfo, clientError } = await import('./client-log');
    const { trackExamFinish } = await import('./funnel');
    for (let i = 0; i < 100; i++) {
      clientInfo('page.view', { path: `/p${i}`, viewId: `view${i}x` });
      clientError('js.uncaught', { msg: `boom ${i}` });
    }
    trackExamFinish({ base: 'sternik', score: 70, total: 75, passed: true });
    await flush();
    const count = (evt: string) => env.beacons.filter((b) => b.evt === evt).length;
    expect(count('page.view')).toBe(100);
    expect(count('js.uncaught')).toBe(50);
    expect(count('exam.finish')).toBe(1);
  });

  it('keeps two views of the same route apart by view id', async () => {
    const env = installBrowser('');
    const { clientInfo } = await import('./client-log');
    clientInfo('page.view', { path: '/radio', viewId: 'aaaaaa1' });
    clientInfo('page.view', { path: '/radio', viewId: 'bbbbbb2' });
    clientInfo('page.view', { path: '/radio', viewId: 'bbbbbb2' });
    await flush();
    expect(env.beacons.map((b) => b.viewId)).toEqual(['aaaaaa1', 'bbbbbb2']);
  });

  // page.engaged is sent from the route's cleanup, after a client-side
  // navigation has already moved window.location to the next page.
  it('credits page.engaged to the route the caller names, not the current URL', async () => {
    const env = installBrowser('');
    (window.location as { pathname: string }).pathname = '/next';
    const { clientInfo } = await import('./client-log');
    clientInfo('page.engaged', { path: '/prev', viewId: 'prevview1', msOnPage: 12_000, maxScrollPct: 40 });
    clientInfo('exam.start', { base: 'sternik' });
    await flush();
    expect(env.beacons.map((b) => [b.evt, b.path])).toEqual([['page.engaged', '/prev'], ['exam.start', '/next']]);
  });
});

describe('analytics off', () => {
  it.each([
    ['an automated browser (navigator.webdriver)', { webdriver: true }],
    ['HeadlessChrome', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/147.0.0.0 Safari/537.36' }],
    ['the app switch (window flag)', { noAnalytics: true, webView: true }],
    ['the app switch (sessionStorage flag)', { session: { 'regatta.noanalytics.v1': '1' } }],
  ] as const)('sends nothing for %s', async (_label, opts) => {
    const env = installBrowser('?embed=1', opts);
    const { trackExamFinish, trackExamStart } = await import('./funnel');
    const { clientInfo, flushBufferedLogs } = await import('./client-log');
    trackExamStart('sternik');
    trackExamFinish({ base: 'sternik', score: 70, total: 75, passed: true });
    clientInfo('page.view', { path: '/sternik' });
    flushBufferedLogs();
    await flush();
    expect(env.beacons).toEqual([]);
  });
});

// The GA4 loader in src/components/GoogleAnalytics.tsx runs as an inline
// script; run the same text against the fake browser and look for gtag.js.
describe('GA4 loader', () => {
  async function runLoader(search: string, opts: BrowserOpts = {}): Promise<string[]> {
    installBrowser(search, opts);
    const injected: string[] = [];
    vi.stubGlobal('document', {
      createElement: () => ({}) as { src?: string },
      head: { appendChild: (el: { src?: string }) => { injected.push(el.src ?? ''); } },
    });
    const { GA_LOADER } = await import('@/components/GoogleAnalytics');
    new Function(GA_LOADER)();
    return injected;
  }

  it('loads gtag.js for a normal web visitor', async () => {
    const injected = await runLoader('');
    expect(injected).toHaveLength(1);
    expect(injected[0]).toContain('googletagmanager.com/gtag/js?id=G-ZEWWJ4N31M');
  });

  it.each([
    ['an automated browser (navigator.webdriver)', '', { webdriver: true }],
    ['HeadlessChrome', '', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/147.0.0.0 Safari/537.36' }],
    ['our Playwright user agent', '', { userAgent: 'Mozilla/5.0 Chrome/147.0.0.0 Safari/537.36 RegattaE2E' }],
    ['an app embed (?embed=1)', '?embed=1', {}],
    ['an app WebView', '', { webView: true }],
    ['the remembered embed flag', '', { session: { 'regatta.embed.v1': '1' } }],
    ['the app analytics switch', '', { noAnalytics: true }],
  ] as const)('does not load for %s', async (_label, search, opts) => {
    expect(await runLoader(search, opts)).toEqual([]);
  });
});

describe('isBrowserNoise', () => {
  it('flags extension frames and opaque cross-origin errors, not our own', () => {
    expect(isBrowserNoise({ src: 'chrome-extension://abc/frame_ant.js' })).toBe(true);
    expect(isBrowserNoise({ stack: 'TypeError: x | at moz-extension://abc/content.js:1:2' })).toBe(true);
    expect(isBrowserNoise({ stack: 'f@safari-web-extension://abc/inject.js:3:4' })).toBe(true);
    expect(isBrowserNoise({ stack: 'f@webkit-masked-url://hidden/:1:2' })).toBe(true);
    expect(isBrowserNoise({ msg: 'Script error.', src: '' })).toBe(true);
    expect(isBrowserNoise({ msg: 'Script error.', src: 'https://weektoregatta.com/_next/x.js' })).toBe(false);
    expect(isBrowserNoise({
      msg: 'TypeError: a is undefined',
      src: 'https://weektoregatta.com/_next/x.js',
      stack: 'TypeError: a | at https://weektoregatta.com/_next/x.js:1:2 | at chrome-extension://abc/y.js:1:1',
    })).toBe(false);
  });
});

describe('appStoreUrl', () => {
  it('tags the App Store link with the placement token', async () => {
    installBrowser('');
    const { appStoreUrl } = await import('./funnel');
    const url = new URL(appStoreUrl('web_home'));
    expect(url.origin + url.pathname).toBe('https://apps.apple.com/app/id6768134329');
    expect(url.searchParams.get('ct')).toBe('web_home');
  });

  it('falls back to the bare link for an invalid token', async () => {
    installBrowser('');
    const { appStoreUrl } = await import('./funnel');
    expect(appStoreUrl('Web Home')).toBe('https://apps.apple.com/app/id6768134329');
  });
});
