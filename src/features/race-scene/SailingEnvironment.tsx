'use client';

import { memo, useCallback, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { sampleWave } from "@/features/simulator-3d/ocean/waves";
import { METRES_PER_UNIT } from "@/features/race-3d/pose";
import { landPolygon, raceTerrain, noise1, RACE_AREA } from "@/data/venues/geometry";
import type { Venue } from "@/data/venues/venues";
import { raceLight, sceneColors, sunDirection, type SceneColors, type VenueLook } from "@/data/venues/look";
import { shoreField } from "./shore";
import { TRAIL_POINTS, buildRibbon, pushTrail, ribbonIndices, type TrailPoint } from "./trail";
import { BEACH_ROWS, landGeometry } from "./land";
import { TRAINER_COLORS, calmFactor, shadowMaterial, shoreTexture, skyMaterial, wakeMaterial, waterMaterial, waterUniforms, type WaterLook, type WaterUniforms } from "./materials";
import { SAILING_SUN, sailingEnvironmentFrame, sailingHull, type SailingHull, type SailingState, type WorldPoint } from "./environment-state";
import { QUALITY_PROFILES, type SceneQuality } from "./quality";

/** The parts of a quality profile (quality.ts, M2-5) the environment draws. */
export type EnvironmentQuality = Pick<SceneQuality, "waterSegments" | "waterDetail" | "clouds" | "treeShare" | "glow">;

/** The trainers keep the full picture of the race before M3-6: no glow. */
const TRAINER_QUALITY: EnvironmentQuality = { ...QUALITY_PROFILES.high, glow: 0 };

type OriginRef = MutableRefObject<WorldPoint>;
const DEG = Math.PI / 180;
const STERN = 6.3;
const LAND_HEIGHT = 1.8;
const TRAINER_SUN = new THREE.Vector3(...SAILING_SUN).normalize();
const CHART_ORIGIN: WorldPoint = { x: 0, z: 0 };

/** One world-space wake and soft hull shadow per sailing boat. A new wake
 * material (another venue look, glow switched on or off) is swapped onto the
 * wakes already on the water: the meshes and their trails stay. */
export function HullMarks({ readBoats, originRef, travel, colors, glow, sunDir }: {
  readBoats: () => readonly SailingHull[];
  originRef: OriginRef;
  travel: { value: THREE.Vector2 };
  colors: SceneColors;
  /** The shared glow uniform when the profile glows, none on "low" and in the trainers. */
  glow?: { value: number };
  sunDir: THREE.Vector3;
}) {
  const wake = useMemo(() => wakeMaterial(travel, colors, glow), [travel, colors, glow]);
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
    ribbons.current.forEach((r) => { r.mesh.material = wake; });
    return () => wake.dispose();
  }, [wake]);
  useEffect(() => {
    const live = ribbons.current;
    const shades = shadows.current;
    const root = group.current;
    return () => {
      live.forEach((r) => { root?.remove(r.mesh); r.geometry.dispose(); });
      shades.forEach((s) => root?.remove(s));
      live.clear();
      shades.clear();
      shadow.dispose();
      plane.dispose();
    };
  }, [shadow, plane]);

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
      const x = c.x - origin.x - sunDir.x * 2.5;
      const z = c.z - origin.z - sunDir.z * 2.5;
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
function Water({ venue, uniforms, chartOrigin, segments, detail, look }: { venue?: Venue; uniforms: WaterUniforms; chartOrigin: WorldPoint; segments: number; detail: boolean; look: WaterLook }) {
  const geometry = useMemo(() => {
    const size = 2800;
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    const pos = g.attributes.position;
    // Dense round the boat (about 0.8 m), sparse towards the fog.
    const spread = (v: number) => (size / 2) * Math.sinh((4 * v) / (size / 2)) / Math.sinh(4);
    for (let i = 0; i < pos.count; i++) pos.setXY(i, spread(pos.getX(i)), spread(pos.getY(i)));
    g.rotateX(-Math.PI / 2);
    return g;
  }, [segments]);
  const shore = useMemo(() => {
    const m = METRES_PER_UNIT;
    const polys = (venue?.lands ?? []).map((l) => landPolygon(l, RACE_AREA).map((p) => ({ x: p.x * m - chartOrigin.x, z: p.y * m - chartOrigin.z })));
    const margin = 520;
    const bounds = { min: { x: -margin - chartOrigin.x, z: -margin - chartOrigin.z }, max: { x: RACE_AREA.width * m + margin - chartOrigin.x, z: RACE_AREA.height * m + margin - chartOrigin.z } };
    const field = shoreField(polys, bounds, { cols: 224, rows: 256, maxDist: 70 });
    return { texture: shoreTexture(field), min: field.min, size: field.size };
  }, [venue, chartOrigin.x, chartOrigin.z]);
  const material = useMemo(() => waterMaterial(uniforms, shore, detail, look), [uniforms, shore, detail, look]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  // The material may be rebuilt (detail on a profile step) over the same shore texture.
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => shore.texture.dispose(), [shore]);
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
const Trees = memo(function Trees({ venue, share = 1 }: { venue: Venue; share?: number }) {
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
    // A cheaper profile keeps an even subset (golden-ratio spacing): fewer trees, the same coast.
    const kept = matrices.map((_, i) => i).filter((i) => share >= 1 || (i * 0.6180339887) % 1 < share);
    const count = Math.min(2400, kept.length);
    const geometry = new THREE.ConeGeometry(1, 1, 6);
    geometry.translate(0, 0.5, 0);
    const material = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.95, metalness: 0 });
    const m = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
    m.count = count;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, count) * 3), 3);
    for (let i = 0; i < count; i++) { m.setMatrixAt(i, matrices[kept[i]]); m.setColorAt(i, colors[kept[i]]); }
    m.frustumCulled = false;
    return m;
  }, [venue, share]);
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose(); }, [mesh]);
  return <primitive object={mesh} />;
});

/** The land and its trees, shifted with the world (the player stays at the origin). */
function Dressing({ venue, originRef, chartOrigin, treeShare }: { venue: Venue; originRef: OriginRef; chartOrigin: WorldPoint; treeShare: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => { group.current?.position.set(-originRef.current.x - chartOrigin.x, 0, -originRef.current.z - chartOrigin.z); });
  return <group ref={group}><Land venue={venue} /><Trees venue={venue} share={treeShare} /></group>;
}

/** A small local reflection map for gelcoat, stainless and sail cloth.
 * WebGPURenderer prefilters it once; there is no HDR download or extra
 * per-frame cube render. The same sky colours light both products. */
function Reflections({ colors, sunDir }: { colors: SceneColors; sunDir: THREE.Vector3 }) {
  const environment = useMemo(() => {
    const width = 128, height = 64;
    const data = new Uint8Array(width * height * 4);
    const horizon = new THREE.Color(colors.horizon);
    const zenith = new THREE.Color(colors.zenith);
    const ground = new THREE.Color(colors.deep).multiplyScalar(0.45);
    const warm = new THREE.Color(colors.sun);
    const color = new THREE.Color();
    const direction = new THREE.Vector3();
    for (let row = 0; row < height; row++) {
      const latitude = Math.PI * (row / (height - 1) - 0.5);
      const y = Math.sin(latitude);
      for (let col = 0; col < width; col++) {
        const longitude = col / width * Math.PI * 2;
        direction.set(Math.cos(latitude) * Math.cos(longitude), y, Math.cos(latitude) * Math.sin(longitude));
        color.copy(horizon).lerp(y >= 0 ? zenith : ground, Math.pow(Math.abs(y), 0.45));
        color.lerp(warm, Math.pow(Math.max(0, direction.dot(sunDir)), 180) * 0.9);
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
  }, [colors, sunDir]);
  useEffect(() => () => environment.dispose(), [environment]);
  return <primitive object={environment} attach="environment" />;
}

/** Sets the venue look's tone mapping exposure on the renderer; returns what gives the previous one back. No value leaves it alone. */
export function applyExposure(gl: { toneMappingExposure: number }, value: number | undefined): (() => void) | undefined {
  if (value === undefined) return undefined;
  const before = gl.toneMappingExposure;
  gl.toneMappingExposure = value;
  return () => { gl.toneMappingExposure = before; };
}

/** The venue look's tone mapping exposure on the shared renderer, given back on unmount. */
function Exposure({ value }: { value?: number }) {
  const gl = useThree((state) => state.gl) as unknown as { toneMappingExposure: number };
  useEffect(() => applyExposure(gl, value), [gl, value]);
  return null;
}

/** What the environment draws from a venue look (M3-6), or the trainers' light without one.
 * `soft` (F4, the race's "Softer light" setting) lowers exposure, sun, glints and glow (look.ts raceLight). */
export function environmentLight(look?: VenueLook, soft = false) {
  if (!look) return { colors: TRAINER_COLORS, sun: SAILING_SUN, intensity: 2.4, exposure: undefined, nearCalm: false, glint: 1, glow: 1 };
  const [x, y, z] = sunDirection(look);
  const light = raceLight(look, soft);
  return { colors: sceneColors(look), sun: [x * 80, y * 80, z * 80] as [number, number, number], intensity: light.sunIntensity, exposure: light.exposure, nearCalm: true,
    glint: light.glint, glow: light.glow };
}

/** One environment for the solo race, replay and trainers. Call inside the
 * shared renderer's Canvas. Cameras, rig state and lesson UI stay with the
 * consumer; only the sea, scenery, light and world-space wakes live here. */
export function SailingEnvironment({ venue, look, soft = false, readState, readBoats, originRef, chartOrigin = CHART_ORIGIN, quality = TRAINER_QUALITY }: {
  venue?: Venue;
  /** The venue's light and colour (M3-6, src/data/venues/look.ts); trainers pass none and keep their light. */
  look?: VenueLook;
  /** F4: the race's softer light (less glare, a slightly darker picture); gains on uniforms, no new shader. */
  soft?: boolean;
  /** The race scene's quality profile (M2-5); trainers keep the full picture. */
  quality?: EnvironmentQuality;
  readState: () => SailingState | null;
  readBoats?: () => readonly SailingHull[];
  originRef: OriginRef;
  chartOrigin?: WorldPoint;
}) {
  const uniforms = useMemo(() => waterUniforms(), []);
  const uniformsRef = useRef(uniforms);
  const light = useMemo(() => environmentLight(look), [look]);
  // F4: the softer light changes gains only (uniforms, exposure, sun), never the colours, so switching it builds no shader.
  const gains = useMemo(() => environmentLight(look, soft), [look, soft]);
  const sunDir = useMemo(() => look ? new THREE.Vector3(...light.sun).normalize() : TRAINER_SUN, [look, light]);
  // The glints follow the sun of the look (the trainers keep the water's own default).
  useEffect(() => { if (look) uniforms.sunDir.value.copy(sunDir); }, [look, sunDir, uniforms]);
  // The glow's strength is a uniform: "high" to "medium" changes a value, only glow on or off builds new materials.
  const glowing = quality.glow > 0;
  useEffect(() => { uniformsRef.current.glow.value = quality.glow * gains.glow; }, [quality.glow, gains.glow]);
  useEffect(() => { uniformsRef.current.glint.value = gains.glint; }, [gains.glint]);
  const waterLook = useMemo<WaterLook>(() => ({ colors: light.colors, glow: glowing, nearCalm: light.nearCalm }), [light, glowing]);
  const sky = useMemo(() => skyMaterial(sunDir, uniforms.time, quality.clouds, light.colors), [sunDir, uniforms, quality.clouds, light]);
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
    <color attach="background" args={[light.colors.horizon]} />
    <fog attach="fog" args={[light.colors.fog, 420, 1900]} />
    <hemisphereLight args={[light.colors.hemiSky, light.colors.hemiGround, 0.9]} />
    <directionalLight position={light.sun} intensity={gains.intensity} color={look ? light.colors.sun : "#fff0d8"} />
    <Exposure value={gains.exposure} />
    <Reflections colors={light.colors} sunDir={sunDir} />
    <mesh renderOrder={-100} material={sky}><sphereGeometry args={[3600, 32, 16]} /></mesh>
    <Water venue={venue} uniforms={uniforms} chartOrigin={chartOrigin} segments={quality.waterSegments} detail={quality.waterDetail} look={waterLook} />
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.6, 0]}>
      <planeGeometry args={[9000, 9000]} /><meshBasicMaterial color={light.colors.deep} />
    </mesh>
    {venue && <Dressing venue={venue} originRef={originRef} chartOrigin={chartOrigin} treeShare={quality.treeShare} />}
    <HullMarks readBoats={readBoats ?? singleHull} originRef={originRef} travel={uniforms.travel} colors={light.colors} glow={glowing ? uniforms.glow : undefined} sunDir={sunDir} />
  </>;
}
