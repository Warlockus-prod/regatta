import { getMetrics, listFeedback, type Metrics, type FeedbackRow } from '@/lib/db';
import FeedbackAdmin from './FeedbackAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function StatsPage() {
  let metrics: Metrics | null = null;
  let feedback: FeedbackRow[] = [];
  let error: string | null = null;

  try {
    metrics = getMetrics();
    feedback = listFeedback(100);
  } catch (err) {
    error = err instanceof Error ? err.message : 'DB error';
  }

  if (error || !metrics) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">Regatta Stats</h1>
        <div className="card p-4">
          <p className="text-sm text-[var(--danger)]">DB error: {error ?? 'unknown'}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            SQLite может быть не инициализирована - зайди на любую страницу сайта, чтобы сгенерировать событие.
          </p>
        </div>
      </div>
    );
  }

  const totalDevices = metrics.deviceSplit.reduce((s, d) => s + d.count, 0) || 1;
  const totalLangs = metrics.languageSplit.reduce((s, l) => s + l.count, 0) || 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Regatta Stats</h1>
          <p className="text-xs text-[var(--text-muted)]">Обновляется при перезагрузке · {new Date().toISOString()}</p>
        </div>
      </div>

      {/* Top-line KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Kpi label="Events сегодня" value={metrics.eventsToday.toLocaleString()} />
        <Kpi label="Events за 7д" value={metrics.eventsLast7d.toLocaleString()} />
        <Kpi label="Sessions сегодня" value={metrics.sessionsToday.toLocaleString()} />
        <Kpi label="Sessions всего" value={metrics.sessionsTotal.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Top paths */}
        <Panel title="Топ страниц (7 дней)">
          <Bars items={metrics.topPaths.map((p) => ({ label: p.path || '-', value: p.count }))} />
        </Panel>

        {/* Top events */}
        <Panel title="Топ событий (7 дней)">
          <Bars items={metrics.topEvents.map((e) => ({ label: e.evt, value: e.count }))} />
        </Panel>

        {/* Device split */}
        <Panel title="Устройства (7 дней)">
          <Distribution items={metrics.deviceSplit.map((d) => ({ label: d.device, value: d.count, total: totalDevices }))} />
        </Panel>

        {/* Language split */}
        <Panel title="Языки (7 дней)">
          <Distribution items={metrics.languageSplit.map((l) => ({ label: l.language, value: l.count, total: totalLangs }))} />
        </Panel>
      </div>

      {/* Daily events trend */}
      <Panel title="События по дням (30 дней)" className="mb-6">
        <DailyChart data={metrics.dailyEvents} />
      </Panel>

      {/* Feedback & Bug reports */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kpi label={`Feedback всего / new`} value={`${metrics.feedbackCount.total} / ${metrics.feedbackCount.new ?? 0}`} />
        <Kpi label={`Bug reports всего / new`} value={`${metrics.bugCount.total} / ${metrics.bugCount.new ?? 0}`} />
      </div>

      <FeedbackAdmin items={feedback} />

      <p className="text-xs text-[var(--text-muted)] mt-8">
        Данные в /tmp/regatta-stats.db (Docker volume). Password guarded via middleware.
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="text-xl sm:text-2xl font-bold mt-1" style={{ color: 'var(--accent-cyan)' }}>{value}</div>
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
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
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

function Distribution({ items }: { items: { label: string; value: number; total: number }[] }) {
  if (items.length === 0) {
    return <div className="text-xs text-[var(--text-muted)]">Нет данных</div>;
  }
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
        {items.map((it, idx) => (
          <div key={idx} style={{ width: `${(it.value / it.total) * 100}%`, background: DIST_COLORS[idx % DIST_COLORS.length] }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm" style={{ background: DIST_COLORS[idx % DIST_COLORS.length] }} />
            <span className="text-[var(--text-secondary)] truncate">{it.label}</span>
            <span className="text-[var(--text-muted)] font-mono text-[10px]">{((it.value / it.total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DIST_COLORS = ['#00d4ff', '#44ff88', '#ffaa00', '#8844ff', '#ff6688'];

function DailyChart({ data }: { data: Array<{ day: string; count: number }> }) {
  if (data.length === 0) {
    return <div className="text-xs text-[var(--text-muted)]">Нет событий за период</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-0.5 h-24" style={{ background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 6 }}>
      {data.map((d) => (
        <div key={d.day} className="flex-1 relative group" style={{ minWidth: 4 }}>
          <div
            className="w-full rounded-sm transition-all"
            style={{ height: `${(d.count / max) * 100}%`, background: 'linear-gradient(180deg, rgba(0,212,255,0.9), rgba(0,212,255,0.4))' }}
            title={`${d.day}: ${d.count}`}
          />
        </div>
      ))}
    </div>
  );
}
