// Contract of the local dashboard's report (scripts/analytics/report.mjs):
// visits split on 30-minute gaps, time per view comes from page.engaged or the
// gap to the next view, returning visitors count visits before the range,
// clients and channels are told apart, and admin pages are left out.

import { describe, expect, it } from 'vitest';
import { buildReport, channelOf, sectionOf } from '../../scripts/analytics/report.mjs';

const MIN = 60_000;
const DAY = 86_400_000;
const T0 = new Date(2026, 10, 10, 12, 0, 0).getTime(); // 10 Nov 2026, local noon

let id = 0;
const ev = (sid, ts, evt, path, meta = {}, extra = {}) => ({ id: ++id, sid, ts, evt, path, meta, language: 'pl', country: 'PL', device: 'mobile', ...extra });
const view = (sid, ts, path, viewId, extra = {}) => ev(sid, ts, 'page.view', path, { viewId, client: 'web' }, extra);
const engaged = (sid, ts, path, viewId, ms, scroll = 50) => ev(sid, ts, 'page.engaged', path, { viewId, msOnPage: ms, maxScrollPct: scroll });

describe('buildReport', () => {
  const events = [
    // Visitor a: came before the range, returns in it with two visits.
    view('a', T0 - 10 * DAY, '/', 'v0'),
    view('a', T0, '/', 'v1', { referrer: 'https://www.google.com/' }),
    engaged('a', T0 + 1 * MIN, '/', 'v1', 40_000),
    view('a', T0 + 2 * MIN, '/radio', 'v2'),
    ev('a', T0 + 3 * MIN, 'ui.click', '/radio', { kind: 'tab', target: 'Teoria', viewId: 'v2', client: 'web' }),
    view('a', T0 + 5 * MIN, '/radio/teoria', 'v3'),
    // 2 hours later: a new visit.
    view('a', T0 + 125 * MIN, '/radio', 'v4'),
    engaged('a', T0 + 127 * MIN, '/radio', 'v4', 120_000, 80),
    // Visitor b: one app WebView page and native screens.
    ev('b', T0 + DAY, 'page.view', '/learn/sails', { viewId: 'w1', client: 'app' }),
    ev('b', T0 + DAY + MIN, 'screen.view', '/menu', { client: 'app' }),
    ev('b', T0 + DAY + 2 * MIN, 'app.session', '/menu', { durationSec: 300, screens: 2, client: 'app' }),
    // Owner on /stats: hidden.
    view('c', T0 + DAY, '/stats', 'x1'),
  ];
  const r = buildReport(events, [], { from: T0 - DAY, to: T0 + 5 * DAY });

  it('splits visits on 30-minute gaps and counts returning visitors', () => {
    expect(r.kpi.visitors).toBe(2);
    expect(r.kpi.visits).toBe(3);
    expect(r.kpi.returningVisitors).toBe(1);
    expect(r.kpi.newVisitors).toBe(1); // b; a first came before the range
    expect(r.kpi.views).toBe(6);
    expect(r.kpi.clicks).toBe(1);
  });

  it('times views by page.engaged, else by the gap to the next view', () => {
    const home = r.content.pages.find((p) => p.key === '/');
    expect(home.avgSec).toBe(40);
    const radio = r.content.pages.find((p) => p.key === '/radio');
    // v2: no engaged, 3 min to the next view; v4: 120 s engaged.
    expect(radio.views).toBe(2);
    expect(radio.avgSec).toBe(150);
    expect(radio.avgScrollPct).toBe(80);
    const radioSection = r.content.sections.find((s) => s.key === 'Радио SRC');
    expect(radioSection.returnVisitors).toBe(1);
  });

  it('tells site from app, channels, navigation and clicks apart', () => {
    expect(r.kpi.webVisitors).toBe(1);
    expect(r.kpi.appVisitors).toBe(1);
    expect(r.sources.channels.map((c) => c.key).sort()).toEqual(['Поиск', 'Прямые заходы', 'Приложение'].sort());
    expect(r.navigation.transitions.find((t) => t.key === '/ → /radio')?.count).toBe(1);
    expect(r.navigation.afterHome[0].key).toBe('Радио SRC');
    expect(r.clicks.rows[0]).toMatchObject({ path: '/radio', kind: 'tab', target: 'Teoria', count: 1 });
    expect(r.app).toMatchObject({ screenViews: 1, webViewPages: 1, sessions: 1, avgSessionSec: 300 });
    expect(r.content.pages.some((p) => p.key === '/stats')).toBe(false);
  });

  it('filters by client and excludes listed visitors', () => {
    const app = buildReport(events, [], { from: T0 - DAY, to: T0 + 5 * DAY, client: 'app' });
    expect(app.kpi.visitors).toBe(1);
    expect(app.kpi.views).toBe(2);
    const noA = buildReport(events, [], { from: T0 - DAY, to: T0 + 5 * DAY, excludeSessions: ['a'] });
    expect(noA.kpi.visitors).toBe(1);
  });
});

describe('labels', () => {
  it('maps routes to product sections', () => {
    expect(sectionOf('/')).toBe('Главная');
    expect(sectionOf('/pl')).toBe('Главная');
    expect(sectionOf('/simulator-v3/drills')).toBe('Тренажер трима');
    expect(sectionOf('/simulator')).toBe('Тренажер: Основы');
    expect(sectionOf('/radio/symulator')).toBe('Радио SRC');
    expect(sectionOf('/nowhere')).toBe('Прочее');
  });

  it('classifies referrers into channels', () => {
    expect(channelOf({ referrer: 'https://www.google.pl/', client: 'web' })).toBe('Поиск');
    expect(channelOf({ referrer: 'https://chatgpt.com/', client: 'web' })).toBe('ИИ-ассистенты');
    expect(channelOf({ referrer: 'https://t.me/', client: 'web' })).toBe('Мессенджеры');
    expect(channelOf({ referrer: 'https://weektoregatta.com/radio', client: 'web' })).toBe('Прямые заходы');
    expect(channelOf({ referrer: null, utmSource: 'fb', client: 'web' })).toBe('Кампании (utm)');
    expect(channelOf({ referrer: 'https://sailing-forum.example/', client: 'web' })).toBe('Ссылки с сайтов');
  });
});
