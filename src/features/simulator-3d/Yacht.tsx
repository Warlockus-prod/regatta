'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { YACHT_MODEL_URL } from './config';
import { sampleWave } from './ocean/waves';
import type { YachtState } from './types';
import { FORESTAY_AXIS, sailPoint, createSailGeometry, updateSailGeometry, createSailSeams, updateSailSeams, type SailShape } from './sails/geometry';

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

/**
 * Upgrade the GLB's flat Sail_Canvas material: slight sheen + softer roughness
 * gives the cloth a lit, premium read (the exported material was roughness=1
 * matte "paper"). Mobile-safe: sheen is a cheap BRDF term, unlike transmission.
 */
function upgradeSailMaterial(mesh: THREE.Mesh | null, weave: THREE.DataTexture) {
  if (!mesh) return;
  const src = mesh.material as THREE.MeshStandardMaterial;
  if (!src || (src as THREE.MeshPhysicalMaterial).sheen === 1) return;
  const mat = new THREE.MeshPhysicalMaterial({
    color: src.color?.clone() ?? new THREE.Color('#f4f2ec'),
    map: src.map ?? null,
    side: THREE.DoubleSide,
    roughness: 0.62,
    metalness: 0,
    sheen: 0.4,
    emissive: new THREE.Color('#d6d8ce'),
    emissiveIntensity: 0.06,
    normalMap: weave,
    normalScale: new THREE.Vector2(0.12, 0.12),
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#fff6e6'),
  });
  mat.name = src.name + '_sheen';
  mesh.material = mat;
  return mat;
}

export function Yacht({ stateRef, light = false }: { stateRef: MutableRefObject<YachtState>; light?: boolean }) {
  const { scene } = useGLTF(YACHT_MODEL_URL);
  const root = useRef<THREE.Group>(null);
  const yawRoot = useRef<THREE.Group>(null);
  const heelLerp = useRef(0);
  const jibAngle = useRef(0);
  const clothTime = useRef(-1);
  const cloth = useRef({ main: { fill: 1, luff: 0, side: 1 }, jib: { fill: 1, luff: 0, side: 1 } });

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
    sheets: THREE.LineSegments | null;
    mainSeams: THREE.LineSegments | null;
    jibSeams: THREE.LineSegments | null;
  }>({
    mainRig: null,
    jibRig: null,
    rudder: null,
    main: null,
    jib: null,
    sheets: null,
    mainSeams: null,
    jibSeams: null,
  });

  useEffect(() => {
    // A small woven normal tile; no network texture or extra geometry.
    const data = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      data[i] = 128 + Math.round(35 * Math.sin(x * Math.PI / 4));
      data[i + 1] = 128 + Math.round(35 * Math.sin(y * Math.PI / 4));
      data[i + 2] = 250; data[i + 3] = 255;
    }
    const weave = new THREE.DataTexture(data, 64, 64);
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
    weave.repeat.set(10, 16);
    weave.magFilter = THREE.LinearFilter;
    weave.minFilter = THREE.LinearMipmapLinearFilter;
    weave.generateMipmaps = true;
    weave.needsUpdate = true;
    const surfaces: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[]; owned: THREE.Material[] }[] = [];
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const original = mesh.material;
      const owned: THREE.Material[] = [];
      const upgrade = (material: THREE.Material) => {
        if (material.name !== "Gelcoat_White") return material;
        const source = material as THREE.MeshStandardMaterial;
        const finish = new THREE.MeshPhysicalMaterial({ color: source.color, map: source.map,
          roughness: 0.26, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.2 });
        finish.name = source.name;
        owned.push(finish);
        return finish;
      };
      mesh.material = Array.isArray(original) ? original.map(upgrade) : upgrade(original);
      if (owned.length) surfaces.push({ mesh, original, owned });
    });
    const main = findMorphMesh(model.getObjectByName('MainSail') ?? null);
    const jib = findMorphMesh(model.getObjectByName('Jib') ?? null);
    const oldMainGeometry = main?.geometry;
    const oldJibGeometry = jib?.geometry;
    const mainGeometry = createSailGeometry(light ? 14 : 24, light ? 22 : 36);
    const jibGeometry = createSailGeometry(light ? 14 : 24, light ? 22 : 36);
    const sheetGeometry = new THREE.BufferGeometry();
    sheetGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(18), 3).setUsage(THREE.DynamicDrawUsage));
    const sheets = new THREE.LineSegments(sheetGeometry, new THREE.LineBasicMaterial({ color: "#bfc3b7" }));
    sheets.frustumCulled = false;
    model.add(sheets);
    const mainSeams = createSailSeams();
    const jibSeams = createSailSeams();
    const initial: SailShape = { camber: 0.5, twist: 0.35, luff: 0, reef: 0, side: -1, time: 0 };
    updateSailGeometry(mainGeometry, "main", initial);
    updateSailGeometry(jibGeometry, "jib", initial);
    if (main) { main.geometry = mainGeometry; main.add(mainSeams); }
    if (jib) { jib.geometry = jibGeometry; jib.add(jibSeams); }
    // Exported rigid decorations do not follow the cloth and float off it.
    const decorations = ["Battens", "SailNumber", "Main_Telltales", "Jib_Telltales", "Running_Rigging", "Anatomy_Sheets", "Anatomy_Fender_-1", "Anatomy_Fender_1", "Anatomy_Fender_Line_-1", "Anatomy_Fender_Line_1"].map((name) => model.getObjectByName(name));
    decorations.forEach((object) => { if (object) object.visible = false; });
    const mainMaterial = main?.material;
    const jibMaterial = jib?.material;
    const mainUpgrade = upgradeSailMaterial(main, weave);
    const jibUpgrade = upgradeSailMaterial(jib, weave);
    nodesRef.current = {
      mainRig: model.getObjectByName('MainRig') ?? null,
      jibRig: model.getObjectByName('JibRig') ?? null,
      rudder: model.getObjectByName('Rudder') ?? null,
      main,
      jib,
      mainSeams,
      jibSeams,
      sheets,

    };
    return () => {
      if (main && oldMainGeometry) { main.geometry = oldMainGeometry; main.remove(mainSeams); }
      if (jib && oldJibGeometry) { jib.geometry = oldJibGeometry; jib.remove(jibSeams); }
      model.remove(sheets); sheetGeometry.dispose(); (sheets.material as THREE.Material).dispose();
      mainGeometry.dispose(); jibGeometry.dispose();
      for (const seam of [mainSeams, jibSeams]) { seam.geometry.dispose(); (seam.material as THREE.Material).dispose(); }
      decorations.forEach((object) => { if (object) object.visible = true; });
      if (main && mainMaterial) main.material = mainMaterial;
      if (jib && jibMaterial) jib.material = jibMaterial;
      for (const surface of surfaces) { surface.mesh.material = surface.original; surface.owned.forEach((material) => material.dispose()); }
      weave.dispose();
      mainUpgrade?.dispose();
      jibUpgrade?.dispose();
    };
  }, [model, light]);

  useFrame((st, dt) => {
    const n = nodesRef.current;
    const s = stateRef.current;
    const k = Math.min(1, dt * 8);
    const t = st.clock.elapsedTime;
    if (n.mainRig) n.mainRig.rotation.y = THREE.MathUtils.lerp(n.mainRig.rotation.y, SIGN.boom * s.boomAngle * DEG, k);
    jibAngle.current = THREE.MathUtils.lerp(jibAngle.current, SIGN.jib * s.jibAngle * DEG, k);
    if (n.jibRig) n.jibRig.quaternion.setFromAxisAngle(FORESTAY_AXIS, jibAngle.current);
    if (n.rudder) n.rudder.rotation.y = THREE.MathUtils.lerp(n.rudder.rotation.y, SIGN.rudder * s.rudderAngle * DEG, k);
    const response = 1 - Math.exp(-Math.min(dt, 0.1) / 0.24);
    for (const kind of ["main", "jib"] as const) {
      const target = kind === "jib" ? s.jibShape ?? s : s;
      const shape = cloth.current[kind];
      shape.fill += ((target.fill ?? 1) - shape.fill) * response;
      shape.luff += (target.luff - shape.luff) * response;
      shape.side += ((Math.sign(kind === "main" ? s.boomAngle : s.jibAngle) || 1) - shape.side) * response;
    }
    if (t - clothTime.current > 1 / (light ? 20 : 30) || t < clothTime.current) {
      clothTime.current = t;
      for (const [mesh, seam, kind, shape] of [
        [n.main, n.mainSeams, "main", { camber: s.camber, twist: s.twist, luff: cloth.current.main.luff, fill: cloth.current.main.fill, airSpeed: s.airSpeed, reef: s.reef, side: cloth.current.main.side, time: t }],
        [n.jib, n.jibSeams, "jib", { camber: s.jibShape?.camber ?? s.camber, twist: s.jibShape?.twist ?? s.twist,
          luff: cloth.current.jib.luff, fill: cloth.current.jib.fill, airSpeed: s.jibShape?.airSpeed ?? s.airSpeed, reef: 0, furl: s.jibShape?.furl ?? 0, side: cloth.current.jib.side, time: t }],
      ] as const) {
        if (mesh) updateSailGeometry(mesh.geometry, kind, shape);
        if (seam) updateSailSeams(seam, kind, shape);
      }
    }
    if (n.sheets && n.mainRig && n.jibRig) {
      const position = n.sheets.geometry.getAttribute("position") as THREE.BufferAttribute;
      const boomEnd = new THREE.Vector3(-5.2, -0.04, 0).applyQuaternion(n.mainRig.quaternion).add(n.mainRig.position);
      const clew = sailPoint("jib", 1, 0, { camber: 0, twist: 0, luff: 0, reef: 0, furl: s.jibShape?.furl ?? 0, side: 1, time: 0 }, new THREE.Vector3())
        .applyQuaternion(n.jibRig.quaternion).add(n.jibRig.position);
      position.setXYZ(0, -3.1, 1.3, -0.25); position.setXYZ(1, boomEnd.x, boomEnd.y, boomEnd.z);
      position.setXYZ(2, -3.1, 1.3, 0.25); position.setXYZ(3, boomEnd.x, boomEnd.y, boomEnd.z);
      position.setXYZ(4, -3.4, 1.3, (Math.sign(s.jibAngle) || 1) * 1.15); position.setXYZ(5, clew.x, clew.y, clew.z);
      position.needsUpdate = true;
    }
    const yaw = s.heading === undefined ? 0 : (90 - s.heading) * DEG;
    if (yawRoot.current) yawRoot.current.rotation.y = yaw;
    if (root.current) {
      // Heel from the trim state, smoothed.
      heelLerp.current = THREE.MathUtils.lerp(heelLerp.current, SIGN.heel * s.heel * DEG, k);
      // Ride the swell: sample the shared wave field at four hull points for
      // heave (center), pitch (bow vs stern, X axis) and roll (port vs stbd, Z).
      const waveAt = (x: number, z: number) => sampleWave(
        x * Math.cos(yaw) + z * Math.sin(yaw) + (s.travel?.x ?? 0),
        -x * Math.sin(yaw) + z * Math.cos(yaw) + (s.travel?.z ?? 0), t,
      ).y;
      const center = waveAt(0, 0);
      const bow = waveAt(5.8, 0);
      const stern = waveAt(-5.8, 0);
      const port = waveAt(0, -1.6);
      const stbd = waveAt(0, 1.6);
      root.current.position.y = center;
      root.current.rotation.x = heelLerp.current + Math.atan2(stbd - port, 3.2) * 0.5;
      root.current.rotation.z = Math.atan2(bow - stern, 11.6) * 0.6;
    }
  });

  return (
    <group ref={yawRoot}><group ref={root}>
      <primitive object={model} />
    </group></group>
  );
}
