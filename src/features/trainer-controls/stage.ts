// Package 32 stage B (rule R-46, point 6): on a phone the trainer scene is
// painted over the whole workspace, under the bar, the readouts and the dock,
// and the boat stays where it was: in the middle of the free window between
// them. This file is the geometry, with no DOM and no three.js, so it can be
// tested directly (stage.test.ts).

/** The free window inside the stage, in CSS pixels from the stage's top left corner. */
export interface StageWindow { left: number; top: number; width: number; height: number }

/** Event a stage element fires when its window moved or changed size. */
export const STAGE_EVENT = "trainer-stage";

/** `data-window="left,top,width,height"` on the stage element, or null when it is absent or malformed. */
export function parseStageWindow(value: string | null | undefined): StageWindow | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isFinite(part))) return null;
  const [left, top, width, height] = parts;
  return width > 0 && height > 0 ? { left, top, width, height } : null;
}

export const formatStageWindow = (free: StageWindow) =>
  [free.left, free.top, free.width, free.height].map(value => Math.round(value * 100) / 100).join(",");

/**
 * Arguments for PerspectiveCamera.setViewOffset that keep the camera's framing
 * tied to the window while the canvas covers the whole stage.
 *
 * The virtual full frame is as tall as the window, has the canvas's
 * proportion and is centred on the window's centre; the canvas then shows the
 * part of that frame it covers, at one frame unit per pixel. So the boat is
 * drawn at the size and place it had when the canvas was only the window, and
 * the rest of the canvas is more of the same view: water under the controls,
 * sky above. Null when there is nothing to offset.
 */
export function stageViewOffset(canvas: { width: number; height: number }, free: StageWindow | null):
  { fullWidth: number; fullHeight: number; x: number; y: number; width: number; height: number } | null {
  if (!free || canvas.width <= 0 || canvas.height <= 0 || free.width <= 0 || free.height <= 0) return null;
  const fullHeight = free.height;
  const fullWidth = free.height * canvas.width / canvas.height;
  const x = fullWidth / 2 - (free.left + free.width / 2);
  const y = fullHeight / 2 - (free.top + free.height / 2);
  // The window is the whole canvas: no offset, leave the camera alone.
  if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5 && Math.abs(fullHeight - canvas.height) < 0.5) return null;
  return { fullWidth, fullHeight, x, y, width: canvas.width, height: canvas.height };
}

/** Width over height the camera should fit the boat into: the window's when there is one, else the canvas's. */
export function stageAspect(canvas: { width: number; height: number }, free: StageWindow | null): number {
  const box = free ?? canvas;
  return box.width / Math.max(1, box.height);
}
