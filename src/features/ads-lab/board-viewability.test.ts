import { describe, expect, it } from "vitest";
import { BOARD_MAX_GAP_MS, BOARD_RUN_START, BOARD_SAMPLE_MS, BOARD_VIEW_SAMPLES, boardSample, boardSize, frameShare, observeBoard, type BoardRun, type BoardSampleInput, type Vec4 } from "./board-viewability";

/** A flat rectangle at depth w, facing the camera; half-size in NDC units. */
function rect(cx: number, cy: number, hx: number, hy: number, w = 10): Vec4[] {
  return [[(cx - hx) * w, (cy - hy) * w, 0, w], [(cx + hx) * w, (cy - hy) * w, 0, w], [(cx + hx) * w, (cy + hy) * w, 0, w], [(cx - hx) * w, (cy + hy) * w, 0, w]];
}
const facing: BoardSampleInput = {
  // A quarter of the canvas in each direction: 6.25% of its area.
  corners: rect(0, 0, .25, .25), center: [0, 0, -80], normal: [0, 0, 1], right: [1, 0, 0], canvasShare: 1, occluded: 0, imageReady: true, pageVisible: true,
};

describe("Projected board area", () => {
  it("measures a share of the canvas", () => {
    expect(frameShare(rect(0, 0, 1, 1))).toBeCloseTo(1, 10);
    expect(frameShare(rect(0, 0, .25, .25))).toBeCloseTo(.0625, 10);
  });
  it("cuts the part outside the frame and keeps only what is on screen", () => {
    expect(frameShare(rect(1, 0, .5, .5))).toBeCloseTo(.125, 10);
    expect(frameShare(rect(3, 0, .5, .5))).toBe(0);
  });
  it("gives nothing for a board behind the camera and cuts a board crossing it", () => {
    expect(frameShare(rect(0, 0, .5, .5, -10))).toBe(0);
    const crossing: Vec4[] = [[-2, -2, 0, 4], [2, -2, 0, 4], [2, 2, 0, -4], [-2, 2, 0, -4]];
    const share = frameShare(crossing);
    expect(share).toBeGreaterThan(0); expect(share).toBeLessThan(1);
  });
});

describe("Viewable by the guideline", () => {
  it("passes a board facing the camera, large enough and clear", () => {
    expect(boardSample(facing)).toMatchObject({ viewable: true, block: null, angleDeg: 0 });
  });
  it("applies the screen share, not the canvas share", () => {
    expect(boardSample({ ...facing, corners: rect(0, 0, .1, .1) })).toMatchObject({ viewable: false, block: "small" }); // 1% of the screen
    expect(boardSample({ ...facing, corners: rect(0, 0, .13, .13) }).block).toBeNull(); // 1.69%
    const small = boardSample({ ...facing, corners: rect(0, 0, .13, .13), canvasShare: .75 });
    expect(small.block).toBe("small"); expect(small.screenShare).toBeCloseTo(.0127, 3);
  });
  it("counts only the visible part: a 2% board half hidden fails, as in the guideline's own example", () => {
    const two = rect(0, 0, Math.sqrt(.02), Math.sqrt(.02));
    expect(boardSample({ ...facing, corners: two }).viewable).toBe(true);
    const half = boardSample({ ...facing, corners: two, occluded: .5 });
    expect(half).toMatchObject({ viewable: false, block: "occluded" }); expect(half.visibleShare).toBeCloseTo(.01, 5);
  });
  it("refuses more than 55 degrees on any one axis", () => {
    const at = (deg: number) => [Math.sin(deg * Math.PI / 180), 0, Math.cos(deg * Math.PI / 180)] as const;
    expect(boardSample({ ...facing, normal: at(54) }).block).toBeNull();
    expect(boardSample({ ...facing, normal: at(56) }).block).toBe("angle");
    expect(boardSample({ ...facing, normal: [0, Math.sin(1), Math.cos(1)] }).block).toBe("angle"); // 57 degrees of pitch
    expect(boardSample({ ...facing, right: [Math.cos(1), Math.sin(1), 0] }).block).toBe("angle"); // 57 degrees of roll
  });
  it("names why a board does not count", () => {
    expect(boardSample({ ...facing, imageReady: false }).block).toBe("image");
    expect(boardSample({ ...facing, pageVisible: false }).block).toBe("hidden");
    expect(boardSample({ ...facing, normal: [0, 0, -1] }).block).toBe("back");
    expect(boardSample({ ...facing, corners: rect(5, 0, .25, .25) }).block).toBe("frame");
  });
});

describe("One count per creative", () => {
  const run = (samples: readonly boolean[], step = BOARD_SAMPLE_MS, from: BoardRun = BOARD_RUN_START) => samples.reduce((state, viewable, i) => observeBoard(state, viewable, 1000 + i * step), from);
  it("counts on the fifth positive sample in a row and not earlier", () => {
    expect(run(Array(BOARD_VIEW_SAMPLES - 1).fill(true)).counted).toBe(false);
    expect(run(Array(BOARD_VIEW_SAMPLES).fill(true)).counted).toBe(true);
  });
  it("starts over after a negative sample", () => {
    expect(run([true, true, true, true, false, true, true, true, true]).counted).toBe(false);
  });
  it("starts over after a pause: a hidden page does not add up", () => {
    let state = run([true, true, true, true]);
    state = observeBoard(state, true, (state.lastAt ?? 0) + BOARD_MAX_GAP_MS + 1);
    expect(state.streak).toBe(1); expect(state.counted).toBe(false);
  });
  it("stays counted once earned", () => {
    expect(run([true, true, true, true, true, false, false]).counted).toBe(true);
  });
});

describe("Board size", () => {
  it("keeps the creative's shape at the given area", () => {
    expect(boardSize(2, 128)).toEqual({ width: 16, height: 8 });
    const wide = boardSize(970 / 250, 128);
    expect(wide.width * wide.height).toBeCloseTo(128, 8); expect(wide.width / wide.height).toBeCloseTo(3.88, 8);
    expect(boardSize(NaN, 128)).toEqual({ width: 16, height: 8 });
  });
});
