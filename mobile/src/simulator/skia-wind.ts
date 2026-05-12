/**
 * Skia helpers for the simulator wind layer: ambient wind-arrow grid,
 * apparent-wind indicator path, no-go-zone triangle, and the compass
 * arrow path used by the wind dial. Pure functions so the screen
 * memoizes them by their numeric inputs.
 */

import { Skia } from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';

/** A single wind-arrow position on the playfield grid. */
export interface WindArrowSlot {
  cx: number;
  cy: number;
  /** Per-arrow phase in [0, 1] used to stagger their breathing animation. */
  phase: number;
}

/** Build a sparse grid of arrow centers covering the playfield. */
export function buildArrowGrid(
  width: number,
  height: number,
  step = 56,
): WindArrowSlot[] {
  const slots: WindArrowSlot[] = [];
  const offset = step / 2;
  let i = 0;
  for (let y = offset; y < height; y += step) {
    for (let x = offset; x < width; x += step) {
      // Stagger phases so arrows do not pulse in lockstep.
      const phase = (i * 0.137) % 1;
      slots.push({ cx: x, cy: y, phase });
      i += 1;
    }
  }
  return slots;
}

/**
 * Build a single Skia path that contains all wind arrows in the grid,
 * each rotated to point IN the direction the wind flows TO (i.e., FROM
 * + PI). Caller passes the wind dir in radians (CW from north).
 *
 * Each arrow is a tiny shaft + chevron head, length ~14 px. The arrows
 * are drawn into one path so we render them in one Skia draw call.
 */
export function buildWindArrowsPath(
  slots: WindArrowSlot[],
  windDirRadFrom: number,
): SkPath {
  // Direction the wind FLOWS toward (offset by PI).
  const flow = windDirRadFrom + Math.PI;
  const dx = Math.sin(flow);
  const dy = -Math.cos(flow);
  // Perpendicular unit vector for the chevron heads.
  const px = -dy;
  const py = dx;

  const half = 7;
  const headLen = 4;
  const headWidth = 3;

  const path = Skia.Path.Make();
  for (const s of slots) {
    const sx = s.cx - dx * half;
    const sy = s.cy - dy * half;
    const ex = s.cx + dx * half;
    const ey = s.cy + dy * half;

    path.moveTo(sx, sy);
    path.lineTo(ex, ey);

    // Chevron head: two short lines back from (ex, ey).
    path.moveTo(ex - dx * headLen + px * headWidth, ey - dy * headLen + py * headWidth);
    path.lineTo(ex, ey);
    path.lineTo(ex - dx * headLen - px * headWidth, ey - dy * headLen - py * headWidth);
  }
  return path;
}

/**
 * No-go-zone triangle anchored at the boat, opening 45 deg either side
 * of the apparent-wind FROM-direction. The path is built in screen-space
 * with the boat at (boatX, boatY).
 */
export function buildNoGoPath(
  boatX: number,
  boatY: number,
  awaDirRadFrom: number,
  reach: number,
): SkPath {
  const half = (45 * Math.PI) / 180;
  const dirL = awaDirRadFrom - half;
  const dirR = awaDirRadFrom + half;

  // The arrow tip points to where wind COMES FROM. The triangle opens
  // upwind, so the tip vectors go in the FROM direction.
  const lx = boatX + Math.sin(dirL) * reach;
  const ly = boatY - Math.cos(dirL) * reach;
  const rx = boatX + Math.sin(dirR) * reach;
  const ry = boatY - Math.cos(dirR) * reach;

  const path = Skia.Path.Make();
  path.moveTo(boatX, boatY);
  path.lineTo(lx, ly);
  path.lineTo(rx, ry);
  path.close();
  return path;
}

/**
 * A short arrow centered at the boat's bow, showing apparent wind
 * direction. The arrow points toward where the wind COMES FROM (so an
 * upwind sailor sees it pointing forward).
 */
export function buildApparentArrowPath(
  bowX: number,
  bowY: number,
  awaRadFrom: number,
): SkPath {
  const len = 22;
  const tipX = bowX + Math.sin(awaRadFrom) * len;
  const tipY = bowY - Math.cos(awaRadFrom) * len;

  // Arrowhead flares.
  const back = 6;
  const flare = 4;
  const dx = Math.sin(awaRadFrom);
  const dy = -Math.cos(awaRadFrom);
  const px = -dy;
  const py = dx;

  const path = Skia.Path.Make();
  path.moveTo(bowX, bowY);
  path.lineTo(tipX, tipY);
  path.moveTo(tipX - dx * back + px * flare, tipY - dy * back + py * flare);
  path.lineTo(tipX, tipY);
  path.lineTo(tipX - dx * back - px * flare, tipY - dy * back - py * flare);
  return path;
}

/** Wind compass dial arrow, length ~28 px, centered at origin, pointing -y. */
export function buildCompassArrowPath(): SkPath {
  const path = Skia.Path.Make();
  // Shaft.
  path.moveTo(0, 14);
  path.lineTo(0, -16);
  // Head.
  path.moveTo(-6, -10);
  path.lineTo(0, -18);
  path.lineTo(6, -10);
  // Tail flag tick.
  path.moveTo(-4, 12);
  path.lineTo(0, 14);
  path.lineTo(4, 12);
  return path;
}
