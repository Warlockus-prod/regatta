import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contract (M1-1, M1-6): the race lobby is one setup screen with one primary
// start action and an "i" briefing button; on the site it shows the race frame,
// the mode picker and the venue cards; inside the app (the hub chose mode and
// venue) it shows the mode only as text and asks for neither again.

// A direct call (no renderer) to read the lobby's real click handlers: while
// it runs, useState returns its initial value and effects do not run;
// `tab` stands in for the lobby's preset tab ("learn" on a first render).
const direct = vi.hoisted(() => ({ on: false, tab: null as string | null, effects: null as Array<() => void> | null }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => direct.on
      ? (() => { const value = typeof initial === "function" ? (initial as () => unknown)() : initial; return [direct.tab && value === "learn" ? direct.tab : value, () => {}]; })()
      : actual.useState(initial),
    // A direct call collects the effects (when asked), so a test can run them as one commit.
    useEffect: (effect: () => void, deps?: unknown[]) => direct.on ? void direct.effects?.push(effect) : actual.useEffect(effect, deps),
  };
});
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => <div data-testid="mode-picker" /> }));
vi.mock("@/components/FoundationReturn", () => ({ FoundationReturn: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
import { GameMenu, LOBBY_HERO_SRC, linkedMenuTab } from "./GameMenu";
import { missions } from "@/data/missions";
import { RACE_HOME_STORAGE_KEY } from "@/lib/race-next-step";
import { BEST_TIMES_STORAGE_KEY } from "@/lib/best-times";

const noop = () => {};
function lobbyProps(patch: Partial<ComponentProps<typeof GameMenu>> = {}): ComponentProps<typeof GameMenu> {
  return {
    difficulty: "easy", setDifficulty: noop, windStrength: "medium", setWindStrength: noop, selectedMission: null, pickMission: noop,
    onStart: noop, onShowBriefing: noop, racePrefs: { mode: "pro" } as ComponentProps<typeof GameMenu>["racePrefs"], updateRacePrefs: noop,
    dailyDay: null, ...patch,
  };
}
function lobby(patch: Partial<ComponentProps<typeof GameMenu>> = {}) {
  return renderToStaticMarkup(<GameMenu {...lobbyProps(patch)} />);
}
type Node = { props?: Record<string, unknown> } | Node[] | string | number | boolean | null | undefined;
function byTestId(node: Node, id: string): Record<string, unknown> | null {
  if (Array.isArray(node)) { for (const child of node) { const hit = byTestId(child, id); if (hit) return hit; } return null; }
  if (!node || typeof node !== "object" || !node.props) return null;
  if (node.props["data-testid"] === id) return node.props;
  return byTestId(node.props.children as Node, id);
}
function lobbyTree(patch: Partial<ComponentProps<typeof GameMenu>> = {}) {
  direct.on = true;
  try { return GameMenu(lobbyProps(patch)) as Node; } finally { direct.on = false; }
}

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

describe("race lobby", () => {
  it("is one site screen: race frame, presets, mode, venue cards and one primary start", () => {
    const html = lobby();
    expect(LOBBY_HERO_SRC).toBe("/design-v3/sailing-editorial.webp");
    expect(html).toContain(`src="${LOBBY_HERO_SRC}"`);
    expect(html).toContain('data-testid="mode-picker"');
    expect(html).toContain('data-testid="race-lobby-venues"');
    expect(html.match(/role="radio"/g)?.length).toBe(4); // the four venue cards
    expect(html.match(/data-testid="race-lobby-start"/g)?.length).toBe(1);
    expect(html.match(/background:var\(--accent-cyan\)/g)?.length).toBe(1);
    expect(html).toContain("Start your first race");
    expect(html).toMatch(/aria-label="Briefing: course and rules"[^>]*data-testid="race-lobby-briefing"/);
    // The old details panel duplicated the briefing; the "i" button replaces it.
    expect(html).not.toContain("Show controls and course rules");
    for (const preset of ["First race", "Free race", "Mission"]) expect(html).toContain(`aria-label="${preset}.`);
  });

  it("inside the app shows the hub's mode as text and no mode, venue or image choice", () => {
    const html = lobby({ native: true });
    expect(html).not.toContain('data-testid="mode-picker"');
    expect(html).not.toContain('data-testid="race-lobby-venues"');
    expect(html).not.toContain("<img");
    expect(html).toMatch(/data-testid="race-lobby-mode"[^>]*><span[^>]*>Mode: Pro\.<\/span> Choose the mode in the Race tab\./);
    expect(html.match(/data-testid="race-lobby-start"/g)?.length).toBe(1);
  });

  it("names the daily start by the day", () => {
    expect(lobby({ dailyDay: "2026-10-30" })).toContain("Start the daily race");
    expect(lobby({ dailyDay: "2026-10-30" })).toContain('data-testid="race-lobby-daily"');
  });

  it("lists the missions with a hidden line icon and the title, no emoji (M1-7)", () => {
    direct.on = true; direct.tab = "mission";
    let html: string;
    try { html = renderToStaticMarkup(<GameMenu {...lobbyProps()} />); } finally { direct.on = false; direct.tab = null; }
    expect(html).toContain("PICK A MISSION");
    const choices = html.match(/<button[^>]*role="radio"[^>]*>(?:(?!<\/button>).)*<\/button>/g) ?? [];
    const missionChoices = choices.filter(choice => missions.some(m => choice.includes(`>${m.titleEn}</span>`)));
    expect(missionChoices).toHaveLength(missions.length);
    for (const choice of missionChoices) expect(choice).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>(?:(?!<\/svg>).)*<\/svg><span[^>]*>[^<]+<\/span>/);
    for (const m of missions) expect(html, m.id).not.toContain(m.emoji);
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("wires the primary start to onStart and the i button to onShowBriefing", () => {
    const onStart = vi.fn(), onShowBriefing = vi.fn();
    for (const native of [false, true]) {
      const tree = lobbyTree({ onStart, onShowBriefing, native });
      expect(byTestId(tree, "race-lobby-start")!.onClick).toBe(onStart);
      expect(byTestId(tree, "race-lobby-briefing")!.onClick).toBe(onShowBriefing);
      expect(byTestId(tree, "race-lobby-start")!.disabled).toBe(false);
    }
  });

  // F5: "How to race" reopens the race intro; a secondary entry, so the start stays the one cyan action.
  it("offers How to race as a secondary 44 px button wired to onShowIntro", () => {
    const onShowIntro = vi.fn();
    for (const native of [false, true]) expect(byTestId(lobbyTree({ onShowIntro, native }), "race-lobby-intro")!.onClick).toBe(onShowIntro);
    const html = lobby({ onShowIntro });
    expect(html).toMatch(/<button[^>]*data-testid="race-lobby-intro"[^>]*class="[^"]*min-h-11[^"]*"[^>]*>(?:(?!<\/button>).)*How to race<\/button>/);
    expect(html.match(/background:var\(--accent-cyan\)/g)?.length).toBe(1);
    expect(lobby()).not.toContain('data-testid="race-lobby-intro"');
  });
});

// Contract (M4-2): "Back to the race" from a practice links /game with its
// level and wind; the lobby opens on "Free race" with them on every mount
// (also after a race, through Menu), and never resets them to the "First
// race" defaults. A mission, a daily race or a bare lesson link keep their tab.
describe("race lobby opened by a linked setup (M4-2)", () => {
  it("picks the tab from the link", () => {
    expect(linkedMenuTab(new URLSearchParams("?difficulty=hard&wind=heavy"))).toBe("free");
    expect(linkedMenuTab(new URLSearchParams("?difficulty=easy&wind=medium&fromLesson=mini-race"))).toBe("free");
    expect(linkedMenuTab(new URLSearchParams("?fromLesson=mini-race"))).toBe("learn");
    expect(linkedMenuTab(new URLSearchParams(`?mission=${missions[0].id}`))).toBe("learn");
    expect(linkedMenuTab(new URLSearchParams("?daily=2026-10-30"))).toBe("learn");
    expect(linkedMenuTab(new URLSearchParams(""))).toBe("learn");
  });

  /** Mount the lobby and run its mount effects as one commit (the tab is
   * still the initial one there, as in React), recording what the lobby asks
   * the race to set. */
  function mount(search: string, difficulty: "easy" | "hard" = "hard") {
    vi.stubGlobal("window", { location: { search } });
    const calls: string[] = [];
    direct.on = true; direct.effects = [];
    let tree: Node;
    try {
      tree = GameMenu(lobbyProps({ difficulty, windStrength: "light",
        setDifficulty: d => calls.push(`difficulty:${d}`), setWindStrength: w => calls.push(`wind:${w}`),
        pickMission: m => calls.push(`mission:${m?.id ?? "none"}`) })) as Node;
      for (const effect of direct.effects) effect();
    } finally { direct.on = false; direct.effects = null; }
    const start = byTestId(tree, "race-lobby-start")!;
    return { calls, cta: (start.children as unknown[]).join("") };
  }

  it("opens on Free race for a linked level and wind and keeps them, on every mount", () => {
    // The first mount and a later one (Menu after a race) behave the same.
    for (let mountNo = 0; mountNo < 2; mountNo++) {
      const { calls, cta } = mount("?difficulty=hard&wind=light");
      expect(cta).toBe("Start · Hard →");
      expect(calls).not.toContain("difficulty:easy");
      expect(calls).not.toContain("wind:medium");
    }
  });

  it("a bare lesson link or no link opens First race with its defaults", () => {
    for (const search of ["?fromLesson=mini-race", ""]) {
      const { calls, cta } = mount(search, "easy");
      expect(cta).toBe("Start your first race →");
      expect(calls).toEqual(expect.arrayContaining(["difficulty:easy", "wind:medium"]));
    }
  });
});

// Contract (F1, TestFlight 74 feedback): before the first ended solo race on
// this device the easy preset is "First race" and the start "Start your first
// race"; after one (the race home row or a personal best) the same preset is
// "Easy race" and the one primary start says "Start the race".
describe("race lobby wording after the first race (F1)", () => {
  function lobbyWith(rows: Record<string, string>) {
    vi.stubGlobal("window", { location: { search: "" }, localStorage: { getItem: (key: string) => rows[key] ?? null } });
    try { return lobby(); } finally { vi.unstubAllGlobals(); vi.stubGlobal("React", React); }
  }

  it("says First race with no race on this device", () => {
    const html = lobbyWith({});
    expect(html).toContain('aria-label="First race.');
    expect(html).toContain("Start your first race →");
    expect(html).not.toContain("Easy race");
  });

  it("says Easy race and Start the race after an ended race or a personal best", () => {
    const rows: Array<Record<string, string>> = [
      { [RACE_HOME_STORAGE_KEY]: JSON.stringify({ schema: 1, days: ["2026-10-31"], goal: null, dailyDone: null }) },
      { [BEST_TIMES_STORAGE_KEY]: JSON.stringify({ "easy-medium": { timeSec: 101, ts: 1 } }) },
    ];
    for (const row of rows) {
      const html = lobbyWith(row);
      expect(html).toContain('aria-label="Easy race. Easy level, medium wind.');
      expect(html).not.toContain("First race");
      expect(html).not.toContain("first race");
      expect(html.match(/data-testid="race-lobby-start"/g)?.length).toBe(1);
      expect(html).toMatch(/data-testid="race-lobby-start"[^>]*>Start the race →<\/button>/);
    }
  });

  it("a storage that throws reads as no race", () => {
    vi.stubGlobal("window", { location: { search: "" }, localStorage: { getItem: () => { throw new Error("denied"); } } });
    try { expect(lobby()).toContain("Start your first race →"); } finally { vi.unstubAllGlobals(); vi.stubGlobal("React", React); }
  });
});
