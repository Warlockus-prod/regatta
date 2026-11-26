import { describe, expect, it } from "vitest";
import { HINT_LOG_LIMITS, LOGGED_ROUTE_ACTIONS, LOGGED_TRIM_KEYS, createHintLog, hintLogKind, hintLogTime, logHint, loggedRouteAction, loggedTrimKey, type HintLog } from "./hint-log";

// F4 contract: the race hint log keeps every coach and judge message of the
// race, newest first, at most HINT_LOG_LIMITS.size lines with their race
// time; the same text again within HINT_LOG_LIMITS.repeatSec is not logged
// twice; a new race starts from an empty log.

const add = (log: HintLog, text: string, at: number, kind: "rule" | "hint" | "route" | "trim" | "race" = "race") => logHint(log, { kind, text, tone: "info" }, at);

describe("race hint log", () => {
  it("keeps the newest first with its race time and kind", () => {
    let log = createHintLog();
    log = add(log, "Tack: -1.2 kn", 12, "race");
    log = add(log, "Port tack gives way.", 30.4, "rule");
    log = add(log, "Prepare to tack", 41, "route");
    expect(log.entries.map(e => [e.text, e.at, e.kind])).toEqual([
      ["Prepare to tack", 41, "route"], ["Port tack gives way.", 30.4, "rule"], ["Tack: -1.2 kn", 12, "race"],
    ]);
    expect(new Set(log.entries.map(e => e.id)).size).toBe(3);
  });

  it("holds the last twenty lines: the oldest goes", () => {
    let log = createHintLog();
    for (let i = 0; i < 26; i++) log = add(log, `Mark split ${i}`, i * 30);
    expect(HINT_LOG_LIMITS.size).toBe(20);
    expect(log.entries).toHaveLength(20);
    expect(log.entries[0].text).toBe("Mark split 25");
    expect(log.entries.at(-1)!.text).toBe("Mark split 6");
  });

  it("logs the same text again only after the repeat window", () => {
    let log = add(createHintLog(), "Prepare to tack", 10, "route");
    const same = add(log, "Prepare to tack", 10 + HINT_LOG_LIMITS.repeatSec - 1, "route");
    expect(same).toBe(log);
    log = add(log, "Prepare to tack", 10 + HINT_LOG_LIMITS.repeatSec, "route");
    expect(log.entries).toHaveLength(2);
    // A different text right away is logged.
    expect(add(log, "Prepare to gybe", 31, "route").entries).toHaveLength(3);
  });

  it("drops empty text and a time that is not a number", () => {
    const log = createHintLog();
    expect(add(log, "   ", 1)).toBe(log);
    expect(add(log, "Keep clear.", Number.NaN)).toBe(log);
    expect(add(log, "  Keep clear. ", 1).entries[0].text).toBe("Keep clear.");
  });

  it("names the bus sources and logs only the route actions that ask for a manoeuvre", () => {
    expect(hintLogKind("rule")).toBe("rule");
    expect(hintLogKind("missed-mark")).toBe("rule");
    expect(hintLogKind("hint")).toBe("hint");
    for (const source of ["contact", "manoeuvre", "mark", "place", "split"] as const) expect(hintLogKind(source)).toBe("race");
    expect([...LOGGED_ROUTE_ACTIONS].sort()).toEqual(["gybe", "return-start", "round-port", "tack"]);
    expect(LOGGED_ROUTE_ACTIONS).not.toContain("hold");
    expect(LOGGED_ROUTE_ACTIONS).not.toContain("steer-port");
  });

  it("reads the race time as minutes and seconds; the countdown reads 0:00", () => {
    expect(hintLogTime(0)).toBe("0:00");
    expect(hintLogTime(-4)).toBe("0:00");
    expect(hintLogTime(65.9)).toBe("1:05");
    expect(hintLogTime(600)).toBe("10:00");
  });

  it("keeps only the latest of a row of trim lines, so flapping trim advice never pushes a rule notice out", () => {
    let log = add(createHintLog(), "Port tack gives way.", 5, "rule");
    log = add(log, "Finish not counted.", 6, "rule");
    // Advice flipping between two keys every second for two minutes.
    for (let t = 10; t < 130; t++) log = add(log, t % 2 ? "Ease the main" : "Sheet in the jib", t, "trim");
    expect(log.entries.map(e => e.kind)).toEqual(["trim", "rule", "rule"]);
    expect(log.entries[0]).toMatchObject({ text: "Ease the main", at: 129 });
    // The same trim text again changes nothing; a trim line after another line is added.
    expect(add(log, "Ease the main", 131, "trim")).toBe(log);
    log = add(log, "Prepare to tack", 132, "route");
    log = add(log, "Sheet in the jib", 133, "trim");
    expect(log.entries.map(e => e.kind)).toEqual(["trim", "route", "trim", "rule", "rule"]);
  });
});

// F4 contract for what the page feeds into the log besides the bus: the route
// line only when it asks for a manoeuvre with the route hint on, the trim line
// only in a Pro race with the trim hint on and only advice that asks for a
// change; nothing outside the running race.
describe("route and trim lines for the log", () => {
  it("logs a manoeuvre call of the route hint, not the steering corrections, and nothing with the hint off", () => {
    for (const action of ["tack", "gybe", "return-start", "round-port"] as const) expect(loggedRouteAction(true, true, action)).toBe(action);
    for (const action of ["hold", "steer-port", "steer-starboard"] as const) expect(loggedRouteAction(true, true, action)).toBeNull();
    expect(loggedRouteAction(true, false, "tack")).toBeNull();
    expect(loggedRouteAction(false, true, "tack")).toBeNull();
    expect(loggedRouteAction(true, true, null)).toBeNull();
  });

  it("logs Pro trim advice that asks for a change, only with the trim hint on", () => {
    const pro = { mode: "pro" as const, trimHints: true };
    for (const key of ["inIrons", "pinching", "luffMain", "luffJib", "luffBoth", "stallMain", "stallJib", "stallBoth"] as const) expect(loggedTrimKey(true, pro, key)).toBe(key);
    for (const key of ["good", "reachOn", "run"] as const) expect(loggedTrimKey(true, pro, key)).toBeNull();
    expect(LOGGED_TRIM_KEYS).not.toContain("good");
    expect(loggedTrimKey(true, { mode: "simple", trimHints: true }, "luffMain")).toBeNull();
    expect(loggedTrimKey(true, { mode: "pro", trimHints: false }, "luffMain")).toBeNull();
    expect(loggedTrimKey(false, pro, "luffMain")).toBeNull();
    expect(loggedTrimKey(true, pro, null)).toBeNull();
  });
});
