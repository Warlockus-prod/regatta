'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WAVES } from './waves';
import type { YachtState } from '../types';

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
  stateRef,
  size = 700,
  seg = 192,
  color = '#0e4256',
  roughness = 0.24,
  skyReflection = 1,
  farCalm,
  sunGlint = 1,
}: {
  stateRef: MutableRefObject<YachtState>;
  size?: number;
  seg?: number;
  color?: string;
  /** Rougher water spreads the sun over the waves instead of sharp glints
   *  (the race view, seen from far, uses more). */
  roughness?: number;
  /**
   * Share of the reflected sky (the scene environment). Seen at grazing
   * angles over a whole race area its bright panels smear into white sheets;
   * the race view turns it down. Done in the shader: with a scene
   * environment three.js ignores material.envMapIntensity.
   */
  skyReflection?: number;
  /**
   * From..to metres from the camera over which the waves flatten and the
   * surface roughens. Far wave facets otherwise each mirror the sun, a white
   * chequerboard over a whole race area. Off by default (the 3D boat's water
   * ends at 340 m).
   */
  farCalm?: [number, number];
  /** Share of the sun's direct glitter on the water (the race view seen from
   *  above towards the sun turns the swell into white sheets at 1). */
  sunGlint?: number;
}) {
  const timeRef = useRef({ value: 0 });
  const travelRef = useRef({ value: new THREE.Vector2() });

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    // Concentrate vertices around the yacht: ~0.54 m spacing at the origin,
    // expanding smoothly toward the fogged horizon, without patch seams.
    const positions = g.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const spread = (v: number) => size / 2 * Math.sinh(4 * v / (size / 2)) / Math.sinh(4);
      positions.setXY(i, spread(positions.getX(i)), spread(positions.getY(i)));
    }
    g.rotateX(-Math.PI / 2); // XZ plane, +Y up, matching the wave field axes
    return g;
  }, [size, seg]);

  const calmFrom = farCalm?.[0];
  const calmTo = farCalm?.[1];
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.07,
      // Low roughness so the sun/environment breaks into a specular path on
      // the moving surface (the "premium water" read).
      roughness,
      envMapIntensity: 1.15,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = timeRef.current;
      shader.uniforms.uTravel = travelRef.current;
      shader.vertexShader =
        `uniform float uTime; uniform vec2 uTravel; varying vec3 vOceanPosition;\n` +
        waveGlsl() +
        shader.vertexShader
          .replace(
            '#include <beginnormal_vertex>',
            `#include <beginnormal_vertex>
  vec3 regattaW = regattaWave(position + vec3(uTravel.x, 0.0, uTravel.y), uTime);
  objectNormal = normalize(vec3(regattaW.y, 1.0, regattaW.z));`,
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
  transformed.y += regattaW.x;
  vOceanPosition = position + vec3(uTravel.x, 0.0, uTravel.y);`,
          );
      shader.fragmentShader = "uniform float uTime; varying vec3 vOceanPosition;\n" + waveGlsl() + shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec3 waveNormal = regattaWave(vOceanPosition, uTime);
        float rippleFade = 1.0 - smoothstep(0.15, 0.9, length(fwidth(vOceanPosition.xz)) * 8.0);
        float rippleX = rippleFade * 0.02 * sin(vOceanPosition.x * 8.1 + vOceanPosition.z * 3.2 + uTime * 2.0);
        float rippleZ = rippleFade * 0.015 * cos(vOceanPosition.z * 9.4 - vOceanPosition.x * 2.8 - uTime * 1.6);
        float calm = ${calmFrom !== undefined && calmTo !== undefined ? `smoothstep(${calmFrom.toFixed(1)}, ${calmTo.toFixed(1)}, length(vViewPosition))` : "0.0"};
        vec3 waterNormal = vec3(waveNormal.y + rippleX, 1.0, waveNormal.z + rippleZ);
        waterNormal.xz *= 1.0 - 0.85 * calm;
        normal = normalize(mat3(viewMatrix) * normalize(waterNormal));
        roughnessFactor = mix(roughnessFactor, 0.72, calm);`,
      ).replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
        reflectedLight.directSpecular *= ${sunGlint.toFixed(3)};
        reflectedLight.indirectSpecular *= ${skyReflection.toFixed(3)};`,
      );
    };
    return m;
  }, [color, roughness, skyReflection, calmFrom, calmTo, sunGlint]);

  useFrame(({ clock }) => {
    timeRef.current.value = clock.elapsedTime;
    travelRef.current.value.set(stateRef.current.travel?.x ?? 0, stateRef.current.travel?.z ?? 0);
  });

  return <mesh geometry={geometry} material={material} receiveShadow />;
}
