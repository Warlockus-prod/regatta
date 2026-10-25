import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import RadioFront from "./RadioFront";
import { createInitialRadio } from "./radioModel";

vi.mock("../localization/context", () => ({ useRadioI18n: () => ({ rt: <T,>(value: T) => value, tp: (_ru: string, en: string) => en }) }));
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
it("keeps one moving index and both accessible rotation alternatives in every model, skin and layout", () => {
  for (const model of ["M330", "M323"] as const) for (const skin of ["green", "amber"] as const) for (const realistic of [false, true]) for (const compact of [false, true]) {
    const html = renderToStaticMarkup(<RadioFront s={createInitialRadio(model)} model={model} skin={skin} realistic={realistic} compact={compact}
      dispatch={() => {}} holdPct={0} onDistressDown={() => {}} onDistressUp={() => {}} onPttDown={() => {}} onPttUp={() => {}} clock="12:00" nextTxSec={0} />);
    for (const id of ["dial-center", "dial-index", "dial-ccw", "dial-cw"]) expect(html.match(new RegExp(`data-testid="${id}"`, "g")), `${model}/${skin}/${realistic}/${compact}: ${id}`).toHaveLength(1);
    expect(html).toContain('aria-label="Rotate dial counter-clockwise"');
    expect(html).toContain('aria-label="Rotate dial clockwise"');
    expect(html).toContain('aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"');
  }
});
