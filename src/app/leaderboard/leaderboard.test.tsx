import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nScope, type Lang } from "@/lib/i18n";
import { raceContextForClassId } from "@/lib/race-record-class";

vi.mock("@/components/ContentFooterNavLoader", () => ({ default: () => null }));
import LeaderboardPage from "./page";
import { LeaderboardTable } from "./LeaderboardTable";
import { useLeaderboardCopy } from "./leaderboard-copy";
import { DEFAULT_LEADERBOARD_COURSE, LEADERBOARD_COURSES, STANDARD_RACE_CLASS, archiveUrl, courseRaceClass, formatLeaderboardTime, leaderboardUrl, showsArchive,
  type LeaderboardRow, type LeaderboardSelection } from "./leaderboard-model";
import { PHYSICAL_RACE_DEFAULT_PROFILE } from "@/lib/race-context";
import { missions } from "@/data/missions";
import { MISSION_TITLE_LIST } from "@/data/mission-titles";

// Contract (M1-7): Simple and Pro results are never in one table (each mode
// asks for its own classified list, results without a mode are a separate
// folded list), and the page fits a 390 px phone: 20 px gutters, 44 px
// choices, wrapping names, no emoji and no action cyan on the player's row.

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
const base: LeaderboardSelection = { board: "free", course: "classic", mode: "simple", difficulty: "medium", wind: "light", missionId: "sub-90" };
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
    const archive = query(archiveUrl(base));
    expect([...archive.keys()].sort()).toEqual(["board", "difficulty", "wind"]);
    expect(archive.get("board")).toBe("archive");
    expect(query(leaderboardUrl({ ...base, board: "mission" })).get("mission")).toBe("sub-90");
    expect(query(leaderboardUrl({ ...base, board: "mission" })).has("raceMode")).toBe(false);
  });

  it("formats times as the race clock does", () => {
    expect(formatLeaderboardTime(98.46)).toBe("1:38.4");
    expect(formatLeaderboardTime(601)).toBe("10:01.0");
  });
});

// Contract (M5 step 8, ADR-0015 point 12): every course x mode x level x
// wind is its own class table (a metric course asks for its metric class,
// the classic course for the legacy class), the archive of results without a
// mode belongs to the classic course and opens folded, the quick online race
// asks for its own board, and nothing ever asks for the mixed old pool.
describe("course, archive and online queries (M5 step 8)", () => {
  it("asks each course for its own class, never another course's", () => {
    const classes = LEADERBOARD_COURSES.map(course => query(leaderboardUrl({ ...base, course })).get("raceClass"));
    expect(classes).toEqual(["physical-cruiser-v1:short:r1", "physical-cruiser-v1:medium:r1", "physical-cruiser-v1:long:r1", STANDARD_RACE_CLASS]);
    expect(new Set(classes).size).toBe(4);
    for (const course of LEADERBOARD_COURSES) {
      expect(raceContextForClassId(courseRaceClass(course))?.model).toBe(course === "classic" ? "legacy-race-v1" : "physical-cruiser-v1");
      for (const mode of ["simple", "pro"] as const) expect(query(leaderboardUrl({ ...base, course, mode })).get("raceMode")).toBe(mode);
    }
  });

  it("asks the online board by level and wind only, and shows the archive only under the classic course", () => {
    const online = query(leaderboardUrl({ ...base, board: "online", course: "short" }));
    expect(Object.fromEntries(online)).toEqual({ board: "online", difficulty: "medium", wind: "light" });
    expect(showsArchive(base)).toBe(true);
    for (const course of ["short", "medium", "long"] as const) expect(showsArchive({ ...base, course })).toBe(false);
    expect(showsArchive({ ...base, board: "online" })).toBe(false);
    expect(showsArchive({ ...base, board: "mission" })).toBe(false);
  });

  it("lists the missions by their one title source, in the missions' order", () => {
    expect(MISSION_TITLE_LIST.map(m => m.id)).toEqual(missions.map(m => m.id));
    for (const m of missions) expect(MISSION_TITLE_LIST.find(t => t.id === m.id)).toMatchObject({ titleRu: m.titleRu, titleEn: m.titleEn, titlePl: m.titlePl, titleIt: m.titleIt });
  });

  it("opens on the classic course until switch B sets a default metric course", () => {
    expect(PHYSICAL_RACE_DEFAULT_PROFILE).toBeNull();
    expect(DEFAULT_LEADERBOARD_COURSE).toBe("classic");
  });
});

const renderPage = (lang: Lang) => renderToStaticMarkup(<I18nScope lang={lang}><LeaderboardPage /></I18nScope>);

describe("leaderboard page", () => {
  it.each(["ru", "en", "pl", "es", "fr", "de", "it"] as const)("renders the course, Simple / Pro choices and the folded archive in %s", lang => {
    const html = renderPage(lang);
    expect(html).toContain('data-testid="leaderboard-page"');
    expect(html).toMatch(/<h1[^>]*>(Результаты гонок|Leaderboard|Ranking|Clasificación|Classement|Bestenliste|Classifica)<\/h1>/);
    expect(html).toContain('data-testid="leaderboard-archive"');
    expect(html).not.toMatch(/<details[^>]*data-testid="leaderboard-archive"[^>]* open/);
    expect(html).toMatch(/>(Архив: режим не записан|Archive: mode not recorded|Archiwum: tryb niezapisany|Archivo: modo no registrado|Archives : mode non enregistré|Archiv: Modus nicht erfasst|Archivio: modalità non registrata)</);
    expect(html.match(/role="radiogroup"/g)).toHaveLength(5);
    expect(html.match(/role="radio"/g)).toHaveLength(3 + 4 + 2 + 3 + 3);
    expect(html).toMatch(/role="radio" aria-checked="true"[^>]*>(Классическая трасса|Classic course|Klasyczna trasa|Recorrido clásico|Parcours classique|Klassischer Kurs|Percorso classico)</);
    expect(html).toMatch(/>(Быстрая онлайн-гонка|Quick online race|Szybki wyścig online|Regata rápida en línea|Course rapide en ligne|Schnelles Online-Rennen|Regata veloce online)</);
    expect(html).toMatch(/role="radio" aria-checked="true"[^>]*>(Простой|Simple|Prosty|Sencillo|Einfach|Semplice)</);
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
