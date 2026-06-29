'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { YACHT_MODEL_URL } from './config';
import { sampleWave } from './ocean/waves';
import type { YachtState } from './types';

// ============================================================================
// Yacht - drives a per-instance clone of the GLB from a shared rig-state ref.
//
// useGLTF returns a module-cached scene; we clone it so this component owns its
// own rig (rotations, morph influences, shadow flags) and the module stays
// drop-in reusable (no state leaking across mounts / StrictMode / 2nd instance).
// The clone copies morphTargetInfluences per mesh (Mesh.copy) and shares the
// geometry, which is what we want.
//
// Reading from a ref (not a prop) lets the physics loop update the boat 60x a
// second without re-rendering the Canvas.
//
// SIGN keeps all axis directions in one place: flip a 1 to -1 after a visual
// check if any motion reads backwards (orientation cannot be verified headless).
// ============================================================================

const SIGN = {
  boom: 1,
  jib: 1,
  rudder: 1,
  heel: -1,
};

const DEG = Math.PI / 180;

/** The mesh under `node` that actually carries morph targets (node may be a
 * group wrapping the mesh, or the mesh itself). */
function findMorphMesh(node: THREE.Object3D | null): THREE.Mesh | null {
  if (!node) return null;
  let found: THREE.Mesh | null = null;
  node.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!found && m.isMesh && m.morphTargetDictionary) found = m;
  });
  return found;
}

function setMorph(mesh: THREE.Mesh | null, name: string, value: number) {
  if (!mesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
  const idx = mesh.morphTargetDictionary[name];
  if (idx !== undefined) mesh.morphTargetInfluences[idx] = value;
}

export function Yacht({ stateRef }: { stateRef: MutableRefObject<YachtState> }) {
  const { scene } = useGLTF(YACHT_MODEL_URL);
  const root = useRef<THREE.Group>(null);
  const heelLerp = useRef(0);

  // Per-instance clone with shadows enabled (pure: builds and returns a value).
  const model = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return m;
  }, [scene]);

  // Node lookups live in a ref (not a memo) so the per-frame rig mutations are
  // not treated as modifying a hook-derived value.
  const nodesRef = useRef<{
    mainRig: THREE.Object3D | null;
    jibRig: THREE.Object3D | null;
    rudder: THREE.Object3D | null;
    main: THREE.Mesh | null;
    jib: THREE.Mesh | null;
  }>({ mainRig: null, jibRig: null, rudder: null, main: null, jib: null });

  useEffect(() => {
    nodesRef.current = {
      mainRig: model.getObjectByName('MainRig') ?? null,
      jibRig: model.getObjectByName('JibRig') ?? null,
      rudder: model.getObjectByName('Rudder') ?? null,
      main: findMorphMesh(model.getObjectByName('MainSail') ?? null),
      jib: findMorphMesh(model.getObjectByName('Jib') ?? null),
    };
  }, [model]);

  useFrame((st, dt) => {
    const n = nodesRef.current;
    const s = stateRef.current;
    const k = Math.min(1, dt * 8);
    if (n.mainRig) n.mainRig.rotation.y = THREE.MathUtils.lerp(n.mainRig.rotation.y, SIGN.boom * s.boomAngle * DEG, k);
    if (n.jibRig) n.jibRig.rotation.y = THREE.MathUtils.lerp(n.jibRig.rotation.y, SIGN.jib * s.jibAngle * DEG, k);
    if (n.rudder) n.rudder.rotation.y = THREE.MathUtils.lerp(n.rudder.rotation.y, SIGN.rudder * s.rudderAngle * DEG, k);
    for (const mesh of [n.main, n.jib]) {
      setMorph(mesh, 'Camber', s.camber);
      setMorph(mesh, 'Twist', s.twist);
      setMorph(mesh, 'Luff', s.luff);
      setMorph(mesh, 'Reef', s.reef);
    }
    if (root.current) {
      // Heel from the trim state, smoothed.
      heelLerp.current = THREE.MathUtils.lerp(heelLerp.current, SIGN.heel * s.heel * DEG, k);
      // Ride the swell: sample the shared wave field at four hull points for
      // heave (center), pitch (bow vs stern, X axis) and roll (port vs stbd, Z).
      const t = st.clock.elapsedTime;
      const center = sampleWave(0, 0, t).y;
      const bow = sampleWave(2.6, 0, t).y;
      const stern = sampleWave(-2.6, 0, t).y;
      const port = sampleWave(0, -1.6, t).y;
      const stbd = sampleWave(0, 1.6, t).y;
      root.current.position.y = center;
      root.current.rotation.x = heelLerp.current + Math.atan2(stbd - port, 3.2) * 0.5;
      root.current.rotation.z = Math.atan2(bow - stern, 5.2) * 0.6;
    }
  });

  return (
    <group ref={root}>
      <primitive object={model} />
    </group>
  );
}
