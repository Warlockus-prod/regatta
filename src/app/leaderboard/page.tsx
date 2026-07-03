'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { legacyPick } from '@/lib/languages';
import { missions } from '@/data/missions';
import ContentFooterNav from '@/components/ContentFooterNav';

type Difficulty = 'easy' | 'medium' | 'hard';
type Wind = 'light' | 'medium' | 'heavy';

interface Row {
  nickname: string;
  sid: string;
  difficulty: string;
  wind_strength: string;
  mission_id: string | null;
  finish_time_sec: number;
  score: number | null;
  ts: number;
}

export default function LeaderboardPage() {
  const { tp, lang } = useI18n();
  const [mode, setMode] = useState<'free' | 'mission'>('free');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [wind, setWind] = useState<Wind>('medium');
  const [missionId, setMissionId] = useState<string>(missions[0]?.id ?? '');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySid, setMySid] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/player').then((r) => r.json()).then((d) => setMySid(d.sid ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    // Preemptive loading state flashes "Loading..." while the fetch runs, which
    // is better UX than stale rows. React Compiler flags setState as cascading;
    // informational - the fetch settles on completion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // Guard against out-of-order responses: rapidly toggling filters can resolve
    // an older request after a newer one; the cancelled flag drops stale writes.
    let cancelled = false;
    const url = mode === 'mission'
      ? `/api/leaderboard?mission=${encodeURIComponent(missionId)}`
      : `/api/leaderboard?difficulty=${difficulty}&wind=${wind}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setRows(d.rows ?? []); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mode, difficulty, wind, missionId]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s * 10) % 10);
    return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">
        {tp('Таблица лучших', 'Leaderboard', 'Ranking')}
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {tp('Лучшее время по каждой сессии. Переключай режим / сложность / миссию.', 'Best time per session. Toggle mode / difficulty / mission.', 'Najlepszy czas na sesje. Przelacz tryb / poziom / misje.',
        )}
      </p>

      {/* Mode toggle */}
      <div className="card p-3 mb-4 flex flex-wrap gap-2 items-center">
        <div className="text-xs text-[var(--text-muted)] mr-2">{tp('РЕЖИМ', 'MODE', 'TRYB')}:</div>
        <button
          onClick={() => setMode('free')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          style={{
            background: mode === 'free' ? 'rgba(0, 212, 255, 0.15)' : 'rgba(139, 167, 184, 0.08)',
            color: mode === 'free' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: `1px solid ${mode === 'free' ? 'rgba(0, 212, 255, 0.4)' : 'rgba(139, 167, 184, 0.2)'}`,
          }}
        >
          🏁 {tp('Свободная гонка', 'Free race', 'Wolna regata')}
        </button>
        <button
          onClick={() => setMode('mission')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          style={{
            background: mode === 'mission' ? 'rgba(0, 212, 255, 0.15)' : 'rgba(139, 167, 184, 0.08)',
            color: mode === 'mission' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: `1px solid ${mode === 'mission' ? 'rgba(0, 212, 255, 0.4)' : 'rgba(139, 167, 184, 0.2)'}`,
          }}
        >
          🎯 {tp('Миссии', 'Missions', 'Misje')}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 mb-4">
        {mode === 'free' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-[var(--text-muted)] mb-1">{tp('СЛОЖНОСТЬ', 'DIFFICULTY', 'POZIOM')}</div>
              <div className="flex gap-1">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className="flex-1 px-2 py-1.5 rounded text-xs font-semibold transition"
                    style={{
                      background: difficulty === d ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                      border: `1px solid ${difficulty === d ? 'rgba(0, 212, 255, 0.4)' : 'rgba(139, 167, 184, 0.2)'}`,
                      color: difficulty === d ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    }}
                  >
                    {d === 'easy' ? tp('Лёгкий', 'Easy', 'Latwy') : d === 'medium' ? tp('Средний', 'Medium', 'Sredni') : tp('Сложный', 'Hard', 'Trudny')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-muted)] mb-1">{tp('ВЕТЕР', 'WIND', 'WIATR')}</div>
              <div className="flex gap-1">
                {(['light', 'medium', 'heavy'] as Wind[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => setWind(w)}
                    className="flex-1 px-2 py-1.5 rounded text-xs font-semibold transition"
                    style={{
                      background: wind === w ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                      border: `1px solid ${wind === w ? 'rgba(0, 212, 255, 0.4)' : 'rgba(139, 167, 184, 0.2)'}`,
                      color: wind === w ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    }}
                  >
                    {w === 'light' ? tp('Слабый', 'Light', 'Slaby') : w === 'medium' ? tp('Средний', 'Medium', 'Sredni') : tp('Сильный', 'Heavy', 'Silny')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[10px] text-[var(--text-muted)] mb-1">{tp('МИССИЯ', 'MISSION', 'MISJA')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {missions.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMissionId(m.id)}
                  className="px-2 py-1.5 rounded text-xs font-semibold transition text-left"
                  style={{
                    background: missionId === m.id ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                    border: `1px solid ${missionId === m.id ? 'rgba(0, 212, 255, 0.4)' : 'rgba(139, 167, 184, 0.2)'}`,
                    color: missionId === m.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  <span className="mr-1">{m.emoji}</span>
                  {legacyPick(m, 'title', lang)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card p-3">
        {loading ? (
          <div className="text-sm text-[var(--text-muted)] py-10 text-center">
            {tp('Загружаю…', 'Loading…', 'Ladowanie…')}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)] py-10 text-center">
            {tp('Пока никто не финишировал. Стань первым!', 'No results yet. Be the first!', 'Brak wynikow. Badz pierwszy!',
            )}
            <div className="mt-3">
              <Link href="/game" className="text-[var(--accent-cyan)] font-semibold hover:underline">
                {tp('К гонке →', 'To the race →', 'Do regaty →')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {rows.map((r, i) => {
              const isMe = mySid && r.sid === mySid;
              return (
                <div
                  key={`${r.sid}-${i}`}
                  className="flex items-center gap-3 py-2 px-3 rounded"
                  style={{
                    background: isMe ? 'rgba(0, 212, 255, 0.1)' : i === 0 ? 'rgba(255, 170, 0, 0.06)' : 'transparent',
                    border: isMe ? '1px solid rgba(0, 212, 255, 0.35)' : '1px solid transparent',
                  }}
                >
                  <div className="w-7 text-center text-xs font-mono" style={{ color: i === 0 ? 'var(--warning)' : i < 3 ? 'var(--success)' : 'var(--text-muted)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate text-[var(--text-primary)]">
                      {r.nickname} {isMe && <span className="text-[10px] text-[var(--accent-cyan)]">you</span>}
                    </div>
                    {r.score !== null && (
                      <div className="text-[10px] text-[var(--text-muted)]">score {r.score}/100</div>
                    )}
                  </div>
                  <div className="text-sm font-mono text-[var(--accent-cyan)] tabular-nums">
                    {formatTime(r.finish_time_sec)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-center mt-6">
        <Link href="/game" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition">
          ← {tp('Назад к гонке', 'Back to race', 'Powrot do regaty')}
        </Link>
      </div>

      <ContentFooterNav page="/leaderboard" />
    </div>
  );
}
