import { RULE_EVENT_COOLDOWN, type RaceRuleEvent, type RaceRuleEventKind, type RacingRule } from "./race-rules";

/** Training judge debrief (ADR-0009). Pure: turns the rule events that
 * race-rules.ts emitted during one race into an ordered, explained list of
 * incidents for one boat. It never invents liability: a situation the engine
 * did not decide stays undecided and never carries a penalty here, and a race
 * phase that the events cannot prove is reported as "unknown" with the reason. */

export const RACE_JUDGE_PLAYER_ID = "player";
/** The engine repeats an ongoing situation every RULE_EVENT_COOLDOWN seconds.
 * Events of the same kind, rule and other boat closer than this gap form one incident. */
export const RACE_JUDGE_MERGE_GAP = RULE_EVENT_COOLDOWN + 2;
/** Events emitted in the same simulation frame share one time value. */
const SAME_FRAME = 0.05;

export type RaceJudgePhase = "pre-start" | "start" | "upwind" | "mark" | "downwind" | "finish" | "after-finish" | "unknown";
/** Why a phase is "unknown": which facts were missing. */
export type RaceJudgePhaseNote = "start-or-upwind" | "start-or-windward-mark" | "rounding-not-recorded";
/** "undecided": the engine refused to assign right of way. "unknown": the input
 * did not include the other boat's events, so the debrief cannot tell. */
export type RaceJudgeRightOfWay = "you" | "other" | "undecided" | "unknown" | "not-applicable";
export type RaceJudgePenalty =
  | { kind: "applied"; seconds: number }
  | { kind: "other-boat"; seconds: number }
  | { kind: "uncertain" }
  | { kind: "advice" }
  | { kind: "correction-required" }
  | { kind: "penalties-off" };
export type RaceJudgeIncidentKind = Exclude<RaceRuleEventKind, "mark-rounded">;
export type RaceJudgeLesson =
  | "keep-clear-port" | "keep-clear-windward" | "keep-clear-astern"
  | "avoid-contact-right-of-way" | "avoid-contact-unclear"
  | "return-behind-line" | "clean-start" | "mark-clearance" | "round-to-port";

/** What this judge deliberately does not do. Always part of the summary. */
export const RACE_JUDGE_NOT_COVERED = ["mark-room", "tack-and-course-change", "penalty-turns", "protests", "umpire"] as const;
export type RaceJudgeNotCovered = (typeof RACE_JUDGE_NOT_COVERED)[number];

export const RACE_JUDGE_INCIDENT_KINDS: readonly RaceJudgeIncidentKind[] = ["early-start", "start-clear", "give-way", "avoid-contact", "contact", "mark-touch", "wrong-rounding"];

export interface RaceJudgeItem {
  id: string;
  kind: RaceJudgeIncidentKind;
  rule: RacingRule;
  phase: RaceJudgePhase;
  phaseNote?: RaceJudgePhaseNote;
  /** First and last event time of the merged incident, race seconds from the start signal. */
  time: number;
  until: number;
  occurrences: number;
  otherBoatId?: string;
  rightOfWay: RaceJudgeRightOfWay;
  penalty: RaceJudgePenalty;
  /** Early start only: a later start-clear proves the boat returned behind the line. */
  resolved?: boolean;
  lesson: RaceJudgeLesson;
}

export interface RaceJudgeSummary {
  incidents: number;
  counts: Record<RaceJudgeIncidentKind, number>;
  /** Seconds added to this boat's result. Equals the engine's sum for decided incidents. */
  totalPenaltySeconds: number;
  uncertain: number;
  markRounded: boolean;
  notCovered: readonly RaceJudgeNotCovered[];
}

export interface RaceJudgeDebrief {
  boatId: string;
  items: RaceJudgeItem[];
  summary: RaceJudgeSummary;
}

export interface RaceJudgeOptions {
  /** Defaults to "player". */
  boatId?: string;
  /** Race time when the boat crossed the start line. Without it the start and the upwind leg cannot be told apart. */
  startedAt?: number;
  /** Race time of the windward mark rounding. Defaults to this boat's mark-rounded event. */
  markRoundedAt?: number;
  /** Race time of the finish (without penalties). */
  finishedAt?: number;
}

interface Candidate { kind: RaceJudgeIncidentKind; rule: RacingRule; other?: string; standOn: boolean; events: RaceRuleEvent[]; }

const finite = (n: number | undefined): n is number => typeof n === "number" && Number.isFinite(n);
const ruleLesson = (rule: RacingRule): RaceJudgeLesson => rule === "10" ? "keep-clear-port" : rule === "11" ? "keep-clear-windward" : "keep-clear-astern";
const decided = (rule: RacingRule) => rule === "10" || rule === "11" || rule === "12";

/** Build the judge debrief for one boat. Pass every rule event of the race
 * (all boats): the other boats' events tell who had right of way in close
 * approaches and which contacts the other boat was penalised for. */
export function buildRaceJudgeDebrief(events: readonly RaceRuleEvent[], options: RaceJudgeOptions = {}): RaceJudgeDebrief {
  const me = options.boatId ?? RACE_JUDGE_PLAYER_ID;
  const all = events.filter(e => finite(e.time)).map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.time - b.e.time || a.i - b.i).map(x => x.e);
  const mine = all.filter(e => e.boatId === me);
  const markRoundedAt = finite(options.markRoundedAt) ? options.markRoundedAt : mine.find(e => e.kind === "mark-rounded")?.time;
  const startedAt = finite(options.startedAt) ? options.startedAt : undefined;
  const finishedAt = finite(options.finishedAt) ? options.finishedAt : undefined;

  // Group into incidents: same kind, rule, other boat and side, chained within the merge gap.
  const groups: Candidate[] = [];
  const open = new Map<string, Candidate>();
  const add = (e: RaceRuleEvent, kind: RaceJudgeIncidentKind, other: string | undefined, standOn: boolean) => {
    const key = `${standOn ? "s" : "m"}:${kind}:${e.rule}:${other ?? ""}`;
    const current = open.get(key);
    const last = current?.events[current.events.length - 1];
    if (current && last && e.time - last.time <= RACE_JUDGE_MERGE_GAP) { current.events.push(e); return; }
    const created: Candidate = { kind, rule: e.rule, other, standOn, events: [e] };
    groups.push(created); open.set(key, created);
  };
  const earlyTimes = mine.filter(e => e.kind === "early-start").map(e => e.time);
  for (const e of all) {
    if (e.boatId === me) {
      if (e.kind === "mark-rounded") continue;
      // A start-clear closes an early start; only an orphan one becomes its own item.
      if (e.kind === "start-clear" && earlyTimes.some(t => t <= e.time)) continue;
      add(e, e.kind, e.otherBoatId, false);
    } else if (e.kind === "contact" && e.otherBoatId === me && decided(e.rule)) {
      // The other boat was the give-way boat and got the penalty; we stood on.
      add(e, "contact", e.boatId, true);
    }
  }

  const sameFrame = (a: number, b: number) => Math.abs(a - b) <= SAME_FRAME;
  const items = groups.map((g): RaceJudgeItem => {
    const first = g.events[0], lastEvent = g.events[g.events.length - 1];
    const seconds = g.events.reduce((sum, e) => sum + (finite(e.penaltySeconds) && e.penaltySeconds > 0 ? e.penaltySeconds : 0), 0);
    const base = { id: `${g.standOn ? "stand-on:" : ""}${g.kind}:${g.rule}:${g.other ?? ""}:${first.time.toFixed(3)}`, kind: g.kind, rule: g.rule,
      time: first.time, until: lastEvent.time, occurrences: g.events.length, ...(g.other ? { otherBoatId: g.other } : {}) };
    const { phase, phaseNote } = resolvePhase(g.kind, first.time, { startedAt, markRoundedAt, finishedAt });
    const withPhase = { ...base, phase, ...(phaseNote ? { phaseNote } : {}) };
    switch (g.kind) {
      case "give-way":
        return { ...withPhase, rightOfWay: "other", penalty: { kind: "advice" }, lesson: ruleLesson(g.rule) };
      case "avoid-contact": {
        const at = (pred: (e: RaceRuleEvent) => boolean) => all.some(e => pred(e) && g.events.some(x => sameFrame(x.time, e.time)));
        const rightOfWay: RaceJudgeRightOfWay =
          at(e => e.kind === "give-way" && e.boatId === g.other && e.otherBoatId === me) ? "you"
          : at(e => e.kind === "give-way" && e.boatId === me && e.otherBoatId === g.other) ? "other"
          : at(e => e.kind === "avoid-contact" && e.boatId === g.other && e.otherBoatId === me) ? "undecided"
          : "unknown";
        return { ...withPhase, rightOfWay, penalty: rightOfWay === "undecided" ? { kind: "uncertain" } : { kind: "advice" },
          lesson: rightOfWay === "you" ? "avoid-contact-right-of-way" : rightOfWay === "other" ? ruleLesson(lastRule(all, me, g.other, first.time)) : "avoid-contact-unclear" };
      }
      case "contact":
        if (g.standOn) return { ...withPhase, rightOfWay: "you", penalty: seconds > 0 ? { kind: "other-boat", seconds } : { kind: "penalties-off" }, lesson: "avoid-contact-right-of-way" };
        // Rule 14 contact: the engine could not tell who had right of way. Never a penalty (ADR-0009).
        if (!decided(g.rule)) return { ...withPhase, rightOfWay: "undecided", penalty: { kind: "uncertain" }, lesson: "avoid-contact-unclear" };
        return { ...withPhase, rightOfWay: "other", penalty: seconds > 0 ? { kind: "applied", seconds } : { kind: "penalties-off" }, lesson: ruleLesson(g.rule) };
      case "early-start": {
        const nextEarly = earlyTimes.find(t => t > lastEvent.time) ?? Infinity;
        const resolved = mine.some(e => e.kind === "start-clear" && e.time >= lastEvent.time && e.time < nextEarly);
        return { ...withPhase, rightOfWay: "not-applicable", penalty: { kind: "correction-required" }, resolved, lesson: "return-behind-line" };
      }
      case "start-clear":
        return { ...withPhase, rightOfWay: "not-applicable", penalty: { kind: "advice" }, lesson: "clean-start" };
      case "mark-touch":
        return { ...withPhase, rightOfWay: "not-applicable", penalty: seconds > 0 ? { kind: "applied", seconds } : { kind: "penalties-off" }, lesson: "mark-clearance" };
      case "wrong-rounding":
        return { ...withPhase, rightOfWay: "not-applicable", penalty: { kind: "correction-required" }, lesson: "round-to-port" };
    }
  });

  const counts = Object.fromEntries(RACE_JUDGE_INCIDENT_KINDS.map(k => [k, 0])) as Record<RaceJudgeIncidentKind, number>;
  for (const item of items) counts[item.kind] += 1;
  return {
    boatId: me,
    items,
    summary: {
      incidents: items.length,
      counts,
      totalPenaltySeconds: items.reduce((sum, item) => sum + (item.penalty.kind === "applied" ? item.penalty.seconds : 0), 0),
      uncertain: items.filter(item => item.penalty.kind === "uncertain").length,
      markRounded: markRoundedAt !== undefined,
      notCovered: RACE_JUDGE_NOT_COVERED,
    },
  };
}

function lastRule(all: readonly RaceRuleEvent[], me: string, other: string | undefined, time: number): RacingRule {
  const match = all.find(e => e.kind === "give-way" && e.boatId === me && e.otherBoatId === other && Math.abs(e.time - time) <= SAME_FRAME);
  return match?.rule ?? "10";
}

/** Phase from what the events prove. The engine clock is zero at the start
 * signal and only runs while racing, so a negative time is before the signal. */
export function resolvePhase(kind: RaceJudgeIncidentKind, time: number, timeline: { startedAt?: number; markRoundedAt?: number; finishedAt?: number }): { phase: RaceJudgePhase; phaseNote?: RaceJudgePhaseNote } {
  const { startedAt, markRoundedAt, finishedAt } = timeline;
  if (time < 0) return { phase: "pre-start" };
  if (finishedAt !== undefined && time >= finishedAt) return { phase: "after-finish" };
  if (kind === "early-start" || kind === "start-clear") return { phase: "start" };
  if (kind === "wrong-rounding") return { phase: "mark" };
  const rounded = markRoundedAt !== undefined && time >= markRoundedAt;
  // Finished but no rounding recorded: the events cannot place the incident on a leg.
  if (markRoundedAt === undefined && finishedAt !== undefined) return { phase: "unknown", phaseNote: "rounding-not-recorded" };
  if (kind === "mark-touch") {
    // After the rounding only the start/finish line marks are checked.
    if (rounded) return { phase: "finish" };
    if (startedAt === undefined) return { phase: "unknown", phaseNote: "start-or-windward-mark" };
    return { phase: time >= startedAt ? "mark" : "start" };
  }
  if (rounded) return { phase: "downwind" };
  if (startedAt === undefined) return { phase: "unknown", phaseNote: "start-or-upwind" };
  return { phase: time >= startedAt ? "upwind" : "start" };
}
