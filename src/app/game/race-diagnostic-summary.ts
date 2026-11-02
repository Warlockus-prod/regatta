// race.summary for the local diagnostics journal (Menu > Settings > Diagnostics).
// One solo race end writes two bounded rows in the same tick: "result" (how
// the race was set up and how it ended) and "debrief" (what happened on the
// water). Only enums, flags and clamped counts: no names, nickname, answers or
// free text. Pure: the race loop gathers the values, this file shapes them.

import { RACE_SUMMARY_LIMITS, type DiagnosticInput } from "@/lib/diagnostics";
import { measureRaceLog, type CoachGoalKind } from "@/lib/fallback-coach";
import type { RaceRuleEvent } from "@/lib/race-rules";
import { RACE_START_JOSTLE_SECONDS, isStartJostleWithin } from "@/lib/race-start-jostle";
import type { LogEvent, LogSample } from "./race-model";

type Summary = Extract<DiagnosticInput, { type: "race.summary" }>;
export type RaceSummaryResult = Extract<Summary, { action: "result" }>;
export type RaceSummaryDebrief = Extract<Summary, { action: "debrief" }>;
export type RaceSetupSource = RaceSummaryResult["setupSource"];
export type RaceKind = RaceSummaryResult["race"];

/** What GameClient knows about how this race was entered. */
export interface RaceSetupRecord { source: RaceSetupSource; briefingShown: boolean; race: RaceKind }
/** Per-race counts the loop keeps for the summary; reset with each race. */
export interface RaceTally { missedMarkNotices: number; contacts: number }

export interface RaceSummaryInput {
  mode: "simple" | "pro";
  difficulty: "easy" | "medium" | "hard";
  wind: "light" | "medium" | "heavy";
  setup: RaceSetupRecord;
  finished: boolean;
  place: number;
  total: number;
  botsFinished: number;
  raceSeconds: number;
  penaltySeconds: number;
  finishHoldShown: boolean;
  soundOn: boolean;
  orientation: "portrait" | "landscape" | null;
  events: readonly LogEvent[];
  samples: readonly LogSample[];
  /** Every boat's rule events of this race; only the player's are counted. */
  ruleEvents: readonly RaceRuleEvent[];
  /** Null where the engine does not measure it (the physical trial). */
  tally: RaceTally | null;
  coachScore: number;
  mainMistake: CoachGoalKind | null;
  /** The race's start jostle, seconds (raceScale startJostleSeconds); the legacy 10 s when omitted. */
  startJostleSeconds?: number;
}

const int = (value: number, min: number, max: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : min;
const count = (value: number) => int(value, 0, RACE_SUMMARY_LIMITS.count);
const seconds = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(RACE_SUMMARY_LIMITS.seconds, Math.round(value * 10) / 10)) : 0;

export function raceSummaryDiagnostics(input: RaceSummaryInput): [RaceSummaryResult, RaceSummaryDebrief] {
  const total = int(input.total, 1, RACE_SUMMARY_LIMITS.boats);
  const player = input.ruleEvents.filter(e => e.boatId === "player");
  const jostled = (e: RaceRuleEvent) => isStartJostleWithin(e, input.startJostleSeconds ?? RACE_START_JOSTLE_SECONDS);
  const jostle = player.filter(jostled).length;
  const result: RaceSummaryResult = { type: "race.summary", surface: "race", outcome: "accepted", source: "system", action: "result",
    mode: input.mode, difficulty: input.difficulty, wind: input.wind, setupSource: input.setup.source, race: input.setup.race,
    briefingShown: input.setup.briefingShown, finished: input.finished, place: int(input.place, 1, total), total,
    botsFinished: int(input.botsFinished, 0, total - 1), raceSeconds: seconds(input.raceSeconds), penaltySeconds: seconds(input.penaltySeconds),
    finishHoldShown: input.finishHoldShown, soundOn: input.soundOn, ...(input.orientation ? { orientation: input.orientation } : {}) };
  const debrief: RaceSummaryDebrief = { type: "race.summary", surface: "race", outcome: "accepted", source: "system", action: "debrief",
    tacks: count(input.events.filter(e => e.type === "tack").length),
    gybes: count(input.events.filter(e => e.type === "gybe").length),
    // M0-4: the one no-go definition the coach also uses.
    noGoEntries: count(measureRaceLog({ events: [...input.events], samples: [...input.samples] }).noGoEntries),
    ...(input.tally ? { missedMarkNotices: count(input.tally.missedMarkNotices), contacts: count(input.tally.contacts) } : {}),
    startJostleEvents: count(jostle),
    // The player's rule events without the start jostle. With rules on, the loop
    // replaces this with the judge debrief's own item count (withJudgeIncidents).
    judgeIncidents: count(player.filter(e => e.kind !== "mark-rounded" && !jostled(e)).length),
    coachScore: int(input.coachScore, 0, RACE_SUMMARY_LIMITS.score), mainMistake: input.mainMistake ?? "none" };
  return [result, debrief];
}

/** The debrief with the incidents the judge debrief lists (its items without the start jostle). */
export function withJudgeIncidents(debrief: RaceSummaryDebrief, judged: number): RaceSummaryDebrief {
  return { ...debrief, judgeIncidents: count(judged) };
}

/** The screen's orientation at the race end, if the browser can tell. */
export function raceOrientation(): "portrait" | "landscape" | null {
  try {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
    return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
  } catch { return null; }
}
