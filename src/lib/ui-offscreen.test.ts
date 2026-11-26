import { describe, expect, it } from "vitest";
import { MIN_VISUAL_PX, offscreenFinding } from "../../scripts/ui-offscreen.mjs";

// Package 32. Contract of the `check:ui` rule "a picture does not run off the
// side of the screen": it fails on the broken case the owner reported (the Race
// tab frame drawn at its file's size) and stays quiet for pictures inside the
// screen, for strips that scroll sideways on purpose and for icons.
const box = (left: number, width: number, height = 200, scrolls = false) =>
  ({ kind: "img", left, right: left + width, top: 100, bottom: 100 + height, scrolls });

describe("picture off the side of the screen", () => {
  it("fails on the reported case: a 960x688 frame in a 390 px screen", () => {
    const found = offscreenFinding(box(20, 960, 688), 390);
    expect(found).toContain("590px past the right edge");
    expect(found).toContain("img 960x688px");
  });
  it("fails on a picture that starts left of the screen", () => {
    expect(offscreenFinding(box(-40, 300), 390)).toContain("40px past the left edge");
  });
  it("passes a picture inside the screen, edge to edge included", () => {
    expect(offscreenFinding(box(20, 350), 390)).toBeNull();
    expect(offscreenFinding(box(0, 390), 390)).toBeNull();
    // Sub-pixel layout is not a finding.
    expect(offscreenFinding(box(0, 391.5), 390)).toBeNull();
  });
  it("passes a strip that scrolls sideways on purpose and anything icon-sized", () => {
    expect(offscreenFinding(box(20, 864, 432, true), 390)).toBeNull();
    expect(offscreenFinding(box(360, MIN_VISUAL_PX - 1, MIN_VISUAL_PX - 1), 390)).toBeNull();
  });
});
