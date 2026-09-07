'use client';
import { useMemo, useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { YachtState } from "../types";

/** Sparse world-space streaks travel with the actual true wind. */
export function WindFlow({ stateRef }: { stateRef: MutableRefObject<YachtState> }) {
  const flowRef = useRef<THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>>(null);
  const flow = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(24 * 6), 3));
    return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color: "#b9f1ee", transparent: true, opacity: .22, depthWrite: false}));
  }, []);
  useEffect(() => () => { flow.geometry.dispose(); flow.material.dispose(); }, [flow]);
  useFrame(({ clock }) => {
    const flow = flowRef.current;
    if (!flow) return;
    const wind = stateRef.current.wind;
    flow.visible = Boolean(wind && wind.knots > .1);
    if (!wind) return;
    const a = wind.from * Math.PI / 180;
    const dx = -Math.sin(a), dz = Math.cos(a);
    const p = flow.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < 24; i++) {
      const along = ((clock.elapsedTime * wind.knots * .3 + i * 7.3) % 44) - 22;
      const across = ((i * 11.7) % 36) - 18;
      const x = dx * along + dz * across, z = dz * along - dx * across;
      const y = .7 + (i % 3) * .35;
      p.setXYZ(i * 2, x, y, z);
      p.setXYZ(i * 2 + 1, x + dx * 1.3, y, z + dz * 1.3);
    }
    p.needsUpdate = true;
  });
  return <primitive ref={flowRef} object={flow} frustumCulled={false} />;
}
