import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FREE_SPEECH_COPY } from "./free-speech-copy";
import { FREE_SPEECH_LABELS } from "./free-speech-labels";
import { radioText } from "@/app/radio/localization/text";
import type { Lang } from "@/lib/languages";

describe("actual free speech catalog boundary", () => {
  const aliases = JSON.parse(readFileSync("public/radio-locales/aliases.json", "utf8"));
  for (const lang of ["pl", "ru", "en", "es", "fr", "de", "it"] satisfies Lang[]) it(`${lang}: resolves every generated label to its reviewed adaptation`, () => {
    const catalog = JSON.parse(readFileSync(`public/radio-locales/${lang}.json`, "utf8"));
    expect(Object.keys(FREE_SPEECH_LABELS)).toEqual(Object.keys(FREE_SPEECH_COPY));
    for (const key of Object.keys(FREE_SPEECH_COPY) as (keyof typeof FREE_SPEECH_COPY)[]) {
      expect(FREE_SPEECH_LABELS[key]).toBe(FREE_SPEECH_COPY[key].pl);
      expect(radioText(FREE_SPEECH_LABELS[key], catalog, aliases), key).toBe(FREE_SPEECH_COPY[key][lang]);
    }
  });
});
