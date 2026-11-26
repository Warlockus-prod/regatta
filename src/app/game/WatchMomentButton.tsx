'use client';

// M4-3 "watch the moment": opens the race replay 5 s before a judge item or a
// coach mistake (GameClient openReplay). `variant="action"` is the finish
// screen's "Watch the mistake" next to the replay button; `"inline"` sits
// under a judge item or a coach mistake, beside its practice link, and is
// cyan as an action, like that link.

import { replayTeachingCopy } from "@/data/replay-teaching-copy";
import { useI18n } from "@/lib/i18n";
import { ReplayIcon } from "@/features/race-hud/RaceIcons";

const ACTION = "min-h-11 min-w-[120px] flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] py-2 text-base leading-6 text-[var(--text-primary)] transition hover:border-[var(--accent-cyan)]";
const INLINE = "inline-flex min-h-11 items-center gap-1 text-base leading-6 text-[var(--accent-cyan)] underline-offset-2 hover:underline";

export function WatchMomentButton({ at, onWatch, variant = "inline" }: { at: number; onWatch: (at: number) => void; variant?: "action" | "inline" }) {
  const { tl } = useI18n();
  return <button type="button" onClick={() => onWatch(at)} data-testid={variant === "action" ? "race-watch-mistake" : "race-watch-moment"} data-at={at}
    className={variant === "action" ? ACTION : INLINE}>
    <ReplayIcon className="shrink-0" />
    <span>{tl(variant === "action" ? replayTeachingCopy.watchMistake : replayTeachingCopy.watchMoment)}</span>
  </button>;
}
