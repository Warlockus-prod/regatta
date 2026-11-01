import { describe, expect, it } from "vitest";
import { DEFAULT_RACE_ASSISTS, isWindDisplay, sanitizeRaceAssists, WIND_DISPLAYS, type RaceAssists } from "./race-visual-prefs";

describe("race visual preferences", () => {
  it("adds a compass to legacy assists without changing the four existing defaults", () => {
    expect(DEFAULT_RACE_ASSISTS).toEqual({ guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false });
    expect(sanitizeRaceAssists({ guidance: false, rules: false, penalties: true })).toEqual({ guidance: false, trimHints: true, rules: false, penalties: true, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false });
  });

  it.each(WIND_DISPLAYS)("preserves the closed %s wind style and known boolean values only", windDisplay => {
    const input = Object.freeze({ guidance: false, trimHints: false, rules: true, penalties: true, windDisplay, miniMap: false, privatePayload: "PRIVATE", mode: "pro" });
    expect(sanitizeRaceAssists(input)).toEqual({ guidance: false, trimHints: false, rules: true, penalties: true, windDisplay, miniMap: false, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false });
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
    const previous: RaceAssists = { guidance: false, trimHints: false, rules: false, penalties: true, windDisplay: "both", miniMap: false, coachStrip: false, firstRaceHints: false, softLight: true, sailFlow: true };
    expect(sanitizeRaceAssists({ windDisplay: "bad", rules: true }, previous)).toEqual({ ...previous, rules: true });
    expect(sanitizeRaceAssists({}, { ...previous, windDisplay: "PRIVATE" } as unknown as RaceAssists).windDisplay).toBe("compass");
    expect(sanitizeRaceAssists({ miniMap: "true" }, previous).miniMap).toBe(false);
    expect(sanitizeRaceAssists({ miniMap: "false" }).miniMap).toBe(true);
  });

  // F4: the Hints and Graphics switches of the race Settings live in the same
  // assists row (regatta.race.assists.v1, already on the app's storage allowlist).
  it("adds the coach line, first race hints and softer light to old records with their defaults", () => {
    const old = { guidance: false, trimHints: true, rules: true, penalties: false, windDisplay: "arrows", miniMap: false };
    expect(sanitizeRaceAssists(old)).toEqual({ ...old, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false });
    const legacyFallback = { guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "compass", miniMap: true } as unknown as RaceAssists;
    expect(sanitizeRaceAssists({}, legacyFallback)).toMatchObject({ coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false });
  });

  it("keeps each new switch as stored and never coerces a string", () => {
    const stored = sanitizeRaceAssists({ coachStrip: false, firstRaceHints: false, softLight: true });
    expect(stored).toMatchObject({ coachStrip: false, firstRaceHints: false, softLight: true });
    expect(sanitizeRaceAssists({ coachStrip: "false", firstRaceHints: 0, softLight: "true" })).toMatchObject({ coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false });
    expect(sanitizeRaceAssists({ softLight: "yes" }, stored)).toMatchObject({ coachStrip: false, firstRaceHints: false, softLight: true });
  });

  // F6: "Wind on the sails" rides in the same assists row, so the app keeps it
  // through the existing allowlist entry (no new storage key).
  it("adds wind on the sails to old records switched off, and keeps a stored choice without coercion", () => {
    const old = { guidance: false, trimHints: true, rules: true, penalties: false, windDisplay: "arrows", miniMap: false, coachStrip: false, firstRaceHints: true, softLight: true };
    expect(sanitizeRaceAssists(old)).toEqual({ ...old, sailFlow: false });
    expect(sanitizeRaceAssists({ sailFlow: true }).sailFlow).toBe(true);
    expect(sanitizeRaceAssists({ sailFlow: "true" }).sailFlow).toBe(false);
    expect(sanitizeRaceAssists({ sailFlow: 1 }, sanitizeRaceAssists({ sailFlow: true })).sailFlow).toBe(true);
  });
});
