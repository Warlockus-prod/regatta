import { describe, expect, it } from "vitest";
import { DEFAULT_RACE_ASSISTS, isWindDisplay, sanitizeRaceAssists, WIND_DISPLAYS, type RaceAssists } from "./race-visual-prefs";

describe("race visual preferences", () => {
  it("adds a compass to legacy assists without changing the four existing defaults", () => {
    expect(DEFAULT_RACE_ASSISTS).toEqual({ guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "compass" });
    expect(sanitizeRaceAssists({ guidance: false, rules: false, penalties: true })).toEqual({ guidance: false, trimHints: true, rules: false, penalties: true, windDisplay: "compass" });
  });

  it.each(WIND_DISPLAYS)("preserves the closed %s wind style and known boolean values only", windDisplay => {
    const input = Object.freeze({ guidance: false, trimHints: false, rules: true, penalties: true, windDisplay, privatePayload: "PRIVATE", mode: "pro" });
    expect(sanitizeRaceAssists(input)).toEqual({ guidance: false, trimHints: false, rules: true, penalties: true, windDisplay });
    expect(isWindDisplay(windDisplay)).toBe(true);
    expect(input.privatePayload).toBe("PRIVATE");
  });

  it("defaults malformed records and rejects unknown enum or boolean coercion", () => {
    for (const input of [null, undefined, [], ["arrows"], "compass", 1, false]) expect(sanitizeRaceAssists(input)).toEqual(DEFAULT_RACE_ASSISTS);
    for (const windDisplay of ["weather", "COMPASS", "", 1, true, null, {}]) {
      expect(isWindDisplay(windDisplay)).toBe(false);
      expect(sanitizeRaceAssists({ windDisplay, guidance: "false", trimHints: 0, rules: null, penalties: "yes" })).toEqual(DEFAULT_RACE_ASSISTS);
    }
  });

  it("preserves normalized current values on invalid partial updates without leaking an invalid fallback enum", () => {
    const previous: RaceAssists = { guidance: false, trimHints: false, rules: false, penalties: true, windDisplay: "both" };
    expect(sanitizeRaceAssists({ windDisplay: "bad", rules: true }, previous)).toEqual({ ...previous, rules: true });
    expect(sanitizeRaceAssists({}, { ...previous, windDisplay: "PRIVATE" } as unknown as RaceAssists).windDisplay).toBe("compass");
  });
});
