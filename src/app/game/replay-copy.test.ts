import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Lang } from "@/lib/i18n";
import type { RaceRuleEvent } from "@/lib/race-rules";

const locale = vi.hoisted(() => ({ current: "en" as Lang }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ tl: (values: Record<Lang, string>) => values[locale.current] }) }));
import { useRaceCopy } from "./race-copy";
import { REPLAY_COPY_RESOURCES, useReplayCopy } from "./replay-copy";

const languages = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;
// Actual pre-extraction 6dfc24f output:43 public fields plus every rule/penalty
// formatter combination. No runtime git dependency or second translation bank.
const baseline = {
  ru: "cef05060263e3e2a49298cfdfc205a893c44ab9bf8b14a63766b55c6c8767568",
  en: "2b3484defeca62608a7e413e27c1107d6767d37edd86c2b8d8d9fb8c66022da3",
  pl: "4637c30cdb37d0d132e08491e01ac5b8622ebf767df2fffeb8580f442b6f2bdf",
  es: "3d47d9b950c4e3dc9dceee95cc2916475083f20cd4438b9634cb0f949a603255",
  fr: "2c4d69e5c620227da2449d33e95011321ce57412b32645002c514f359b750d2e",
  de: "df6d896852a4ce72ffc5e979a76b5dd265b448cea8cbaa627af3ffe49c8a8f2d",
  it: "a454eeee89235726fa6ca0b24da18501cc87d327742e324f8fa43ac4da2f54da",
} satisfies Record<Lang, string>;
const kinds: RaceRuleEvent["kind"][] = ["give-way", "avoid-contact", "contact", "early-start", "start-clear", "mark-touch", "wrong-rounding", "mark-rounded"];
const rules: RaceRuleEvent["rule"][] = ["10", "11", "12", "14", "29.1", "31", "28"];
afterEach(() => { locale.current = "en"; });

describe("lightweight replay labels", () => {
  it.each(languages)("preserves the complete existing %s racing copy and formatter output", lang => {
    locale.current = lang;
    const copy = useRaceCopy();
    const messages = kinds.flatMap(kind => rules.flatMap(rule => [0, 3, 5].map(penaltySeconds =>
      copy.ruleMessage({ id: "copy-fixture", kind, rule, boatId: "player", time: 12, penaltySeconds }))));
    expect(Object.keys(copy)).toHaveLength(47);
    // P03 adds a separate four-label PB status. Keep the original43-field
    // byte contract, including every existing formatter, unchanged.
    const added = ["personalBestSaving", "personalBestChecked", "personalBestError", "retryPersonalBest"] as const;
    for (const key of added) expect(copy[key].trim().length).toBeGreaterThan(0);
    const existing = Object.fromEntries(Object.entries(copy).filter(([key]) => !(added as readonly string[]).includes(key)));
    expect(Object.keys(existing)).toHaveLength(43);
    expect(createHash("sha256").update(JSON.stringify({ copy: existing, messages })).digest("hex")).toBe(baseline[lang]);
    const replay = useReplayCopy();
    expect(Object.keys(replay)).toEqual(["view", "orbit", "resetCamera", "high", "stern", "pause", "resume", "back", "retry"]);
    for (const key of Object.keys(replay) as Array<keyof typeof replay>) {
      expect(replay[key]).toBe(copy[key]);
      expect(replay[key]).toBe(REPLAY_COPY_RESOURCES[key][lang]);
      expect(replay[key]).not.toBe("");
    }
  });

  it("reads the current locale synchronously when the learner changes language", () => {
    expect(useReplayCopy()).toMatchObject({ view: "Camera", back: "Back", retry: "Retry" });
    locale.current = "ru";
    expect(useReplayCopy()).toMatchObject({ view: "Камера", back: "Назад", retry: "Повторить" });
    locale.current = "pl";
    expect(useReplayCopy()).toMatchObject({ view: "Kamera", back: "Wróć", retry: "Ponów" });
  });
});
