/**
 * Geometry for annotated photos. Hotspot coordinates in the Codex catalog are
 * percentages of the FULL original image (coordinateSpace
 * "percent-of-full-image-no-crop"), so a marker must be placed on the
 * rectangle the whole image actually occupies, never on the outer box.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where an image of `imageW x imageH` lands when fitted with "contain" into a
 * `boxW x boxH` box and centred: the full frame, no crop, letterboxed on the
 * sides or on top and bottom.
 */
export function containRect(boxW: number, boxH: number, imageW: number, imageH: number): Rect {
  if (boxW <= 0 || boxH <= 0 || imageW <= 0 || imageH <= 0) return { x: 0, y: 0, width: 0, height: 0 };
  const scale = Math.min(boxW / imageW, boxH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  return { x: (boxW - width) / 2, y: (boxH - height) / 2, width, height };
}

/** A catalog point (percent of the full image) in box coordinates. */
export function pointInRect(rect: Rect, xPct: number, yPct: number): { x: number; y: number } {
  return { x: rect.x + (rect.width * xPct) / 100, y: rect.y + (rect.height * yPct) / 100 };
}

export interface Closeup {
  /** Size of the image drawn inside the closeup window. */
  imageWidth: number;
  imageHeight: number;
  /** Offset of that image in the window (<= 0: the image is larger). */
  offsetX: number;
  offsetY: number;
  /** Where the selected point is in the window: centred unless near an edge. */
  markerX: number;
  markerY: number;
}

/**
 * A closeup of the SAME image around one point: the image is drawn `zoom`
 * times the window width and shifted so the point sits in the middle, but never
 * past the image edges (no empty band); near an edge the marker moves off
 * centre instead of the image leaving the window.
 */
export function closeupFrame(windowW: number, windowH: number, imageW: number, imageH: number, xPct: number, yPct: number, zoom: number): Closeup {
  const imageWidth = windowW * zoom;
  const imageHeight = (imageWidth * imageH) / imageW;
  const px = (imageWidth * xPct) / 100;
  const py = (imageHeight * yPct) / 100;
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const offsetX = clamp(windowW / 2 - px, Math.min(0, windowW - imageWidth), 0);
  const offsetY = clamp(windowH / 2 - py, Math.min(0, windowH - imageHeight), 0);
  return { imageWidth, imageHeight, offsetX, offsetY, markerX: offsetX + px, markerY: offsetY + py };
}
