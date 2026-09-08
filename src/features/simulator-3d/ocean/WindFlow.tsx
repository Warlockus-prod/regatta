'use client';
import { useMemo, useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { YachtState } from "../types";

const COUNT = 18;
const UP = new THREE.Vector3(0, 1, 0);

/** Apparent air velocity in the world frame, X east, Z south. */
export function windFlowDirection(from: number, out: THREE.Vector3) {
  const a = from * Math.PI / 180;
  return out.set(-Math.sin(a), 0, Math.cos(a));
}

/** Solid instanced arrows remain legible on Retina and in the iOS WebView.
 * Unlike WebGL lines their thickness is not limited to one device pixel.
 * These show incoming air, not a CFD solution around the cloth. */
export function WindFlow({ stateRef }: { stateRef: MutableRefObject<YachtState> }) {
  const distance = useRef(0);
  const shaftsRef = useRef<THREE.InstancedMesh>(null);
  const headsRef = useRef<THREE.InstancedMesh>(null);
  const flow = useMemo(() => {
    const shaftGeometry = new THREE.CylinderGeometry(.055, .055, 1, 5);
    const headGeometry = new THREE.ConeGeometry(.22, .5, 6);
    const shaftMaterial = new THREE.MeshBasicMaterial({ color: "#075a70", transparent: true, opacity: .78, depthWrite: false, toneMapped: false });
    const headMaterial = new THREE.MeshBasicMaterial({ color: "#12dcf4", transparent: true, opacity: .92, depthWrite: false, toneMapped: false });
    const shafts = new THREE.InstancedMesh(shaftGeometry, shaftMaterial, COUNT);
    const heads = new THREE.InstancedMesh(headGeometry, headMaterial, COUNT);
    for (const mesh of [shafts, heads]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
    }
    return { shafts, heads, matrix: new THREE.Object3D(), direction: new THREE.Vector3(),
      dispose: () => { shaftGeometry.dispose(); headGeometry.dispose(); shaftMaterial.dispose(); headMaterial.dispose(); shafts.dispose(); heads.dispose(); } };
  }, []);
  useEffect(() => () => flow.dispose(), [flow]);
  useFrame((_, dt) => {
    const shafts = shaftsRef.current, heads = headsRef.current;
    if (!shafts || !heads) return;
    const wind = stateRef.current.apparentWind ?? stateRef.current.wind;
    shafts.visible = heads.visible = Boolean(wind && wind.knots > .5);
    if (!wind || wind.knots <= .5) return;
    distance.current = (distance.current + Math.min(dt, .1) * wind.knots * .514444) % 32;
    const d = windFlowDirection(wind.from, flow.direction);
    flow.matrix.quaternion.setFromUnitVectors(UP, d);
    for (let i = 0; i < COUNT; i++) {
      const along = ((distance.current + i * 7.3) % 32) - 16;
      const across = ((i * 5.7) % 18) - 9;
      const x = d.x * along + d.z * across, z = d.z * along - d.x * across;
      const y = 2.2 + (i % 4) * 3.1;
      flow.matrix.position.set(x, y, z);
      flow.matrix.scale.set(1, 1.6, 1);
      flow.matrix.updateMatrix();
      shafts.setMatrixAt(i, flow.matrix.matrix);
      flow.matrix.position.set(x + d.x * 1.02, y, z + d.z * 1.02);
      flow.matrix.scale.set(1, 1, 1);
      flow.matrix.updateMatrix();
      heads.setMatrixAt(i, flow.matrix.matrix);
    }
    shafts.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
  });
  return <group><primitive ref={shaftsRef} object={flow.shafts} /><primitive ref={headsRef} object={flow.heads} /></group>;
}
