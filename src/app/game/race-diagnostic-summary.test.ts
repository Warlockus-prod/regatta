import { describe, expect, it } from "vitest";
import { parseDiagnosticBatch } from "@/lib/diagnostics";
import type { RaceRuleEvent } from "@/lib/race-rules";
import { raceSummaryDiagnostics, withJudgeIncidents, type RaceSummaryInput } from "./race-diagnostic-summary";

// Contract: one race end gives two journal rows that the strict diagnostic
// codec (also the iOS app's) accepts unchanged, with the race's own counts.
const rule = (kind: RaceRuleEvent["kind"], time: number, boatId = "player", penaltySeconds = 0): RaceRuleEvent =>
  ({ id: `${kind}-${time}-${boatId}`, kind, rule: "10" as RaceRuleEvent["rule"], boatId, time, penaltySeconds } as RaceRuleEvent);
const sample = (t: number, twa: number, speed: number) => ({ t, x: 0, y: 0, heading: 0, speed, twa, lap: 0 });
function input(patch: Partial<RaceSummaryInput> = {}): RaceSummaryInput {
  return { mode: "pro", difficulty: "hard", wind: "light", setup: { source: "again", briefingShown: false, race: "daily" },
    finished: true, place: 2, total: 6, botsFinished: 5, raceSeconds: 312.46, penaltySeconds: 10, finishHoldShown: true, soundOn: true, orientation: "landscape",
    events: [{ type: "start", t: 0 }, { type: "tack", t: 30 }, { type: "tack", t: 60 }, { type: "gybe", t: 200 }, { type: "no-go-entered", t: 40 }, { type: "no-go-entered", t: 90 }],
    samples: [sample(0, 45, 5), sample(1, 45, 5)],
    ruleEvents: [rule("contact", 3), rule("give-way", 5), rule("give-way", 40), rule("mark-rounded", 120), rule("early-start", 1, "player", 10), rule("contact", 50, "ai0")],
    tally: { missedMarkNotices: 1, contacts: 4 }, coachScore: 61.6, mainMistake: "tacks", ...patch };
}

describe("race.summary rows", () => {
  it("counts the player's race and passes the strict codec unchanged", () => {
    const rows = raceSummaryDiagnostics(input());
    expect(rows).toEqual([
      { type: "race.summary", surface: "race", outcome: "accepted", source: "system", action: "result", mode: "pro", difficulty: "hard", wind: "light",
        setupSource: "again", race: "daily", briefingShown: false, finished: true, place: 2, total: 6, botsFinished: 5, raceSeconds: 312.5, penaltySeconds: 10,
        finishHoldShown: true, soundOn: true, orientation: "landscape" },
      // Start jostle: the penalty-free contact and give-way in the first 10 s; the early start is a judged incident.
      { type: "race.summary", surface: "race", outcome: "accepted", source: "system", action: "debrief", tacks: 2, gybes: 1, noGoEntries: 2,
        missedMarkNotices: 1, contacts: 4, startJostleEvents: 2, judgeIncidents: 2, coachScore: 62, mainMistake: "tacks" },
    ]);
    expect(parseDiagnosticBatch({ version: 1, events: rows })?.events).toEqual(rows);
  });

  it("clamps out-of-range values instead of losing the row, and omits what the trial does not measure", () => {
    const rows = raceSummaryDiagnostics(input({ place: 9, total: 6, botsFinished: 12, raceSeconds: 99_999, penaltySeconds: -3, coachScore: Number.NaN,
      mainMistake: null, orientation: null, tally: null, setup: { source: "lobby", briefingShown: true, race: "trial" } }));
    expect(rows[0]).toMatchObject({ place: 6, total: 6, botsFinished: 5, raceSeconds: 7200, penaltySeconds: 0, race: "trial" });
    expect(rows[0]).not.toHaveProperty("orientation");
    expect(rows[1]).toMatchObject({ coachScore: 0, mainMistake: "none" });
    expect(rows[1]).not.toHaveProperty("contacts");
    expect(rows[1]).not.toHaveProperty("missedMarkNotices");
    expect(parseDiagnosticBatch({ version: 1, events: rows })).not.toBeNull();
  });

  it("counts the start jostle of the race's own model (M5 step 6)", () => {
    const events = [rule("give-way", 5), rule("give-way", 14), rule("give-way", 40)];
    expect(raceSummaryDiagnostics(input({ ruleEvents: events }))[1]).toMatchObject({ startJostleEvents: 1, judgeIncidents: 2 });
    expect(raceSummaryDiagnostics(input({ ruleEvents: events, startJostleSeconds: 16 }))[1]).toMatchObject({ startJostleEvents: 2, judgeIncidents: 1 });
  });

  it("takes the judge debrief's own item count, clamped, and changes nothing else", () => {
    const [, debrief] = raceSummaryDiagnostics(input());
    expect(withJudgeIncidents(debrief, 1)).toEqual({ ...debrief, judgeIncidents: 1 });
    expect(withJudgeIncidents(debrief, 1e9).judgeIncidents).toBe(10_000);
    expect(parseDiagnosticBatch({ version: 1, events: [withJudgeIncidents(debrief, Number.NaN)] })).not.toBeNull();
  });

  it("writes a time-limit race as not finished with the bots that did finish", () => {
    const [result] = raceSummaryDiagnostics(input({ finished: false, place: 6, botsFinished: 3, finishHoldShown: false, raceSeconds: 300.01 }));
    expect(result).toMatchObject({ finished: false, place: 6, botsFinished: 3, finishHoldShown: false, raceSeconds: 300 });
  });
});
