// The teaching replay (M4-3): the pure parts of the replay controls. The speed
// steps, where a jump lands (a few seconds before the moment, so the player
// sees what led to it), which coach mistakes are a moment at all, and the
// event ribbon built from the race log: the start signal, every tack with
// the speed it cost (each tack measured the way the M4-1 tacks bar measures
// it; the bar shows their average), the windward mark rounding and the
// training judge's items, which event the replay is at, and one step of the
// replay clock. The replay screen (src/app/game/RaceReplay.tsx) and its tests
// read one definition.

import type { RaceJudgeIncidentKind, RaceJudgeItem } from "./race-judge";
import { measureTacks, type SkillEvent, type SkillSample } from "./race-tack-metrics";

/** The replay speeds, slowest first. 1 is real time. */
export const REPLAY_SPEEDS = [0.5, 1, 2, 4] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

/** A jump lands this many seconds before the moment. */
export const REPLAY_LEAD_SEC = 5;

/** A coach mistake longer than this is a whole-race note ("no-go entries"
 * over the whole race, the overall pace), not a moment to jump to. */
export const REPLAY_MOMENT_MAX_SEC = 20;

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Where a jump to `moment` lands: REPLAY_LEAD_SEC earlier, inside the
 * recording [first, last]. A moment that is not a number lands at the start. */
export function replaySeekTarget(moment: number, first: number, last: number): number {
  const lo = finite(first) ? first : 0;
  const hi = finite(last) ? Math.max(lo, last) : lo;
  if (!finite(moment)) return lo;
  return Math.min(hi, Math.max(lo, moment - REPLAY_LEAD_SEC));
}

/** The race time a coach mistake points at, or null when it spans more than
 * REPLAY_MOMENT_MAX_SEC (a whole-race note: jumping would only restart). */
export function coachMistakeMoment(mistake: { timeStart: number; timeEnd: number } | null | undefined): number | null {
  if (!mistake || !finite(mistake.timeStart) || !finite(mistake.timeEnd)) return null;
  if (mistake.timeEnd < mistake.timeStart || mistake.timeEnd - mistake.timeStart > REPLAY_MOMENT_MAX_SEC) return null;
  return mistake.timeStart;
}

export type ReplayRibbonItem =
  | { id: string; kind: "start"; t: number; seekT: number }
  | { id: string; kind: "tack"; t: number; seekT: number; lossKn: number | null }
  | { id: string; kind: "mark"; t: number; seekT: number }
  | { id: string; kind: "judge"; t: number; seekT: number; judgeKind: RaceJudgeIncidentKind; jostle: boolean };

export interface ReplayRibbonInput {
  samples: readonly SkillSample[];
  events: readonly SkillEvent[];
  /** The training judge's items of this race; none for a shared replay. */
  judgeItems?: readonly Pick<RaceJudgeItem, "id" | "time" | "kind" | "jostle">[];
}

const ORDER: Record<ReplayRibbonItem["kind"], number> = { start: 0, judge: 1, tack: 2, mark: 3 };

/** The event ribbon, in race order. Only what the recording shows: an event
 * after the last sample is left out (the replay cannot show it), one before
 * the first lands at the first sample. No events, no ribbon. */
export function replayRibbon(input: ReplayRibbonInput): ReplayRibbonItem[] {
  const timed = input.samples.filter((s) => finite(s.t));
  if (!timed.length) return [];
  const first = timed[0].t, last = timed[timed.length - 1].t;
  const seek = (t: number) => replaySeekTarget(t, first, last);
  const shown = (t: number) => finite(t) && t <= last;
  const items: ReplayRibbonItem[] = [];

  const start = input.events.find((e) => e.type === "start" && shown(e.t));
  if (start) items.push({ id: "start", kind: "start", t: start.t, seekT: seek(start.t) });
  measureTacks(input.samples, input.events).forEach((tack, i) => {
    if (shown(tack.t)) items.push({ id: `tack-${i}`, kind: "tack", t: tack.t, seekT: seek(tack.t), lossKn: tack.speedLossKn });
  });
  input.events.forEach((e, i) => {
    if (e.type === "mark-rounded" && shown(e.t)) items.push({ id: `mark-${i}`, kind: "mark", t: e.t, seekT: seek(e.t) });
  });
  for (const item of input.judgeItems ?? []) {
    if (shown(item.time)) items.push({ id: `judge-${item.id}`, kind: "judge", t: item.time, seekT: seek(item.time), judgeKind: item.kind, jostle: item.jostle === true });
  }
  return items.sort((a, b) => a.t - b.t || ORDER[a.kind] - ORDER[b.kind]);
}

/** The ribbon item the replay is at. `pinned` is the item the player jumped
 * to (a ribbon tap, a debrief moment): it stays the current one through the
 * 5 s lead-in and its own moment, until the cursor reaches a later event or
 * goes back before the jump target. Otherwise it is the last event that has
 * happened by `time` (its moment, not its jump target, so an event is never
 * marked before it happens and "Start" is current at the start even when
 * early events share its clamped jump target). Null before the first. */
export function replayRibbonCurrent(items: readonly ReplayRibbonItem[], time: number, pinned: string | null = null): string | null {
  const pin = pinned === null ? undefined : items.find((item) => item.id === pinned);
  if (pin && time >= pin.seekT && !items.some((item) => item.t > pin.t && item.t <= time)) return pin.id;
  let current: string | null = null;
  for (const item of items) if (item.t <= time) current = item.id;
  return current;
}

/** The longest step the replay clock takes in one frame, seconds (a frame
 * after a stall or a background tab must not skip the moment). */
export const REPLAY_MAX_FRAME_SEC = 0.1;

/** One frame of the replay clock: where the cursor is after `dtSec` of wall
 * time. It moves only while the replay plays, the page is visible and the 3D
 * scene has drawn its first frame: the 5 s lead of a jump or of a replay
 * opened at a moment must not run out behind "Loading the yacht". */
export function replayClockStep(cursor: number, dtSec: number, s: { rate: number; total: number; playing: boolean; sceneReady: boolean; hidden: boolean }): number {
  if (!s.playing || !s.sceneReady || s.hidden || !finite(dtSec) || dtSec <= 0) return cursor;
  return Math.min(s.total, cursor + Math.min(REPLAY_MAX_FRAME_SEC, dtSec) * s.rate);
}
