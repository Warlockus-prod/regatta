import { describe, expect, it } from "vitest";
import { assistCostsGold, raceAssistRecord, readRaceAssistRecord, resolveRaceHelmControl } from "./race-helm";

// Contracts (ADR-0022, owner decision 1 of the race game logic):
// - a new install steers the race with arrows; a saved choice is never
//   overwritten (the race's own row first, else the trainers' saved mode);
// - a result remembers the helm and the assists, and a result without the
//   field (saved before package 13) stays valid;
// - only BEST VMG costs gold (R-8).

describe("race helm control", () => {
  it("arrows for a new install", () => {
    expect(resolveRaceHelmControl(null, null)).toBe("arrows");
    expect(resolveRaceHelmControl(undefined, undefined)).toBe("arrows");
    expect(resolveRaceHelmControl("joystick", "dials")).toBe("arrows");
  });
  it("the trainers' saved mode is kept until the race has its own choice", () => {
    expect(resolveRaceHelmControl(null, "wheels")).toBe("wheels");
    expect(resolveRaceHelmControl(null, "sliders")).toBe("sliders");
  });
  it("the race's own choice wins", () => {
    expect(resolveRaceHelmControl("arrows", "sliders")).toBe("arrows");
    expect(resolveRaceHelmControl("wheels", null)).toBe("wheels");
    expect(resolveRaceHelmControl("sliders", "wheels")).toBe("sliders");
  });
});

describe("assists stored with a result", () => {
  it("rounds and bounds the usage", () => {
    expect(raceAssistRecord("arrows", { buttonTurns: 3, bestVmgSec: 41.6, angleHoldSec: 0.2 }))
      .toEqual({ helm: "arrows", buttonTurns: 3, bestVmgSec: 42, angleHoldSec: 0 });
    expect(raceAssistRecord("wheels", { buttonTurns: -1, bestVmgSec: Number.NaN, angleHoldSec: 1e9 }))
      .toEqual({ helm: "wheels", buttonTurns: 0, bestVmgSec: 0, angleHoldSec: 7200 });
  });
  it("reads a valid record back and rejects anything else", () => {
    const record = { helm: "sliders", buttonTurns: 2, bestVmgSec: 10, angleHoldSec: 5 };
    expect(readRaceAssistRecord(record)).toEqual(record);
    expect(readRaceAssistRecord(JSON.parse(JSON.stringify(record)))).toEqual(record);
    for (const bad of [null, undefined, "arrows", [], { ...record, helm: "tiller" }, { ...record, buttonTurns: 1.5 },
      { ...record, bestVmgSec: -1 }, { ...record, angleHoldSec: 9999 }, { helm: "arrows" }]) expect(readRaceAssistRecord(bad)).toBeNull();
  });
  it("only BEST VMG costs gold", () => {
    expect(assistCostsGold({ bestVmgSec: 0 })).toBe(false);
    expect(assistCostsGold({ bestVmgSec: 0.05 })).toBe(true);
  });
});
