/**
 * Activity report for the local analytics dashboard (scripts/analytics/).
 *
 * Pure: takes the events and sessions pulled from production
 * (scripts/analytics/pull.mjs) and returns one JSON object with everything
 * the dashboard draws. No user data is involved: visitors are the anonymous
 * `regatta_sid` cookie, paths are our routes, clicks are routes or UI labels.
 *
 * Terms used below:
 * - visitor: one `regatta_sid` (one browser, or one app install);
 * - visit: a visitor's activity with no gap longer than 30 minutes;
 * - view: a page.view (web page or app WebView) or a screen.view (native app
 *   screen);
 * - time on a view: its page.engaged visible time; without one (under 5 s or
 *   the app was killed), the time until the next view of the same visit, up
 *   to 30 minutes; the last view of a visit without page.engaged counts 0.
 */

export const VISIT_GAP_MS = 30 * 60 * 1000;
const VIEW_GAP_CAP_MS = 30 * 60 * 1000;
const VISIT_MAX_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

const VIEW_EVENTS = new Set(['page.view', 'screen.view']);
const HIDDEN_PREFIXES = ['/stats', '/api/', '/_next'];

/** Product sections by route prefix (longest prefix wins). */
const SECTIONS = [
  ['/', 'Главная'],
  ['/menu', 'Меню (приложение)'],
  ['/start', 'Курс «С нуля»'],
  ['/bootcamp', 'Курс «С нуля»'],
  ['/learn', 'Уроки парусов'],
  ['/courses', 'Курсы к ветру'],
  ['/kursy', 'Курсы к ветру'],
  ['/racing', 'Гоночная тактика'],
  ['/rules', 'Правила (МППСС/RRS)'],
  ['/glossary', 'Глоссарий'],
  ['/anatomy', 'Устройство яхты'],
  ['/anatomy-offline', 'Устройство яхты'],
  ['/onboard', 'Первая неделя на борту'],
  ['/checklist', 'Чек-лист'],
  ['/library', 'Библиотека'],
  ['/simulator', 'Тренажер: Основы'],
  ['/simulator-v1', 'Тренажер: Основы'],
  ['/simulator-basics', 'Тренажер: Основы'],
  ['/simulator-v3', 'Тренажер трима'],
  ['/simulator2', 'Лодка 3D'],
  ['/simulators', 'Тренажеры (хаб)'],
  ['/quick', 'Быстрая практика'],
  ['/game', 'Гонка'],
  ['/race', 'Гонка'],
  ['/race-3d', 'Гонка'],
  ['/multiplayer', 'Мультиплеер'],
  ['/leaderboard', 'Таблица лидеров'],
  ['/history', 'История гонок'],
  ['/replay', 'Повторы'],
  ['/r', 'Повторы'],
  ['/radio', 'Радио SRC'],
  ['/sternik', 'Экзамен sternik'],
  ['/coach', 'ИИ-тренер'],
  ['/ask', 'ИИ-тренер'],
  ['/gallery', 'Галерея'],
  ['/spots', 'Акватории'],
  ['/settings', 'Настройки'],
  ['/diagnostics', 'Настройки'],
  ['/ads', 'Настройки'],
  ['/privacy', 'Служебные страницы'],
  ['/terms', 'Служебные страницы'],
  ['/support', 'Служебные страницы'],
  ['/feedback', 'Служебные страницы'],
].sort((a, b) => b[0].length - a[0].length);

export function sectionOf(path) {
  const p = typeof path === 'string' && path ? path : '/';
  if (p === '/') return 'Главная';
  for (const [prefix, name] of SECTIONS) {
    if (prefix === '/') continue;
    if (p === prefix || p.startsWith(`${prefix}/`)) return name;
  }
  // Short language links (/pl, /en ...) land on Home.
  if (/^\/[a-z]{2}$/.test(p)) return 'Главная';
  return 'Прочее';
}

/** Traffic channel of a visit from its first view's referrer and utm. */
export function channelOf({ referrer, utmSource, client }) {
  if (utmSource) return 'Кампании (utm)';
  let host = '';
  try {
    if (referrer) host = new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }
  if (!host || host.endsWith('weektoregatta.com')) return client === 'app' ? 'Приложение' : 'Прямые заходы';
  if (/(^|\.)apps\.apple\.com$|itunes\.apple\.com/.test(host)) return 'App Store';
  if (/(chatgpt|openai|perplexity|claude\.ai|copilot|gemini\.google|you\.com|phind)/.test(host)) return 'ИИ-ассистенты';
  if (/(google\.|bing\.|yandex\.|ya\.ru|duckduckgo|yahoo\.|ecosia|baidu|search\.brave|startpage|qwant|seznam|naver)/.test(host)) return 'Поиск';
  if (/(^t\.me$|telegram|whatsapp|messenger\.com|viber|discord|slack)/.test(host)) return 'Мессенджеры';
  if (/(facebook|fb\.|instagram|^t\.co$|twitter|^x\.com$|linkedin|reddit|vk\.com|youtube|youtu\.be|tiktok|pinterest|threads\.net|wykop)/.test(host)) return 'Соцсети';
  return 'Ссылки с сайтов';
}

export function refHost(referrer) {
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, '');
    return h.endsWith('weektoregatta.com') ? null : h;
  } catch {
    return null;
  }
}

function viewportBucket(vp) {
  const w = Number(String(vp ?? '').split('x')[0]);
  if (!Number.isFinite(w) || w <= 0) return 'неизвестно';
  if (w < 480) return 'телефон (<480)';
  if (w < 768) return 'большой телефон (480-767)';
  if (w < 1024) return 'планшет (768-1023)';
  if (w < 1440) return 'ноутбук (1024-1439)';
  return 'монитор (1440+)';
}

const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round1 = (x) => Math.round(x * 10) / 10;
const pct = (a, b) => (b > 0 ? round1((100 * a) / b) : 0);

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function weekKey(ts) {
  const d = new Date(ts);
  const wd = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - wd);
  return dayKey(monday.getTime());
}

class Counter {
  constructor() { this.m = new Map(); }
  add(key, row = {}) {
    let r = this.m.get(key);
    if (!r) { r = { key, n: 0, visitors: new Set(), visits: new Set() }; this.m.set(key, r); }
    r.n += 1;
    if (row.sid) r.visitors.add(row.sid);
    if (row.visit) r.visits.add(row.visit);
    return r;
  }
  rows(limit = Infinity, sortBy = 'visitors') {
    return [...this.m.values()]
      .map((r) => ({ key: r.key, count: r.n, visitors: r.visitors.size, visits: r.visits.size }))
      .sort((a, b) => b[sortBy] - a[sortBy] || b.count - a.count)
      .slice(0, limit);
  }
}

const DEPTH_ORDER = ['1 экран', '2 экрана', '3-4 экрана', '5-9 экранов', '10+ экранов'];
const VISITS_ORDER = ['1 визит', '2 визита', '3 визита', '4-5 визитов', '6-10 визитов', '11+ визитов'];
const GAP_ORDER = ['в тот же день', 'на следующий день', 'через 2-7 дней', 'через 8-30 дней', 'через месяц+'];
/** Histogram rows in their natural bucket order, empty buckets kept. */
function ordered(counter, order) {
  const byKey = new Map(counter.rows().map((r) => [r.key, r]));
  return order.map((key) => byKey.get(key) ?? { key, count: 0, visitors: 0, visits: 0 });
}

/** Client of an event: meta.client, else the client of its view, else web. */
function clientOfEvent(e, viewClient) {
  if (e.evt === 'screen.view' || e.evt === 'app.session') return 'app';
  const c = e.meta?.client;
  if (c === 'app' || c === 'web') return c;
  const viaView = e.meta?.viewId ? viewClient.get(e.meta.viewId) : undefined;
  return viaView ?? 'web';
}

/**
 * @param {Array<object>} allEvents pulled events (ts ascending not required)
 * @param {Array<object>} sessions pulled sessions table rows
 * @param {object} opts { from, to (ms), client: 'all'|'web'|'app', language, country, excludeSessions: string[] }
 */
export function buildReport(allEvents, sessions = [], opts = {}) {
  const from = Number.isFinite(opts.from) ? opts.from : -Infinity;
  const to = Number.isFinite(opts.to) ? opts.to : Infinity;
  const clientFilter = opts.client === 'web' || opts.client === 'app' ? opts.client : 'all';
  const langFilter = opts.language || '';
  const countryFilter = opts.country || '';
  const exclude = new Set(opts.excludeSessions ?? []);

  const sorted = allEvents
    .filter((e) => e && Number.isFinite(e.ts) && e.evt)
    .filter((e) => !exclude.has(e.sid))
    .filter((e) => !HIDDEN_PREFIXES.some((p) => (e.path ?? '').startsWith(p)))
    .sort((a, b) => a.ts - b.ts || (a.id ?? 0) - (b.id ?? 0));

  // Client of each view, so page.engaged and clicks inherit it.
  const viewClient = new Map();
  for (const e of sorted) {
    if (e.evt === 'page.view' && e.meta?.viewId) viewClient.set(e.meta.viewId, e.meta?.client === 'app' ? 'app' : 'web');
  }
  // First activity ever per visitor (all pulled data plus sessions.first_seen).
  const firstSeen = new Map();
  for (const s of sessions) if (s.id && Number.isFinite(s.first_seen)) firstSeen.set(s.id, s.first_seen);
  const languageOfSid = new Map();
  for (const e of sorted) {
    if (!e.sid) continue;
    const f = firstSeen.get(e.sid);
    if (f === undefined || e.ts < f) firstSeen.set(e.sid, e.ts);
    if (e.language) languageOfSid.set(e.sid, e.language);
  }
  for (const s of sessions) if (s.id && s.language && !languageOfSid.has(s.id)) languageOfSid.set(s.id, s.language);

  const inScope = (e) => {
    if (e.ts < from || e.ts > to) return false;
    if (clientFilter !== 'all' && clientOfEvent(e, viewClient) !== clientFilter) return false;
    if (countryFilter && e.country !== countryFilter) return false;
    if (langFilter) {
      const lang = e.language || languageOfSid.get(e.sid) || '';
      if (lang !== langFilter) return false;
    }
    return true;
  };
  const events = sorted.filter(inScope);
  const lastDataTs = sorted.length ? sorted[sorted.length - 1].ts : null;

  // ---- visits --------------------------------------------------------------
  const engagedByView = new Map();
  const scrollByView = new Map();
  for (const e of events) {
    if (e.evt === 'page.engaged' && e.meta?.viewId) {
      const ms = Number(e.meta.msOnPage);
      if (Number.isFinite(ms) && ms >= 0) engagedByView.set(e.meta.viewId, Math.min(ms, VIEW_GAP_CAP_MS));
      const sc = Number(e.meta.maxScrollPct);
      if (Number.isFinite(sc)) scrollByView.set(e.meta.viewId, Math.max(0, Math.min(100, sc)));
    }
  }

  const bySid = new Map();
  for (const e of events) {
    if (!e.sid || e.evt.startsWith('js.')) continue;
    let list = bySid.get(e.sid);
    if (!list) { list = []; bySid.set(e.sid, list); }
    list.push(e);
  }

  const visits = [];
  const visitsOfSid = new Map();
  for (const [sid, list] of bySid) {
    let cur = null;
    let lastTs = -Infinity;
    for (const e of list) {
      if (!cur || e.ts - lastTs > VISIT_GAP_MS) {
        cur = { id: `${sid}:${visits.length}`, sid, start: e.ts, end: e.ts, events: [], views: [] };
        visits.push(cur);
        if (!visitsOfSid.has(sid)) visitsOfSid.set(sid, []);
        visitsOfSid.get(sid).push(cur);
      }
      cur.events.push(e);
      cur.end = e.ts;
      if (VIEW_EVENTS.has(e.evt)) cur.views.push(e);
      lastTs = e.ts;
    }
  }

  // Number of each visit in the visitor's whole history (1 = first ever).
  // Visits before the range are not in `visits`, so count them from all data.
  const priorVisitCount = new Map();
  const priorLastTs = new Map();
  for (const e of sorted) {
    if (!e.sid || e.ts >= from || e.evt.startsWith('js.') || !visitsOfSid.has(e.sid)) continue;
    const last = priorLastTs.get(e.sid) ?? -Infinity;
    if (e.ts - last > VISIT_GAP_MS) priorVisitCount.set(e.sid, (priorVisitCount.get(e.sid) ?? 0) + 1);
    priorLastTs.set(e.sid, e.ts);
  }

  const viewRows = []; // one per view, with time, section, visit
  for (const v of visits) {
    const first = v.views[0] ?? v.events[0];
    v.client = clientOfEvent(first, viewClient);
    v.channel = channelOf({ referrer: first.referrer, utmSource: first.utm_source, client: v.client });
    v.refHost = refHost(first.referrer);
    v.utm = first.utm_source ? [first.utm_source, first.utm_medium, first.utm_campaign].filter(Boolean).join(' / ') : null;
    v.language = first.language || languageOfSid.get(v.sid) || 'неизвестно';
    v.country = first.country || 'неизвестно';
    v.device = first.device || 'неизвестно';
    let sumMs = 0;
    v.views.forEach((view, i) => {
      const next = v.views[i + 1];
      const engaged = view.meta?.viewId ? engagedByView.get(view.meta.viewId) : undefined;
      let ms = engaged;
      if (ms === undefined && next) {
        const gap = next.ts - view.ts;
        ms = gap <= VIEW_GAP_CAP_MS ? gap : undefined;
      }
      const row = {
        sid: v.sid, visit: v.id, ts: view.ts, path: view.path || '/', section: sectionOf(view.path),
        ms: ms ?? null, scroll: view.meta?.viewId ? scrollByView.get(view.meta.viewId) ?? null : null,
        isEntry: i === 0, isExit: i === v.views.length - 1, client: v.client, evt: view.evt,
        prev: i > 0 ? v.views[i - 1] : null,
      };
      if (ms) sumMs += ms;
      viewRows.push(row);
    });
    const appSessionMs = v.events.filter((e) => e.evt === 'app.session').reduce((a, e) => a + (Number(e.meta?.durationSec) || 0) * 1000, 0);
    v.durationMs = Math.min(VISIT_MAX_MS, Math.max(sumMs, v.end - v.start, appSessionMs));
    v.number = (priorVisitCount.get(v.sid) ?? 0) + visitsOfSid.get(v.sid).indexOf(v) + 1;
    v.bounce = v.views.length <= 1 && v.events.filter((e) => e.evt === 'ui.click').length === 0;
  }

  // ---- KPIs ---------------------------------------------------------------
  const visitors = new Set(visits.map((v) => v.sid));
  const newVisitors = [...visitors].filter((sid) => (firstSeen.get(sid) ?? 0) >= from);
  const returningVisitors = [...visitors].filter((sid) => (visitsOfSid.get(sid)?.length ?? 0) + (priorVisitCount.get(sid) ?? 0) >= 2);
  const durations = visits.map((v) => v.durationMs / 1000);
  const totalViews = viewRows.length;
  const kpi = {
    visitors: visitors.size,
    newVisitors: newVisitors.length,
    returningVisitors: returningVisitors.length,
    returningPct: pct(returningVisitors.length, visitors.size),
    visits: visits.length,
    views: totalViews,
    viewsPerVisit: visits.length ? round1(totalViews / visits.length) : 0,
    avgVisitSec: Math.round(durations.reduce((a, b) => a + b, 0) / Math.max(1, durations.length)),
    medianVisitSec: Math.round(median(durations)),
    totalHours: round1(durations.reduce((a, b) => a + b, 0) / 3600),
    bouncePct: pct(visits.filter((v) => v.bounce).length, visits.length),
    clicks: events.filter((e) => e.evt === 'ui.click').length,
    appVisitors: new Set(visits.filter((v) => v.client === 'app').map((v) => v.sid)).size,
    webVisitors: new Set(visits.filter((v) => v.client === 'web').map((v) => v.sid)).size,
  };

  // ---- daily series -------------------------------------------------------
  const days = new Map();
  const dayRow = (k) => {
    let r = days.get(k);
    if (!r) { r = { date: k, visitors: new Set(), visits: 0, views: 0, web: new Set(), app: new Set(), newVisitors: new Set() }; days.set(k, r); }
    return r;
  };
  for (const v of visits) {
    const r = dayRow(dayKey(v.start));
    r.visits += 1;
    r.visitors.add(v.sid);
    (v.client === 'app' ? r.app : r.web).add(v.sid);
    if (v.number === 1) r.newVisitors.add(v.sid);
  }
  for (const row of viewRows) dayRow(dayKey(row.ts)).views += 1;
  // Fill empty days inside the range so the chart shows gaps honestly.
  if (Number.isFinite(from) && Number.isFinite(to) && to - from <= 400 * DAY_MS) {
    for (let t = from; t <= to; t += DAY_MS) dayRow(dayKey(t));
  }
  const daily = [...days.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, visitors: r.visitors.size, visits: r.visits, views: r.views, web: r.web.size, app: r.app.size, newVisitors: r.newVisitors.size }));

  // ---- sources ------------------------------------------------------------
  const channels = new Counter();
  const refHosts = new Counter();
  const campaigns = new Counter();
  for (const v of visits) {
    channels.add(v.channel, { sid: v.sid, visit: v.id });
    if (v.refHost) refHosts.add(v.refHost, { sid: v.sid, visit: v.id });
    if (v.utm) campaigns.add(v.utm, { sid: v.sid, visit: v.id });
  }
  const channelQuality = channels.rows().map((c) => {
    const vs = visits.filter((v) => v.channel === c.key);
    return { ...c, avgVisitSec: Math.round(vs.reduce((a, v) => a + v.durationMs, 0) / Math.max(1, vs.length) / 1000), bouncePct: pct(vs.filter((v) => v.bounce).length, vs.length), viewsPerVisit: round1(vs.reduce((a, v) => a + v.views.length, 0) / Math.max(1, vs.length)) };
  });
  const appStoreClicks = new Counter();
  for (const e of events) if (e.evt === 'app_store.click') appStoreClicks.add(e.meta?.ct || 'без метки', { sid: e.sid });

  // ---- audience -----------------------------------------------------------
  const languages = new Counter();
  const countries = new Counter();
  const devices = new Counter();
  const models = new Counter();
  const oses = new Counter();
  const browsers = new Counter();
  const viewports = new Counter();
  const clients = new Counter();
  for (const v of visits) {
    const first = v.views[0] ?? v.events[0];
    languages.add(v.language, { sid: v.sid, visit: v.id });
    countries.add(v.country, { sid: v.sid, visit: v.id });
    devices.add(v.device, { sid: v.sid, visit: v.id });
    models.add(first.device_model || 'неизвестно', { sid: v.sid, visit: v.id });
    oses.add(first.os || 'неизвестно', { sid: v.sid, visit: v.id });
    browsers.add(v.client === 'app' ? 'Приложение iOS' : first.browser || 'неизвестно', { sid: v.sid, visit: v.id });
    viewports.add(viewportBucket(first.viewport), { sid: v.sid, visit: v.id });
    clients.add(v.client === 'app' ? 'Приложение iOS' : 'Сайт', { sid: v.sid, visit: v.id });
  }
  const languageTime = languages.rows().map((l) => {
    const vs = visits.filter((v) => v.language === l.key);
    return { ...l, avgVisitSec: Math.round(vs.reduce((a, v) => a + v.durationMs, 0) / Math.max(1, vs.length) / 1000) };
  });

  // ---- content ------------------------------------------------------------
  const agg = (keyFn) => {
    const m = new Map();
    for (const r of viewRows) {
      const k = keyFn(r);
      let a = m.get(k);
      if (!a) { a = { key: k, views: 0, visitors: new Set(), visits: new Set(), timeMs: 0, timed: 0, scroll: 0, scrolled: 0, entries: 0, exits: 0, bounces: 0, visitsBySid: new Map() }; m.set(k, a); }
      a.views += 1;
      a.visitors.add(r.sid);
      a.visits.add(r.visit);
      if (r.ms !== null) { a.timeMs += r.ms; a.timed += 1; }
      if (r.scroll !== null) { a.scroll += r.scroll; a.scrolled += 1; }
      if (r.isEntry) a.entries += 1;
      if (r.isExit) a.exits += 1;
      if (r.isEntry && r.isExit) a.bounces += 1;
      if (!a.visitsBySid.has(r.sid)) a.visitsBySid.set(r.sid, new Set());
      a.visitsBySid.get(r.sid).add(r.visit);
    }
    return [...m.values()].map((a) => {
      const comeBack = [...a.visitsBySid.values()].filter((s) => s.size >= 2).length;
      return {
        key: a.key,
        views: a.views,
        visitors: a.visitors.size,
        visits: a.visits.size,
        visitorSharePct: pct(a.visitors.size, visitors.size),
        totalMin: round1(a.timeMs / 60000),
        avgSec: a.timed ? Math.round(a.timeMs / a.timed / 1000) : null,
        avgScrollPct: a.scrolled ? Math.round(a.scroll / a.scrolled) : null,
        entries: a.entries,
        exits: a.exits,
        exitPct: pct(a.exits, a.views),
        bouncePct: pct(a.bounces, a.entries),
        returnVisitors: comeBack,
        returnPct: pct(comeBack, a.visitors.size),
      };
    });
  };
  const sections = agg((r) => r.section).sort((a, b) => b.visitors - a.visitors || b.views - a.views);
  const pages = agg((r) => r.path).sort((a, b) => b.views - a.views).slice(0, 80);

  // ---- navigation ---------------------------------------------------------
  const entries = new Counter();
  const exits = new Counter();
  const transitions = new Counter();
  const sectionFlows = new Counter();
  for (const r of viewRows) {
    if (r.isEntry) entries.add(r.path, { sid: r.sid, visit: r.visit });
    if (r.isExit) exits.add(r.path, { sid: r.sid, visit: r.visit });
    if (r.prev && (r.prev.path || '/') !== r.path) {
      transitions.add(`${r.prev.path || '/'} → ${r.path}`, { sid: r.sid, visit: r.visit });
      const a = sectionOf(r.prev.path);
      if (a !== r.section) sectionFlows.add(`${a} → ${r.section}`, { sid: r.sid, visit: r.visit });
    }
  }
  // Where people go right after Home.
  const afterHome = new Counter();
  for (const r of viewRows) if (r.prev && sectionOf(r.prev.path) === 'Главная' && r.section !== 'Главная') afterHome.add(r.section, { sid: r.sid, visit: r.visit });
  const depth = new Counter();
  for (const v of visits) {
    const n = v.views.length;
    depth.add(n <= 1 ? '1 экран' : n === 2 ? '2 экрана' : n <= 4 ? '3-4 экрана' : n <= 9 ? '5-9 экранов' : '10+ экранов', { sid: v.sid, visit: v.id });
  }

  // ---- clicks -------------------------------------------------------------
  const clicks = new Counter();
  const clickKinds = new Counter();
  const clicksBySection = new Counter();
  for (const e of events) {
    if (e.evt !== 'ui.click') continue;
    const kind = e.meta?.kind || 'button';
    const target = e.meta?.target || '?';
    clicks.add(`${e.path || '/'}\u0000${kind}\u0000${target}`, { sid: e.sid });
    clickKinds.add(kind, { sid: e.sid });
    clicksBySection.add(sectionOf(e.path), { sid: e.sid });
  }
  const clickRows = clicks.rows(120, 'count').map((r) => {
    const [path, kind, target] = r.key.split('\u0000');
    return { path, kind, target, count: r.count, visitors: r.visitors };
  });

  // ---- retention ----------------------------------------------------------
  const visitHist = new Counter();
  const gapHist = new Counter();
  for (const sid of visitors) {
    const n = (visitsOfSid.get(sid)?.length ?? 0) + (priorVisitCount.get(sid) ?? 0);
    visitHist.add(n === 1 ? '1 визит' : n === 2 ? '2 визита' : n === 3 ? '3 визита' : n <= 5 ? '4-5 визитов' : n <= 10 ? '6-10 визитов' : '11+ визитов', { sid });
    const vs = visitsOfSid.get(sid) ?? [];
    for (let i = 1; i < vs.length; i += 1) {
      const d = (vs[i].start - vs[i - 1].end) / DAY_MS;
      gapHist.add(d < 1 ? 'в тот же день' : d < 2 ? 'на следующий день' : d < 8 ? 'через 2-7 дней' : d < 31 ? 'через 8-30 дней' : 'через месяц+', { sid });
    }
  }
  // Weekly cohorts by first-ever activity; cell = % of the cohort active in week N.
  const cohortMap = new Map();
  for (const sid of visitors) {
    const f = firstSeen.get(sid);
    if (f === undefined || f < from) continue;
    const ck = weekKey(f);
    if (!cohortMap.has(ck)) cohortMap.set(ck, { week: ck, sids: new Set(), active: new Map() });
    const c = cohortMap.get(ck);
    c.sids.add(sid);
    for (const v of visitsOfSid.get(sid) ?? []) {
      const n = Math.floor((new Date(weekKey(v.start)).getTime() - new Date(ck).getTime()) / (7 * DAY_MS) + 0.5);
      if (n < 0 || n > 8) continue;
      if (!c.active.has(n)) c.active.set(n, new Set());
      c.active.get(n).add(sid);
    }
  }
  const cohorts = [...cohortMap.values()].sort((a, b) => a.week.localeCompare(b.week)).map((c) => ({
    week: c.week,
    size: c.sids.size,
    weeks: Array.from({ length: 9 }, (_, n) => (c.active.has(n) ? pct(c.active.get(n).size, c.sids.size) : null)),
  }));
  // What returning visits are made of, against first visits.
  const visitById = new Map(visits.map((v) => [v.id, v]));
  const firstVsReturn = new Map();
  for (const r of viewRows) {
    const v = visitById.get(r.visit);
    const kind = v && v.number > 1 ? 'ret' : 'first';
    if (!firstVsReturn.has(r.section)) firstVsReturn.set(r.section, { section: r.section, first: 0, ret: 0 });
    firstVsReturn.get(r.section)[kind] += 1;
  }
  const firstViews = viewRows.filter((r) => (visitById.get(r.visit)?.number ?? 1) === 1).length;
  const retViews = viewRows.length - firstViews;
  const returnMix = [...firstVsReturn.values()]
    .map((x) => ({ section: x.section, firstPct: pct(x.first, firstViews), returnPct: pct(x.ret, retViews), first: x.first, ret: x.ret }))
    .sort((a, b) => b.ret - a.ret || b.first - a.first);

  // ---- time of day --------------------------------------------------------
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const v of visits) {
    const d = new Date(v.start);
    heat[(d.getDay() + 6) % 7][d.getHours()] += 1;
  }

  // ---- funnels ------------------------------------------------------------
  const count = (pred) => events.filter(pred).length;
  const uniq = (pred) => new Set(events.filter(pred).map((e) => e.sid)).size;
  const exams = ['sternik', 'src'].map((base) => {
    const starts = (e) => e.evt === 'exam.start' && e.meta?.base === base;
    const fins = (e) => e.evt === 'exam.finish' && e.meta?.base === base;
    const finished = events.filter(fins);
    return {
      base,
      starts: count(starts),
      startVisitors: uniq(starts),
      finishes: finished.length,
      passed: finished.filter((e) => e.meta?.passed === true).length,
      avgScorePct: finished.length ? Math.round(finished.reduce((a, e) => a + (100 * (Number(e.meta?.score) || 0)) / Math.max(1, Number(e.meta?.total) || 1), 0) / finished.length) : null,
    };
  });
  const lessons = new Counter();
  for (const e of events) if (e.evt === 'lesson.complete') lessons.add(`${e.meta?.course || '?'} / ${e.meta?.lessonId || '?'}`, { sid: e.sid });
  const lessonCourses = new Counter();
  for (const e of events) if (e.evt === 'lesson.complete') lessonCourses.add(e.meta?.course || '?', { sid: e.sid });
  const radioTasks = new Counter();
  for (const e of events) if (e.evt === 'radio.task.complete') radioTasks.add(e.meta?.taskId || '?', { sid: e.sid });
  const raceStep = (evt, extra = () => true) => ({
    all: count((e) => e.evt === evt && extra(e)),
    visitors: uniq((e) => e.evt === evt && extra(e)),
    firstRace: count((e) => e.evt === evt && Number(e.meta?.raceNo) === 1 && extra(e)),
  });
  const race = {
    countdown: raceStep('race.countdown'),
    firstTack: raceStep('race.first_tack'),
    firstMark: raceStep('race.first_mark'),
    ended: raceStep('race.end'),
    finished: raceStep('race.end', (e) => e.meta?.finished === true),
    saved: { all: count((e) => e.evt === 'race.finish'), visitors: uniq((e) => e.evt === 'race.finish'), firstRace: null },
    replays: { all: count((e) => e.evt === 'race.replay'), visitors: uniq((e) => e.evt === 'race.replay'), firstRace: null },
  };
  const raceModes = new Counter();
  for (const e of events) if (e.evt === 'race.countdown') raceModes.add([e.meta?.mode, e.meta?.difficulty, e.meta?.wind].filter(Boolean).join(' / ') || '?', { sid: e.sid });
  const coach = { requests: count((e) => e.evt === 'coach.requested'), visitors: uniq((e) => e.evt === 'coach.requested') };

  // ---- native app ---------------------------------------------------------
  const screens = new Counter();
  for (const e of events) if (e.evt === 'screen.view') screens.add(e.path || '/', { sid: e.sid });
  const appSessions = events.filter((e) => e.evt === 'app.session');
  const app = {
    screenViews: count((e) => e.evt === 'screen.view'),
    webViewPages: count((e) => e.evt === 'page.view' && clientOfEvent(e, viewClient) === 'app'),
    sessions: appSessions.length,
    avgSessionSec: appSessions.length ? Math.round(appSessions.reduce((a, e) => a + (Number(e.meta?.durationSec) || 0), 0) / appSessions.length) : null,
    medianSessionSec: appSessions.length ? Math.round(median(appSessions.map((e) => Number(e.meta?.durationSec) || 0))) : null,
    avgScreens: appSessions.length ? round1(appSessions.reduce((a, e) => a + (Number(e.meta?.screens) || 0), 0) / appSessions.length) : null,
    versions: (() => {
      const c = new Counter();
      for (const e of events) if (clientOfEvent(e, viewClient) === 'app' && e.app_version) c.add(e.app_version, { sid: e.sid });
      return c.rows(10);
    })(),
    topScreens: screens.rows(40, 'count'),
  };

  // ---- errors -------------------------------------------------------------
  const errors = new Counter();
  for (const e of events) {
    if (!e.evt.startsWith('js.')) continue;
    const msg = String(e.meta?.msg ?? e.meta?.reason ?? e.meta?.message ?? '?').slice(0, 120);
    errors.add(`${e.path || '/'}\u0000${msg}`, { sid: e.sid });
  }
  const errorRows = errors.rows(20, 'count').map((r) => {
    const [path, msg] = r.key.split('\u0000');
    return { path, msg, count: r.count, visitors: r.visitors };
  });

  // ---- what to develop: a simple score per section ------------------------
  const maxVisitors = Math.max(1, ...sections.map((s) => s.visitors));
  const maxTime = Math.max(1, ...sections.map((s) => s.totalMin));
  const focus = sections
    .filter((s) => s.key !== 'Главная' && s.key !== 'Прочее' && s.key !== 'Служебные страницы' && s.key !== 'Настройки')
    .map((s) => ({
      section: s.key,
      reach: Math.round((100 * s.visitors) / maxVisitors),
      depth: Math.round((100 * s.totalMin) / maxTime),
      returnPct: s.returnPct,
      exitPct: s.exitPct,
      score: Math.round(0.4 * ((100 * s.visitors) / maxVisitors) + 0.35 * ((100 * s.totalMin) / maxTime) + 0.25 * s.returnPct),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    generatedAt: Date.now(),
    lastDataTs,
    range: { from: Number.isFinite(from) ? from : null, to: Number.isFinite(to) ? to : null, client: clientFilter, language: langFilter, country: countryFilter },
    kpi,
    daily,
    sources: { channels: channelQuality, refHosts: refHosts.rows(30), campaigns: campaigns.rows(30), appStoreClicks: appStoreClicks.rows(20, 'count') },
    audience: {
      languages: languageTime,
      countries: countries.rows(40),
      devices: devices.rows(),
      models: models.rows(20),
      oses: oses.rows(),
      browsers: browsers.rows(),
      viewports: viewports.rows(),
      clients: clients.rows(),
    },
    content: { sections, pages, focus },
    navigation: {
      entries: entries.rows(25, 'count'),
      exits: exits.rows(25, 'count'),
      transitions: transitions.rows(40, 'count'),
      sectionFlows: sectionFlows.rows(40, 'count'),
      afterHome: afterHome.rows(20, 'count'),
      depth: ordered(depth, DEPTH_ORDER),
    },
    clicks: { rows: clickRows, kinds: clickKinds.rows(), bySection: clicksBySection.rows(30, 'count') },
    retention: { visitHist: ordered(visitHist, VISITS_ORDER), gapHist: ordered(gapHist, GAP_ORDER), cohorts, returnMix },
    time: { heat },
    funnels: { exams, lessons: lessons.rows(40, 'count'), lessonCourses: lessonCourses.rows(), radioTasks: radioTasks.rows(30, 'count'), race, raceModes: raceModes.rows(20, 'count'), coach },
    app,
    errors: errorRows,
    filters: {
      languages: [...new Set(sorted.map((e) => e.language).filter(Boolean))].sort(),
      countries: [...new Set(sorted.map((e) => e.country).filter(Boolean))].sort(),
    },
  };
}
