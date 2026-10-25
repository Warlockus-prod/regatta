import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ENABLED_LANGUAGES } from "@/lib/languages";
import { radioText, type RadioAliases, type RadioCatalog } from "../localization/text";
import { THEORY_SECTION_LABELS } from "./sectionLabels";

describe("SRC theory section headings", () => {
  it("provides explicit copy for all twelve learn and exam headings in every UI language", () => {
    const languages = ENABLED_LANGUAGES.map(({ id }) => id).sort();
    expect(Object.keys(THEORY_SECTION_LABELS)).toHaveLength(12);
    for (const label of Object.values(THEORY_SECTION_LABELS)) {
      expect(Object.keys(label).sort()).toEqual(languages);
      for (const { id } of ENABLED_LANGUAGES) {
        expect(label[id].trim().length).toBeGreaterThan(3);
        expect(label[id]).not.toMatch(/[\u2013\u2014]/);
        if (id !== "pl") expect(label[id]).not.toBe(label.pl);
      }
    }
  });

  it("uses the explicit localized labels for every SectionTitle in the theory page", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    const headings = [...source.matchAll(/<SectionTitle\s+[^>]*>/g)].map(([tag]) => tag);
    expect(headings).toHaveLength(12);
    expect(headings.map((tag) => tag.match(/\bid="([^"]+)"/)?.[1]).sort()).toEqual(Object.keys(THEORY_SECTION_LABELS).sort());
    expect(headings.every((tag) => !/\b(?:pl|ru)=/.test(tag))).toBe(true);
    expect(source).toContain("tl(THEORY_SECTION_LABELS[id])");
  });

  it("keeps each explicitly selected heading unchanged through the actual locale catalog", () => {
    const aliases = JSON.parse(readFileSync(new URL("../../../../public/radio-locales/aliases.json", import.meta.url), "utf8")) as RadioAliases;
    for (const { id } of ENABLED_LANGUAGES) {
      const catalog = JSON.parse(readFileSync(new URL(`../../../../public/radio-locales/${id}.json`, import.meta.url), "utf8")) as RadioCatalog;
      for (const label of Object.values(THEORY_SECTION_LABELS)) {
        expect(radioText(label.pl, catalog, aliases)).toBe(label[id]);
        expect(radioText(label[id], catalog, aliases)).toBe(label[id]);
      }
    }
  });
});
