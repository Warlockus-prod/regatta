import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { destinations, type Language } from "@/lib/product/catalog";

// The real results screen, drawn in each language: the nickname prompt and the
// link below it use the name the menu gives the board. scripts/sailing-glossary.md
// holds the names; the prompt appears only after a real finish on a visible board,
// so the browser checks do not reach it.
const language = vi.hoisted(() => ({ current: "ru" }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: language.current,
  tl: (text: Record<string, string>) => text[language.current],
  tp: (ru: string, en: string, pl: string, rest: Record<string, string>) => ({ ru, en, pl, ...rest })[language.current] }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
import { RaceResults } from "./RaceResults";
import type { Boat } from "./race-model";

const noop = () => {};
const board = destinations.find(destination => destination.id === "leaderboard")!;
const LANGUAGES: Language[] = ["ru", "en", "pl", "es", "fr", "de", "it"];

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { vi.unstubAllGlobals(); language.current = "ru"; });

function results(lang: Language) {
  language.current = lang;
  const props = {
    copy: {}, trialProfile: null, judgeDebrief: null, boatsRef: { current: [] as Boat[] }, nativeRace: false, nativeSave: "idle",
    retryNativeSave: noop, nativeBestSave: { status: "idle", id: "", requestId: "", retryable: false }, sceneRaceId: "race_1", requestNativeBest: noop,
    results: [{ name: "You", time: 101.5, color: "#c9f", isPlayer: true }], isNewRecord: false, bestRecord: null, missionResult: null,
    coachingSource: "local", coaching: null, coachingLoading: false, coachingError: null, saveState: "prompting", setSaveState: noop, saveError: null,
    saveResult: noop, nicknameInput: "", setNicknameInput: noop, replayCode: null, nickname: null, difficulty: "medium", windStrength: "medium",
    selectedMission: null, replayDisabled: false, onMenu: noop, onReplay: noop, onAgain: noop,
  } as unknown as ComponentProps<typeof RaceResults>;
  return renderToStaticMarkup(<RaceResults {...props} />);
}

describe("the results screen names the board as the menu does", () => {
  it.each(LANGUAGES)("%s: the link under the results carries the menu's name", lang => {
    expect(results(lang)).toMatch(new RegExp(`<a[^>]*href="/leaderboard"[^>]*>${board.title[lang]}</a>`));
  });

  it("Russian prompt says the owner's name and never the old ones", () => {
    const html = results("ru");
    expect(html).toContain("Ты в результатах гонок!");
    expect(html).toContain("Без ника в результатах будет «Моряк».");
    expect(html).not.toMatch(/[Лл]идерборд|[Тт]аблиц/);
  });
});
