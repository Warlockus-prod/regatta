'use client';

import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Venue } from "../../../data/venues/venues";
import { terrainColor, terrainIndices, venueTerrain, noise1 } from "../../../data/venues/geometry";

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

function buildGeometry(venue: Venue): THREE.BufferGeometry[] {
  return venueTerrain(venue).map((t, n) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(t.positions, 3));
    const colors: number[] = [];
    const c = new THREE.Color();
    t.heights01.forEach((h, k) => {
      c.set(terrainColor(t.relief, h, venue.palette, noise1(97 + n, k * 0.37)));
      const r = Math.hypot(t.positions[k * 3], t.positions[k * 3 + 2]);
      c.lerp(HAZE, Math.min(0.48, 0.08 + Math.max(0, r - 150) / 330));
      colors.push(c.r, c.g, c.b);
    });
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const island = venue.lands[n]?.kind === "island";
    g.setIndex(terrainIndices(t.rows, t.cols, island));
    // Low-poly faces: one normal per triangle.
    const flat = g.toNonIndexed();
    flat.computeVertexNormals();
    g.dispose();
    return flat;
  });
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
