import { describe, expect, it } from "vitest";
import { eventText, ordinal } from "./events";
import { RACE_UNITS } from "./units";

const LANGS = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;
// En and em dash, built from their codes so this file stays free of them.
const TYPOGRAPHIC_DASH = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

// Contract: every race event reads in all seven languages with the number the
// race measured, and no typographic dash slips into a loss.
describe("race event texts", () => {
  it("writes places as each language does", () => {
    expect([1, 2, 3, 4, 11, 21].map((n) => ordinal("en", n))).toEqual(["1st", "2nd", "3rd", "4th", "11th", "21st"]);
    expect(ordinal("ru", 2)).toBe("2-й");
    expect(ordinal("fr", 1)).toBe("1er");
    expect(ordinal("de", 3)).toBe("3.");
  });

  it("carries the measured numbers in every language", () => {
    for (const lang of LANGS) {
      // M1-7: the knot and second signs are the language's own, not "kn" / "s" everywhere.
      expect(eventText(lang, { kind: "tack", lossKn: 1.24 })).toContain(`-1.2 ${RACE_UNITS.knots[lang]}`);
      expect(eventText(lang, { kind: "mark", place: 2, gapSec: 4.26 })).toContain(`+4.3 ${RACE_UNITS.seconds[lang]}`);
      expect(eventText(lang, { kind: "gained", place: 2 })).toContain(ordinal(lang, 2));
      expect(eventText(lang, { kind: "mark", place: 1, gapSec: 0 }).length).toBeGreaterThan(5);
      for (const kind of ["tack", "gybe"] as const) expect(eventText(lang, { kind, lossKn: 2 })).not.toMatch(TYPOGRAPHIC_DASH);
    }
  });

  it("does not leak the English knot sign into Russian, Polish or French (M1-7)", () => {
    expect(eventText("ru", { kind: "tack", lossKn: 1.24 })).toBe("Оверштаг: -1.2 уз");
    expect(eventText("pl", { kind: "gybe", lossKn: 0.5 })).toBe("Zwrot przez rufę: -0.5 w.");
    expect(eventText("fr", { kind: "tack", lossKn: 2 })).toBe("Virement : -2.0 nd");
    expect(eventText("ru", { kind: "mark", place: 3, gapSec: 4.26 })).toBe("Знак: 3-й, +4.3 с");
    expect(eventText("en", { kind: "tack", lossKn: 1.24 })).toBe("Tack: -1.2 kn");
    for (const lang of ["ru", "pl", "fr"] as const) expect(eventText(lang, { kind: "tack", lossKn: 1 })).not.toMatch(/\bkn\b/);
  });
});
