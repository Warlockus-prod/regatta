'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WAVES } from './waves';

// ============================================================================
// Ocean - a segmented plane displaced ON THE GPU by the shared wave field.
//
// The previous version sampled all (seg+1)^2 vertices on the CPU every frame
// and re-uploaded both position and normal buffers - the single biggest
// WebView FPS risk found by the 2026-07 render audit. Now the same 4-wave
// sum-of-sines (generated from the SAME `WAVES` table the Yacht uses to ride
// the swell, so hull and water stay in phase) runs in the vertex shader via
// onBeforeCompile; per frame the CPU writes exactly one float (the time
// uniform). That also lets us afford a denser grid for smoother swells.
// Procedural and CSP-safe (no HDR, no external textures).
// ============================================================================

/** GLSL for the wave field, generated from WAVES so there is one source of
 * truth. Returns vec3(height, ddx, ddz) - matching waves.ts sampleWave(). */
function waveGlsl(): string {
  const terms = WAVES.map((w) => {
    const k = (2 * Math.PI) / w.len;
    return `
  {
    float phase = ${k.toFixed(6)} * (${w.dirX.toFixed(3)} * p.x + ${w.dirZ.toFixed(3)} * p.z) + t * ${w.speed.toFixed(3)};
    h += ${w.amp.toFixed(3)} * sin(phase);
    float d = ${w.amp.toFixed(3)} * ${k.toFixed(6)} * cos(phase);
    nx -= ${w.dirX.toFixed(3)} * d;
    nz -= ${w.dirZ.toFixed(3)} * d;
  }`;
  }).join('');
  return `
vec3 regattaWave(vec3 p, float t) {
  float h = 0.0;
  float nx = 0.0;
  float nz = 0.0;
  ${terms}
  return vec3(h, nx, nz);
}
`;
}

export function Ocean({
  size = 700,
  seg = 128,
  color = '#0e4256',
}: {
  size?: number;
  seg?: number;
  color?: string;
}) {
  const timeRef = useRef({ value: 0 });

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2); // XZ plane, +Y up, matching the wave field axes
    return g;
  }, [size, seg]);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.07,
      // Low roughness so the sun/environment breaks into a specular path on
      // the moving surface (the "premium water" read).
      roughness: 0.14,
      envMapIntensity: 1.15,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = timeRef.current;
      shader.vertexShader =
        `uniform float uTime;\n` +
        waveGlsl() +
        shader.vertexShader
          .replace(
            '#include <beginnormal_vertex>',
            `#include <beginnormal_vertex>
  vec3 regattaW = regattaWave(position, uTime);
  objectNormal = normalize(vec3(regattaW.y, 1.0, regattaW.z));`,
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
  transformed.y += regattaW.x;`,
          );
    };
    return m;
  }, [color]);

  useFrame(({ clock }) => {
    timeRef.current.value = clock.elapsedTime;
  });

  return <mesh geometry={geometry} material={material} receiveShadow />;
}
