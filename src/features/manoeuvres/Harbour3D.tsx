'use client';

import { Suspense, memo, useEffect, useMemo, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Yacht } from "@/features/simulator-3d/Yacht";
import { Ocean } from "@/features/simulator-3d/ocean/Ocean";
import { Wake } from "@/features/simulator-3d/ocean/Wake";
import { Backdrop } from "@/features/simulator-3d/ocean/Backdrop";
import { sampleWave } from "@/features/simulator-3d/ocean/waves";
import { SceneBoundary, reportScene } from "@/features/simulator-3d/SceneBoundary";
import { YACHT_MODEL_URL } from "@/features/simulator-3d/config";
import { geometryLayout, mergeStaticGeometries } from "@/features/race-3d/rival-lod";
import { Buoy, GUIDANCE_COLOR, Loading, MARK_COLOR, NameTag, SKY, SUN, SkyDome } from "@/features/race-3d/Race3DView";
import { NEUTRAL_YACHT, type YachtState } from "@/features/simulator-3d/types";
import { VENUES } from "@/data/venues/venues";
import { toWorld, type Vec2 } from "@/lib/harbour-physics";
import type { ManoeuvreExercise, SceneObstacle } from "@/data/manoeuvres";
import type { RunInput, RunState } from "./runner";
import { windAt } from "./runner";
import {
  HEIGHTS, MODEL_LOA, beaconPoint, berthOutline, blocksView, bollards, circlePoints, dashesAlong, easeAngle, harbourCamera, harbourCentre,
  sternCamera, swellOf, toScene, yachtFromRun, type HarbourCameraMode,
} from "./scene3d";

// ============================================================================
// Harbour3D - the Manoeuvres harbour seen in 3D (owner request 2026-11-27:
// "the manoeuvres are schematic, they need real 3D").
//
// A view, not a second simulation: it reads the refs the Play loop steps
// (ManoeuvresApp.tsx), so the hull, the contacts, the score and the plan are
// the same as before. The same stack as the 3D race and trainer: our GLB
// yacht with its real rudder, the shared ocean (nearly flat inside the
// marina), the venue shore on the horizon, local image light only (the CSP
// blocks external HDR). Moored yachts are the same GLB, merged once and
// drawn instanced, so a full fairway costs a dozen draw calls.
// ============================================================================

export interface Harbour3DLabels { loading: string; scene: string; error: string; retry: string; wind: string }

const TARGET_COLOR = "#44ff88";
const PLAN_COLOR = "#dfe8ee";
const LINE_COLOR = "#ffce4d";
const DEG = Math.PI / 180;

/** Our yacht: the harbour pose of the run every frame, the rudder, the stowed or set sails, fenders out under engine. */
function OurYacht({ exercise, runRef, inputRef, stateRef, swell, wake }: {
  exercise: ManoeuvreExercise; runRef: MutableRefObject<RunState>; inputRef: MutableRefObject<RunInput>;
  stateRef: MutableRefObject<YachtState>; swell: number; wake: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const s = yachtFromRun(exercise, runRef.current, inputRef.current);
    stateRef.current = s;
    if (group.current && s.travel) group.current.position.set(s.travel.x, 0, s.travel.z);
  });
  return (
    <group ref={group}>
      <Yacht stateRef={stateRef} swell={swell} fenders={exercise.track === "engine"} />
      {wake && <Wake stateRef={stateRef} swell={swell} />}
    </group>
  );
}

/** Parts of the GLB a moored, unmanned yacht does not show: sails, crew, sheets. */
const MOORED_HIDDEN = new Set(["MainSail", "Jib", "Helmsman", "Crew_Starboard", "Crew_Port", "Anatomy_Sheets", "Battens", "SailNumber",
  "Main_Telltales", "Jib_Telltales", "Running_Rigging", "Teaching_MainTackle", "Sprayhood"]);
/** Topside colours of the moored fleet: mostly white, as in any marina. */
const MOORED_PAINT = ["#ffffff", "#f3f1ea", "#1f3550", "#ffffff", "#e9eef2", "#8c2f2f", "#ffffff"];

interface MooredPart { geometry: THREE.BufferGeometry; material: THREE.Material; gelcoat: boolean }

/** The GLB's static parts merged once per material, in the model frame. */
function mooredParts(scene: THREE.Object3D): MooredPart[] {
  scene.updateMatrixWorld(true);
  const toModel = scene.matrixWorld.clone().invert();
  const groups = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
  const relative = new THREE.Matrix4();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material) || mesh.morphTargetInfluences?.length) return;
    for (let p: THREE.Object3D | null = mesh; p && p !== scene; p = p.parent) if (MOORED_HIDDEN.has(p.name)) return;
    const layout = geometryLayout(mesh.geometry);
    if (!layout) return;
    relative.multiplyMatrices(toModel, mesh.matrixWorld);
    const key = `${mesh.material.name}|${layout}`;
    const group = groups.get(key) ?? { material: mesh.material, geometries: [] };
    group.geometries.push(mesh.geometry.clone().applyMatrix4(relative));
    groups.set(key, group);
  });
  return [...groups.values()].map((g) => {
    const geometry = mergeStaticGeometries(g.geometries);
    g.geometries.forEach((x) => x.dispose());
    return { geometry, material: g.material, gelcoat: g.material.name.startsWith("Gelcoat_White") };
  });
}

/**
 * Every moored yacht of the exercise, instanced: one draw call per material
 * for the whole fleet. Like a rival in the race, a moored yacht standing
 * between the camera and our boat steps out of the picture until it is clear
 * (behind the stern its rig would fill the view).
 */
function MooredFleet({ boats, runRef }: { boats: NonNullable<SceneObstacle["boat"]>[]; runRef: MutableRefObject<RunState> }) {
  const { scene } = useGLTF(YACHT_MODEL_URL, false, false);
  const parts = useMemo(() => mooredParts(scene), [scene]);
  useEffect(() => () => parts.forEach((p) => p.geometry.dispose()), [parts]);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const shown = useRef<string>("");
  const work = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), c: new THREE.Color() }), []);
  const place = (visible: boolean[]) => {
    const { m, q, s, p, up, c } = work;
    parts.forEach((part, k) => {
      const mesh = meshes.current[k];
      if (!mesh) return;
      boats.forEach((b, i) => {
        const at = toScene([b.x, b.y]);
        p.set(at.x, 0, at.z);
        q.setFromAxisAngle(up, (90 - b.heading) * DEG);
        s.setScalar(visible[i] ? b.loa / MODEL_LOA : 0);
        mesh.setMatrixAt(i, m.compose(p, q, s));
        if (part.gelcoat) mesh.setColorAt(i, c.set(MOORED_PAINT[i % MOORED_PAINT.length]));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  };
  useEffect(() => { shown.current = ""; }, [parts, boats]);
  useFrame(({ camera }) => {
    const run = runRef.current;
    const ours = toScene([run.pose.x, run.pose.y]);
    const visible = boats.map((b) => !blocksView(camera.position, ours, toScene([b.x, b.y])));
    const key = visible.map((v) => (v ? 1 : 0)).join("");
    if (key === shown.current) return;
    shown.current = key;
    place(visible);
  });
  if (!boats.length) return null;
  return <>{parts.map((part, k) => (
    <instancedMesh key={k} ref={(el) => { meshes.current[k] = el; }} args={[part.geometry, part.material, boats.length]} castShadow receiveShadow frustumCulled={false} />
  ))}</>;
}

/** A small canvas texture: deck planks or weathered concrete, no image file (offline bundle, CSP). */
function surfaceTexture(kind: "planks" | "concrete"): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d");
  if (!g) return null;
  let seed = kind === "planks" ? 7 : 13;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (kind === "planks") {
    for (let i = 0; i < 8; i++) {
      const tone = 112 + Math.round(rand() * 34);
      g.fillStyle = `rgb(${tone + 30}, ${tone}, ${Math.round(tone * 0.72)})`;
      g.fillRect(0, i * 16, 128, 15);
      g.fillStyle = "rgba(40, 28, 18, 0.55)";
      g.fillRect(0, i * 16 + 15, 128, 1);
    }
  } else {
    g.fillStyle = "#b9b5aa";
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      const v = Math.round(150 + rand() * 70);
      g.fillStyle = `rgba(${v}, ${v - 3}, ${v - 10}, 0.35)`;
      g.fillRect(rand() * 128, rand() * 128, 1 + rand() * 2, 1 + rand() * 2);
    }
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  // Extrude caps take world metres as UV: one tile is 2 m of planks or 4 m of concrete.
  t.repeat.setScalar(kind === "planks" ? 0.5 : 0.25);
  t.anisotropy = 4;
  return t;
}

/** A convex polygon of the harbour raised into a slab: its top `top` metres above the water, its foot under it. */
function slabGeometry(points: readonly Vec2[], top: number, foot: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: top - foot, bevelEnabled: false });
  // Shape x / y become X / -Z, the extrusion becomes height.
  g.rotateX(-Math.PI / 2);
  g.translate(0, foot, 0);
  return g;
}

/** Pontoons, quays, piles, buoys and the person in the water. */
const HarbourWorks = memo(function HarbourWorks({ exercise, swell }: { exercise: ManoeuvreExercise; swell: number }) {
  const looks = useMemo(() => {
    const planks = surfaceTexture("planks"), concrete = surfaceTexture("concrete");
    return {
      planks, concrete,
      deck: new THREE.MeshStandardMaterial({ map: planks, color: "#d6c3a4", roughness: 0.85 }),
      float: new THREE.MeshStandardMaterial({ color: "#5b6670", roughness: 0.7 }),
      quayTop: new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.95 }),
      quaySide: new THREE.MeshStandardMaterial({ color: "#8f8b82", roughness: 0.95 }),
      timber: new THREE.MeshStandardMaterial({ color: "#6b4f35", roughness: 0.9 }),
      iron: new THREE.MeshStandardMaterial({ color: "#2b2f33", roughness: 0.5, metalness: 0.4 }),
    };
  }, []);
  useEffect(() => () => {
    looks.planks?.dispose(); looks.concrete?.dispose();
    [looks.deck, looks.float, looks.quayTop, looks.quaySide, looks.timber, looks.iron].forEach((m) => m.dispose());
  }, [looks]);
  const slabs = useMemo(() => exercise.obstacles.flatMap((o) => {
    if (o.shape.type !== "poly" || o.kind === "boat") return [];
    const pontoon = o.kind === "pontoon";
    return [{ id: o.id, geometry: slabGeometry(o.shape.points, pontoon ? HEIGHTS.pontoon : HEIGHTS.quay, pontoon ? -0.4 : -2.5), pontoon }];
  }), [exercise]);
  useEffect(() => () => slabs.forEach((s) => s.geometry.dispose()), [slabs]);
  const posts = useMemo(() => exercise.obstacles.flatMap((o) => bollards(o, [exercise.start.x, exercise.start.y]).map((p) => toScene(p))), [exercise]);
  return (
    <group name="harbour-works">
      {slabs.map((s) => (
        <mesh key={s.id} geometry={s.geometry} material={s.pontoon ? [looks.deck, looks.float] : [looks.quayTop, looks.quaySide]} castShadow receiveShadow />
      ))}
      {posts.map((p, i) => (
        <mesh key={`bollard-${i}`} position={[p.x, HEIGHTS.quay + 0.22, p.z]} material={looks.iron} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.44, 10]} />
        </mesh>
      ))}
      {exercise.obstacles.map((o) => {
        if (o.shape.type !== "circle") return null;
        const at = toScene([o.shape.x, o.shape.y]);
        if (o.kind === "pile") return (
          <mesh key={o.id} position={[at.x, HEIGHTS.pile / 2 - 0.8, at.z]} material={looks.timber} castShadow receiveShadow>
            <cylinderGeometry args={[o.shape.r, o.shape.r * 1.1, HEIGHTS.pile + 1.6, 12]} />
          </mesh>
        );
        if (o.kind === "person") return <Person key={o.id} x={at.x} z={at.z} swell={swell} />;
        if (exercise.track === "sail") return <Buoy key={o.id} x={at.x} z={at.z} color={MARK_COLOR} look={{ scale: 0.55, glow: false, halo: true }} />;
        return <MooringBuoy key={o.id} x={at.x} z={at.z} r={o.shape.r} swell={swell} />;
      })}
    </group>
  );
});

/** A mooring buoy: a float half out of the water with a pick-up ring on top. */
function MooringBuoy({ x, z, r, swell }: { x: number; z: number; r: number; swell: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = sampleWave(x, z, clock.elapsedTime, swell).y; });
  return (
    <group ref={ref} position={[x, 0, z]}>
      <mesh position-y={0.05} castShadow>
        <sphereGeometry args={[r, 20, 14]} />
        <meshStandardMaterial color="#ff7a1a" roughness={0.45} />
      </mesh>
      <mesh position-y={r + 0.18} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.16, 0.035, 8, 20]} />
        <meshStandardMaterial color="#2b2f33" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** The person overboard: head and lifejacket in the water, one arm up. */
function Person({ x, z, swell }: { x: number; z: number; swell: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = sampleWave(x, z, clock.elapsedTime, swell).y; });
  return (
    <group ref={ref} position={[x, 0, z]}>
      <mesh position-y={0.02} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.24, 0.12, 10, 20]} />
        <meshStandardMaterial color="#ff5a1f" roughness={0.6} />
      </mesh>
      <mesh position-y={0.3}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshStandardMaterial color="#d9a888" roughness={0.7} />
      </mesh>
      <mesh position={[0.22, 0.45, 0]} rotation-z={-0.35}>
        <cylinderGeometry args={[0.045, 0.05, 0.6, 8]} />
        <meshStandardMaterial color="#ff5a1f" roughness={0.6} />
      </mesh>
      <NameTag text="MOB" y={2.6} />
    </group>
  );
}

/** Dashes on the water along a path: the berth outline, a zone, the gate line, the plan. */
function DashedPath({ points, closed, color, swell, opacity = 0.95, width = 0.22, dash = 1.2, gap = 0.8 }: {
  points: readonly Vec2[]; closed: boolean; color: string; swell: number; opacity?: number; width?: number; dash?: number; gap?: number;
}) {
  const dashes = useMemo(() => dashesAlong(points, closed, dash, gap), [points, closed, dash, gap]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // A flat harbour places the dashes once; out at sea they ride the swell.
  const still = swell < 0.3;
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m || (still && m.userData.placed)) return;
    const t = clock.elapsedTime;
    dashes.forEach((d, i) => {
      dummy.position.set(d.x, HEIGHTS.overlay + sampleWave(d.x, d.z, t, swell).y, d.z);
      dummy.rotation.set(0, d.yaw, 0);
      dummy.scale.set(1, 1, d.length);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.userData.placed = true;
  });
  if (!dashes.length) return null;
  return (
    <instancedMesh key={dashes.length} ref={mesh} args={[undefined, undefined, dashes.length]} frustumCulled={false} renderOrder={3}>
      <boxGeometry args={[width, 0.05, 1]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

/** The centre of a round mark (a buoy, a pile, the person), or null. */
function markCentre(exercise: ManoeuvreExercise, id: string): Vec2 | null {
  const o = exercise.obstacles.find((x) => x.id === id);
  return o?.shape.type === "circle" ? [o.shape.x, o.shape.y] : null;
}

/** What the exercise asks for, drawn on the water as on the diagram: the berth, the zone, the gates, the circle. */
function GoalMarks({ exercise, runRef, swell }: { exercise: ManoeuvreExercise; runRef: MutableRefObject<RunState>; swell: number }) {
  const goal = exercise.target;
  const find = (id: string) => markCentre(exercise, id);
  const gateRefs = useRef<(THREE.Group | null)[]>([]);
  const arrow = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.Group>(null);
  useFrame(() => {
    const run = runRef.current;
    if (goal.type === "gates") gateRefs.current.forEach((g, i) => { if (g) g.visible = i >= run.progress.gate; });
    if (arrow.current && goal.type === "turn") {
      const p = toScene([run.pose.x, run.pose.y]);
      arrow.current.position.set(p.x, HEIGHTS.overlay, p.z);
    }
    if (beacon.current) {
      const at = beaconPoint(exercise, run);
      beacon.current.visible = Boolean(at) && run.status === "running";
      if (at) { const w = toScene(at); beacon.current.position.set(w.x, 0, w.z); }
    }
  });
  const berth = useMemo(() => goal.type === "berth" ? berthOutline(goal) : null, [goal]);
  const station = useMemo(() => {
    if (goal.type !== "station") return null;
    const c = markCentre(exercise, goal.markId);
    return c ? circlePoints(c[0], c[1], goal.radius) : null;
  }, [exercise, goal]);
  return (
    <group name="goal-marks">
      {berth && <>
        <DashedPath points={berth} closed color={TARGET_COLOR} swell={swell} dash={0.9} gap={0.6} />
        <BerthFill points={berth} />
      </>}
      {(goal.type === "leave" || goal.type === "turn") && <DashedPath points={goal.zone} closed color={TARGET_COLOR} swell={swell} opacity={0.7} />}
      {goal.type === "turn" && <group ref={arrow}><HeadingArrow heading={goal.heading} /></group>}
      {goal.type === "gates" && goal.gates.map((gate, i) => {
        const a = find(gate[0]), b = find(gate[1]);
        return a && b ? <group key={i} ref={(el) => { gateRefs.current[i] = el; }}><DashedPath points={[a, b]} closed={false} color={TARGET_COLOR} swell={swell} width={0.35} dash={2} gap={1.4} /></group> : null;
      })}
      {station && <DashedPath points={station} closed color={TARGET_COLOR} swell={swell} opacity={0.75} width={0.35} dash={2} gap={1.6} />}
      <group ref={beacon} visible={false} name="goal-beacon">
        <mesh position-y={4.5}>
          <cylinderGeometry args={[0.18, 0.18, 9, 8, 1, true]} />
          <meshBasicMaterial color={GUIDANCE_COLOR} transparent opacity={0.4} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation-x={Math.PI} position-y={9.8}>
          <coneGeometry args={[0.7, 1.4, 4]} />
          <meshBasicMaterial color={GUIDANCE_COLOR} />
        </mesh>
      </group>
    </group>
  );
}

/** A faint green floor inside the berth outline, so the target reads at a glance from above. */
function BerthFill({ points }: { points: readonly Vec2[] }) {
  const geometry = useMemo(() => {
    const g = new THREE.ShapeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))));
    g.rotateX(-Math.PI / 2);
    return g;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position-y={HEIGHTS.overlay - 0.02} renderOrder={2}>
      <meshBasicMaterial color={TARGET_COLOR} transparent opacity={0.16} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** The heading to turn to: a flat arrow on the water under the boat. */
function HeadingArrow({ heading }: { heading: number }) {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, -9); s.lineTo(0.5, -9); s.lineTo(0.5, 7); s.lineTo(1.8, 7); s.lineTo(0, 11); s.lineTo(-1.8, 7); s.lineTo(-0.5, 7); s.closePath();
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} rotation-y={-heading * DEG} renderOrder={3}>
      <meshBasicMaterial color={TARGET_COLOR} transparent opacity={0.55} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Our mooring lines while they are fast: a rope from the deck cleat to the pile or the pontoon. */
function MooringLines({ runRef }: { runRef: MutableRefObject<RunState> }) {
  const ropes = useRef<(THREE.Mesh | null)[]>([]);
  const a = useMemo(() => new THREE.Vector3(), []), b = useMemo(() => new THREE.Vector3(), []), mid = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame(() => {
    const run = runRef.current;
    const lines = run.harbour?.lines ?? [];
    ropes.current.forEach((rope, i) => {
      if (!rope) return;
      const line = lines[i];
      rope.visible = Boolean(line);
      if (!line) return;
      const cleat = toScene(toWorld(run.pose, line.cleat)), anchor = toScene(line.anchor);
      a.set(cleat.x, HEIGHTS.cleat, cleat.z);
      b.set(anchor.x, HEIGHTS.pontoon + 0.1, anchor.z);
      mid.addVectors(a, b).multiplyScalar(0.5);
      rope.position.copy(mid);
      const length = a.distanceTo(b);
      rope.scale.set(1, Math.max(0.01, length), 1);
      rope.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
    });
  });
  return <>{[0, 1, 2].map((i) => (
    <mesh key={i} ref={(el) => { ropes.current[i] = el; }} visible={false}>
      <cylinderGeometry args={[0.05, 0.05, 1, 6]} />
      <meshStandardMaterial color={LINE_COLOR} roughness={0.8} />
    </mesh>
  ))}</>;
}

/** The suggested track of the hint, dotted on the water. */
function PlanTrack({ exercise, swell }: { exercise: ManoeuvreExercise; swell: number }) {
  return <DashedPath points={exercise.plan} closed={false} color={PLAN_COLOR} swell={swell} opacity={0.6} width={0.3} dash={0.5} gap={1.6} />;
}

/** The camera: the harbour overview or behind the stern; drag turns the overview, the wheel or pinch zooms. */
function HarbourCameraRig({ exercise, runRef, mode, orbitRef }: {
  exercise: ManoeuvreExercise; runRef: MutableRefObject<RunState>; mode: HarbourCameraMode;
  orbitRef: MutableRefObject<{ azimuth: number; zoom: number }>;
}) {
  const yaw = useRef<number | null>(null);
  const smooth = useRef<{ p: THREE.Vector3; t: THREE.Vector3 } | null>(null);
  const goalP = useMemo(() => new THREE.Vector3(), []), goalT = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }, rawDt) => {
    const dt = Math.min(0.1, rawDt);
    const cam = camera as THREE.PerspectiveCamera;
    const fov = size.width < size.height ? 60 : 45;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const run = runRef.current;
    yaw.current = yaw.current === null ? run.pose.heading : easeAngle(yaw.current, run.pose.heading, 1 - Math.exp(-dt * 2.2));
    const pose = mode === "stern" ? sternCamera(run, yaw.current, orbitRef.current.zoom)
      : harbourCamera(exercise, run, size.width / Math.max(1, size.height), fov, orbitRef.current.azimuth, orbitRef.current.zoom);
    goalP.set(...pose.position);
    goalT.set(...pose.target);
    if (!smooth.current) smooth.current = { p: goalP.clone(), t: goalT.clone() };
    // The view eases towards its framing so it does not jump (as the plan did).
    const k = 1 - Math.exp(-dt * (mode === "stern" ? 6 : 2.5));
    smooth.current.p.lerp(goalP, k);
    smooth.current.t.lerp(goalT, k);
    camera.position.copy(smooth.current.p);
    camera.lookAt(smooth.current.t);
  });
  return null;
}

/** The sun's shadow follows the boat, so a small shadow map stays sharp over a long course. */
function SunShadow({ runRef }: { runRef: MutableRefObject<RunState> }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    scene.add(l.target);
    return () => { scene.remove(l.target); };
  }, [scene]);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const p = toScene([runRef.current.pose.x, runRef.current.pose.y]);
    l.position.set(p.x + SUN[0], SUN[1], p.z + SUN[2]);
    l.target.position.set(p.x, 0, p.z);
  });
  return (
    <directionalLight ref={light} position={SUN} intensity={2.2} color="#fff2dc" castShadow
      shadow-normalBias={0.03} shadow-mapSize={[1024, 1024]} shadow-camera-near={1} shadow-camera-far={220}
      shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} />
  );
}

/** The wind over the water: an arrow turned with the camera, and its speed, in the corner of the view. */
function WindCompass({ exercise, runRef, elRef, format }: {
  exercise: ManoeuvreExercise; runRef: MutableRefObject<RunState>; elRef: MutableRefObject<HTMLDivElement | null>; format: (knots: number) => string;
}) {
  const forward = useMemo(() => new THREE.Vector3(), []);
  const last = useRef("");
  const lastText = useRef("");
  useFrame(({ camera }) => {
    const el = elRef.current;
    if (!el) return;
    camera.getWorldDirection(forward);
    // Camera bearing (compass, 0 = north): world X east, Z south.
    const cameraBearing = Math.atan2(forward.x, -forward.z) / DEG;
    const wind = windAt(exercise, runRef.current.t);
    // The arrow points where the wind blows TO, relative to the screen's up.
    const screen = (wind.direction + 180 - cameraBearing + 720) % 360;
    const glyph = el.firstElementChild as HTMLElement | null;
    const key = `${Math.round(screen)}`;
    if (glyph && key !== last.current) { glyph.style.transform = `rotate(${screen}deg)`; last.current = key; }
    const text = format(wind.speed), words = el.querySelector("[data-wind]");
    if (words && text !== lastText.current) { words.textContent = text; lastText.current = text; }
  });
  return null;
}

function Ready() {
  useEffect(() => { reportScene("scene-ready"); }, []);
  return null;
}

/**
 * The harbour in 3D. `runRef` and `inputRef` are the Play loop's refs; the
 * view only reads them. `plan` shows the hint's suggested track.
 */
export default memo(function Harbour3D({ exercise, runRef, inputRef, plan, mode, labels, windText, onFail, lite = false }: {
  exercise: ManoeuvreExercise;
  /** No GPU (WebGL drawn in software): no shadows, a coarser sea, no wake, one pixel per CSS pixel. */
  lite?: boolean;
  runRef: MutableRefObject<RunState>;
  inputRef: MutableRefObject<RunInput>;
  plan: boolean;
  mode: HarbourCameraMode;
  labels: Harbour3DLabels;
  /** The wind speed in knots as the HUD writes it; the compass rewrites its words only when they change. */
  windText: (knots: number) => string;
  /** The 3D scene failed (no WebGL, model error): the caller falls back to the plan. */
  onFail?: () => void;
}) {
  const swell = swellOf(exercise);
  const stateRef = useRef<YachtState>({ ...NEUTRAL_YACHT });
  const still = useRef<YachtState>({ ...NEUTRAL_YACHT });
  const orbitRef = useRef({ azimuth: 0, zoom: 1 });
  const compassRef = useRef<HTMLDivElement | null>(null);
  const venue = useMemo(() => VENUES.find((v) => v.id === (exercise.track === "sail" ? "split" : "gocek")) ?? VENUES[0], [exercise.track]);
  const centre = toScene(harbourCentre(exercise));
  const boats = useMemo(() => exercise.obstacles.flatMap((o) => o.boat ? [o.boat] : []), [exercise]);
  useEffect(() => { orbitRef.current = { azimuth: 0, zoom: 1 }; }, [mode, exercise]);

  // Drag turns the overview round its framed point; the wheel and a pinch zoom (both modes).
  const drag = useRef<{ x: number; pointers: Map<number, { x: number; y: number }>; pinch: number | null }>({ x: 0, pointers: new Map(), pinch: null });
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current.x = e.clientX;
    drag.current.pinch = null;
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.pointers.has(e.pointerId)) return;
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (d.pointers.size >= 2) {
      const [p, q] = [...d.pointers.values()];
      const span = Math.hypot(p.x - q.x, p.y - q.y);
      if (d.pinch) orbitRef.current.zoom = Math.max(0.45, Math.min(2.2, orbitRef.current.zoom * d.pinch / Math.max(1, span)));
      d.pinch = span;
      return;
    }
    if (mode === "harbour") orbitRef.current.azimuth += (e.clientX - d.x) * 0.35;
    d.x = e.clientX;
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => { drag.current.pointers.delete(e.pointerId); drag.current.pinch = null; };
  const wrap = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.zoom = Math.max(0.45, Math.min(2.2, orbitRef.current.zoom * Math.exp(e.deltaY * 0.0012)));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  return (
    <SceneBoundary modelUrl={YACHT_MODEL_URL} errorLabel={labels.error} retryLabel={labels.retry} onError={onFail}>
      <div ref={wrap} className="relative h-full w-full" style={{ touchAction: "none" }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <Canvas
          fallback={<span>{labels.scene}</span>}
          shadows={lite ? false : "percentage"}
          dpr={lite ? 1 : [1, 1.75]}
          camera={{ position: [centre.x, 40, centre.z + 40], fov: 45, near: 0.3, far: 3000 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <color attach="background" args={[SKY.horizon]} />
          <fog attach="fog" args={[SKY.horizon, 260, 1100]} />
          <hemisphereLight args={["#cfe6ff", "#33454f", 0.5]} />
          <group position={[centre.x, 0, centre.z]}><SkyDome radius={2400} /></group>
          <SunShadow runRef={runRef} />
          <Environment resolution={128} frames={1} background={false}>
            <Lightformer form="rect" intensity={4} color="#fff3da" position={[30, 22, 12]} scale={[14, 14, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={0.9} color="#bfe0f2" position={[0, 40, 0]} rotation-x={Math.PI / 2} scale={[120, 120, 1]} />
            <Lightformer form="rect" intensity={0.35} color="#9dc4d8" position={[0, 6, -60]} scale={[160, 30, 1]} />
            <Lightformer form="rect" intensity={0.35} color="#9dc4d8" position={[0, 6, 60]} rotation-y={Math.PI} scale={[160, 30, 1]} />
          </Environment>
          <Ocean stateRef={still} size={1400} seg={lite ? 64 : exercise.track === "sail" ? 160 : 96} roughness={0.28} skyReflection={0.6} sunGlint={0.35} farCalm={[60, 420]} swell={swell} />
          <mesh rotation-x={-Math.PI / 2} position={[0, -1.2, 0]}>
            <planeGeometry args={[8000, 8000]} />
            <meshStandardMaterial color="#0e4256" roughness={0.6} metalness={0.07} />
          </mesh>
          {/* The venue shore stands at 150-300 m round the boat in the trainer; a harbour view sees farther, so it is set back. */}
          <group position={[centre.x, 0, centre.z]} scale={[2.2, 1.4, 2.2]}><Backdrop venue={venue} /></group>
          <HarbourWorks exercise={exercise} swell={swell} />
          <GoalMarks exercise={exercise} runRef={runRef} swell={swell} />
          {plan && <PlanTrack exercise={exercise} swell={swell} />}
          <MooringLines runRef={runRef} />
          <Suspense fallback={<Loading label={labels.loading} />}>
            <MooredFleet boats={boats} runRef={runRef} />
            <OurYacht exercise={exercise} runRef={runRef} inputRef={inputRef} stateRef={stateRef} swell={swell} wake={!lite} />
            <Ready />
          </Suspense>
          <HarbourCameraRig exercise={exercise} runRef={runRef} mode={mode} orbitRef={orbitRef} />
          <WindCompass exercise={exercise} runRef={runRef} elRef={compassRef} format={windText} />
        </Canvas>
        <div ref={compassRef} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{ background: "rgba(10, 22, 40, 0.78)", color: "#ffffff", fontSize: 14, fontWeight: 600 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "none" }}>
            <path d="M12 20V4M5 11l7-7 7 7" />
          </svg>
          <span>{labels.wind}</span><span data-wind="" />
        </div>
      </div>
    </SceneBoundary>
  );
});
