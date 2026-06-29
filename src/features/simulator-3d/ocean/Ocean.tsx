'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sampleWave } from './waves';

// ============================================================================
// Ocean - a segmented plane whose vertices ride the shared wave field each
// frame (CPU displacement + analytic normals). Replaces the flat water plane
// so the boat sits on a living, moving sea. Procedural and CSP-safe (no HDR,
// no external textures).
// ============================================================================

export function Ocean({
  size = 700,
  seg = 72,
  color = '#0c3a4c',
}: {
  size?: number;
  seg?: number;
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, xs, zs } = useMemo(() => {
    const N = seg + 1;
    const count = N * N;
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const xs = new Float32Array(count);
    const zs = new Float32Array(count);
    let p = 0;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = (i / seg - 0.5) * size;
        const z = (j / seg - 0.5) * size;
        positions[p * 3] = x;
        positions[p * 3 + 2] = z;
        normals[p * 3 + 1] = 1;
        xs[p] = x;
        zs[p] = z;
        p++;
      }
    }
    const indices: number[] = [];
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * N + i;
        const b = a + 1;
        const c = a + N;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    g.setIndex(indices);
    return { geometry: g, xs, zs };
  }, [size, seg]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // Mutate through the mesh ref (not the memoized geometry) so the per-frame
    // surface update does not trip the react-hooks immutability rule.
    const geom = mesh.geometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const nor = geom.attributes.normal as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < xs.length; i++) {
      const s = sampleWave(xs[i], zs[i], t);
      pos.setY(i, s.y);
      const inv = 1 / Math.hypot(s.nx, 1, s.nz);
      nor.setXYZ(i, s.nx * inv, inv, s.nz * inv);
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial color={color} metalness={0.0} roughness={0.18} />
    </mesh>
  );
}
