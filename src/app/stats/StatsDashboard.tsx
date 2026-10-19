'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Must match the shape of RangeMetrics in src/lib/db.ts
interface RangeMetrics {
  range: { fromMs: number; toMs: number };
  events: number;
  pageViews: number;
  uniqueSessions: number;
  uniqueIps: number;
  feedbackNew: number;
  bugsNew: number;
  jsErrors: number;
  topPaths: Array<{ path: string; count: number }>;
  topEvents: Array<{ evt: string; count: number }>;
  topIps: Array<{ ip: string; count: number }>;
  topReferrers: Array<{ ref: string; count: number }>;
  deviceSplit: Array<{ device: string; count: number }>;
  deviceModelSplit?: Array<{ device_model: string; count: number }>;
  browserSplit: Array<{ browser: string; count: number }>;
  osSplit: Array<{ os: string; count: number }>;
  viewportSplit: Array<{ viewport: string; count: number }>;
  languageSplit: Array<{ language: string; count: number }>;
  countrySplit?: Array<{ country: string; count: number }>;
  utmSourceSplit?: Array<{ utm_source: string; count: number }>;
  utmCampaignSplit?: Array<{ utm_campaign: string; count: number }>;
  funnel?: {
    clientSplit: Array<{ client: string; count: number }>;
    exams: Array<{ base: string; started: number; finished: number; passed: number; avgScorePct: number }>;
    lessons: Array<{ course: string; count: number }>;
    radioTasks: number;
    appStoreClicks: Array<{ ct: string; count: number }>;
  };
  hourly: Array<{ hour: string; events: number; pageViews: number }>;
  daily: Array<{ day: string; events: number; pageViews: number; uniqueSessions: number }>;
  visits: number;
  pagesPerVisit: number;
  bounceRate: number;
  medianVisitSeconds: number;
  p90VisitSeconds: number;
  returningVisitorPct: number;
  avgMsSinceStart?: number;
  medianMsSinceStart?: number;
  recent: Array<{ ts: number; evt: string; path: string | null; ip: string | null; device: string | null; lang: string | null; country?: string | null; device_model?: string | null }>;
}

type Preset = '1h' | '24h' | '7d' | '30d' | 'today' | 'custom';

function nowRange(preset: Preset): [Date, Date] {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case '1h':
      from.setTime(to.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      from.setTime(to.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      from.setTime(to.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      from.setTime(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'today':
      from.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      break;
  }
  return [from, to];
}

function isoLocal(d: Date): string {
  // yyyy-MM-ddTHH:mm for datetime-local input
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function StatsDashboard() {
  const [preset, setPreset] = useState<Preset>('24h');
  const [fromInput, setFromInput] = useState<string>(() => isoLocal(nowRange('24h')[0]));
  const [toInput, setToInput] = useState<string>(() => isoLocal(nowRange('24h')[1]));
  const [live, setLive] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<RangeMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const firstRenderRef = useRef(true);

  // Load preset -> inputs when user picks a button (but not on first render)
  useEffect(() => {
    if (firstRenderRef.current) { firstRenderRef.current = false; return; }
    if (preset === 'custom') return;
    const [f, t] = nowRange(preset);
    setFromInput(isoLocal(f));
    setToInput(isoLocal(t));
  }, [preset]);

  const fetchMetrics = useCallback(async () => {
    try {
      const fromMs = new Date(fromInput).getTime();
      const toMs = new Date(toInput).getTime();
      if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
        setError('Invalid date range');
        return;
      }
      const url = `/api/admin/stats-range?from=${encodeURIComponent(new Date(fromMs).toISOString())}&to=${encodeURIComponent(new Date(toMs).toISOString())}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) {
        setError(`HTTP ${r.status}`);
        return;
      }
      const data = (await r.json()) as RangeMetrics;
      setMetrics(data);
      setError(null);
      setLastFetch(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch error');
    } finally {
      setLoading(false);
    }
  }, [fromInput, toInput]);

  // Initial + manual-refresh
  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // Auto-refresh. In "live" mode for presets 1h/24h/today we also slide
  // the `to` side to now so the view keeps up with incoming events.
  useEffect(() => {
    if (!live) return;
    const tick = () => {
      if (preset === '1h' || preset === '24h' || preset === 'today') {
        const [f, t] = nowRange(preset);
        setFromInput(isoLocal(f));
        setToInput(isoLocal(t));
      } else {
        // Non-sliding preset - just re-fetch the current range
        fetchMetrics();
      }
    };
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [live, preset, fetchMetrics]);

  // When inputs change (either by user or by sliding ticker), re-fetch
  // (fetchMetrics is already in its own effect on [fromInput, toInput])

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {(['1h', '24h', 'today', '7d', '30d', 'custom'] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: preset === p ? 'rgba(0, 212, 255, 0.18)' : 'var(--hover-bg)',
                color: preset === p ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: `1px solid ${preset === p ? 'rgba(0, 212, 255, 0.32)' : 'var(--border-subtle)'}`,
              }}
            >
              {presetLabel(p)}
            </button>
          ))}
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="accent-[var(--accent-cyan)]" />
            <span className="font-semibold" style={{ color: live ? 'var(--success)' : 'var(--text-muted)' }}>
              {live ? '● LIVE (15s)' : '○ Live off'}
            </span>
          </label>
          <button
            onClick={() => fetchMetrics()}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={{
              background: 'rgba(0, 212, 255, 0.1)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
            }}
          >
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <span className="text-[var(--text-muted)]">from</span>
            <input
              type="datetime-local"
              value={fromInput}
              onChange={(e) => { setFromInput(e.target.value); setPreset('custom'); }}
              className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-[var(--text-muted)]">to</span>
            <input
              type="datetime-local"
              value={toInput}
              onChange={(e) => { setToInput(e.target.value); setPreset('custom'); }}
              className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs"
            />
          </label>
          {lastFetch && (
            <span className="text-[var(--text-muted)]">
              updated {lastFetch.toLocaleTimeString()}
            </span>
          )}
          {error && (
            <span style={{ color: 'var(--danger)' }}>err: {error}</span>
          )}
        </div>
      </div>

      {!metrics ? (
        <div className="card p-8 text-center text-[var(--text-muted)]">Loading…</div>
      ) : (
        <>
          {/* Top-line KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <Kpi label="Events"          value={metrics.events.toLocaleString()} />
            <Kpi label="Page views"      value={metrics.pageViews.toLocaleString()} accent />
            <Kpi label="Visitors (sid)"  value={metrics.uniqueSessions.toLocaleString()} />
            <Kpi label="Unique IPs"      value={metrics.uniqueIps.toLocaleString()} />
            <Kpi label="JS errors"       value={metrics.jsErrors.toLocaleString()} tone={metrics.jsErrors > 0 ? 'danger' : undefined} />
            <Kpi label="Feedback new"    value={metrics.feedbackNew.toLocaleString()} />
            <Kpi label="Bugs new"        value={metrics.bugsNew.toLocaleString()} tone={metrics.bugsNew > 0 ? 'warn' : undefined} />
            <Kpi label="1-page visits"   value={`${(metrics.bounceRate * 100).toFixed(0)}%`} tone={metrics.bounceRate > 0.7 ? 'warn' : undefined} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Visits" value={metrics.visits.toLocaleString()} />
            <Kpi label="Pages / visit" value={metrics.pagesPerVisit.toFixed(1)} />
            <Kpi label="Median visit" value={formatDuration(metrics.medianVisitSeconds)} />
            <Kpi label="Visit p90" value={formatDuration(metrics.p90VisitSeconds)} />
            <Kpi label="Returning visitors" value={`${(metrics.returningVisitorPct * 100).toFixed(0)}%`} />
            <Kpi label="Range" value={`${formatRange(metrics.range.fromMs, metrics.range.toMs)}`} />
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            A visitor is one browser cookie (regatta_sid, kept a year). A visit ends after 30 min without a page view;
            its length runs from the first to the last page view, so a 1-page visit counts as 0 s.
            Returning: 2+ visits in the range, or first seen before it. Automated browsers (webdriver, HeadlessChrome,
            our Playwright runs) are not recorded from the analytics release of 2026-10-19 on. Ranges that include
            earlier days still count them (about half of all page views before then) until those rows are cleaned up.
          </p>

          {/* Hourly chart */}
          <Panel title="Events timeline">
            <TimeChart data={metrics.hourly} bucket="hour" />
          </Panel>

          {/* Paths + Events + IPs + Referrers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Top pages">
              <Bars items={metrics.topPaths.map((p) => ({ label: p.path, value: p.count }))} />
            </Panel>
            <Panel title="Top events">
              <Bars items={metrics.topEvents.map((e) => ({ label: e.evt, value: e.count }))} />
            </Panel>
            <Panel title="Top IPs (unique visitors)">
              <Bars items={metrics.topIps.map((r) => ({ label: maskIp(r.ip), value: r.count }))} />
            </Panel>
            <Panel title="Top referrers">
              <Bars items={metrics.topReferrers.map((r) => ({ label: shortenRef(r.ref), value: r.count }))} />
            </Panel>
          </div>

          {/* Device / browser / OS / viewport / lang */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Panel title="Devices"><Distribution items={metrics.deviceSplit.map((d) => ({ label: d.device, value: d.count }))} /></Panel>
            <Panel title="Browsers"><Distribution items={metrics.browserSplit.map((b) => ({ label: b.browser, value: b.count }))} /></Panel>
            <Panel title="OS"><Distribution items={metrics.osSplit.map((o) => ({ label: o.os, value: o.count }))} /></Panel>
            <Panel title="Viewports"><Distribution items={metrics.viewportSplit.map((v) => ({ label: v.viewport, value: v.count }))} topN={5} /></Panel>
            <Panel title="Languages"><Distribution items={metrics.languageSplit.map((l) => ({ label: l.language, value: l.count }))} /></Panel>
          </div>

          {/* Country / Device-model / UTM (2026-04-25) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Panel title="Countries (country code)">
              {metrics.countrySplit && metrics.countrySplit.length > 0 ? (
                <Distribution items={metrics.countrySplit.map((c) => ({ label: c.country, value: c.count }))} topN={15} />
              ) : (
                <EmptyHint text="No country data in this range. /api/log looks the country up from the truncated IP (fast-geoip) unless a cf-ipcountry or x-country-code header is present; the server log warns once if the lookup is broken." />
              )}
            </Panel>
            <Panel title="Device models">
              {metrics.deviceModelSplit && metrics.deviceModelSplit.length > 0 ? (
                <Distribution items={metrics.deviceModelSplit.map((d) => ({ label: d.device_model, value: d.count }))} topN={15} />
              ) : (
                <EmptyHint text="Device models appear after the next deploy - ua-parser-js parses them from UA on every event." />
              )}
            </Panel>
            <Panel title="Traffic sources (utm_source / campaign)">
              {((metrics.utmSourceSplit && metrics.utmSourceSplit.length > 0) ||
                (metrics.utmCampaignSplit && metrics.utmCampaignSplit.length > 0)) ? (
                <>
                  {metrics.utmSourceSplit && metrics.utmSourceSplit.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">utm_source</div>
                      <Distribution items={metrics.utmSourceSplit.map((u) => ({ label: u.utm_source, value: u.count }))} topN={10} />
                    </div>
                  )}
                  {metrics.utmCampaignSplit && metrics.utmCampaignSplit.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">utm_campaign</div>
                      <Distribution items={metrics.utmCampaignSplit.map((u) => ({ label: u.utm_campaign, value: u.count }))} topN={10} />
                    </div>
                  )}
                </>
              ) : (
                <EmptyHint text="No UTM-tagged visits yet. Share links with ?utm_source=twitter etc. to populate." />
              )}
            </Panel>
          </div>

          {/* Funnel (2026-10-18): app vs web, exams, lessons, App Store clicks */}
          {metrics.funnel && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <Panel title="Page views: app vs web">
                <Distribution items={metrics.funnel.clientSplit.map((c) => ({ label: c.client, value: c.count }))} />
              </Panel>
              <Panel title="Mock exams">
                {metrics.funnel.exams.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {metrics.funnel.exams.map((x) => (
                      <div key={x.base}>
                        <div className="font-semibold text-[var(--text-primary)]">{x.base}</div>
                        <div className="text-[var(--text-secondary)] tabular-nums">
                          started {x.started} · finished {x.finished} · passed {x.passed} · avg {x.avgScorePct}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyHint text="No exam.start / exam.finish events in this range." />
                )}
              </Panel>
              <Panel title="Lessons completed">
                <Distribution items={metrics.funnel.lessons.map((l) => ({ label: l.course, value: l.count }))} />
                <div className="mt-2 text-xs text-[var(--text-secondary)] tabular-nums">radio tasks: {metrics.funnel.radioTasks}</div>
              </Panel>
              <Panel title="App Store clicks (ct)">
                <Distribution items={metrics.funnel.appStoreClicks.map((a) => ({ label: a.ct, value: a.count }))} />
              </Panel>
              <p className="lg:col-span-4 text-[11px] leading-relaxed text-[var(--text-muted)]">
                Funnel counts are reported by the browser (/api/log), so a visitor can send them by hand; treat them as
                trends, not exact numbers. The app&apos;s offline SRC radio course (its default mode) runs from a local
                file and never reaches /api/log: its lessons, simulator tasks and exam starts are missing here, and only
                its finished exams reach the app&apos;s own analytics (PostHog).
              </p>
            </div>
          )}

          {/* Time-on-page (ms_since_start) */}
          {(metrics.avgMsSinceStart !== undefined || metrics.medianMsSinceStart !== undefined) && (
            <div className="grid grid-cols-2 gap-3">
              <Kpi
                label="Avg time into session (s)"
                value={metrics.avgMsSinceStart && metrics.avgMsSinceStart > 0 ? (metrics.avgMsSinceStart / 1000).toFixed(1) : '-'}
              />
              <Kpi
                label="Median time into session (s)"
                value={metrics.medianMsSinceStart && metrics.medianMsSinceStart > 0 ? (metrics.medianMsSinceStart / 1000).toFixed(1) : '-'}
              />
            </div>
          )}

          {/* Live event feed */}
          <Panel title={`Live events (most recent ${metrics.recent.length})`}>
            <LiveFeed items={metrics.recent} />
          </Panel>
        </>
      )}
    </div>
  );
}

// ---------- sub-components ----------

function Kpi({ label, value, accent, tone }: { label: string; value: string; accent?: boolean; tone?: 'warn' | 'danger' }) {
  const color = tone === 'danger' ? 'var(--danger)'
    : tone === 'warn' ? 'var(--warning)'
    : accent ? 'var(--accent-cyan)'
    : 'var(--text-primary)';
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="text-lg sm:text-xl font-bold mt-1 font-mono" style={{ color }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-3">{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function Bars({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) {
    return <div className="text-xs text-[var(--text-muted)]">Нет данных</div>;
  }
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="text-xs text-[var(--text-secondary)] w-1/2 truncate" title={it.label}>{it.label}</div>
          <div className="flex-1 h-5 rounded overflow-hidden relative" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="h-full" style={{ width: `${(it.value / max) * 100}%`, background: 'linear-gradient(90deg, rgba(0,212,255,0.6), rgba(0,212,255,0.3))' }} />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono">{it.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const DIST_COLORS = ['#00d4ff', '#44ff88', '#ffaa00', '#8844ff', '#ff6688', '#aaaaff'];

function Distribution({ items, topN = 6 }: { items: { label: string; value: number }[]; topN?: number }) {
  if (items.length === 0) {
    return <div className="text-xs text-[var(--text-muted)]">Нет данных</div>;
  }
  const shown = items.slice(0, topN);
  const total = Math.max(1, shown.reduce((s, i) => s + i.value, 0));
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
        {shown.map((it, idx) => (
          <div key={idx} style={{ width: `${(it.value / total) * 100}%`, background: DIST_COLORS[idx % DIST_COLORS.length] }} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-0.5 text-[11px]">
        {shown.map((it, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: DIST_COLORS[idx % DIST_COLORS.length] }} />
            <span className="text-[var(--text-secondary)] truncate">{it.label}</span>
            <span className="text-[var(--text-muted)] font-mono ml-auto">{((it.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeChart({ data, bucket }: { data: { hour?: string; day?: string; events: number; pageViews: number }[]; bucket: 'hour' | 'day' }) {
  if (data.length === 0) {
    return <div className="text-xs text-[var(--text-muted)]">Нет событий за период</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.events));
  return (
    <div>
      <div className="flex items-end gap-0.5 h-32" style={{ background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 6 }}>
        {data.map((d, idx) => (
          <div
            key={idx}
            className="flex-1 relative group"
            style={{ minWidth: 3 }}
            title={`${bucket === 'hour' ? d.hour : d.day}: ${d.events} events, ${d.pageViews} page-views`}
          >
            <div className="w-full rounded-sm" style={{
              height: `${(d.events / max) * 100}%`,
              background: 'linear-gradient(180deg, rgba(0,212,255,0.9), rgba(0,212,255,0.4))',
            }} />
            <div className="absolute bottom-0 w-full rounded-sm" style={{
              height: `${(d.pageViews / max) * 100}%`,
              background: 'linear-gradient(180deg, rgba(68,255,136,0.9), rgba(68,255,136,0.3))',
              opacity: 0.7,
              pointerEvents: 'none',
            }} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[10px] mt-1.5 text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(0,212,255,0.7)' }} /> all events</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(68,255,136,0.7)' }} /> page.views</span>
        <span className="ml-auto">{data.length} {bucket === 'hour' ? 'hours' : 'days'}</span>
      </div>
    </div>
  );
}

function LiveFeed({ items }: { items: RangeMetrics['recent'] }) {
  if (items.length === 0) {
    return <div className="text-xs text-[var(--text-muted)]">Тихо, событий пока нет.</div>;
  }
  return (
    <div className="font-mono text-[11px] overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <th className="text-left py-1 pr-3">Time</th>
            <th className="text-left py-1 pr-3">Event</th>
            <th className="text-left py-1 pr-3">Path</th>
            <th className="text-left py-1 pr-3">IP</th>
            <th className="text-left py-1 pr-3">Country</th>
            <th className="text-left py-1 pr-3">Device</th>
            <th className="text-left py-1 pr-3">Model</th>
            <th className="text-left py-1 pr-3">Lang</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={i} className="border-t border-[rgba(0,212,255,0.08)]">
              <td className="py-1 pr-3 text-[var(--text-muted)]">{new Date(r.ts).toLocaleTimeString()}</td>
              <td className="py-1 pr-3" style={{ color: eventColor(r.evt) }}>{r.evt}</td>
              <td className="py-1 pr-3 text-[var(--text-secondary)] truncate max-w-[140px]" title={r.path ?? ''}>{r.path ?? '-'}</td>
              <td className="py-1 pr-3 text-[var(--text-muted)]">{r.ip ? maskIp(r.ip) : '-'}</td>
              <td className="py-1 pr-3 text-[var(--text-muted)]">{r.country ?? '-'}</td>
              <td className="py-1 pr-3 text-[var(--text-muted)]">{r.device ?? '-'}</td>
              <td className="py-1 pr-3 text-[var(--text-muted)] truncate max-w-[120px]" title={r.device_model ?? ''}>{r.device_model ?? '-'}</td>
              <td className="py-1 pr-3 text-[var(--text-muted)]">{r.lang ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-[11px] text-[var(--text-muted)] leading-relaxed py-2">
      {text}
    </div>
  );
}

// ---------- helpers ----------

function presetLabel(p: Preset): string {
  switch (p) {
    case '1h': return '1 час';
    case '24h': return '24 часа';
    case 'today': return 'Сегодня';
    case '7d': return '7 дней';
    case '30d': return '30 дней';
    case 'custom': return 'Custom';
  }
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function formatRange(from: number, to: number): string {
  const hours = (to - from) / 3600_000;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function maskIp(ip: string): string {
  // IPv4: 1.2.3.4 -> 1.2.3.x
  const m4 = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (m4) return `${m4[1]}.x`;
  // IPv6: show first 4 groups only
  if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + '::x';
  return ip;
}

function shortenRef(ref: string): string {
  if (!ref || ref === '(direct)') return '(direct)';
  try {
    const u = new URL(ref);
    return u.hostname + (u.pathname === '/' ? '' : u.pathname.slice(0, 20));
  } catch {
    return ref.slice(0, 40);
  }
}

function eventColor(evt: string): string {
  if (evt === 'page.view') return 'var(--success)';
  if (evt.startsWith('js.')) return 'var(--danger)';
  if (evt.includes('feedback') || evt.includes('bug')) return 'var(--warning)';
  return 'var(--accent-cyan)';
}
