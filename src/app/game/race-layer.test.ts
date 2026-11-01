import { describe, expect, it } from "vitest";
import { isRacePauseKey, raceUsesGameLayer } from "./race-layer";
import type { GameState } from "./race-model";

describe("solo race game layer phases", () => {
  it.each([
    ["countdown", true], ["racing", true], ["replay", true],
    ["menu", false], ["briefing", false], ["finished", false],
  ] as [GameState, boolean][])("%s uses the game layer: %s", (state, layer) => {
    expect(raceUsesGameLayer(state)).toBe(layer);
  });
});

describe("desktop pause keys", () => {
  it("toggles on Esc and P in either case", () => {
    for (const key of ["Escape", "Esc", "p", "P"]) expect(isRacePauseKey({ key }, false), key).toBe(true);
  });
  it("never toggles on a held key, a chord, typing or another key", () => {
    expect(isRacePauseKey({ key: "p", repeat: true }, false)).toBe(false);
    expect(isRacePauseKey({ key: "p", metaKey: true }, false)).toBe(false);
    expect(isRacePauseKey({ key: "p", ctrlKey: true }, false)).toBe(false);
    expect(isRacePauseKey({ key: "Escape", altKey: true }, false)).toBe(false);
    expect(isRacePauseKey({ key: "p" }, true)).toBe(false);
    for (const key of ["q", "a", "ArrowLeft", " ", "Enter"]) expect(isRacePauseKey({ key }, false), key).toBe(false);
  });
});
