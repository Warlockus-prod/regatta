// Land colouring for the race scene (ADR-0008). The race terrain
// (raceTerrain in src/data/venues/geometry.ts) is a grid whose first row is
// under water and whose second row is the beach; the shared colouring paints
// every low vertex as sand, so the flat, tapered ends of a coast read as a
// white plain under the brighter race light. Here only the beach row is sand,
// everything behind it is vegetation by height, with bare rock on steep faces
// and on the summits, one flat colour per face (low-poly).

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
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  const col = flat.getAttribute("color") as THREE.BufferAttribute;
  const pos = flat.getAttribute("position") as THREE.BufferAttribute;
  const nrm = flat.getAttribute("normal") as THREE.BufferAttribute;
  const rock = new THREE.Color(palette.high);
  const face = new THREE.Color();
  for (let v = 0; v < col.count; v += 3) {
    // The face takes its highest corner's colour; a steep face above the beach shows rock.
    const top = [v, v + 1, v + 2].reduce((a, b) => (pos.getY(b) > pos.getY(a) ? b : a));
    face.setRGB(col.getX(top), col.getY(top), col.getZ(top));
    const steep = Math.min(1, Math.max(0, (0.8 - nrm.getY(v)) * 2.5));
    if (pos.getY(top) > 3) face.lerp(rock, steep * 0.7);
    for (let k = 0; k < 3; k++) col.setXYZ(v + k, face.r, face.g, face.b);
  }
  g.dispose();
  return flat;
}
