'use client';

import type { ReactNode } from "react";
import { MedalIcon } from "@/features/race-hud/RaceIcons";
import { penaltyText } from "@/features/race-hud/units";
import type { Lang } from "@/lib/languages";
import type { LeaderboardCopy } from "./leaderboard-copy";
import { formatLeaderboardTime, type LeaderboardRow } from "./leaderboard-model";

// One ranked list (M1-7): fits a 390 px phone without horizontal scroll (the
// name wraps instead of pushing the time out), places 1-3 carry a drawn medal
// with the number instead of emoji, and the player's own row is marked by
// weight, a frame and "you", not by the action cyan.

export function LeaderboardTable({ rows, copy, lang, testId, empty }: {
  rows: LeaderboardRow[]; copy: LeaderboardCopy; lang: Lang; testId: string; empty?: ReactNode;
}) {
  if (rows.length === 0) return <div className="py-8 text-center text-base text-[var(--text-muted)]" data-testid={`${testId}-empty`}>{empty ?? copy.empty}</div>;
  return <ol className="m-0 list-none space-y-1 p-0" data-testid={testId}>
    {rows.map((row, index) => {
      const place = index + 1;
      return <li key={`${row.nickname}-${index}`} data-me={row.isMe || undefined}
        className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-2 py-2 sm:px-3"
        style={{ background: row.isMe ? "var(--bg-card-hover)" : "transparent", border: `1px solid ${row.isMe ? "var(--text-secondary)" : "transparent"}` }}>
        <span className="flex w-8 shrink-0 justify-center text-sm font-semibold tabular-nums text-[var(--text-secondary)]">
          {place <= 3 ? <MedalIcon place={place as 1 | 2 | 3} label={copy.place(place)} /> : <span aria-label={copy.place(place)}>{place}.</span>}
        </span>
        <span className="min-w-0 flex-1 text-base leading-6 text-[var(--text-primary)]">
          <span className="break-words font-semibold [overflow-wrap:anywhere]">{row.nickname}</span>
          {row.isMe && <span className="ml-2 text-sm font-semibold text-[var(--text-primary)]">({copy.you})</span>}
          {(row.score !== null || (row.penalty_seconds ?? 0) > 0) && <span className="block text-sm text-[var(--text-muted)]">
            {row.score !== null && `${copy.score} ${row.score}/100`}
            {row.score !== null && (row.penalty_seconds ?? 0) > 0 && ", "}
            {(row.penalty_seconds ?? 0) > 0 && `${copy.penalties} ${penaltyText(lang, row.penalty_seconds!)}`}
          </span>}
        </span>
        <span className="shrink-0 font-mono text-base tabular-nums text-[var(--text-primary)]">{formatLeaderboardTime(row.finish_time_sec)}</span>
      </li>;
    })}
  </ol>;
}
