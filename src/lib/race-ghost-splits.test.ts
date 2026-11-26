import { describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT } from "./race-context";
import { ghostClassKey, makeGhostTrack } from "./race-ghost";
import { compareSplit, ghostMarkSplit, raceGhostSplits, splitTone } from "./race-ghost-splits";
import { ghostSplitToast, raceGhostCopy, splitDeltaText, splitVerdictText } from "@/data/race-ghost-copy";
import { ENABLED_LANGUAGES } from "./languages";
const LANGS = ENABLED_LANGUAGES.map(l => l.id);

// Contract (M4-4): a split is your time minus the ghost's at the same point;
// minus is ahead and green, plus is behind and red, a shown "0.0" is level
// and neutral; the text always carries the sign and a word, never colour alone.
const key = ghostClassKey({ raceContext: LEGACY_RACE_CONTEXT, mode: "simple", difficulty: "easy", windStrength: "medium", missionId: null });
const samples = (lapAt: number) => Array.from({ length: 8 }, (_, i) => ({ t: i * 10, x: 0, y: 0, heading: 0, speed: 5, lap: i * 10 >= lapAt ? 1 : 0 }));

describe("ghost splits", () => {
  it("signs and rounds as shown, on three inputs", () => {
    expect(compareSplit(62.3, 64.71)).toEqual({ deltaSec: -2.4, verdict: "ahead" });
    expect(compareSplit(70.06, 68.95)).toEqual({ deltaSec: 1.1, verdict: "behind" });
    expect(compareSplit(50.04, 50)).toEqual({ deltaSec: 0, verdict: "even" });
    expect(compareSplit(49.96, 50)).toEqual({ deltaSec: 0, verdict: "even" });
    expect(Object.is(compareSplit(49.96, 50).deltaSec, -0)).toBe(false);
  });

  it("uses the stored mark time, or the laps of an older track", () => {
    const stored = makeGhostTrack(key, 70, samples(30), [27.5])!;
    expect(ghostMarkSplit(stored, 0, 25)).toMatchObject({ at: "mark", ghostSec: 27.5, deltaSec: -2.5, verdict: "ahead" });
    const older = makeGhostTrack(key, 70, samples(30))!;
    expect(older.marks).toBeUndefined();
    expect(ghostMarkSplit(older, 0, 31)).toMatchObject({ ghostSec: 30, deltaSec: 1, verdict: "behind" });
    expect(ghostMarkSplit(null, 0, 31)).toBeNull();
    expect(ghostMarkSplit(stored, 1, 31)).toBeNull();
  });

  it("lists the marks you rounded and the finish when you finished", () => {
    const ghost = makeGhostTrack(key, 70, samples(30), [27.5])!;
    expect(raceGhostSplits(ghost, { marks: [26], finishSec: 72 }).map(s => [s.at, s.deltaSec, s.verdict]))
      .toEqual([["mark", -1.5, "ahead"], ["finish", 2, "behind"]]);
    expect(raceGhostSplits(ghost, { marks: [26], finishSec: null }).map(s => s.at)).toEqual(["mark"]);
    expect(raceGhostSplits(null, { marks: [26], finishSec: 72 })).toEqual([]);
  });

  it("maps ahead to green, behind to red, level to neutral", () => {
    expect([splitTone("ahead"), splitTone("behind"), splitTone("even")]).toEqual(["success", "danger", "info"]);
  });

  it("writes the sign and a word in all seven languages", () => {
    expect(splitDeltaText("en", -2.4)).toBe("-2.4 s");
    expect(splitDeltaText("ru", 1.1)).toBe("+1.1 с");
    expect(splitDeltaText("en", 0)).toBe("0.0 s");
    expect(ghostSplitToast("en", { deltaSec: -2.4, verdict: "ahead" })).toBe("Against your best: -2.4 s, ahead");
    expect(ghostSplitToast("fr", { deltaSec: 1.1, verdict: "behind" })).toBe("Face à ta meilleure course : +1.1 s, en retard");
    expect(ghostSplitToast("it", { deltaSec: -0.5, verdict: "ahead" })).toBe("Contro il tuo miglior tempo: -0.5 s, in vantaggio");
    for (const lang of LANGS) {
      for (const verdict of ["ahead", "behind", "even"] as const) expect(splitVerdictText(lang, { deltaSec: 1, verdict })).toContain(raceGhostCopy.verdict[verdict][lang]);
      expect(new Set(Object.values(raceGhostCopy.verdict).map(v => v[lang])).size).toBe(3);
    }
  });

});
