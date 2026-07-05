'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sampleWave } from './waves';
import type { YachtState } from '../types';

// ============================================================================
// Wake - stern foam trail + bow spray as a small CPU particle system rendered
// with THREE.Points. The boat "sails in place" (the world is boat-centric), so
// the wake is what sells motion: particles spawn at the stern/bow, drift AFT
// at boat speed, ride the swell, expand and fade. Intensity scales with
// telemetry speed (YachtState.speedKn - 0 in free-trim mode, so a posed boat
// shows no wake). Sprite texture is generated on a canvas: zero assets,
// CSP-safe. ~220 particles, one draw call - WebView-friendly.
// ============================================================================

const COUNT = 220;
const KN_TO_MS = 0.514444;
const STERN_X = -3.4;
const BOW_X = 3.1;
const LIFE = 2.6; // seconds

function makeFoamSprite(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.4, 'rgba(235,246,250,0.5)');
  g.addColorStop(1, 'rgba(235,246,250,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  age: number; // seconds; >= LIFE means dead/inactive
}

export function Wake({ stateRef }: { stateRef: MutableRefObject<YachtState> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const spawnAcc = useRef(0);
  const cursor = useRef(0);

  const { geometry, material, particles } = useMemo(() => {
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: 0, y: 0, z: 0, vx: 0, vz: 0, age: LIFE,
    }));
    const positions = new Float32Array(COUNT * 3);
    const alphas = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    // Big static bounds: particles live within ~30 m of the boat.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 60);

    const material = new THREE.PointsMaterial({
      size: 1,
      map: makeFoamSprite(),
      transparent: true,
      depthWrite: false,
      color: '#eef7fa',
    });
    // Per-particle alpha + size via a tiny shader patch (PointsMaterial has
    // neither); keeps everything in one draw call.
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nattribute float aAlpha;\nattribute float aSize;\nvarying float vAlpha;',
        )
        .replace('gl_PointSize = size;', 'gl_PointSize = size * aSize;\nvAlpha = aAlpha;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
        .replace(
          '#include <premultiplied_alpha_fragment>',
          'gl_FragColor.a *= vAlpha;\n#include <premultiplied_alpha_fragment>',
        );
    };
    return { geometry, material, particles };
  }, []);

  useFrame((st, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = st.clock.elapsedTime;
    const speedKn = stateRef.current.speedKn ?? 0;
    const speedMs = speedKn * KN_TO_MS;
    const intensity = Math.min(1, speedKn / 7);

    // Spawn rate scales with speed: silent at rest, ~70/s at hull speed.
    spawnAcc.current += dt * 70 * intensity;
    while (spawnAcc.current >= 1) {
      spawnAcc.current -= 1;
      const p = particles[cursor.current];
      cursor.current = (cursor.current + 1) % COUNT;
      const bow = Math.random() < 0.25 && speedKn > 3.5;
      if (bow) {
        // Bow spray: kicked slightly up and outward.
        p.x = BOW_X + Math.random() * 0.5;
        p.z = (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.3);
        p.y = 0.25 + Math.random() * 0.25;
        p.vx = -speedMs * (0.55 + Math.random() * 0.2);
        p.vz = Math.sign(p.z) * (0.4 + Math.random() * 0.5);
      } else {
        // Stern foam: churned water spreading in a V behind the transom.
        p.x = STERN_X - Math.random() * 0.6;
        p.z = (Math.random() - 0.5) * 1.5;
        p.y = 0.08;
        p.vx = -speedMs * (0.5 + Math.random() * 0.25);
        p.vz = p.z * (0.35 + Math.random() * 0.3);
      }
      p.age = 0;
    }

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const alpha = geometry.attributes.aAlpha as THREE.BufferAttribute;
    const size = geometry.attributes.aSize as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      if (p.age >= LIFE) {
        alpha.setX(i, 0);
        continue;
      }
      p.age += dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      const k = p.age / LIFE;
      // Foam settles onto the moving swell surface.
      const wave = sampleWave(p.x, p.z, t).y;
      pos.setXYZ(i, p.x, Math.max(0.04, p.y * (1 - k)) + wave, p.z);
      alpha.setX(i, intensity * (1 - k) * 0.85);
      size.setX(i, 26 * (0.5 + 1.7 * k));
    }
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
    size.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
