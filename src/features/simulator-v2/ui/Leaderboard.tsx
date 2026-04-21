'use client';

import { rankEntrants, type Opponent } from '../race/opponents';
import { type Vec2 } from '../race/course';

// ---------------------------------------------------------------------------
// Leaderboard - compact rank list of player + opponents sorted by progress.
//
// Player row is highlighted with the cyan accent. Rows are static height so
// the list does not jump as positions swap. PR-5 MVP: always visible when
// racing. A "finished" badge replaces the progress bar once a boat crosses.
// ---------------------------------------------------------------------------

export function Leaderboard({
  player,
  opponents,
  tp,
}: {
  player: { position: Vec2; nextMarkIndex: number; finished: boolean };
  opponents: Opponent[];
  tp: (ru: string, en: string, pl: string) => string;
}) {
  const ranked = rankEntrants(
    {
      id: 'player',
      name: tp('Вы', 'You', 'Ty'),
      color: '#00d4ff',
      ...player,
    },
    opponents,
  );

  const leaderProgress = ranked[0]?.progress ?? 0;

  return (
    <div
      className="rounded-xl p-2 min-w-[170px]"
      style={{
        background: 'rgba(5, 11, 24, 0.72)',
        border: '1px solid rgba(0, 212, 255, 0.22)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'auto',
      }}
    >
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1.5 px-1">
        {tp('РЕЙТИНГ', 'RANK', 'RANKING')}
      </div>
      <div className="space-y-0.5">
        {ranked.map((row, i) => {
          const isPlayer = row.isPlayer;
          const barPct = leaderProgress > 0 ? Math.min(100, (row.progress / leaderProgress) * 100) : 0;
          return (
            <div
              key={row.id}
              className="flex items-center gap-1.5 px-1 py-0.5 rounded"
              style={{
                background: isPlayer ? 'rgba(0, 212, 255, 0.12)' : 'transparent',
              }}
            >
              <span className="w-4 text-[10px] font-bold font-mono tabular-nums text-right"
                    style={{ color: isPlayer ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                {i + 1}
              </span>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
              <span className={`text-[11px] truncate ${isPlayer ? 'font-bold' : 'font-semibold'}`}
                    style={{ color: isPlayer ? 'var(--accent-cyan)' : 'var(--text-secondary)', minWidth: 44 }}>
                {row.name}
              </span>
              <div className="flex-1 h-1 rounded-full overflow-hidden"
                   style={{ background: 'rgba(139, 167, 184, 0.12)' }}>
                <div className="h-full rounded-full transition-all"
                     style={{ width: `${barPct}%`, background: row.color }} />
              </div>
              {row.finished && (
                <span className="text-[8px] font-black uppercase px-1 rounded"
                      style={{ background: 'rgba(82, 255, 142, 0.2)', color: 'var(--success)' }}>
                  F
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
