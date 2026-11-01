'use client';

// M4-4 splits against your best race of the same class (the grey ghost boat),
// on the solo race result screen under the skill bars: one row per mark you
// rounded and one for the finish, your time and the difference. Ahead is
// green, behind red, and the row always writes the sign and a word (ahead,
// behind, level), so colour is never the only signal. Not cyan: nothing here
// is an action. Renders nothing without a ghost (src/lib/race-ghost-splits.ts,
// copy in src/data/race-ghost-copy.ts).

import { useI18n } from "@/lib/i18n";
import { raceGhostCopy, splitLabel, splitVerdictText } from "@/data/race-ghost-copy";
import type { GhostSplit, SplitVerdict } from "@/lib/race-ghost-splits";
import { formatTime } from "./race-model";

const VERDICT_COLOR: Record<SplitVerdict, string> = {
  ahead: "var(--success)", behind: "var(--danger)", even: "var(--text-secondary)",
};

export function RaceGhostSplits({ splits }: { splits?: readonly GhostSplit[] | null }) {
  const { tl, lang } = useI18n();
  if (!splits?.length) return null;
  return (
    <section className="mb-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-base leading-6" data-testid="race-results-splits">
      <h2 className="mb-2 font-semibold text-[var(--text-muted)]">{tl(raceGhostCopy.title)}</h2>
      <ul className="space-y-2">
        {splits.map((split) => (
          <li key={`${split.at}-${split.index}`} className="flex flex-wrap items-baseline justify-between gap-x-3"
            data-testid={`race-split-${split.at}`} data-verdict={split.verdict}>
            <span className="font-semibold text-[var(--text-primary)]">
              {splitLabel(lang, split)}{" "}
              <span className="font-mono font-normal text-[var(--text-secondary)]">
                <span className="sr-only">{tl(raceGhostCopy.yourTime)} </span>{formatTime(split.timeSec)}
              </span>
            </span>
            <span className="font-semibold" style={{ color: VERDICT_COLOR[split.verdict] }} data-testid="race-split-delta">
              {splitVerdictText(lang, split)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
