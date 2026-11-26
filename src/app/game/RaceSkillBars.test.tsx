import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => null }));
const i18n = vi.hoisted(() => ({ lang: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: i18n.lang,
  tl: (text: Record<string, string>) => text[i18n.lang] ?? text.en,
  tp: (ru: string, en: string, pl: string, rest?: Record<string, string>) => ({ ru, en, pl, ...rest } as Record<string, string>)[i18n.lang] ?? en }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
import { RaceResults } from "./RaceResults";
import { RaceSkillBars } from "./RaceSkillBars";
import { raceSkillCopy, skillBarText } from "@/data/race-skill-copy";
import { RACE_UNITS } from "@/features/race-hud/units";
import { ENABLED_LANGUAGES, type Lang } from "@/lib/languages";
import { raceSkillBars, type RaceSkillMetrics, type SkillBar } from "@/lib/race-skill-metrics";
import type { Boat } from "./race-model";

const noop = () => {};
const BARS: SkillBar[] = [
  { id: "start", value: 3.04, fill: 0.94, good: true },
  { id: "upwind", value: 0.874, fill: 0.874, good: true },
  { id: "tacks", value: 1.25, fill: 0.375, good: false },
  { id: "no-go", value: 12.0, fill: 0.6, good: false },
];
const LANGS = ENABLED_LANGUAGES.map((l) => l.id) as Lang[];
/** Long and short dashes plus curly quotes and the ellipsis sign, built from code points so this file has none. */
const TYPOGRAPHIC = new RegExp(`[${[0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026].map(c => String.fromCharCode(c)).join("")}]`);

function results(patch: Partial<ComponentProps<typeof RaceResults>> = {}) {
  const props = {
    copy: {}, trialProfile: null, judgeDebrief: null, boatsRef: { current: [] as Boat[] }, nativeRace: false, nativeSave: "idle",
    retryNativeSave: noop, nativeBestSave: { status: "idle", id: "", requestId: "", retryable: false }, sceneRaceId: "race_1", requestNativeBest: noop,
    results: [{ name: "You", time: 101.5, color: "#c9f", isPlayer: true }], isNewRecord: false, bestRecord: null, missionResult: null,
    coachingSource: "local", coaching: { overall: "", score: 70, mistakes: [], strengths: [], nextGoalRu: "Goal" }, coachingLoading: false,
    coachingError: null, saveState: "idle", setSaveState: noop, saveError: null, saveResult: noop, nicknameInput: "", setNicknameInput: noop,
    replayCode: null, nickname: null, difficulty: "medium", windStrength: "medium", selectedMission: null, replayDisabled: false,
    onMenu: noop, onReplay: noop, onAgain: noop, ...patch,
  } as unknown as ComponentProps<typeof RaceResults>;
  return renderToStaticMarkup(<RaceResults {...props} />);
}

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { vi.unstubAllGlobals(); i18n.lang = "en"; });

describe("skill bars on the result screen (M4-1)", () => {
  it("sit under the place and time and above the main mistake, one label and one number each", () => {
    const html = results({ skillBars: BARS });
    const skills = html.indexOf('data-testid="race-results-skills"');
    expect(skills).toBeGreaterThan(html.indexOf('data-testid="race-results-finished"'));
    expect(skills).toBeLessThan(html.indexOf('data-testid="race-results-main-mistake"'));
    expect(html).toContain(">Skills in this race<");
    expect(html).toContain(">Start<");
    expect(html).toContain(">3.0 s after the start signal<");
    expect(html).toContain(">87% of the best upwind speed (VMG)<");
    expect(html).toContain(">1.3 kn of speed lost per tack on average<");
    expect(html).toContain(">12.0 s in the no-go zone<");
    expect(html).toContain('data-testid="race-skill-start" data-good="true"');
    expect(html).toContain('data-testid="race-skill-tacks" data-good="false"');
  });

  it("render nothing without bars, and the result screen keeps its layout", () => {
    expect(renderToStaticMarkup(<RaceSkillBars bars={null} />)).toBe("");
    expect(renderToStaticMarkup(<RaceSkillBars bars={[]} />)).toBe("");
    expect(results()).not.toContain("race-results-skills");
  });

  it("are not cyan and judge by colour nowhere: every fill is the same neutral tone", () => {
    const html = renderToStaticMarkup(<RaceSkillBars bars={BARS} />);
    expect(html).not.toMatch(/#00d4ff|0,\s*212,\s*255|accent-cyan/i);
    // The light theme's --success teal sits next to its action cyan.
    expect(html).not.toMatch(/--success/);
    expect(html.match(/rounded-full bg-\[var\(--text-muted\)\]/g)).toHaveLength(BARS.length);
    // The bars (and the check marks) decorate the number next to them.
    const good = BARS.filter((b) => b.good).length;
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(BARS.length + good);
  });

  it("mark a good number with a check mark and say it to screen readers, not by colour alone", () => {
    const html = renderToStaticMarkup(<RaceSkillBars bars={BARS} />);
    const item = (id: string) => html.slice(html.indexOf(`data-testid="race-skill-${id}"`), html.indexOf("</li>", html.indexOf(`data-testid="race-skill-${id}"`)));
    for (const bar of BARS) {
      expect(item(bar.id).includes('data-testid="race-skill-good"')).toBe(bar.good);
      expect(item(bar.id).includes('<span class="sr-only">, good result</span>')).toBe(bar.good);
    }
    i18n.lang = "pl";
    expect(renderToStaticMarkup(<RaceSkillBars bars={BARS} />)).toContain('<span class="sr-only">, dobry wynik</span>');
  });

  it("show a beat above the mean-wind target as 100%, never more", () => {
    const metrics = { start: { lateSec: null }, upwind: { ratio: 1.03, playerKn: 4.1, bestKn: 4, seconds: 80 }, downwind: null,
      tacks: { count: 0, list: [], avgAngleDeg: null, avgSpeedLossKn: null }, gybes: 0, noGo: { seconds: 0, entries: 0 }, mark: null,
      laylineOverstandSec: null } satisfies RaceSkillMetrics;
    const upwind = raceSkillBars(metrics).find((b) => b.id === "upwind")!;
    expect(skillBarText(upwind, "en").value).toBe("100% of the best upwind speed (VMG)");
  });

  it("use the language's decimal mark and its own words", () => {
    i18n.lang = "ru";
    const html = renderToStaticMarkup(<RaceSkillBars bars={BARS} />);
    expect(html).toContain(">3,0 с после сигнала<");
    expect(html).toContain(">в среднем 1,3 уз скорости теряется в повороте<");
    expect(html).toContain(">Мертвая зона<");
  });
});

describe("skill bar copy", () => {
  const all = [raceSkillCopy.title, raceSkillCopy.good, ...Object.values(raceSkillCopy.label), ...Object.values(raceSkillCopy.value)];

  it("exists in all 7 languages with a number slot in every value", () => {
    expect(LANGS).toHaveLength(7);
    for (const text of all) for (const lang of LANGS) expect(text[lang]?.trim().length).toBeGreaterThan(0);
    for (const text of Object.values(raceSkillCopy.value)) for (const lang of LANGS) expect(text[lang]).toContain("{n}");
  });

  it("has no typographic dashes or quotes and claims no layline", () => {
    for (const text of all) for (const lang of LANGS) {
      expect(text[lang]).not.toMatch(TYPOGRAPHIC);
      expect(text[lang]).not.toMatch(/layline|лейлайн/i);
    }
  });

  it("writes the race's own unit signs", () => {
    for (const lang of LANGS) {
      expect(skillBarText(BARS[2], lang).value).toContain(` ${RACE_UNITS.knots[lang]}`);
      expect(skillBarText(BARS[0], lang).value).toContain(` ${RACE_UNITS.seconds[lang]}`);
    }
  });
});
