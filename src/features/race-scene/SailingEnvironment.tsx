'use client';

import { memo, useCallback, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { sampleWave } from "@/features/simulator-3d/ocean/waves";
import { METRES_PER_UNIT } from "@/features/race-3d/pose";
import { landPolygon, raceTerrain, noise1, RACE_AREA } from "@/data/venues/geometry";
import type { Venue } from "@/data/venues/venues";
import { shoreField } from "./shore";
import { TRAIL_POINTS, buildRibbon, pushTrail, ribbonIndices, type TrailPoint } from "./trail";
import { BEACH_ROWS, landGeometry } from "./land";
import { PALETTE, calmFactor, shadowMaterial, shoreTexture, skyMaterial, wakeMaterial, waterMaterial, waterUniforms, type WaterUniforms } from "./materials";
import { SAILING_SUN, sailingEnvironmentFrame, sailingHull, type SailingHull, type SailingState, type WorldPoint } from "./environment-state";

type OriginRef = MutableRefObject<WorldPoint>;
const DEG = Math.PI / 180;
const STERN = 6.3;
const LAND_HEIGHT = 1.8;
const SUN_DIR = new THREE.Vector3(...SAILING_SUN).normalize();
const CHART_ORIGIN: WorldPoint = { x: 0, z: 0 };

/** One world-space wake and soft hull shadow per sailing boat. */
function HullMarks({ readBoats, originRef, travel }: {
  readBoats: () => readonly SailingHull[];
  originRef: OriginRef;
  travel: { value: THREE.Vector2 };
}) {
  const wake = useMemo(() => wakeMaterial(travel), [travel]);
  const shadow = useMemo(() => shadowMaterial(), []);
  const plane = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const ribbons = useRef(new Map<string, { points: TrailPoint[]; mesh: THREE.Mesh; geometry: THREE.BufferGeometry; positions: Float32Array; uvs: Float32Array }>());
  const shadows = useRef(new Map<string, THREE.Mesh>());
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    const live = ribbons.current;
    const shades = shadows.current;
    return () => {
      live.forEach((r) => r.geometry.dispose());
      live.clear();
      shades.clear();
      wake.dispose();
      shadow.dispose();
      plane.dispose();
    };
  }, [wake, shadow, plane]);

  useFrame(({ clock }) => {
    const root = group.current;
    if (!root) return;
    const now = clock.elapsedTime;
    const origin = originRef.current;
    const seen = new Set<string>();
    for (const boat of readBoats()) {
      seen.add(boat.id);
      const c = boat.travel;
      const h = (boat.heading ?? 0) * DEG;
      const fwd = { x: Math.sin(h), z: -Math.cos(h) };
      const stern: TrailPoint = { x: c.x - fwd.x * STERN, z: c.z - fwd.z * STERN, t: now };
      let r = ribbons.current.get(boat.id);
      if (!r) {
        const positions = new Float32Array((TRAIL_POINTS + 1) * 6);
        const uvs = new Float32Array((TRAIL_POINTS + 1) * 4);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2).setUsage(THREE.DynamicDrawUsage));
        geometry.setIndex(new THREE.BufferAttribute(ribbonIndices(TRAIL_POINTS + 1), 1));
        const mesh = new THREE.Mesh(geometry, wake);
        mesh.frustumCulled = false;
        mesh.renderOrder = 1;
        root.add(mesh);
        r = { points: [], mesh, geometry, positions, uvs };
        ribbons.current.set(boat.id, r);
      }
      // A boat at the start line, not yet moving, leaves no wake.
      if (boat.speedKn > 0.05) pushTrail(r.points, stern);
      const height = (x: number, z: number) => sampleWave(x, z, now).y * calmFactor(Math.hypot(x - origin.x, z - origin.z));
      const vertices = buildRibbon(r.points, stern, now, origin, height, r.positions, r.uvs);
      r.geometry.setDrawRange(0, Math.max(0, (vertices / 2 - 1) * 6));
      r.mesh.visible = vertices >= 4;
      (r.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (r.geometry.getAttribute("uv") as THREE.BufferAttribute).needsUpdate = true;

      let s = shadows.current.get(boat.id);
      if (!s) {
        s = new THREE.Mesh(plane, shadow);
        s.renderOrder = 1;
        root.add(s);
        shadows.current.set(boat.id, s);
      }
      // Cast away from the sun, along the hull.
      const x = c.x - origin.x - SUN_DIR.x * 2.5;
      const z = c.z - origin.z - SUN_DIR.z * 2.5;
      s.position.set(x, sampleWave(c.x, c.z, now).y * calmFactor(Math.hypot(c.x - origin.x, c.z - origin.z)) + 0.5, z);
      s.rotation.y = (90 - boat.heading) * DEG;
      s.scale.set(15, 1, 5);
    }
    for (const [id, r] of ribbons.current) {
      if (seen.has(id)) continue;
      root.remove(r.mesh);
      r.geometry.dispose();
      ribbons.current.delete(id);
      const s = shadows.current.get(id);
      if (s) root.remove(s);
      shadows.current.delete(id);
    }
  });
  return <group ref={group} />;
}

/** The shared sailing water: dense round the hull, with waves and wind in TSL. */
function Water({ venue, uniforms, chartOrigin }: { venue?: Venue; uniforms: WaterUniforms; chartOrigin: WorldPoint }) {
  const geometry = useMemo(() => {
    const size = 2800;
    const g = new THREE.PlaneGeometry(size, size, 200, 200);
    const pos = g.attributes.position;
    // Dense round the boat (about 0.8 m), sparse towards the fog.
    const spread = (v: number) => (size / 2) * Math.sinh((4 * v) / (size / 2)) / Math.sinh(4);
    for (let i = 0; i < pos.count; i++) pos.setXY(i, spread(pos.getX(i)), spread(pos.getY(i)));
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const shore = useMemo(() => {
    const m = METRES_PER_UNIT;
    const polys = (venue?.lands ?? []).map((l) => landPolygon(l, RACE_AREA).map((p) => ({ x: p.x * m - chartOrigin.x, z: p.y * m - chartOrigin.z })));
    const margin = 520;
    const bounds = { min: { x: -margin - chartOrigin.x, z: -margin - chartOrigin.z }, max: { x: RACE_AREA.width * m + margin - chartOrigin.x, z: RACE_AREA.height * m + margin - chartOrigin.z } };
    const field = shoreField(polys, bounds, { cols: 224, rows: 256, maxDist: 70 });
    return { texture: shoreTexture(field), min: field.min, size: field.size };
  }, [venue, chartOrigin.x, chartOrigin.z]);
  const material = useMemo(() => waterMaterial(uniforms, shore), [uniforms, shore]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => { material.dispose(); shore.texture.dispose(); }, [material, shore]);
  return <mesh geometry={geometry} material={material} />;
}

/** The venue's shore and islands, coloured for the race light (see land.ts). */
const Land = memo(function Land({ venue }: { venue: Venue }) {
  const geometries = useMemo(() => raceTerrain(venue, { metresPerUnit: METRES_PER_UNIT, heightScale: LAND_HEIGHT })
    .map((t, n) => landGeometry(t, venue.palette, n, venue.lands[n]?.kind === "island")), [venue]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }), []);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  useEffect(() => () => material.dispose(), [material]);
  return <>{geometries.map((g, i) => <mesh key={`${venue.id}-${i}`} geometry={g} material={material} />)}</>;
});

/** Low-poly pines behind the beach: scale and a sense of place from high above. */
const Trees = memo(function Trees({ venue }: { venue: Venue }) {
  // Built whole, colours included, before the first frame: an instance colour
  // added after the pipeline is compiled is ignored and the trees render white.
  const mesh = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const base = [new THREE.Color(venue.palette.low), new THREE.Color(venue.palette.mid)];
    const dummy = new THREE.Object3D();
    raceTerrain(venue, { metresPerUnit: METRES_PER_UNIT, heightScale: LAND_HEIGHT }).forEach((t, n) => {
      const relief = t.relief;
      for (let k = 0; k < t.heights01.length; k++) {
        const h = t.heights01[k];
        // Behind the beach, below the bare summits; on chalk cliffs only on top.
        if (Math.floor(k / t.cols) < BEACH_ROWS + 1 || h > 0.78 || (relief === "cliffs" && h < 0.4)) continue;
        const r = noise1(311 + n, k * 0.61);
        if (r < (relief === "flat" ? 0.25 : 0.45)) continue;
        const [x, y, z] = [t.positions[k * 3], t.positions[k * 3 + 1], t.positions[k * 3 + 2]];
        for (let j = 0; j < 2; j++) {
          const a = noise1(17 + n * 7 + j, k * 1.37) * Math.PI * 2;
          const d = 2 + noise1(29 + n + j, k * 0.91) * 7;
          const scale = 0.8 + noise1(41 + j, k * 0.53) * 0.7;
          dummy.position.set(x + Math.cos(a) * d, y - 1, z + Math.sin(a) * d);
          dummy.scale.set(2.6 * scale, 9 * scale, 2.6 * scale);
          dummy.updateMatrix();
          matrices.push(dummy.matrix.clone());
          colors.push(base[(k + j) % 2].clone().multiplyScalar(0.62 + 0.25 * noise1(53 + j, k * 0.77)));
        }
      }
    });
    const count = Math.min(2400, matrices.length);
    const geometry = new THREE.ConeGeometry(1, 1, 6);
    geometry.translate(0, 0.5, 0);
    const material = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.95, metalness: 0 });
    const m = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
    m.count = count;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, count) * 3), 3);
    for (let i = 0; i < count; i++) { m.setMatrixAt(i, matrices[i]); m.setColorAt(i, colors[i]); }
    m.frustumCulled = false;
    return m;
  }, [venue]);
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose(); }, [mesh]);
  return <primitive object={mesh} />;
});

/** The land and its trees, shifted with the world (the player stays at the origin). */
function Dressing({ venue, originRef, chartOrigin }: { venue: Venue; originRef: OriginRef; chartOrigin: WorldPoint }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => { group.current?.position.set(-originRef.current.x - chartOrigin.x, 0, -originRef.current.z - chartOrigin.z); });
  return <group ref={group}><Land venue={venue} /><Trees venue={venue} /></group>;
}

/** A small local reflection map for gelcoat, stainless and sail cloth.
 * WebGPURenderer prefilters it once; there is no HDR download or extra
 * per-frame cube render. The same sky colours light both products. */
function Reflections() {
  const environment = useMemo(() => {
    const width = 128, height = 64;
    const data = new Uint8Array(width * height * 4);
    const horizon = new THREE.Color(PALETTE.horizon);
    const zenith = new THREE.Color(PALETTE.zenith);
    const ground = new THREE.Color(PALETTE.deep).multiplyScalar(0.45);
    const warm = new THREE.Color(PALETTE.sun);
    const color = new THREE.Color();
    const direction = new THREE.Vector3();
    for (let row = 0; row < height; row++) {
      const latitude = Math.PI * (row / (height - 1) - 0.5);
      const y = Math.sin(latitude);
      for (let col = 0; col < width; col++) {
        const longitude = col / width * Math.PI * 2;
        direction.set(Math.cos(latitude) * Math.cos(longitude), y, Math.cos(latitude) * Math.sin(longitude));
        color.copy(horizon).lerp(y >= 0 ? zenith : ground, Math.pow(Math.abs(y), 0.45));
        color.lerp(warm, Math.pow(Math.max(0, direction.dot(SUN_DIR)), 180) * 0.9);
        const i = (row * width + col) * 4;
        data[i] = Math.round(color.r * 255); data[i + 1] = Math.round(color.g * 255); data[i + 2] = Math.round(color.b * 255); data[i + 3] = 255;
      }
    }
    const texture = new THREE.DataTexture(data, width, height);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);
  useEffect(() => () => environment.dispose(), [environment]);
  return <primitive object={environment} attach="environment" />;
}

/** One environment for the solo race, replay and trainers. Call inside the
 * shared renderer's Canvas. Cameras, rig state and lesson UI stay with the
 * consumer; only the sea, scenery, light and world-space wakes live here. */
export function SailingEnvironment({ venue, readState, readBoats, originRef, chartOrigin = CHART_ORIGIN }: {
  venue?: Venue;
  readState: () => SailingState | null;
  readBoats?: () => readonly SailingHull[];
  originRef: OriginRef;
  chartOrigin?: WorldPoint;
}) {
  const uniforms = useMemo(() => waterUniforms(), []);
  const uniformsRef = useRef(uniforms);
  const sky = useMemo(() => skyMaterial(SUN_DIR, uniforms.time), [uniforms]);
  const singleHull = useCallback(() => [sailingHull(readState())], [readState]);
  useEffect(() => () => sky.dispose(), [sky]);
  // Update travel before the meshes, wakes, course markers and cameras read
  // the shared world origin. No simulation clock or controls are owned here.
  useFrame(({ clock }) => {
    const frame = sailingEnvironmentFrame(readState());
    originRef.current = frame.travel;
    const u = uniformsRef.current;
    u.time.value = clock.elapsedTime;
    u.travel.value.set(frame.travel.x, frame.travel.z);
    u.flow.value.set(frame.flow.x, frame.flow.z);
    u.windiness.value = frame.windiness;
  }, -2);
  return <>
    <color attach="background" args={[PALETTE.horizon]} />
    <fog attach="fog" args={[PALETTE.horizon, 420, 1900]} />
    <hemisphereLight args={["#d6ecff", "#3a5560", 0.9]} />
    <directionalLight position={SAILING_SUN} intensity={2.4} color="#fff0d8" />
    <Reflections />
    <mesh renderOrder={-100} material={sky}><sphereGeometry args={[3600, 32, 16]} /></mesh>
    <Water venue={venue} uniforms={uniforms} chartOrigin={chartOrigin} />
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.6, 0]}>
      <planeGeometry args={[9000, 9000]} /><meshBasicMaterial color={PALETTE.deep} />
    </mesh>
    {venue && <Dressing venue={venue} originRef={originRef} chartOrigin={chartOrigin} />}
    <HullMarks readBoats={readBoats ?? singleHull} originRef={originRef} travel={uniforms.travel} />
  </>;
}
