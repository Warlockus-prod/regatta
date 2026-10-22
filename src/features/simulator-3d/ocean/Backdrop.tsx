'use client';

import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Venue } from "../../../data/venues/venues";
import { terrainColor, terrainIndices, venueTerrain, noise1, type Terrain3D } from "../../../data/venues/geometry";

// The venue on the horizon (src/data/venues): the shore and the islands as
// low-poly terrain at 150-300 m, inside the fog, so they fade into the haze
// like a real coast. Static and world-fixed by compass: turning the boat
// brings a different shore ahead, which is what gives the race area a sense
// of place. Like the yacht, it stays centred on the boat (the ocean scrolls
// under it), so the land behaves like a distant shore and is never reached.

// Aerial perspective instead of the scene fog: the scene fog (110..340 m)
// would swallow a shore at 200-280 m down to a thin line. Each vertex is
// mixed toward the sky haze by its distance, so the far ridge stays readable
// but blue-grey, the near islands keep their green.
const HAZE = new THREE.Color("#7fa4bd");

/**
 * One low-poly terrain mesh with vertex colours by height. `haze` gives the
 * share of the sky haze mixed into a vertex at (x, z); the race view passes
 * none and lets its scene fog do it.
 */
export function terrainGeometry(t: Terrain3D, palette: Venue["palette"], seed: number, wrap: boolean,
  haze?: (x: number, z: number) => number, faceted = false): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(t.positions, 3));
  const colors: number[] = [];
  const c = new THREE.Color();
  t.heights01.forEach((h, k) => {
    c.set(terrainColor(t.relief, h, palette, noise1(97 + seed, k * 0.37)));
    if (haze) c.lerp(HAZE, haze(t.positions[k * 3], t.positions[k * 3 + 2]));
    colors.push(c.r, c.g, c.b);
  });
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(terrainIndices(t.rows, t.cols, wrap));
  // Low-poly faces: one normal per triangle.
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  // Seen up close (the race), one colour per face reads as land; colours
  // blended across a tall face read as a smeared wall.
  if (faceted) {
    const col = flat.getAttribute("color") as THREE.BufferAttribute;
    const pos = flat.getAttribute("position") as THREE.BufferAttribute;
    for (let v = 0; v < col.count; v += 3) {
      const top = [v, v + 1, v + 2].reduce((a, b) => (pos.getY(b) > pos.getY(a) ? b : a));
      for (let k = 0; k < 3; k++) col.setXYZ(v + k, col.getX(top), col.getY(top), col.getZ(top));
    }
  }
  g.dispose();
  return flat;
}

function buildGeometry(venue: Venue): THREE.BufferGeometry[] {
  const haze = (x: number, z: number) => Math.min(0.48, 0.08 + Math.max(0, Math.hypot(x, z) - 150) / 330);
  return venueTerrain(venue).map((t, n) => terrainGeometry(t, venue.palette, n, venue.lands[n]?.kind === "island", haze));
}

export const Backdrop = memo(function Backdrop({ venue }: { venue: Venue }) {
  const geometries = useMemo(() => buildGeometry(venue), [venue]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0, fog: false, envMapIntensity: 0.25 }), []);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group name="venue-backdrop">
      {geometries.map((g, i) => <mesh key={`${venue.id}-${i}`} geometry={g} material={material} />)}
    </group>
  );
});
