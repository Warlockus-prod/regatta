import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nScope, type Lang } from "@/lib/i18n";
import { raceContextForClassId } from "@/lib/race-record-class";

vi.mock("@/components/ContentFooterNavLoader", () => ({ default: () => null }));
import LeaderboardPage from "./page";
import { LeaderboardTable } from "./LeaderboardTable";
import { useLeaderboardCopy } from "./leaderboard-copy";
import { STANDARD_RACE_CLASS, formatLeaderboardTime, leaderboardUrl, unrecordedModeUrl, type LeaderboardRow, type LeaderboardSelection } from "./leaderboard-model";

// Contract (M1-7): Simple and Pro results are never in one table (each mode
// asks for its own classified list, results without a mode are a separate
// folded list), and the page fits a 390 px phone: 20 px gutters, 44 px
// choices, wrapping names, no emoji and no action cyan on the player's row.

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
const base: LeaderboardSelection = { board: "free", mode: "simple", difficulty: "medium", wind: "light", missionId: "sub-90" };
const query = (url: string) => new URL(url, "https://example.test").searchParams;

describe("leaderboard queries", () => {
  it("asks for one classified mode table at a time, never the mixed list", () => {
    const simple = query(leaderboardUrl(base));
    const pro = query(leaderboardUrl({ ...base, mode: "pro" }));
    expect(simple.get("raceMode")).toBe("simple");
    expect(pro.get("raceMode")).toBe("pro");
    for (const q of [simple, pro]) {
      expect(q.get("raceClass")).toBe(STANDARD_RACE_CLASS);
      expect(raceContextForClassId(q.get("raceClass"))?.model).toBe("legacy-race-v1");
      expect(q.get("difficulty")).toBe("medium");
      expect(q.get("wind")).toBe("light");
      expect(q.has("mission")).toBe(false);
    }
  });

  it("keeps results without a recorded mode and missions on their own lists", () => {
    const unrecorded = query(unrecordedModeUrl(base));
    expect([...unrecorded.keys()].sort()).toEqual(["difficulty", "wind"]);
    expect(query(leaderboardUrl({ ...base, board: "mission" })).get("mission")).toBe("sub-90");
    expect(query(leaderboardUrl({ ...base, board: "mission" })).has("raceMode")).toBe(false);
  });

  it("formats times as the race clock does", () => {
    expect(formatLeaderboardTime(98.46)).toBe("1:38.4");
    expect(formatLeaderboardTime(601)).toBe("10:01.0");
  });
});

const renderPage = (lang: Lang) => renderToStaticMarkup(<I18nScope lang={lang}><LeaderboardPage /></I18nScope>);

describe("leaderboard page", () => {
  it.each(["ru", "en", "pl", "es", "fr", "de", "it"] as const)("renders separate Simple / Pro choices and the unrecorded list in %s", lang => {
    const html = renderPage(lang);
    expect(html).toContain('data-testid="leaderboard-page"');
    expect(html).toMatch(/<h1[^>]*>(Таблица лучших|Leaderboard|Ranking|Clasificación|Classement|Bestenliste|Classifica)<\/h1>/);
    expect(html).toContain('data-testid="leaderboard-unrecorded"');
    expect(html.match(/role="radiogroup"/g)).toHaveLength(4);
    expect(html.match(/role="radio"/g)).toHaveLength(2 + 2 + 3 + 3);
    expect(html).toMatch(/role="radio" aria-checked="true"[^>]*>(Обычный|Simple|Prosty|Sencillo|Einfach|Semplice)</);
    expect(html).toMatch(/role="radio" aria-checked="false"[^>]*>Pro</);
    expect(html).not.toMatch(EMOJI);
    if (lang !== "en") expect(html).not.toMatch(/>(Leaderboard|Free race|Control mode|Loading\.\.\.)</);
  });

  it("keeps the phone layout inside 390 px: 20 px gutters, 44 px targets, nothing truncated", () => {
    const html = renderPage("de");
    expect(html).toContain("px-5 sm:px-6");
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThanOrEqual(10);
    for (const button of buttons) expect(button).toContain("min-h-11");
    expect(html).not.toMatch(/truncate|whitespace-nowrap|overflow-x|min-w-\[|w-\[[4-9]\d\dpx\]/);
    expect(html).not.toMatch(/text-\[10px\]|text-xs/);
  });
});

function Table({ rows, lang }: { rows: LeaderboardRow[]; lang: Lang }) {
  return <I18nScope lang={lang}><Rows rows={rows} lang={lang} /></I18nScope>;
}
function Rows({ rows, lang }: { rows: LeaderboardRow[]; lang: Lang }) {
  return <LeaderboardTable rows={rows} copy={useLeaderboardCopy()} lang={lang} testId="rows" />;
}
const row = (nickname: string, patch: Partial<LeaderboardRow> = {}): LeaderboardRow => ({ nickname, isMe: false, finish_time_sec: 100, score: null, ...patch });

describe("leaderboard rows", () => {
  it("marks the podium with drawn medals and localized place names, not emoji", () => {
    const html = renderToStaticMarkup(<Table lang="pl" rows={[row("A"), row("B"), row("C"), row("D")]} />);
    expect(html.match(/data-medal="[123]"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Miejsce 1"');
    expect(html).toContain('aria-label="Miejsce 4"');
    expect(html).not.toMatch(EMOJI);
  });

  it("marks the player's row without the action cyan and wraps a long name", () => {
    const long = "Bardzo_Dlugi_Nick_Zeglarza_Ktory_Nie_Miesci_Sie";
    const html = renderToStaticMarkup(<Table lang="en" rows={[row(long, { isMe: true, score: 81 }), row("B")]} />);
    expect(html).toContain('data-me="true"');
    expect(html).toContain("(you)");
    expect(html).toContain("score 81/100");
    expect(html).not.toMatch(/accent-cyan|0, 212, 255/);
    expect(html).toContain("[overflow-wrap:anywhere]");
    expect(html).not.toContain("truncate");
  });

  it("writes penalties with the language's second sign", () => {
    expect(renderToStaticMarkup(<Table lang="ru" rows={[row("A", { penalty_seconds: 5 })]} />)).toContain("штрафы +5 с");
    expect(renderToStaticMarkup(<Table lang="en" rows={[row("A", { penalty_seconds: 5, score: 70 })]} />)).toContain("score 70/100, penalties +5 s");
  });

  it("shows the empty state when a mode has no results yet", () => {
    expect(renderToStaticMarkup(<Table lang="fr" rows={[]} />)).toContain("Pas encore de résultats");
  });
});
