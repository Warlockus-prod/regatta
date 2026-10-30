import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ tl: (values: Record<string, string>) => values.en }) }));
import { pickLocalized } from "@/lib/languages";
import { MISSED_MARK_NOTICE } from "./race-copy";

// En and em dashes, curly quotes and the ellipsis, built from code points so
// this file itself stays plain ASCII punctuation.
const TYPOGRAPHIC = new RegExp(`[${[0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026].map(c => String.fromCharCode(c)).join("")}]`);
const languages = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;
// Each language names the windward mark (scripts/sailing-glossary.md) and the
// port side the course rounds it to, as the rest of the race copy does.
const terms = {
  ru: ["верхний знак", "по левому борту"],
  en: ["windward mark", "to port"],
  pl: ["znak nawietrzny", "po lewej burcie"],
  es: ["baliza de barlovento", "a babor"],
  fr: ["bouée au vent", "à bâbord"],
  de: ["Luvtonne", "an Backbord"],
  it: ["boa di bolina", "a sinistra"],
} as const;

describe("missed windward mark notice", () => {
  it.each(languages)("tells %s players to round the windward mark to port first", lang => {
    const text = pickLocalized(lang, MISSED_MARK_NOTICE);
    expect(text).toBe(MISSED_MARK_NOTICE[lang]);
    for (const term of terms[lang]) expect(text).toContain(term);
    expect(text.length).toBeLessThan(100);
    expect(text).not.toMatch(TYPOGRAPHIC);
  });

  it("writes Polish with diacritics", () => {
    expect(MISSED_MARK_NOTICE.pl).toMatch(/[ąćęłńóśźż]/);
  });
});
