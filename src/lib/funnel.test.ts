// Funnel helpers (src/lib/funnel.ts) and the event field contract they share
// with /api/log (src/lib/analytics-events.ts).
// Contract: every real lesson / chapter / scenario id passes the server-side
// id check (otherwise its completions are silently dropped), and an exam
// result reaches both /api/log and the iOS app shell.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIENT_EVENTS, isClientEvent, pickEventFields } from './analytics-events';
import { bootcampLessons } from '@/data/bootcamp';
import { sailLessons } from '@/data/sailing-lab/course';
import { THEORY_CHAPTERS } from '@/app/radio/teoria/courseData';
import { SCENARIOS } from '@/app/radio/symulator/scenarios';

interface FakeEnv {
  beacons: Array<Record<string, unknown>>;
  posted: Array<Record<string, unknown>>;
  session: Map<string, string>;
}

function installBrowser(search: string, opts: { webView?: boolean; protocol?: string } = {}): FakeEnv {
  const env: FakeEnv = { beacons: [], posted: [], session: new Map() };
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
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', {
    onLine: true,
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
  it('does not dedup two different lessons completed on the same page', async () => {
    const env = installBrowser('');
    const { trackLessonComplete } = await import('./funnel');
    trackLessonComplete('radio-theory', 'ch1');
    trackLessonComplete('radio-theory', 'ch2');
    trackLessonComplete('radio-theory', 'ch2');
    await flush();
    expect(env.beacons.map((b) => b.lessonId)).toEqual(['ch1', 'ch2']);
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
