import { describe, expect, it } from "vitest";
import { createStartSignalCue, playerRecallChange, SERVER_COUNTDOWN_FROM, SOLO_COUNTDOWN_FROM, startFlags } from "./race-start-signals";
import type { RaceRuleEvent } from "./race-rules";

// Contract (M3-3): over the unchanged countdown, the first second sounds the
// horn, every later second above zero a short signal and zero the gun, each
// exactly once per countdown; the flags follow RRS 26 in the same seconds
// (class flag on the warning, P up on the next second and down on the last,
// class down at the gun); flag X follows only the race's own early-start events.

const run = (seconds: (number | null)[]) => {
  const cue = createStartSignalCue();
  return seconds.map(s => cue.at(s));
};

describe("start signal per countdown second", () => {
  it("plays horn, short, short, gun over the solo 3-2-1-0 countdown", () => {
    expect(run([3, 2, 1, 0])).toEqual(["warning", "tick", "tick", "start"]);
  });

  it("plays the same pattern over the server's 5 s countdown, rounding its remaining seconds up", () => {
    expect(run([5, 4.96, 4.2, 3.7, 3, 2.01, 1.5, 0.4, 0, 0]))
      .toEqual(["warning", null, null, "tick", "tick", null, "tick", "tick", "start", null]);
  });

  it("plays nothing again for a repeated second, a pause (null) or the race after the gun", () => {
    expect(run([null, 3, 3, null, 3, 2, null, 2, 1, 0, 0, 0])).toEqual([null, "warning", null, null, null, "tick", null, null, "tick", "start", null, null]);
  });

  it("fires no gun for a player who joins at or after the start", () => {
    expect(run([0, 0])).toEqual([null, null]);
    expect(run([null, 0])).toEqual([null, null]);
  });

  it("starts over after a reset: the next countdown begins with the horn again", () => {
    const cue = createStartSignalCue();
    expect([cue.at(3), cue.at(2)]).toEqual(["warning", "tick"]);
    cue.reset();
    expect([cue.at(3), cue.at(2), cue.at(1), cue.at(0)]).toEqual(["warning", "tick", "tick", "start"]);
  });

  it("ignores values that are not a number", () => {
    expect(run([Number.NaN, undefined as unknown as null, Infinity])).toEqual([null, null, null]);
  });
});

describe("start flags", () => {
  it("raises the class flag on the warning, P on the next second, lowers P on the last second and the class flag at the gun", () => {
    expect([3, 2, 1, 0].map(s => startFlags(s))).toEqual([["class"], ["class", "preparatory"], ["class"], []]);
    expect(startFlags(3, false, SOLO_COUNTDOWN_FROM)).toEqual(["class"]);
  });

  it("stages the same order over the server's 5 s countdown", () => {
    expect([5, 4.6, 4, 3, 2, 1.3, 1, 0].map(s => startFlags(s, false, SERVER_COUNTDOWN_FROM)))
      .toEqual([["class"], ["class"], ["class", "preparatory"], ["class", "preparatory"], ["class", "preparatory"], ["class", "preparatory"], ["class"], []]);
  });

  it("shows nothing at or after the start", () => {
    expect(startFlags(0)).toEqual([]);
    expect(startFlags(undefined)).toEqual([]);
    expect(startFlags(null)).toEqual([]);
  });

  it("shows flag X only after the start, while the player is recalled", () => {
    expect(startFlags(undefined, true)).toEqual(["recall"]);
    expect(startFlags(0, true)).toEqual(["recall"]);
    expect(startFlags(2, true)).toEqual(["class", "preparatory"]);
    expect(startFlags(1, true)).toEqual(["class"]);
    expect(startFlags(undefined, false)).toEqual([]);
  });
});

describe("player recall from the race rules", () => {
  const ev = (kind: RaceRuleEvent["kind"], boatId = "player"): RaceRuleEvent => ({ id: `${kind}:${boatId}`, kind, rule: "29.1", boatId, time: 0, penaltySeconds: 0 });
  it("goes up on the player's early start and down when the player has cleared it", () => {
    expect(playerRecallChange([ev("early-start")])).toBe(true);
    expect(playerRecallChange([ev("start-clear")])).toBe(false);
    expect(playerRecallChange([ev("early-start"), ev("start-clear")])).toBe(false);
  });
  it("ignores other boats and other rule events", () => {
    expect(playerRecallChange([ev("early-start", "ai0"), ev("contact"), ev("mark-touch")])).toBeNull();
    expect(playerRecallChange([])).toBeNull();
  });
});
