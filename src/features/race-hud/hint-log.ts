// The race hint log (F4, TestFlight 74: "a stack of coach hints, so you can
// bring it up and read what to do"). Every coach or feedback message of the
// current race is kept in a short list the player can open from the dock, the
// race Settings or the pause sheet and read at 16 px:
// - what the feedback bus is given (feedback.ts): rule notices, the
//   missed-mark notice, tack costs, mark splits, place changes, ghost splits
//   and the first race hints (M4-7). They are logged when posted, so a
//   message the bus dropped from its queue (a full stack) can still be read;
// - the route coach line when it asks for a manoeuvre (tack, gybe, back
//   behind the line, leave the mark to port). Gentle steering corrections
//   change every few seconds and say nothing new, so they are not logged;
// - the Pro trim hint when it changes to a new advice that asks for a change
//   (LOGGED_TRIM_KEYS: not "good", "reach on" or "run", which say nothing to
//   do). Trim advice can flip between two keys every second near a
//   threshold, so a trim line right after a trim line replaces it: in a row of
//   trim changes only the latest stays, and a run of trim advice can never
//   push a rule notice or a missed-mark notice out of the log.
// Rules: newest first; at most HINT_LOG_LIMITS.size entries (the oldest goes);
// the same text again within HINT_LOG_LIMITS.repeatSec of race time is not
// logged twice (a route line that comes and goes, a repeated rule notice);
// the page clears the log for every new race (Again, Restart, the next race).
// Time is the race clock in seconds (negative or zero in the countdown).
//
// The log never steers on its own: it repeats only what the race already
// showed, so it costs no medal. Route and trim lines get into it only while
// those hints are on, and those switches already take gold off the race
// (src/lib/race-medals.ts raceUsesHints).
//
// Pure module: the race time is passed in, so the order, the bound and the
// repeat rule are tested without React.

import type { RaceGuidanceAction } from "@/lib/race-guidance";
import type { CoachKey } from "@/features/sailing-lab/runtime/trim-coach";
import type { FeedbackSource, FeedbackTone } from "./feedback";

/** What a log line is about; the panel names it in a few words. */
export type HintLogKind = "rule" | "hint" | "route" | "trim" | "race";

export interface HintLogEntry {
  id: number;
  kind: HintLogKind;
  text: string;
  tone: FeedbackTone;
  /** Race clock, seconds. */
  at: number;
}

export interface HintLog {
  /** Newest first. */
  entries: readonly HintLogEntry[];
  nextId: number;
}

export const HINT_LOG_LIMITS = {
  /** Lines kept: the last twenty messages of a race. */
  size: 20,
  /** The same text again within this many race seconds is not logged again. */
  repeatSec: 20,
} as const;

/** The route coach actions that ask for a manoeuvre, and so are logged. */
export const LOGGED_ROUTE_ACTIONS: readonly RaceGuidanceAction[] = ["tack", "gybe", "return-start", "round-port"];

/** The Pro trim advice that asks for a change, and so is logged. */
export const LOGGED_TRIM_KEYS: readonly CoachKey[] = ["inIrons", "pinching", "luffMain", "luffJib", "luffBoth", "stallMain", "stallJib", "stallBoth"];

/** The route action the page logs now: only while racing, with the route hint on, and only a manoeuvre call. */
export function loggedRouteAction(racing: boolean, guidanceOn: boolean, action: RaceGuidanceAction | null | undefined): RaceGuidanceAction | null {
  return racing && guidanceOn && action && LOGGED_ROUTE_ACTIONS.includes(action) ? action : null;
}

/** The Pro trim advice the page logs now: only while racing a Pro race with the trim hint on, and only advice that asks for a change. */
export function loggedTrimKey(racing: boolean, prefs: { mode: "simple" | "pro"; trimHints: boolean }, key: CoachKey | null | undefined): CoachKey | null {
  return racing && prefs.mode === "pro" && prefs.trimHints && key && LOGGED_TRIM_KEYS.includes(key) ? key : null;
}

export function createHintLog(): HintLog {
  return { entries: [], nextId: 1 };
}

/** The log kind of a feedback bus message. */
export function hintLogKind(source: FeedbackSource): HintLogKind {
  return source === "rule" || source === "missed-mark" ? "rule" : source === "hint" ? "hint" : "race";
}

/** Add a line at race time `at`; returns the same log when nothing is added. */
export function logHint(log: HintLog, line: { kind: HintLogKind; text: string; tone: FeedbackTone }, at: number): HintLog {
  const text = line.text.trim();
  if (!text || !Number.isFinite(at)) return log;
  const newest = log.entries[0];
  // A trim line after a trim line replaces it (flapping advice, see the top).
  const replace = line.kind === "trim" && newest?.kind === "trim";
  if (replace && newest.text === text) return log;
  if (!replace && log.entries.some(e => e.text === text && Math.abs(at - e.at) < HINT_LOG_LIMITS.repeatSec)) return log;
  const entry: HintLogEntry = { id: log.nextId, kind: line.kind, text, tone: line.tone, at };
  const rest = replace ? log.entries.slice(1) : log.entries;
  return { entries: [entry, ...rest].slice(0, HINT_LOG_LIMITS.size), nextId: log.nextId + 1 };
}

/** "1:05" for a race time in seconds; the countdown and the start read "0:00". */
export function hintLogTime(at: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(at) ? at : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
