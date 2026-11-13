import { describe, expect, it } from "vitest";
import { formatStageWindow, parseStageWindow, stageAspect, stageViewOffset } from "./stage";

// Package 32 stage B. Contract: the canvas covers the whole phone workspace,
// yet the boat is drawn exactly as it was when the canvas was only the free
// window: same size on screen, centred on the window, not on the canvas.
describe("trainer stage: the scene under the controls keeps the boat in the free window", () => {
  // A 390x844 phone: 44 px bar above, 330 px of readouts and dock below.
  const canvas = { width: 390, height: 844 };
  const free = { left: 0, top: 44, width: 390, height: 470 };

  /** Canvas pixel where a point of the virtual full frame lands (the frame maps 1:1 to pixels). */
  const toCanvas = (view: NonNullable<ReturnType<typeof stageViewOffset>>, fx: number, fy: number) => ({ x: fx - view.x, y: fy - view.y });

  it("puts the camera's centre on the middle of the window, not of the canvas", () => {
    const view = stageViewOffset(canvas, free)!;
    const centre = toCanvas(view, view.fullWidth / 2, view.fullHeight / 2);
    expect(centre.x).toBeCloseTo(195, 5);
    expect(centre.y).toBeCloseTo(44 + 235, 5);
    expect(centre.y).not.toBeCloseTo(canvas.height / 2, 0);
  });

  it("keeps the boat's size: the camera's vertical field spans the window height, one unit per pixel", () => {
    const view = stageViewOffset(canvas, free)!;
    expect(view.fullHeight).toBe(470);
    // No stretch: the frame has the canvas's proportion and the canvas shows it 1:1.
    expect(view.fullWidth / view.fullHeight).toBeCloseTo(canvas.width / canvas.height, 9);
    expect(view.width).toBe(390);
    expect(view.height).toBe(844);
    // The top of the camera's field is the top of the window.
    expect(toCanvas(view, 0, 0).y).toBeCloseTo(44, 5);
    expect(toCanvas(view, 0, view.fullHeight).y).toBeCloseTo(44 + 470, 5);
  });

  it("works for a turned phone, where the window is the left part of the canvas", () => {
    const turned = { width: 844, height: 390 };
    const left = { left: 0, top: 0, width: 500, height: 390 };
    const view = stageViewOffset(turned, left)!;
    expect(toCanvas(view, view.fullWidth / 2, view.fullHeight / 2).x).toBeCloseTo(250, 5);
    expect(view.fullHeight).toBe(390);
  });

  it("leaves the camera alone when the window is the whole canvas or missing", () => {
    expect(stageViewOffset(canvas, { left: 0, top: 0, width: 390, height: 844 })).toBeNull();
    expect(stageViewOffset(canvas, null)).toBeNull();
    expect(stageViewOffset({ width: 0, height: 0 }, free)).toBeNull();
  });

  it("fits the boat into the window's proportion, falling back to the canvas", () => {
    expect(stageAspect(canvas, free)).toBeCloseTo(390 / 470, 9);
    expect(stageAspect(canvas, null)).toBeCloseTo(390 / 844, 9);
  });

  it("round-trips the window through the data attribute and rejects junk", () => {
    expect(parseStageWindow(formatStageWindow(free))).toEqual(free);
    expect(parseStageWindow("")).toBeNull();
    expect(parseStageWindow("1,2,3")).toBeNull();
    expect(parseStageWindow("0,0,0,100")).toBeNull();
    expect(parseStageWindow("a,b,c,d")).toBeNull();
  });
});
