'use client';
import { useMemo, useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { YachtState } from "../types";

/** Directed apparent-air streaks at sail height. These show incoming air,
 * not a claimed CFD solution of the flow around the cloth. */
export function WindFlow({ stateRef }: { stateRef: MutableRefObject<YachtState> }) {
  const flowRef = useRef<THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>>(null);
  const flow = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(18 * 18), 3).setUsage(THREE.DynamicDrawUsage));
    return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: "#bbf2ef", transparent: true, opacity: .48, depthWrite: false }));
  }, []);
  useEffect(() => () => { flow.geometry.dispose(); flow.material.dispose(); }, [flow]);
  const distance = useRef(0);
  useFrame((_, dt) => {
    const flow = flowRef.current;
    if (!flow) return;
    const wind = stateRef.current.apparentWind ?? stateRef.current.wind;
    flow.visible = Boolean(wind && wind.knots > .5);
    if (!wind) return;
    distance.current += Math.min(dt, .1) * wind.knots * .514444;
    const a = wind.from * Math.PI / 180;
    const dx = -Math.sin(a), dz = Math.cos(a);
    const p = flow.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < 18; i++) {
      const along = ((distance.current + i * 7.3) % 32) - 16;
      const across = ((i * 5.7) % 18) - 9;
      const x = dx * along + dz * across, z = dz * along - dx * across;
      const y = 2.2 + (i % 4) * 3.1;
      const tipX = x + dx * 1.5, tipZ = z + dz * 1.5;
      const n = i * 6;
      p.setXYZ(n, x, y, z); p.setXYZ(n + 1, tipX, y, tipZ);
      p.setXYZ(n + 2, tipX - dx * .35 + dz * .16, y, tipZ - dz * .35 - dx * .16);
      p.setXYZ(n + 3, tipX, y, tipZ);
      p.setXYZ(n + 4, tipX - dx * .35 - dz * .16, y, tipZ - dz * .35 + dx * .16);
      p.setXYZ(n + 5, tipX, y, tipZ);
    }
    p.needsUpdate = true;
  });
  return <primitive ref={flowRef} object={flow} frustumCulled={false} />;
}
