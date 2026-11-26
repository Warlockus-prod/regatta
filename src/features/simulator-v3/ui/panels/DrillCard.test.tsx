import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DRILLS } from "../../runtime/scenario-presets";
import type { TpFn } from "../shared";
import { DrillCard, type DrillResult } from "./DrillCard";

// Package 13 stage D: "Show me" in a lesson task. The card offers it while the
// learner works on the task, and a shown attempt reads as a demonstration that
// does not count, with the way to try it alone; it never reads as done.

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
const tp: TpFn = (_ru, en) => en;
const card = (result: DrillResult, onShowMe = vi.fn()) => renderToStaticMarkup(
  <DrillCard active={DRILLS[0]} elapsed={12} heldFor={0} result={result} lang="en" tp={tp}
    onStart={vi.fn()} onRestart={vi.fn()} onExit={vi.fn()} onShowMe={onShowMe} />);

describe("Show me in a drill", () => {
  it("is offered while the task runs and after a failed attempt, not after a pass", () => {
    expect(card("pending")).toContain('data-testid="drill-show-me"');
    expect(card("pending")).toContain("Show me");
    expect(card("fail")).toContain('data-testid="drill-show-me"');
    expect(card("win")).not.toContain('data-testid="drill-show-me"');
  });

  it("a shown attempt says it does not count and asks the learner to do it", () => {
    const html = card("shown");
    expect(html).toContain('data-testid="drill-shown"');
    expect(html).toContain("SHOWN");
    expect(html).toContain("does not count");
    expect(html).toContain("Now you");
    expect(html).not.toContain("DONE");
    expect(html).not.toContain('data-testid="drill-show-me"');
  });
});
