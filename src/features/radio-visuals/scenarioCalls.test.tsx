import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PRACTICE_GROUPS } from "@/app/radio/symulator/practiceMenu";
import { SCENARIOS } from "@/app/radio/symulator/scenarios";
import { THEORY_CHAPTERS } from "@/app/radio/teoria/courseData";
import { CHAPTERS_WITH_SCREEN, SCENARIO_CALLS, chapterScreen, scenarioCall, scenarioScreen, voiceChannel } from "./scenarioCalls";
import { ChapterRadioScreen, ScenarioDiagram, ScenarioVisuals } from "./ScenarioVisuals";
import { VENUES } from "@/app/radio/symulator/venues";

vi.mock("@/app/radio/localization/context", () => ({ useRadioI18n: () => ({ rt: <T,>(value: T) => value, tp: (_ru: string, en: string) => en, tl: (values: { en: string }) => values.en }) }));

// Package 32, step 5. Contract: every practice scenario of the radio simulator has BOTH a
// schematic (who calls whom, on which channels) and a picture (the radio's own screen at the
// scenario's key moment, drawn by the radio's own LCD from the simulator's own model).
describe("radio scenarios: a schematic and a picture for each", () => {
  it("names the call of every scenario of the practice list, and nothing else", () => {
    expect(Object.keys(SCENARIO_CALLS).sort()).toEqual(SCENARIOS.map(scenario => scenario.id).sort());
    expect(PRACTICE_GROUPS.flatMap(group => group.scenarios).sort()).toEqual(Object.keys(SCENARIO_CALLS).sort());
    expect(scenarioCall("toString")).toBeNull();
    expect(scenarioScreen("toString")).toBeNull();
  });

  it("keeps the rules of the air in the drawing: an alert before a distress, urgency or safety voice call, 16 for those calls, a working channel for routine", () => {
    for (const [id, call] of Object.entries(SCENARIO_CALLS)) {
      if (call.priority === "settings") { expect(call, id).toMatchObject({ party: "none", dsc: false, voice: null }); continue; }
      // Only someone else's distress is relayed by voice alone.
      if (call.priority !== "routine") { expect(call.voice, id).toBe("16"); expect(call.dsc, id).toBe(id !== "mayday-relay"); }
      else expect(call.voice, id).not.toBe("16");
    }
    // A voice call to a marina or a VTS goes on that place's own channel.
    for (const venue of VENUES) {
      if (venue.marina) expect(voiceChannel(SCENARIO_CALLS["routine-marina"], venue)).toBe(venue.marina.channel);
      if (venue.vts) expect(voiceChannel(SCENARIO_CALLS["vts-report"], venue)).toBe(venue.vts.channel);
    }
  });

  it("builds a powered radio on the screen the scenario turns on, with the simulator's own model", () => {
    for (const scenario of SCENARIOS) {
      const screen = scenarioScreen(scenario.id)!;
      expect(screen.power, scenario.id).toBe(true);
      expect(screen.screen, scenario.id).not.toBe("off");
    }
    expect(scenarioScreen("fire-mayday")).toMatchObject({ screen: "distress-nature" });
    expect(scenarioScreen("receive-distress")).toMatchObject({ screen: "rx-distress-alert" });
    expect(scenarioScreen("engine-panpan")).toMatchObject({ screen: "otherdsc-compose", odType: 2, odCategory: 2 });
    expect(scenarioScreen("radio-check")).toMatchObject({ screen: "standby", hiPower: false });
    // The picture never shows the mistake the scenario marks: a routine call that names channel 16.
    for (const id of ["routine-ship", "group-call"]) expect(renderToStaticMarkup(<ScenarioVisuals id={id} name="x" />), id).not.toContain("CH 16");
    expect(renderToStaticMarkup(<ScenarioVisuals id="engine-panpan" name="x" />)).toContain("CH 16");
    // Scenarios differ on screen unless they are the same call (two urgency calls to all ships).
    const shown = new Map(SCENARIOS.map(scenario => { const s = scenarioScreen(scenario.id)!; return [scenario.id, JSON.stringify([s.screen, s.channelIndex, s.hiPower, s.natureCursor, s.odType, s.odCategory, s.scanActive])]; }));
    expect(new Set(shown.values()).size).toBeGreaterThanOrEqual(SCENARIOS.length - 2);
  });

  it("draws both visuals for every scenario, the screen with the radio's own LCD", () => {
    for (const scenario of SCENARIOS) {
      const html = renderToStaticMarkup(<ScenarioVisuals id={scenario.id} name={scenario.title.pl} />);
      expect(html.match(/data-testid="scenario-diagram"/g), scenario.id).toHaveLength(1);
      // A picture, not a control: the frame is inert and hidden from assistive technology.
      expect(html, scenario.id).toMatch(/<div aria-hidden="true" inert=""[^>]*data-testid="radio-screen-frame"/);
      expect(html, scenario.id).toContain(`aria-label="${scenario.title.pl.replace(/"/g, "&quot;")}: Radio screen"`);
      expect(html, scenario.id).not.toContain("- OFF -");
      // The picture never answers to the hooks of the radio's one real screen (browser tests and "tap to explain" look for them).
      expect(html, scenario.id).not.toMatch(/data-testid="(lcd|radio-lcd-body)"|data-ik="lcd"/);
    }
    const distress = renderToStaticMarkup(<ScenarioDiagram call={SCENARIO_CALLS["fire-mayday"]} label="x" />);
    expect(distress).toContain('data-priority="distress"');
    // The alert on 70, then the voice on 16.
    expect([...distress.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(match => match[1])).toEqual(["70", "16"]);
    expect(renderToStaticMarkup(<ScenarioVisuals id="toString" name="x" />)).toBe("");
  });

  it("is shown in the list of scenarios and, outside the exam, beside the situation", () => {
    const page = readFileSync("src/app/radio/symulator/page.tsx", "utf8");
    expect(page).toContain("<ScenarioThumb id={sc.id} />");
    expect(page).toContain("{learning && <ScenarioVisuals id={scenario.id}");
  });
});

describe("radio theory: the radio's screen beside the drawing of the chapters that are about it", () => {
  it("names real chapters, builds a powered radio for each and draws it", () => {
    const ids = THEORY_CHAPTERS.map(chapter => chapter.id);
    expect(ids).toHaveLength(18);
    for (const id of CHAPTERS_WITH_SCREEN) {
      expect(ids, id).toContain(id);
      expect(chapterScreen(id)!.power, id).toBe(true);
      const html = renderToStaticMarkup(<ChapterRadioScreen chapterId={id} />);
      expect(html, id).toContain('data-testid="chapter-radio-screen"');
      expect(html, id).not.toContain("- OFF -");
    }
    expect(CHAPTERS_WITH_SCREEN).toHaveLength(9);
    expect(chapterScreen("power")).toMatchObject({ hiPower: false });
    // A chapter about the horizon or an EPIRB has no radio screen to show.
    for (const id of ["horizon", "epirb", "toString"]) { expect(chapterScreen(id), id).toBeNull(); expect(renderToStaticMarkup(<ChapterRadioScreen chapterId={id} />)).toBe(""); }
    expect(readFileSync("src/app/radio/teoria/page.tsx", "utf8")).toContain("<ChapterRadioScreen chapterId={chapter.id} />");
  });
});
