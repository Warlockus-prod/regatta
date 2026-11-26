import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const i18n = vi.hoisted(() => ({ lang: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: i18n.lang,
  tl: (text: Record<string, string>) => text[i18n.lang] ?? text.en,
  tp: (ru: string, en: string, pl: string, rest?: Record<string, string>) =>
    ({ ru, en, pl, ...rest } as Record<string, string>)[i18n.lang] ?? en }) }));
import { MultiplayerMenu } from "./MultiplayerLobby";
import { RACE_INTRO_COPY } from "@/data/race-intro-copy";

// F5: the multiplayer menu offers "How to race" in every language as a 44 px
// secondary button (Create stays the one primary action); without the page's
// handler there is no entry.
const noop = () => {};
const menu = (onShowIntro?: () => void) => renderToStaticMarkup(<MultiplayerMenu embed={false} nickname="Sailor 42" setNickname={noop} nicknameInvalid={false}
  nicknameHint="" joinCode="" setJoinCode={noop} createBlocker={null} connecting={false} onCreate={noop} onJoin={noop} joinDisabled error={null} onShowIntro={onShowIntro} />);
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { vi.unstubAllGlobals(); i18n.lang = "en"; });

describe("How to race in the multiplayer menu (F5)", () => {
  it("is a 44 px secondary button in every language", () => {
    for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
      i18n.lang = lang;
      const button = menu(noop).match(/<button[^>]*data-testid="mp-intro"[^>]*>[\s\S]*?<\/button>/)![0];
      expect(button).toContain(RACE_INTRO_COPY.title[lang]);
      expect(button).toContain("min-h-11");
      expect(button).not.toMatch(/background:\s*var\(--accent-cyan\)|bg-\[var\(--accent-cyan\)\]/);
    }
  });
  it("has no entry without the page's handler", () => {
    expect(menu()).not.toContain('data-testid="mp-intro"');
  });
});
