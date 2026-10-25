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
