'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { legacyPick } from '@/lib/languages';
import { MISSION_TITLE_LIST as missions } from '@/data/mission-titles';
import ContentFooterNav from '@/components/ContentFooterNavLoader';
import { FlagIcon, TargetIcon } from '@/features/race-hud/RaceIcons';
import { PHYSICAL_RACE_EMISSION_ENABLED } from '@/lib/race-context';
import { leaderboardVisible } from '@/lib/leaderboard-visibility';
import { useLeaderboardCopy, type LeaderboardCopy } from './leaderboard-copy';
import { LeaderboardTable } from './LeaderboardTable';
import {
  DEFAULT_LEADERBOARD_COURSE, LEADERBOARD_COURSES, archiveUrl, formatLeaderboardTime, leaderboardUrl, showsArchive,
  type LeaderboardBoard, type LeaderboardCourse, type LeaderboardRow, type LeaderboardSelection,
} from './leaderboard-model';

// M1-7: Simple and Pro are ranked in separate tables, and the page fits a 390
// px phone: 20 px gutters, 44 px choices, names that wrap instead of
// scrolling. M5 step 8 (ADR-0015 point 12): the free race is ranked per
// course (the metric courses and the classic one), results without a recorded
// mode are the classic course's folded archive, and the quick online race has
// its own board.

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
  onChange: (value: T) => void; columns?: 'flex' | 'grid' | 'grid3';
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-sm text-[var(--text-secondary)]" aria-hidden="true">{label}</div>
      <div role="radiogroup" aria-label={label} className={columns === 'grid' ? 'grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4' : columns === 'grid3' ? 'grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3' : 'flex gap-2'}>
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

/** R-12: a board with too few results shows the player's own record, not a near-empty table. */
function LeaderboardWaiting({ rows, copy, showGhost, raceHref }: { rows: LeaderboardRow[]; copy: LeaderboardCopy; showGhost: boolean; raceHref: string }) {
  const mine = rows.find((row) => row.isMe);
  return (
    <div className="px-1 py-3 text-base leading-6" data-testid="leaderboard-waiting">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{copy.waitingTitle}</h2>
      <p className="text-[var(--text-secondary)]" data-testid="leaderboard-waiting-count">{copy.waitingCount(rows.length)}</p>
      {mine
        ? <p className="mt-3 text-[var(--text-primary)]" data-testid="leaderboard-my-best">{copy.yourBest}: <span className="font-mono font-semibold tabular-nums">{formatLeaderboardTime(mine.finish_time_sec)}</span></p>
        : <p className="mt-3 text-[var(--text-secondary)]" data-testid="leaderboard-no-best">{copy.noBest}</p>}
      {showGhost && <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{copy.ghost}</p>}
      <div className="mt-2"><Link href={raceHref} className="inline-flex min-h-11 items-center font-semibold text-[var(--accent-cyan)] hover:underline">{copy.toRace}</Link></div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { lang } = useI18n();
  const copy = useLeaderboardCopy();
  const [selection, setSelection] = useState<LeaderboardSelection>({
    board: 'free', course: DEFAULT_LEADERBOARD_COURSE, mode: 'simple', difficulty: 'medium', wind: 'medium', missionId: missions[0]?.id ?? '',
  });
  const [archiveOpen, setArchiveOpen] = useState(false);
  const update = (patch: Partial<LeaderboardSelection>) => setSelection((s) => ({ ...s, ...patch }));
  const main = useRows(leaderboardUrl(selection));
  const archived = showsArchive(selection);
  const archive = useRows(archived && archiveOpen ? archiveUrl(selection) : null);
  const free = selection.board === 'free', online = selection.board === 'online';
  const courseLabel: Record<LeaderboardCourse, string> = { short: copy.courseShort, medium: copy.courseMedium, long: copy.courseLong, classic: copy.courseClassic };
  // A metric course while switch A is off: an empty but valid board, said plainly.
  const metricClosed = free && selection.course !== 'classic' && !PHYSICAL_RACE_EMISSION_ENABLED;
  const tableName = free ? `${courseLabel[selection.course]}: ${selection.mode === 'pro' ? copy.pro : copy.simple}` : online ? copy.online : copy.missions;

  return (
    <div className="page-enter max-w-3xl mx-auto px-5 sm:px-6 py-10" data-testid="leaderboard-page">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">{copy.title}</h1>
      <p className="text-base leading-6 text-[var(--text-secondary)] mb-6">{copy.intro}</p>

      <div className="card p-3 mb-4 space-y-4">
        <Choices<LeaderboardBoard> label={copy.raceType} value={selection.board} onChange={(board) => update({ board })} options={[
          { id: 'free', label: copy.free, icon: <FlagIcon size={20} /> },
          { id: 'online', label: copy.online },
          { id: 'mission', label: copy.missions, icon: <TargetIcon size={20} /> },
        ]} columns="grid3" />
        {free || online ? <>
          {free && <Choices<LeaderboardCourse> label={copy.course} value={selection.course} onChange={(course) => update({ course })} columns="grid"
            options={LEADERBOARD_COURSES.map((id) => ({ id, label: courseLabel[id] }))} />}
          {free && <Choices label={copy.controlMode} value={selection.mode} onChange={(mode) => update({ mode })} options={[
            { id: 'simple', label: copy.simple }, { id: 'pro', label: copy.pro },
          ]} />}
          {online && <p className="text-sm leading-5 text-[var(--text-muted)]" data-testid="leaderboard-online-note">{copy.onlineNote}</p>}
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

      <section className="card p-3" aria-label={tableName} data-board={selection.board} data-course={free ? selection.course : undefined}>
        {main.loading
          ? <div className="py-10 text-center text-base text-[var(--text-muted)]" role="status">{copy.loading}</div>
          : metricClosed
            ? <div className="py-8 text-center text-base text-[var(--text-muted)]" data-testid="leaderboard-rows-empty">{copy.metricEmpty}</div>
            : leaderboardVisible(main.rows)
              ? <LeaderboardTable rows={main.rows} copy={copy} lang={lang} testId="leaderboard-rows" />
              : <LeaderboardWaiting rows={main.rows} copy={copy} showGhost={!online} raceHref={online ? '/multiplayer' : '/game'} />}
      </section>

      {archived && <details className="card p-3 mt-4" data-testid="leaderboard-archive" onToggle={(e) => setArchiveOpen(e.currentTarget.open)}>
        <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold text-[var(--text-primary)]">{copy.archiveTitle}</summary>
        <p className="mb-2 text-sm leading-5 text-[var(--text-muted)]">{copy.unrecordedNote}</p>
        {archiveOpen && (archive.loading
          ? <div className="py-6 text-center text-base text-[var(--text-muted)]" role="status">{copy.loading}</div>
          : <LeaderboardTable rows={archive.rows} copy={copy} lang={lang} testId="leaderboard-archive-rows" />)}
      </details>}

      <div className="text-center mt-6">
        <Link href="/game" className="inline-flex min-h-11 items-center text-base text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{copy.back}</Link>
      </div>

      <ContentFooterNav page="/leaderboard" />
    </div>
  );
}
