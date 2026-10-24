'use client';

import { Suspense, memo, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type GLProps } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Yacht } from "@/features/simulator-3d/Yacht";
import { sampleWave } from "@/features/simulator-3d/ocean/waves";
import { SceneBoundary } from "@/features/simulator-3d/SceneBoundary";
import { YACHT_MODEL_URL } from "@/features/simulator-3d/config";
import type { YachtState } from "@/features/simulator-3d/types";
import { landPolygon, raceTerrain, noise1, RACE_AREA } from "@/data/venues/geometry";
import type { Venue } from "@/data/venues/venues";
import {
  ChaseCamera, Loading, Ready, Rival, SUN, World,
  playerOf, useBoatPose, type OriginRef, type Race3DLabels,
} from "@/features/race-3d/Race3DView";
import { METRES_PER_UNIT, nextTarget, raceRanks, toWorld, type Race3DBoat, type Race3DCourse, type RaceCamera } from "@/features/race-3d/pose";
import { distance } from "@/lib/race-physics";
import type { RaceGuidance } from "@/lib/race-guidance";
import { follow, tacticalPose } from "./camera";
import { shoreField } from "./shore";
import { TRAIL_POINTS, buildRibbon, pushTrail, ribbonIndices, type TrailPoint } from "./trail";
import { initialDpr, nextDpr } from "./quality";
import { BEACH_ROWS, landGeometry } from "./land";
import { guidancePath } from "./guidance";
import { PALETTE, calmFactor, shadowMaterial, shoreTexture, skyMaterial, wakeMaterial, waterMaterial, waterUniforms, type WaterUniforms } from "./materials";

// ============================================================================
// RaceScene - the next race renderer (ADR-0008, vertical slice).
//
// The same race as Race3DView (it reads the refs GameClient steps and reuses
// its marks, rivals and arrows), drawn by WebGPURenderer with TSL materials:
// WebGPU where the browser has it, WebGL2 otherwise. Stylized: water that
// shows the wind and the shallows, white wakes that keep every tack, soft
// shadows under the hulls, trees on the shore. The tactical camera (the
// default) keeps upwind at the top like the race map; "stern" is the chase
// view. Switched on by ?scene=next on /game until it replaces Race3DView.
// ============================================================================

const DEG = Math.PI / 180;
const SUN_DIR = new THREE.Vector3(...SUN).normalize();
/** Hull half-length to the stern from the boat's centre (m). */
const STERN = 6.3;
/** The race shore stands taller than the horizon one (as in Race3DView). */
const LAND_HEIGHT = 1.8;
const GUIDANCE_POINTS = 80;
const GUIDANCE_MARKERS = 14;

export interface RaceSceneStats { backend: string; fps: number; dpr: number }

/** Optional teaching route, painted on the water rather than over the yacht.
 * Blue is a sailing leg; the rounded yellow part is the next change of course. */
function WaterGuidance({ boatsRef, windDirRef, originRef, guidance }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  windDirRef: MutableRefObject<number>;
  originRef: OriginRef;
  guidance?: RaceGuidance | null;
}) {
  const resources = useMemo(() => {
    const positions = new Float32Array(GUIDANCE_POINTS * 6);
    const colors = new Float32Array(GUIDANCE_POINTS * 6);
    const indices: number[] = [];
    for (let i = 0; i < GUIDANCE_POINTS - 1; i++) {
      const v = i * 2;
      indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(indices);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const ribbon = new THREE.Mesh(geometry, material);
    ribbon.frustumCulled = false;
    ribbon.renderOrder = 2;
    const chevron = new THREE.BufferGeometry();
    chevron.setAttribute("position", new THREE.Float32BufferAttribute([
      -1.8, 0, 1.4, 0, 0, -1.4, -0.85, 0, 1.4,
      0, 0, -1.4, 1.8, 0, 1.4, 0.85, 0, 1.4,
    ], 3));
    const markerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.68, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const markers = new THREE.InstancedMesh(chevron, markerMaterial, GUIDANCE_MARKERS);
    markers.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(GUIDANCE_MARKERS * 3), 3);
    markers.frustumCulled = false;
    markers.renderOrder = 3;
    const targetGeometry = new THREE.RingGeometry(3.4, 3.9, 32);
    targetGeometry.rotateX(-Math.PI / 2);
    const targetMaterial = new THREE.MeshBasicMaterial({ color: "#76c9e9", transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const target = new THREE.Mesh(targetGeometry, targetMaterial);
    target.frustumCulled = false;
    return { geometry, material, ribbon, positions, colors, chevron, markerMaterial, markers, targetGeometry, targetMaterial, target,
      dummy: new THREE.Object3D(), blue: new THREE.Color("#76c9e9"), yellow: new THREE.Color("#ecd47b") };
  }, []);
  const resourceRef = useRef(resources);
  useEffect(() => () => {
    resources.geometry.dispose(); resources.material.dispose();
    resources.chevron.dispose(); resources.markerMaterial.dispose(); resources.markers.dispose();
    resources.targetGeometry.dispose(); resources.targetMaterial.dispose();
  }, [resources]);
  useFrame(({ clock }) => {
    const r = resourceRef.current;
    const player = playerOf(boatsRef.current);
    const points = player && guidance ? guidancePath(player.pos, player.heading, windDirRef.current, guidance) : [];
    const count = Math.min(GUIDANCE_POINTS, points.length);
    r.ribbon.visible = r.markers.visible = r.target.visible = count >= 2;
    if (count < 2) return;
    const origin = originRef.current;
    const now = clock.elapsedTime;
    const height = (x: number, z: number) => sampleWave(x, z, now).y * calmFactor(Math.hypot(x - origin.x, z - origin.z)) + 0.2;
    let travelled = 0;
    let nextMarker = 16;
    let markerCount = 0;
    for (let i = 0; i < count; i++) {
      const point = points[i];
      const before = points[Math.max(0, i - 1)];
      const after = points[Math.min(count - 1, i + 1)];
      const dx = after.x - before.x;
      const dz = after.y - before.y;
      const norm = Math.hypot(dx, dz) || 1;
      const sideX = -dz / norm * 0.9;
      const sideZ = dx / norm * 0.9;
      const x = point.x * METRES_PER_UNIT;
      const z = point.y * METRES_PER_UNIT;
      const y = height(x, z);
      const color = point.turning ? r.yellow : r.blue;
      for (let edge = 0; edge < 2; edge++) {
        const offset = i * 6 + edge * 3;
        const sign = edge === 0 ? -1 : 1;
        r.positions[offset] = x - origin.x + sideX * sign;
        r.positions[offset + 1] = y;
        r.positions[offset + 2] = z - origin.z + sideZ * sign;
        r.colors[offset] = color.r; r.colors[offset + 1] = color.g; r.colors[offset + 2] = color.b;
      }
      travelled += Math.hypot(point.x - before.x, point.y - before.y) * METRES_PER_UNIT;
      if (travelled >= nextMarker && markerCount < GUIDANCE_MARKERS) {
        r.dummy.position.set(x - origin.x, y + 0.04, z - origin.z);
        r.dummy.rotation.y = Math.atan2(-dx, -dz);
        r.dummy.updateMatrix();
        r.markers.setMatrixAt(markerCount, r.dummy.matrix);
        r.markers.setColorAt(markerCount, color);
        markerCount++;
        nextMarker = travelled + 28;
      }
    }
    r.geometry.setDrawRange(0, (count - 1) * 6);
    r.geometry.getAttribute("position").needsUpdate = true;
    r.geometry.getAttribute("color").needsUpdate = true;
    r.markers.count = markerCount;
    r.markers.instanceMatrix.needsUpdate = true;
    if (r.markers.instanceColor) r.markers.instanceColor.needsUpdate = true;
    const end = points[count - 1];
    const endX = end.x * METRES_PER_UNIT;
    const endZ = end.y * METRES_PER_UNIT;
    r.target.position.set(endX - origin.x, height(endX, endZ), endZ - origin.z);
  });
  return <group><primitive object={resources.ribbon} /><primitive object={resources.markers} /><primitive object={resources.target} /></group>;
}

/** Each boat's wake and shadow, read straight from the race (not from the 3D pose). */
function BoatMarks({ boatsRef, originRef, travel }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
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
    for (const boat of boatsRef.current) {
      seen.add(boat.id);
      const c = toWorld(boat.pos);
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
      if (boat.speed > 0.05) pushTrail(r.points, stern);
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

/** The player's yacht, its pose shared with the camera and the water. */
function Player({ boatsRef, windDirRef, originRef, playerStateRef }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  windDirRef: MutableRefObject<number>;
  originRef: OriginRef;
  playerStateRef: MutableRefObject<MutableRefObject<YachtState> | null>;
}) {
  const state = useBoatPose(boatsRef, windDirRef, null);
  useEffect(() => {
    playerStateRef.current = state;
    return () => { playerStateRef.current = null; };
  }, [state, playerStateRef]);
  useFrame(() => {
    const travel = state.current.travel;
    if (travel) originRef.current = travel;
  });
  return <Yacht stateRef={state} />;
}

/** The race water: a dense plane round the boat, waves and colour in TSL. */
function Water({ venue, uniforms }: { venue: Venue; uniforms: WaterUniforms }) {
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
    const polys = venue.lands.map((l) => landPolygon(l, RACE_AREA).map((p) => ({ x: p.x * m, z: p.y * m })));
    const margin = 520;
    const bounds = { min: { x: -margin, z: -margin }, max: { x: RACE_AREA.width * m + margin, z: RACE_AREA.height * m + margin } };
    const field = shoreField(polys, bounds, { cols: 224, rows: 256, maxDist: 70 });
    return { texture: shoreTexture(field), min: field.min, size: field.size };
  }, [venue]);
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
function Dressing({ venue, originRef }: { venue: Venue; originRef: OriginRef }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => { group.current?.position.set(-originRef.current.x, 0, -originRef.current.z); });
  return <group ref={group}><Land venue={venue} /><Trees venue={venue} /></group>;
}

/** High above and downwind, upwind at the top of the screen; eases after the boat and the wind. */
function TacticalCamera({ boatsRef, courseRef, windDirRef }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  courseRef: MutableRefObject<Race3DCourse>;
  windDirRef: MutableRefObject<number>;
}) {
  const wind = useRef<number | null>(null);
  const look = useRef<THREE.Vector3 | null>(null);
  const pos = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }, dt) => {
    const player = playerOf(boatsRef.current);
    if (!player) return;
    // The view turns slowly with a wind shift, so a shift reads on the water, not as a spinning camera.
    const w = windDirRef.current;
    if (wind.current === null) wind.current = w;
    const dw = ((w - wind.current + 540) % 360) - 180;
    wind.current += dw * follow(dt, 3);
    const target = nextTarget(player, courseRef.current);
    const pose = tacticalPose({
      player: toWorld(player.pos),
      target: target ? toWorld(target) : null,
      windFrom: wind.current,
      portrait: size.width < size.height,
    });
    const k = follow(dt, 0.6);
    if (!look.current) look.current = new THREE.Vector3(...pose.look);
    else look.current.lerp(new THREE.Vector3(...pose.look), k);
    pos.set(pose.position[0] - pose.look[0] + look.current.x, pose.position[1], pose.position[2] - pose.look[2] + look.current.z);
    camera.position.copy(pos);
    camera.lookAt(look.current);
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== pose.fov) { cam.fov = pose.fov; cam.updateProjectionMatrix(); }
  });
  return null;
}

/** Drives the water's clock, the player's travel and the wind into the shaders. */
function WaterDriver({ uniformsRef, playerStateRef, windDirRef, boatsRef }: {
  /** The water's shader uniforms, written every frame. */
  uniformsRef: MutableRefObject<WaterUniforms>;
  playerStateRef: MutableRefObject<MutableRefObject<YachtState> | null>;
  windDirRef: MutableRefObject<number>;
  boatsRef: MutableRefObject<Race3DBoat[]>;
}) {
  useFrame(({ clock }) => {
    const u = uniformsRef.current;
    u.time.value = clock.elapsedTime;
    const travel = playerStateRef.current?.current.travel;
    if (travel) u.travel.value.set(travel.x, travel.z);
    const from = windDirRef.current * DEG;
    u.flow.value.set(-Math.sin(from), Math.cos(from));
    const player = playerOf(boatsRef.current);
    // Busier streaks in a breeze: the true wind the player's boat feels.
    const tws = player?.physics?.trueWindSpeed;
    u.windiness.value = tws ? Math.min(1, Math.max(0.35, tws / 18)) : 0.6;
  });
  return null;
}

/** Frame rate and backend, measured over 2 s windows; steps the pixel ratio down while slow. */
function Quality({ onStats, maxDpr }: { onStats?: (s: RaceSceneStats) => void; maxDpr: number }) {
  const { gl, setDpr } = useThree();
  const window_ = useRef({ frames: 0, start: -1, warm: 0 });
  const dpr = useRef(initialDpr(typeof window === "undefined" ? 1 : window.devicePixelRatio));
  const backend = (gl as unknown as { backend?: { isWebGPUBackend?: boolean } }).backend?.isWebGPUBackend ? "WebGPU" : "WebGL2";
  useEffect(() => { setDpr(Math.min(dpr.current, maxDpr)); }, [setDpr, maxDpr]);
  useFrame(({ clock }) => {
    const w = window_.current;
    const t = clock.elapsedTime;
    if (w.start < 0) { w.start = t; w.frames = 0; return; }
    w.frames++;
    if (t - w.start < 2) return;
    const fps = w.frames / (t - w.start);
    w.start = t;
    w.frames = 0;
    w.warm++;
    // The first window includes shader compiles: report it, act from the second.
    if (w.warm > 1) {
      const next = nextDpr(dpr.current, fps, { min: 1, max: maxDpr });
      if (next !== dpr.current) { dpr.current = next; setDpr(next); }
    }
    onStats?.({ backend, fps: Math.round(fps), dpr: dpr.current });
  });
  return null;
}

async function createRenderer(props: { canvas: HTMLCanvasElement | OffscreenCanvas } & Record<string, unknown>) {
  const forceWebGL = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("gl") === "webgl2";
  const renderer = new THREE.WebGPURenderer({ canvas: props.canvas as HTMLCanvasElement, antialias: true, powerPreference: "high-performance", forceWebGL });
  await renderer.init();
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

export const RaceScene = memo(function RaceScene({ boatsRef, courseRef, windDirRef, venue, camera = "high", maxDpr = 2, labels, onStats, guidance }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  courseRef: MutableRefObject<Race3DCourse>;
  windDirRef: MutableRefObject<number>;
  venue: Venue;
  /** "high" is the tactical camera (the default here), "stern" the chase view. */
  camera?: RaceCamera;
  maxDpr?: number;
  labels: Race3DLabels;
  onStats?: (s: RaceSceneStats) => void;
  /** Optional educational aid. Coordinates use race units, converted here to metres. */
  guidance?: RaceGuidance | null;
}) {
  const originRef = useRef({ x: 0, z: 0 });
  const playerStateRef = useRef<MutableRefObject<YachtState> | null>(null);
  const uniforms = useMemo(() => waterUniforms(), []);
  const uniformsRef = useRef(uniforms);
  const sky = useMemo(() => skyMaterial(SUN_DIR, uniforms.time), [uniforms]);
  useEffect(() => () => sky.dispose(), [sky]);
  const [rivals, setRivals] = useState<{ id: string; color: string; label: string }[]>([]);
  const [targetLabel, setTargetLabel] = useState("");
  const metresUnit = labels.metres;
  useEffect(() => {
    const read = () => {
      const course = courseRef.current;
      const ranks = raceRanks(boatsRef.current, course);
      const next = boatsRef.current.filter((b) => !b.isPlayer)
        .map((b) => ({ id: b.id, color: b.color, label: `${ranks.get(b.id) ?? ""}  ${b.name ?? ""}`.trim() }));
      const key = (list: { id: string; label: string }[]) => list.map((r) => `${r.id}:${r.label}`).join();
      setRivals((prev) => (key(prev) === key(next) ? prev : next));
      const player = playerOf(boatsRef.current);
      const target = player ? nextTarget(player, course) : null;
      const metres = player && target ? Math.round((distance(player.pos, target) * METRES_PER_UNIT) / 10) * 10 : null;
      setTargetLabel(metres === null ? "" : `${metres} ${metresUnit}`);
    };
    read();
    const id = window.setInterval(read, 500);
    return () => window.clearInterval(id);
  }, [boatsRef, courseRef, metresUnit]);

  return (
    <SceneBoundary modelUrl={YACHT_MODEL_URL} errorLabel={labels.error} retryLabel={labels.retry}>
      <div className="relative h-full w-full" data-scene="next">
        <Canvas
          fallback={<span>{labels.scene}</span>}
          gl={createRenderer as unknown as GLProps}
          dpr={[1, maxDpr]}
          camera={{ position: [0, 140, 110], fov: 60, near: 1, far: 4200 }}
        >
          <color attach="background" args={[PALETTE.horizon]} />
          <fog attach="fog" args={[PALETTE.horizon, 420, 1900]} />
          <hemisphereLight args={["#d6ecff", "#3a5560", 0.9]} />
          <directionalLight position={SUN} intensity={2.4} color="#fff0d8" />
          <mesh renderOrder={-100} material={sky}>
            <sphereGeometry args={[3600, 32, 16]} />
          </mesh>
          <WaterDriver uniformsRef={uniformsRef} playerStateRef={playerStateRef} windDirRef={windDirRef} boatsRef={boatsRef} />
          <Water venue={venue} uniforms={uniforms} />
          {/* Flat sea beyond the waves, under them, out to the fog. */}
          <mesh rotation-x={-Math.PI / 2} position={[0, -1.6, 0]}>
            <planeGeometry args={[9000, 9000]} />
            <meshBasicMaterial color={PALETTE.deep} />
          </mesh>
          <World venue={venue} courseRef={courseRef} boatsRef={boatsRef} originRef={originRef} targetLabel={targetLabel} land={false} />
          <Dressing venue={venue} originRef={originRef} />
          <BoatMarks boatsRef={boatsRef} originRef={originRef} travel={uniforms.travel} />
          {guidance && <WaterGuidance boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} guidance={guidance} />}
          <Suspense fallback={<Loading label={labels.loading} />}>
            <Player boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} playerStateRef={playerStateRef} />
            {rivals.map((r) => <Rival key={r.id} id={r.id} color={r.color} label={r.label} boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} />)}
            <Ready />
          </Suspense>
          {camera === "stern"
            ? <ChaseCamera stateRef={playerStateRef} mode="stern" />
            : <TacticalCamera boatsRef={boatsRef} courseRef={courseRef} windDirRef={windDirRef} />}
          <Quality onStats={onStats} maxDpr={maxDpr} />
        </Canvas>
      </div>
    </SceneBoundary>
  );
});
