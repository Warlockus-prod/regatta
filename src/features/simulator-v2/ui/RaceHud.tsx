'use client';

import { type RaceState } from '../race/race-state';
import { DEFAULT_COURSE } from '../race/course';

// ---------------------------------------------------------------------------
// RaceHud - center-top countdown, timer, next-mark indicator.
//
// Pre-start: big countdown number + "START IN" label.
// Racing: elapsed timer + "NEXT: <mark label>" + distance to mark.
// Finished: elapsed total + "FINISH" badge.
// ---------------------------------------------------------------------------

export function RaceHud({
  race,
  simTime,
  distanceToNextMark,
  tp,
}: {
  race: RaceState;
  simTime: number;
  distanceToNextMark: number | null;
  tp: (ru: string, en: string, pl: string) => string;
}) {
  const remaining = Math.max(0, race.countdownSec - (simTime - race.countdownStartedAt));
  const elapsed = race.startedAt !== null
    ? (race.finishedAt ?? simTime) - race.startedAt
    : 0;

  const isPrestart = race.phase === 'prestart';
  const isRacing = race.phase === 'racing';
  const isFinished = race.phase === 'finished';

  const activeMark = DEFAULT_COURSE.marks[race.nextMarkIndex];

  return (
    <div
      className="rounded-xl px-4 py-2 flex items-center gap-3"
      style={{
        background: 'rgba(5, 11, 24, 0.78)',
        border: `1px solid ${isPrestart ? 'rgba(255, 170, 0, 0.5)' : isFinished ? 'rgba(82, 255, 142, 0.55)' : 'rgba(0, 212, 255, 0.35)'}`,
        backdropFilter: 'blur(12px)',
        pointerEvents: 'auto',
      }}
    >
      {isPrestart && (
        <>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
              {tp('СТАРТ ЧЕРЕЗ', 'START IN', 'START ZA')}
            </div>
            <div className="text-2xl font-black font-mono tabular-nums leading-none" style={{ color: 'var(--warning)' }}>
              {formatClock(remaining)}
            </div>
          </div>
        </>
      )}
      {isRacing && (
        <>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
              {tp('ВРЕМЯ', 'TIME', 'CZAS')}
            </div>
            <div className="text-2xl font-black font-mono tabular-nums leading-none" style={{ color: 'var(--accent-cyan)' }}>
              {formatClock(elapsed)}
            </div>
          </div>
          {activeMark && (
            <div className="pl-3 border-l" style={{ borderColor: 'rgba(0, 212, 255, 0.18)' }}>
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                {tp('СЛЕД. ЗНАК', 'NEXT MARK', 'NAST. ZNAK')}
              </div>
              <div className="text-sm font-bold" style={{ color: 'var(--accent-cyan)' }}>
                {activeMark.label}
                {distanceToNextMark !== null && (
                  <span className="text-[var(--text-muted)] font-mono tabular-nums ml-2">
                    {Math.round(distanceToNextMark)} u
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {isFinished && (
        <>
          <div className="text-xs font-black uppercase tracking-wider px-2 py-1 rounded"
               style={{ background: 'rgba(82, 255, 142, 0.2)', color: 'var(--success)' }}>
            {tp('ФИНИШ', 'FINISH', 'META')}
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
              {tp('ВРЕМЯ', 'TIME', 'CZAS')}
            </div>
            <div className="text-2xl font-black font-mono tabular-nums leading-none" style={{ color: 'var(--success)' }}>
              {formatClock(elapsed)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
}
