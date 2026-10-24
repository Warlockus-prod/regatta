// Land colouring for the race scene (ADR-0008). The race terrain
// (raceTerrain in src/data/venues/geometry.ts) is a grid whose first row is
// under water and whose second row is the beach; the shared colouring paints
// every low vertex as sand, so the flat, tapered ends of a coast read as a
// white plain under the brighter race light. Here only the beach row is sand,
// everything behind it is vegetation by height, with bare rock on steep faces
// and on the summits. Shared vertices keep the same small terrain grid but
// interpolate its light and colour instead of exposing every triangle.

import * as THREE from "three/webgpu";
import { noise1, terrainIndices, type Terrain3D } from "@/data/venues/geometry";
import type { Venue } from "@/data/venues/venues";

/** Rows of a race terrain grid that are the waterline and the beach. */
export const BEACH_ROWS = 2;

/** Colour of a land vertex by its grid row and height (0..1 of the land's peak). */
export function landColor(row: number, h01: number, palette: Venue["palette"], jitter: number): string {
  if (row < BEACH_ROWS) return palette.sand;
  if (h01 > 0.9) return palette.peak;
  if (h01 > 0.72) return jitter > 0.5 ? palette.high : palette.mid;
  return jitter > 0.55 ? palette.mid : palette.low;
}

export function landGeometry(t: Terrain3D, palette: Venue["palette"], seed: number, wrap: boolean): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(t.positions, 3));
  const colors: number[] = [];
  const c = new THREE.Color();
  t.heights01.forEach((h, k) => {
    c.set(landColor(Math.floor(k / t.cols), h, palette, noise1(97 + seed, k * 0.37)));
    colors.push(c.r, c.g, c.b);
  });
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(terrainIndices(t.rows, t.cols, wrap));
  g.computeVertexNormals();
  const col = g.getAttribute("color") as THREE.BufferAttribute;
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const nrm = g.getAttribute("normal") as THREE.BufferAttribute;
  const rock = new THREE.Color(palette.high);
  const color = new THREE.Color();
  for (let v = 0; v < col.count; v++) {
    color.setRGB(col.getX(v), col.getY(v), col.getZ(v));
    const steep = Math.min(1, Math.max(0, (0.8 - nrm.getY(v)) * 2.5));
    if (Math.floor(v / t.cols) >= BEACH_ROWS && pos.getY(v) > 3) color.lerp(rock, steep * 0.7);
    col.setXYZ(v, color.r, color.g, color.b);
  }
  return g;
}
