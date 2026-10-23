import { describe, expect, it } from "vitest";
import { eventText, ordinal } from "./events";

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
      expect(eventText(lang, { kind: "tack", lossKn: 1.24 })).toContain("-1.2 kn");
      expect(eventText(lang, { kind: "mark", place: 2, gapSec: 4.26 })).toContain("+4.3");
      expect(eventText(lang, { kind: "gained", place: 2 })).toContain(ordinal(lang, 2));
      expect(eventText(lang, { kind: "mark", place: 1, gapSec: 0 }).length).toBeGreaterThan(5);
      for (const kind of ["tack", "gybe"] as const) expect(eventText(lang, { kind, lossKn: 2 })).not.toMatch(TYPOGRAPHIC_DASH);
    }
  });
});
