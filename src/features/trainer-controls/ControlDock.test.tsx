import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONTROL_PREFS } from "./prefs";
import { ControlDock } from "./ControlDock";

vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ tl: (copy: Record<string, string>) => copy.en }) }));
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

describe("lesson task and chosen controls", () => {
  const task = { id: "lesson-task", label: "Task", cards: [{ id: "exercise", title: "Exercise", node: <p>Hold the trim</p> }] };
  const render = (mode: "wheels" | "sliders", leadTab = task) => renderToStaticMarkup(<ControlDock
    surface="trainer" tabs={[]} defaultFavorites={[]} prefs={{ ...DEFAULT_CONTROL_PREFS, mode }} update={() => {}}
    wheelDeck={<p>Wheel controls</p>} leadTab={leadTab} hasSheets rudderAvailable layout="bottom" />);

  it("opens the lesson task while retaining a reachable Wheels tab for the saved choice", () => {
    const html = render("wheels");
    expect(html).toContain('aria-selected="true" aria-controls="tc-panel-trainer">Task');
    expect(html).toContain('role="tab" id="tc-tab-trainer-wheels"');
    expect(html).toContain("Hold the trim");
    expect(html).not.toContain('id="tc-tab-trainer-favorites"');
  });

  it("keeps Favorites available beside a lesson when sliders were chosen", () => {
    const html = render("sliders");
    expect(html).toContain('id="tc-tab-trainer-favorites"');
    expect(html).not.toContain('id="tc-tab-trainer-wheels"');
    expect(html).toContain("Hold the trim");
  });
});

// Package 32, game screen. Contract: with the wheels chosen the dock offers one menu button
// (the tab strip behind it), starts with the menu closed, and a lesson task or the sliders
// mode never hides their tabs: the strip is put away only while the wheels tab is the one shown.
describe("game screen: one menu button instead of the tab strip", () => {
  const render = (mode: "wheels" | "sliders", lead?: { id: string; label: string; cards: { id: string; title: string; node: React.ReactNode }[] }) => renderToStaticMarkup(<ControlDock
    surface="trainer" tabs={[{ id: "sails", label: "Sails", cards: [] }]} defaultFavorites={[]} prefs={{ ...DEFAULT_CONTROL_PREFS, mode }} update={() => {}}
    wheelDeck={<p>Wheel controls</p>} leadTab={lead} hasSheets rudderAvailable layout="bottom" />);

  it("starts on the wheels with the menu closed, the button naming the strip it opens", () => {
    const html = render("wheels");
    expect(html).toContain('data-mode="wheels" data-menu="closed"');
    expect(html).toMatch(/aria-label="Controls"[^>]*aria-expanded="false"[^>]*aria-controls="tc-head-trainer"[^>]*data-testid="control-menu-open"/);
    expect(html).toContain('id="tc-head-trainer"');
    // The tabs stay in the document for the menu to show; nothing is removed, only put away by the styles.
    expect(html).toContain('id="tc-tab-trainer-sails"');
  });

  it("offers no menu button without wheels, where the tabs are the controls", () => {
    const html = render("sliders");
    expect(html).toContain('data-mode="sliders"');
    expect(html).not.toContain("control-menu-open");
  });

  it("keeps a lesson task's tab in view: the strip hides only while the wheels are shown", () => {
    const html = render("wheels", { id: "lesson-task", label: "Task", cards: [{ id: "exercise", title: "Exercise", node: <p>Hold the trim</p> }] });
    expect(html).toContain('data-mode="sliders" data-menu="closed"');
    expect(html).toContain("control-menu-open");
  });
});

