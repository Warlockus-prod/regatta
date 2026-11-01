import { afterEach, describe, expect, it, vi } from "vitest";
import type { Lang } from "@/lib/i18n";
import type { RaceRuleEvent } from "@/lib/race-rules";

const locale = vi.hoisted(() => ({ current: "en" as Lang }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ tl: (values: Record<Lang, string>) => values[locale.current] }) }));
import { MISSED_MARK_NOTICE, useRaceCopy } from "./race-copy";
import { FINISH_COPY } from "./race-finish-summary";
import { RACE_PAUSE_RESOURCES } from "./race-pause-copy";
import { raceJudgeCopy } from "@/data/race-judge-copy";
import { useRaceNavigationCopy } from "@/features/race-hud/navigation-copy";
import { eventText } from "@/features/race-hud/events";
import { RACE_INTRO_COPY } from "@/data/race-intro-copy";

// Contract (2026-10-31 language pass): the race names a course mark with one
// glossary term per language (scripts/sailing-glossary.md, "Race UI terms"):
// French "bouée" (the RCV "marque" only inside "place à la marque"), German
// "Bahnmarke" or a lower-case -tonne compound (Luvtonne, Leetonne,
// Starttonne), never a bare "Tonne". And the toast for a touched mark starts
// with the same incident name the judge debrief lists.

const languages = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;
afterEach(() => { locale.current = "en"; });

function strings(value: unknown, lang: Lang): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (typeof record[lang] === "string" && languages.every((l) => typeof record[l] === "string")) return [record[lang] as string];
  return Object.values(record).flatMap((v) => strings(v, lang));
}

function raceTexts(lang: Lang): string[] {
  locale.current = lang;
  const copy = useRaceCopy();
  const kinds: RaceRuleEvent["kind"][] = ["give-way", "avoid-contact", "contact", "early-start", "start-clear", "mark-touch", "wrong-rounding", "mark-rounded"];
  const messages = kinds.flatMap((kind) => (["10", "11"] as const).map((rule) =>
    copy.ruleMessage({ id: "terms", kind, rule, boatId: "player", time: 1, penaltySeconds: 3 })));
  const events = [eventText(lang, { kind: "mark", place: 1, gapSec: 0 }), eventText(lang, { kind: "mark", place: 2, gapSec: 1.5 })];
  return [
    ...strings(copy, lang), ...messages, ...events, MISSED_MARK_NOTICE[lang],
    ...strings(FINISH_COPY, lang), ...strings(RACE_PAUSE_RESOURCES, lang), ...strings(raceJudgeCopy, lang),
    ...strings(useRaceNavigationCopy(), lang), ...strings(RACE_INTRO_COPY, lang),
  ];
}

describe("race mark terms", () => {
  it("collects the race texts of every language", () => {
    for (const lang of languages) expect(raceTexts(lang).length).toBeGreaterThan(150);
  });

  it("writes the French mark as bouée", () => {
    const bare = raceTexts("fr").map((text) => text.replace(/place à la marque/gi, "")).filter((text) => /\bmarques?\b/i.test(text));
    expect(bare).toEqual([]);
    locale.current = "fr";
    expect(useRaceNavigationCopy().marks).toBe("Bouée");
  });

  it("writes the German mark as Bahnmarke, never a bare Tonne", () => {
    const bare = raceTexts("de").filter((text) => /(^|[^A-Za-zÄÖÜäöüß])Tonne/.test(text));
    expect(bare).toEqual([]);
    locale.current = "de";
    expect(useRaceNavigationCopy().marks).toBe("Bahnmarke");
    expect(eventText("de", { kind: "mark", place: 2, gapSec: 1 })).toMatch(/^Bahnmarke: /);
  });

  it.each(languages)("names a touched mark the same in the %s toast and in the debrief", (lang) => {
    locale.current = lang;
    const toast = useRaceCopy().ruleMessage({ id: "touch", kind: "mark-touch", rule: "31", boatId: "player", time: 1, penaltySeconds: 3 });
    expect(toast.startsWith(raceJudgeCopy.kind["mark-touch"][lang])).toBe(true);
  });
});
