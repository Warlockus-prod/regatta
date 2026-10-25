import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Wheel } from "./Wheel";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
it("exposes the physical line's fractional metre value instead of rounding to whole metres", () => {
  const html = renderToStaticMarkup(<Wheel kind="sheet" rotation={0} label="Mainsheet" valueText="9.1 m" caption="9.1 m"
    ariaNow={9.1} ariaMin={6.4} ariaMax={32} onTurn={() => {}} onStep={() => {}} />);
  expect(html).toContain('aria-valuenow="9.1"');
  expect(html).toContain('aria-valuetext="9.1 m"');
  expect(html).toContain('aria-valuemin="6.4" aria-valuemax="32"');
});
