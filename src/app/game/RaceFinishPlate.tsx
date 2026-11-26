'use client';

// M1-4: the small place plate over the 3D scene during the finish hold
// (race-finish-hold.ts). It only states the place; no action, so no cyan, and
// it never takes a tap. Its entrance uses the existing .page-enter fade, which
// globals.css turns off under prefers-reduced-motion (the hold itself stays).

import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";
import { finishHoldStore } from "./race-finish-hold";
import { FINISH_COPY, fillFinish, placeOrdinal } from "./race-finish-summary";
import { FLEET_RESOLUTION_COPY } from "./race-copy";

export function RaceFinishPlate({ place, total, stillRacing = 0 }: { place: number; total: number; stillRacing?: number }) {
  const { tl, lang } = useI18n();
  const color = place === 1 ? "var(--warning)" : place <= 3 ? "var(--success)" : "var(--text-primary)";
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center px-5 pt-[18%]" data-testid="race-finish-plate">
      <div role="status" aria-live="polite"
        className="page-enter rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-3 text-center shadow-lg">
        <div className="text-base leading-6 text-[var(--text-secondary)]">{tl(FINISH_COPY.finish)}</div>
        <div className="text-3xl font-bold leading-10 tabular-nums" style={{ color }}>{placeOrdinal(place, lang)}</div>
        <div className="text-base leading-6 text-[var(--text-muted)]">{fillFinish(tl(FINISH_COPY.of), { n: String(total) })}</div>
        {/* M5: metric bots still sailing home; the place may still move with their penalties. */}
        {stillRacing > 0 && <div className="text-base leading-6 text-[var(--text-secondary)]" data-testid="race-finish-still-racing">
          {fillFinish(tl(FLEET_RESOLUTION_COPY.stillRacingCount), { n: String(stillRacing) })}</div>}
      </div>
    </div>
  );
}

/** Mount once over the race scene (inside the cockpit's scene area). Shows the
 * plate only while a finish hold of this race is running. */
export function RaceFinishHoldPlate({ raceId }: { raceId?: string }) {
  const hold = useSyncExternalStore(finishHoldStore.subscribe, finishHoldStore.get, finishHoldStore.getServer);
  if (!hold || (raceId !== undefined && hold.raceId !== raceId)) return null;
  return <RaceFinishPlate place={hold.place} total={hold.total} stillRacing={hold.stillRacing} />;
}
