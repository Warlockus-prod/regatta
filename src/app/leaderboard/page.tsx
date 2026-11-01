'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { legacyPick } from '@/lib/languages';
import { missions } from '@/data/missions';
import ContentFooterNav from '@/components/ContentFooterNavLoader';
import { FlagIcon, TargetIcon } from '@/features/race-hud/RaceIcons';
import { useLeaderboardCopy } from './leaderboard-copy';
import { LeaderboardTable } from './LeaderboardTable';
import { leaderboardUrl, unrecordedModeUrl, type LeaderboardBoard, type LeaderboardRow, type LeaderboardSelection } from './leaderboard-model';

// M1-7: Simple and Pro are ranked in separate tables, results without a
// recorded mode sit in their own folded list, and the page fits a 390 px
// phone: 20 px gutters, 44 px choices, names that wrap instead of scrolling.

function useRows(url: string | null) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(url !== null);
  useEffect(() => {
    if (url === null) return;
    // Preemptive loading state: better than stale rows while the fetch runs.
    // React Compiler flags setState as cascading; the fetch settles it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // Drop an older response that resolves after a newer one.
    let cancelled = false;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setRows(Array.isArray(d.rows) ? d.rows : []); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);
  return { rows, loading };
}

function Choices<T extends string>({ label, value, options, onChange, columns = 'flex' }: {
  label: string; value: T; options: Array<{ id: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void; columns?: 'flex' | 'grid';
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-sm text-[var(--text-secondary)]" aria-hidden="true">{label}</div>
      <div role="radiogroup" aria-label={label} className={columns === 'grid' ? 'grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4' : 'flex gap-2'}>
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={active} onClick={() => onChange(o.id)}
              className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-base font-semibold leading-5 [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
              style={{
                background: active ? 'var(--bg-card-hover)' : 'transparent',
                border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-subtle, rgba(139, 167, 184, 0.3))'}`,
                color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              }}>
              {o.icon}{o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { lang } = useI18n();
  const copy = useLeaderboardCopy();
  const [selection, setSelection] = useState<LeaderboardSelection>({
    board: 'free', mode: 'simple', difficulty: 'medium', wind: 'medium', missionId: missions[0]?.id ?? '',
  });
  const [unrecordedOpen, setUnrecordedOpen] = useState(false);
  const update = (patch: Partial<LeaderboardSelection>) => setSelection((s) => ({ ...s, ...patch }));
  const main = useRows(leaderboardUrl(selection));
  const unrecorded = useRows(selection.board === 'free' && unrecordedOpen ? unrecordedModeUrl(selection) : null);
  const free = selection.board === 'free';

  return (
    <div className="page-enter max-w-3xl mx-auto px-5 sm:px-6 py-10" data-testid="leaderboard-page">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">{copy.title}</h1>
      <p className="text-base leading-6 text-[var(--text-secondary)] mb-6">{copy.intro}</p>

      <div className="card p-3 mb-4 space-y-4">
        <Choices<LeaderboardBoard> label={copy.raceType} value={selection.board} onChange={(board) => update({ board })} options={[
          { id: 'free', label: copy.free, icon: <FlagIcon size={20} /> },
          { id: 'mission', label: copy.missions, icon: <TargetIcon size={20} /> },
        ]} />
        {free ? <>
          <Choices label={copy.controlMode} value={selection.mode} onChange={(mode) => update({ mode })} options={[
            { id: 'simple', label: copy.simple }, { id: 'pro', label: copy.pro },
          ]} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Choices label={copy.difficulty} value={selection.difficulty} onChange={(difficulty) => update({ difficulty })} options={[
              { id: 'easy', label: copy.easy }, { id: 'medium', label: copy.medium }, { id: 'hard', label: copy.hard },
            ]} />
            <Choices label={copy.wind} value={selection.wind} onChange={(wind) => update({ wind })} options={[
              { id: 'light', label: copy.light }, { id: 'medium', label: copy.windMedium }, { id: 'heavy', label: copy.heavy },
            ]} />
          </div>
        </> : <>
          <Choices label={copy.mission} value={selection.missionId} onChange={(missionId) => update({ missionId })} columns="grid"
            options={missions.map((m) => ({ id: m.id, label: legacyPick(m, 'title', lang) }))} />
          <p className="text-sm leading-5 text-[var(--text-muted)]" data-testid="leaderboard-mission-note">{copy.missionNote}</p>
        </>}
      </div>

      <section className="card p-3" aria-label={free ? `${copy.free}: ${selection.mode === 'pro' ? copy.pro : copy.simple}` : copy.missions}>
        {main.loading
          ? <div className="py-10 text-center text-base text-[var(--text-muted)]" role="status">{copy.loading}</div>
          : <LeaderboardTable rows={main.rows} copy={copy} lang={lang} testId="leaderboard-rows" empty={<>
              {copy.empty}
              <div className="mt-3"><Link href="/game" className="inline-flex min-h-11 items-center font-semibold text-[var(--accent-cyan)] hover:underline">{copy.toRace}</Link></div>
            </>} />}
      </section>

      {free && <details className="card p-3 mt-4" data-testid="leaderboard-unrecorded" onToggle={(e) => setUnrecordedOpen(e.currentTarget.open)}>
        <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold text-[var(--text-primary)]">{copy.unrecordedTitle}</summary>
        <p className="mb-2 text-sm leading-5 text-[var(--text-muted)]">{copy.unrecordedNote}</p>
        {unrecordedOpen && (unrecorded.loading
          ? <div className="py-6 text-center text-base text-[var(--text-muted)]" role="status">{copy.loading}</div>
          : <LeaderboardTable rows={unrecorded.rows} copy={copy} lang={lang} testId="leaderboard-unrecorded-rows" />)}
      </details>}

      <div className="text-center mt-6">
        <Link href="/game" className="inline-flex min-h-11 items-center text-base text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{copy.back}</Link>
      </div>

      <ContentFooterNav page="/leaderboard" />
    </div>
  );
}
