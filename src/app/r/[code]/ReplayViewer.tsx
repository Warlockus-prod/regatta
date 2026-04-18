'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { deg2rad, makeStandardCourse } from '@/lib/race-physics';

interface Sample { t: number; x: number; y: number; heading: number; twa: number; speed: number; lap: number }
interface Event { type: string; t: number; note?: string }
interface ReplayData {
  code: string;
  ts: number;
  nickname: string | null;
  difficulty: string | null;
  windStrength: string | null;
  missionId: string | null;
  finishTimeSec: number | null;
  views: number;
  samples: Sample[];
  events: Event[];
  course: unknown;
}

export default function ReplayViewer() {
  const params = useParams();
  const rawCode = Array.isArray(params?.code) ? params.code[0] : params?.code;
  const code = (typeof rawCode === 'string' ? rawCode : '').toUpperCase();

  const [data, setData] = useState<ReplayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!code) { setError('Код не задан'); return; }
    fetch(`/api/replay/${code}`)
      .then(async (r) => {
        if (!r.ok) { throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`); }
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message || 'Ошибка'));
  }, [code]);

  // Auto-advance
  useEffect(() => {
    if (!playing || !data) return;
    const id = setInterval(() => {
      setIdx((i) => {
        const next = i + 1;
        if (next >= data.samples.length) {
          setPlaying(false);
          return data.samples.length - 1;
        }
        return next;
      });
    }, 500 / speed);
    return () => clearInterval(id);
  }, [playing, speed, data]);

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const course = makeStandardCourse();
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rect.width, H = rect.height;
    const WORLD_W = 800, WORLD_H = 1200;
    const pad = 20;
    const s = Math.min((W - pad * 2) / WORLD_W, (H - pad * 2) / WORLD_H);
    const ox = (W - WORLD_W * s) / 2;
    const oy = (H - WORLD_H * s) / 2;
    const toXY = (p: { x: number; y: number }) => ({ x: ox + p.x * s, y: oy + p.y * s });

    // Bg
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#051425'); g.addColorStop(1, '#0a1f3d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Start/finish
    const la = toXY(course.startLine.a), lb = toXY(course.startLine.b);
    ctx.strokeStyle = '#ffaa00'; ctx.setLineDash([6, 4]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(la.x, la.y); ctx.lineTo(lb.x, lb.y); ctx.stroke();
    ctx.setLineDash([]);

    // Windward mark
    const wm = toXY(course.marks[0].pos);
    ctx.beginPath(); ctx.arc(wm.x, wm.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffaa00'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

    // Track up to current idx
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= Math.min(idx, data.samples.length - 1); i++) {
      const p = toXY(data.samples[i]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Event dots
    const current = data.samples[Math.min(idx, data.samples.length - 1)];
    if (current) {
      for (const ev of data.events) {
        if (ev.t > current.t) break;
        const samp = data.samples.find((sm) => Math.abs(sm.t - ev.t) < 0.6);
        if (!samp) continue;
        const pp = toXY(samp);
        let col = '#00d4ff';
        if (ev.type === 'tack') col = '#ffaa00';
        else if (ev.type === 'no-go-entered') col = '#ff4444';
        else if (ev.type === 'mark-rounded' || ev.type === 'finish') col = '#44ff88';
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
      }
      // Boat arrow
      const p = toXY(current);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(deg2rad(current.heading));
      ctx.fillStyle = '#00d4ff';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }, [idx, data]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <Link href="/" className="text-xs text-[var(--text-muted)]">← Главная</Link>
        <h1 className="text-2xl font-bold mt-4 mb-2">Replay не найден</h1>
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }
  if (!data) {
    return <div className="min-h-[50vh] flex items-center justify-center text-sm text-[var(--text-muted)]">Загружаю…</div>;
  }

  const date = new Date(data.ts).toISOString().slice(0, 16).replace('T', ' ');

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Главная</Link>
        <button
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
          className="text-[11px] text-[var(--accent-cyan)] hover:underline"
        >
          📋 Копировать ссылку
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-1">
        Replay {data.nickname ? `от ${data.nickname}` : ''} · <span className="font-mono text-[var(--accent-cyan)]">{data.code}</span>
      </h1>
      <div className="text-xs text-[var(--text-muted)] mb-4">
        {date} · {data.difficulty} · ветер {data.windStrength}
        {data.finishTimeSec ? ` · финиш ${formatTime(data.finishTimeSec)}` : ' · не финишировал'}
        {data.views ? ` · ${data.views} просмотров` : ''}
      </div>

      <div className="card p-2 sm:p-3 mb-4">
        <canvas
          ref={canvasRef}
          className="w-full block rounded-lg"
          style={{ aspectRatio: '2/3', maxHeight: '65vh', background: '#061428' }}
        />
      </div>

      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, data.samples.length - 1)}
          value={idx}
          onChange={(e) => { setIdx(Number(e.target.value)); setPlaying(false); }}
          className="flex-1"
        />
        <span className="text-xs font-mono text-[var(--text-secondary)] min-w-[60px] text-right">
          {formatTime(data.samples[Math.min(idx, data.samples.length - 1)]?.t ?? 0)}
        </span>
      </div>
      <div className="flex gap-2 text-xs">
        <span className="text-[var(--text-muted)]">Скорость</span>
        {[0.5, 1, 2, 4].map((sp) => (
          <button
            key={sp}
            onClick={() => setSpeed(sp)}
            className="px-2 py-0.5 rounded border"
            style={{
              borderColor: speed === sp ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
              color: speed === sp ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              background: speed === sp ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
            }}
          >
            {sp}×
          </button>
        ))}
      </div>

      <div className="mt-4 text-center text-xs">
        <Link href="/game" className="text-[var(--accent-cyan)] hover:underline">
          Попробовать самому →
        </Link>
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  if (!isFinite(s)) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s * 10) % 10);
  return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
}
