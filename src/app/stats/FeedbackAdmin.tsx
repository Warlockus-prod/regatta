'use client';

import { useState } from 'react';
import type { FeedbackRow } from '@/lib/db';

const STATUS_OPTIONS = ['new', 'in_progress', 'fixed', 'ignored'];

function formatTs(ts: number): string {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 16);
}

export default function FeedbackAdmin({ items: initialItems }: { items: FeedbackRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<'all' | 'feedback' | 'bug'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = items.filter((i) => {
    if (filter !== 'all' && i.kind !== filter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  });

  const setStatus = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">FEEDBACK &amp; BUG REPORTS</div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'feedback' | 'bug')}
            className="bg-transparent border border-[rgba(139,167,184,0.3)] rounded px-2 py-1 text-xs"
          >
            <option value="all">все типы</option>
            <option value="feedback">только feedback</option>
            <option value="bug">только bugs</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border border-[rgba(139,167,184,0.3)] rounded px-2 py-1 text-xs"
          >
            <option value="all">все статусы</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] p-4 text-center">Пока пусто</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => {
            const isExpanded = expandedId === f.id;
            return (
              <div
                key={f.id}
                className="rounded border text-xs"
                style={{ borderColor: 'rgba(139, 167, 184, 0.2)', background: 'rgba(11, 30, 56, 0.3)' }}
              >
                <div className="flex items-start gap-2 p-2.5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : f.id)}>
                  <span className="text-sm">{f.kind === 'bug' ? '🐛' : '💬'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-[var(--text-muted)]">
                      <span>#{f.id}</span>
                      <span>{formatTs(f.ts)}</span>
                      {f.category && <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(0, 212, 255, 0.15)', color: 'var(--accent-cyan)' }}>{f.category}</span>}
                      <span className="px-1.5 py-0.5 rounded" style={{ background: statusBg(f.status), color: statusColor(f.status) }}>{f.status}</span>
                      {f.path && <span>{f.path}</span>}
                      {f.language && <span>{f.language}</span>}
                    </div>
                    <p className="mt-1 text-[var(--text-primary)] line-clamp-2">{f.message}</p>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-2.5 pb-2.5 border-t border-[rgba(139,167,184,0.15)] pt-2 space-y-2">
                    {f.expected && <div><strong className="text-[var(--text-muted)]">Expected:</strong> {f.expected}</div>}
                    {f.actual && <div><strong className="text-[var(--text-muted)]">Actual:</strong> {f.actual}</div>}
                    {f.contact && <div><strong className="text-[var(--text-muted)]">Contact:</strong> {f.contact}</div>}
                    {f.viewport && <div><strong className="text-[var(--text-muted)]">Viewport:</strong> {f.viewport}</div>}
                    {f.ua && <div className="break-words"><strong className="text-[var(--text-muted)]">UA:</strong> {f.ua}</div>}
                    <div className="flex gap-1 pt-1">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(f.id, s)}
                          disabled={f.status === s}
                          className="px-2 py-1 rounded text-[10px] transition disabled:opacity-40"
                          style={{
                            background: f.status === s ? statusBg(s) : 'transparent',
                            color: f.status === s ? statusColor(s) : 'var(--text-secondary)',
                            border: `1px solid ${f.status === s ? statusColor(s) + '40' : 'rgba(139,167,184,0.2)'}`,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function statusBg(s: string): string {
  switch (s) {
    case 'new': return 'rgba(0, 212, 255, 0.15)';
    case 'in_progress': return 'rgba(255, 170, 0, 0.15)';
    case 'fixed': return 'rgba(68, 255, 136, 0.15)';
    case 'ignored': return 'rgba(139, 167, 184, 0.15)';
    default: return 'rgba(139, 167, 184, 0.1)';
  }
}
function statusColor(s: string): string {
  switch (s) {
    case 'new': return '#00d4ff';
    case 'in_progress': return '#ffaa00';
    case 'fixed': return '#44ff88';
    case 'ignored': return '#8ba7b8';
    default: return '#8ba7b8';
  }
}
