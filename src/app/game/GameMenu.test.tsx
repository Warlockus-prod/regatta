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
const direct = vi.hoisted(() => ({ on: false, tab: null as string | null }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => direct.on
      ? [direct.tab && initial === "learn" ? direct.tab : typeof initial === "function" ? (initial as () => unknown)() : initial, () => {}]
      : actual.useState(initial),
    useEffect: (effect: () => void, deps?: unknown[]) => direct.on ? undefined : actual.useEffect(effect, deps),
  };
});
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => <div data-testid="mode-picker" /> }));
vi.mock("@/components/FoundationReturn", () => ({ FoundationReturn: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
import { GameMenu, LOBBY_HERO_SRC } from "./GameMenu";
import { missions } from "@/data/missions";

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
});
