'use client';

import { Suspense, memo, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Html, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { Yacht } from "@/features/simulator-3d/Yacht";
import { Ocean } from "@/features/simulator-3d/ocean/Ocean";
import { Wake } from "@/features/simulator-3d/ocean/Wake";
import { sampleWave } from "@/features/simulator-3d/ocean/waves";
import { terrainGeometry } from "@/features/simulator-3d/ocean/Backdrop";
import { SceneBoundary, reportScene } from "@/features/simulator-3d/SceneBoundary";
import { YACHT_MODEL_URL } from "@/features/simulator-3d/config";
import { NEUTRAL_YACHT, type YachtState } from "@/features/simulator-3d/types";
import { raceTerrain } from "@/data/venues/geometry";
import { distance, makeStandardCourse } from "@/lib/race-physics";
import type { Venue } from "@/data/venues/venues";
import { METRES_PER_UNIT, NO_GO_DEG, headingDelta, nextTarget, racePose, raceRanks, toWorld, type Race3DBoat, type Race3DCourse, type RaceCamera } from "./pose";

// ============================================================================
// Race3DView - the solo race seen from the water (owner request 2026-10-21).
//
// A view, not a second race: it reads the refs the canvas race steps
// (src/app/game/GameClient.tsx), so the boats, the course, the wind and the
// result are the same in 2D and 3D. The player stays at the origin and the
// world moves under it, like the 3D trainer: the ocean scrolls by the player's
// travel, and the land, the marks and the rivals sit at their race position
// minus the player's. The shore is the 2D one raised into hills
// (raceTerrain), so a boat sees in 3D the coast it sees from above.
// ============================================================================

// The fog takes the sky's horizon colour, so far water and land fade into the
// sky with no seam. The sun stands about 45 degrees high: lower, its glitter
// path filled the water ahead of the boat with white when sailing towards it.
export const SKY = { horizon: "#9ec1d3", zenith: "#1f4a6e" } as const;
export const SUN: [number, number, number] = [56, 64, 28];
/** Waves flatten and roughen from 45 m out, gone by 420 m (see Ocean). */
const FAR_CALM: [number, number] = [45, 420];
const DEG = Math.PI / 180;
/** The race shore stands taller than the horizon one: it is nearer and much wider. */
const LAND_HEIGHT = 1.8;
const MARK_COLOR = "#ff7a1a";
const PIN_COLOR = "#ffd23f";
/** The start line, orange dashes as on the map. */
const LINE_COLOR = "#ffaa00";
export const STANDARD_COURSE: Race3DCourse = makeStandardCourse();

export interface Race3DLabels {
  /** Unit after a distance ("m"; "м" in Russian). */
  metres: string;
  loading: string;
  scene: string;
  error: string;
  retry: string;
}

/** Player position in world metres, shared by everything that sits in the moving world. */
export type OriginRef = MutableRefObject<{ x: number; z: number }>;

export function playerOf(boats: Race3DBoat[]): Race3DBoat | undefined {
  return boats.find((b) => b.isPlayer);
}

/** One boat's pose, refreshed every frame from the race. */
export function useBoatPose(boatsRef: MutableRefObject<Race3DBoat[]>, windDirRef: MutableRefObject<number>, id: string | null) {
  const state = useRef<YachtState>({ ...NEUTRAL_YACHT });
  const last = useRef<{ heading: number; rate: number } | null>(null);
  useFrame((_, dt) => {
    const boats = boatsRef.current;
    const boat = id ? boats.find((b) => b.id === id) : playerOf(boats);
    if (!boat) return;
    const prev = last.current;
    const raw = prev && dt > 0 ? headingDelta(prev.heading, boat.heading) / dt : 0;
    const rate = prev ? prev.rate + (raw - prev.rate) * Math.min(1, dt * 6) : 0;
    last.current = { heading: boat.heading, rate };
    state.current = racePose(boat, windDirRef.current, rate);
  });
  return state;
}

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
  return (
    <>
      <Yacht stateRef={state} />
      <Wake stateRef={state} />
    </>
  );
}

/**
 * Place and name over a rival's mast, the same size on screen at any distance,
 * drawn on a canvas (no font file: the CSP blocks font CDNs).
 */
export function NameTag({ text, color, y = 22 }: { text: string; color?: string; y?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const g = canvas.getContext("2d");
    if (g) {
      g.fillStyle = "rgba(10, 22, 40, 0.86)";
      g.beginPath();
      g.roundRect(2, 6, 252, 52, 26);
      g.fill();
      if (color) {
        g.fillStyle = color;
        g.beginPath();
        g.arc(32, 32, 11, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "#ffffff";
      g.font = "600 28px system-ui, -apple-system, Segoe UI, sans-serif";
      g.textBaseline = "middle";
      if (color) g.fillText(text, 54, 33, 190);
      else {
        g.textAlign = "center";
        g.fillText(text, 128, 33, 230);
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={[0, y, 0]} scale={[0.17, 0.0425, 1]} renderOrder={10}>
      <spriteMaterial map={texture} sizeAttenuation={false} depthTest={false} transparent fog={false} />
    </sprite>
  );
}

export function Rival({ id, color, label, boatsRef, windDirRef, originRef }: {
  id: string;
  color: string;
  label: string;
  boatsRef: MutableRefObject<Race3DBoat[]>;
  windDirRef: MutableRefObject<number>;
  originRef: OriginRef;
}) {
  const state = useBoatPose(boatsRef, windDirRef, id);
  const group = useRef<THREE.Group>(null);
  // The rival's race colour on its hull, the same colour as its dot on the 2D
  // map and its name tag. The GLB's gelcoat is shared by every yacht, so each
  // rival paints its own copy and puts the shared one back when it leaves.
  useEffect(() => {
    const tint = new THREE.Color(color);
    const painted: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[]; copies: THREE.Material[] }[] = [];
    group.current?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const original = mesh.material;
      const copies: THREE.Material[] = [];
      const paint = (m: THREE.Material) => {
        if (!m.name.startsWith("Gelcoat_White")) return m;
        const copy = m.clone() as THREE.MeshStandardMaterial;
        copy.color.copy(tint).multiplyScalar(0.82);
        copies.push(copy);
        return copy;
      };
      mesh.material = Array.isArray(original) ? original.map(paint) : paint(original);
      if (copies.length) painted.push({ mesh, original, copies });
      else mesh.material = original;
    });
    return () => {
      for (const p of painted) {
        p.mesh.material = p.original;
        p.copies.forEach((m) => m.dispose());
      }
    };
  }, [color]);
  useFrame(({ camera }) => {
    const travel = state.current.travel;
    if (!group.current || !travel) return;
    const x = travel.x - originRef.current.x;
    const z = travel.z - originRef.current.z;
    group.current.position.set(x, 0, z);
    // The player's boat comes first: a rival between the camera and the
    // player (close astern) steps out of the picture until it is clear.
    const cx = camera.position.x;
    const cz = camera.position.z;
    const len2 = cx * cx + cz * cz;
    const t = len2 > 0 ? ((x - cx) * -cx + (z - cz) * -cz) / len2 : -1;
    const side = Math.abs((x - cx) * -cz - (z - cz) * -cx) / Math.sqrt(len2 || 1);
    // From high above, the sight line clears a rival's masthead (21 m) until near the player.
    const sightHeight = camera.position.y * (1 - t) + 6 * t;
    group.current.visible = !(t > 0 && t < 1.05 && side < 9 && sightHeight < 21);
  });
  return (
    <group ref={group}>
      <Yacht stateRef={state} light />
      <NameTag text={label} color={color} />
    </group>
  );
}

/** A buoy that rides the swell at its place in the world. */
function Buoy({ x, z, color, flag }: { x: number; z: number; color: string; flag?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = sampleWave(x, z, clock.elapsedTime).y;
  });
  return (
    <group ref={ref} position={[x, 0, z]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.5, 2.6, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.9, 0]}>
        <coneGeometry args={[1.2, 1.2, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {flag && (
        <>
          <mesh position={[0, 6, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 6, 6]} />
            <meshStandardMaterial color="#e8e8e8" />
          </mesh>
          <mesh position={[0.8, 8.2, 0]}>
            <boxGeometry args={[1.6, 1.0, 0.04]} />
            <meshStandardMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** The start and finish line: an orange dashed line on the water, as on the map. */
function LineDashes({ a, b }: { a: { x: number; z: number }; b: { x: number; z: number } }) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const count = Math.max(2, Math.round(length / 3.5));
  const yaw = Math.atan2(b.x - a.x, b.z - a.z);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      dummy.position.set(x, sampleWave(x, z, clock.elapsedTime).y + 0.1, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.28, 0.08, 1.8]} />
      <meshStandardMaterial color={LINE_COLOR} emissive={LINE_COLOR} emissiveIntensity={0.35} roughness={0.6} />
    </instancedMesh>
  );
}

/** A motor-boat hull seen from above, bow north: extruded upward into a low-poly hull. */
function committeeHull(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-1.3, 3.6);
  shape.lineTo(1.3, 3.6);
  shape.lineTo(1.35, -1.2);
  shape.quadraticCurveTo(1.2, -3.2, 0, -4.4);
  shape.quadraticCurveTo(-1.2, -3.2, -1.35, -1.2);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1.3, bevelEnabled: false });
  // Shape x/y become x/z, the extrusion becomes height (y).
  g.rotateX(Math.PI / 2);
  g.translate(0, 1.0, 0);
  return g;
}

/** The race committee boat at the starboard end of the line, flag up. */
function CommitteeBoat({ x, z }: { x: number; z: number }) {
  const ref = useRef<THREE.Group>(null);
  const hull = useMemo(() => committeeHull(), []);
  useEffect(() => () => hull.dispose(), [hull]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = sampleWave(x, z, clock.elapsedTime).y;
  });
  return (
    <group ref={ref} position={[x, 0, z]}>
      <mesh geometry={hull} position-y={-0.3} castShadow>
        <meshStandardMaterial color="#eef2f4" roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.4, 0.9]} castShadow>
        <boxGeometry args={[2.0, 1.0, 2.6]} />
        <meshStandardMaterial color="#9fb3c0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.6, 0.9]}>
        <cylinderGeometry args={[0.06, 0.06, 3.6, 6]} />
        <meshStandardMaterial color="#d8d8d8" />
      </mesh>
      <mesh position={[0.6, 4.9, 0.9]}>
        <boxGeometry args={[1.2, 0.8, 0.04]} />
        <meshStandardMaterial color={MARK_COLOR} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** The sector the boat cannot sail into, on the water at the bow, turned with the wind. */
export function NoGoWedge({ windDirRef }: { windDirRef: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    // Bearing b points along (sin b, 0, -cos b); a ring angle t of the flat
    // ring lands on bearing 90 - t, so north +-30 is t = 60..120 degrees.
    const g = new THREE.RingGeometry(7, 34, 24, 1, (90 - NO_GO_DEG) * DEG, 2 * NO_GO_DEG * DEG);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (group.current) group.current.rotation.y = -windDirRef.current * DEG;
  });
  // The two edges of the sector, like the lines a race broadcast draws on the water.
  const edges = [-NO_GO_DEG, NO_GO_DEG].map((b) => ({ b, x: Math.sin(b * DEG) * 20.5, z: -Math.cos(b * DEG) * 20.5 }));
  return (
    <group ref={group}>
      <mesh geometry={geometry} position-y={0.6} renderOrder={2}>
        <meshBasicMaterial color="#ff4d66" transparent opacity={0.09} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      {edges.map((e) => (
        <mesh key={e.b} position={[e.x, 0.65, e.z]} rotation-y={-e.b * DEG} renderOrder={3}>
          <boxGeometry args={[0.35, 0.05, 27]} />
          <meshBasicMaterial color="#ff6680" transparent opacity={0.75} depthWrite={false} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Where the next target is when it is off screen: an arrow on the edge of the
 * view (clear of the HUD at the top and the controls at the bottom).
 */
export function TargetArrow({ boatsRef, courseRef, originRef, arrowRef }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  courseRef: MutableRefObject<Race3DCourse>;
  originRef: OriginRef;
  arrowRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const el = arrowRef.current;
    if (!el) return;
    const player = playerOf(boatsRef.current);
    const target = player ? nextTarget(player, courseRef.current) : null;
    if (!target) { el.style.display = "none"; return; }
    const w = toWorld(target);
    v.set(w.x - originRef.current.x, 4, w.z - originRef.current.z).project(camera);
    const behind = v.z > 1;
    const x = behind ? -v.x : v.x;
    const y = behind ? -v.y : v.y;
    if (!behind && Math.abs(x) < 0.9 && Math.abs(y) < 0.9) { el.style.display = "none"; return; }
    const m = Math.max(Math.abs(x), Math.abs(y)) || 1;
    const px = Math.min(size.width - 30, Math.max(30, size.width / 2 + (x / m) * (size.width / 2 - 30)));
    const py = Math.min(size.height - 160, Math.max(170, size.height / 2 - (y / m) * (size.height / 2)));
    el.style.display = "flex";
    el.style.transform = `translate(${px - 22}px, ${py - 22}px)`;
    const glyph = el.firstElementChild as HTMLElement | null;
    if (glyph) glyph.style.transform = `rotate(${(Math.atan2(x, y) * 180) / Math.PI}deg)`;
  });
  return null;
}

/** The shore and islands of the venue, the 2D shore raised into terrain. */
const Land = memo(function Land({ venue }: { venue: Venue }) {
  const geometries = useMemo(() => raceTerrain(venue, { metresPerUnit: METRES_PER_UNIT, heightScale: LAND_HEIGHT })
    .map((t, n) => terrainGeometry(t, venue.palette, n, venue.lands[n]?.kind === "island", undefined, true)), [venue]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0, envMapIntensity: 0.25 }), []);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  useEffect(() => () => material.dispose(), [material]);
  return <>{geometries.map((g, i) => <mesh key={`${venue.id}-${i}`} geometry={g} material={material} />)}</>;
});

/** Everything fixed to the race area, shifted so the player stays at the origin. */
export function World({ venue, courseRef, boatsRef, originRef, targetLabel, land = true }: {
  venue: Venue;
  /** False when the caller draws the land itself (the next race scene, ADR-0008). */
  land?: boolean;
  courseRef: MutableRefObject<Race3DCourse>;
  boatsRef: MutableRefObject<Race3DBoat[]>;
  originRef: OriginRef;
  targetLabel: string;
}) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef<THREE.Group>(null);
  // A saved course can arrive after mount without changing the ref object.
  // Refresh geometry only when its snapshot changes, not on every race frame.
  const [course, setCourse] = useState<Race3DCourse | null>(null);
  const geometryCourse = useRef<Race3DCourse | null>(null);
  useFrame(() => {
    if (geometryCourse.current !== courseRef.current) {
      geometryCourse.current = courseRef.current;
      setCourse(courseRef.current);
    }
    if (group.current) group.current.position.set(-originRef.current.x, 0, -originRef.current.z);
    const player = playerOf(boatsRef.current);
    const target = player ? nextTarget(player, courseRef.current) : null;
    if (pointer.current) {
      pointer.current.visible = Boolean(target);
      if (target) {
        const w = toWorld(target);
        pointer.current.position.set(w.x, 15, w.z);
      }
    }
  });
  const start = course ? { a: toWorld(course.startLine.a), b: toWorld(course.startLine.b) } : null;
  const finishSame = course && course.finishLine.a.x === course.startLine.a.x && course.finishLine.a.y === course.startLine.a.y
    && course.finishLine.b.x === course.startLine.b.x && course.finishLine.b.y === course.startLine.b.y;
  return (
    <group ref={group}>
      {land && <Land venue={venue} />}
      {course?.marks.map((m, i) => {
        const w = toWorld(m.pos);
        // The starboard end of the start line is the committee boat, the other end a pin.
        const committee = m.type === "start" && m.pos.x === Math.max(course.startLine.a.x, course.startLine.b.x);
        return committee ? <CommitteeBoat key={i} x={w.x} z={w.z} />
          : <Buoy key={i} x={w.x} z={w.z} color={m.type === "windward" ? MARK_COLOR : PIN_COLOR} flag />;
      })}
      {start && <LineDashes a={start.a} b={start.b} />}
      {course && !finishSame && <LineDashes a={toWorld(course.finishLine.a)} b={toWorld(course.finishLine.b)} />}
      {/* Where to sail next: the same target the race counts, and how far. */}
      <group ref={pointer}>
        <mesh rotation-x={Math.PI}>
          <coneGeometry args={[1.8, 3.2, 4]} />
          <meshBasicMaterial color="#00d4ff" fog={false} />
        </mesh>
        {targetLabel && <NameTag text={targetLabel} y={4.5} />}
      </group>
    </group>
  );
}

/** Behind the stern, or high above it to read the course; turns lag the boat a little. */
export function ChaseCamera({ stateRef, mode }: { stateRef: MutableRefObject<MutableRefObject<YachtState> | null>; mode: RaceCamera }) {
  const yaw = useRef<number | null>(null);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }, dt) => {
    const s = stateRef.current?.current;
    if (!s) return;
    const h = (s.heading ?? 0) * DEG;
    if (yaw.current === null) yaw.current = h;
    const d = Math.atan2(Math.sin(h - yaw.current), Math.cos(h - yaw.current));
    yaw.current += d * (1 - Math.exp(-Math.min(dt, 0.1) * 2.4));
    const fx = Math.sin(yaw.current);
    const fz = -Math.cos(yaw.current);
    // Framed so the whole rig sits in the upper two thirds and the race
    // controls at the bottom of the screen have open water under them.
    const [back, up, ahead, lookY] = mode === "high" ? [70, 50, 20, -20] : [40, 10, 60, 0.2];
    camera.position.set(-fx * back, up, -fz * back);
    look.set(fx * ahead, lookY, fz * ahead);
    camera.lookAt(look);
    // A narrow phone needs a wider lens to keep the whole rig in view.
    const fov = size.width < size.height ? 62 : 48;
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  });
  return null;
}

export function Loading({ label }: { label: string }) {
  return (
    <Html center>
      <div role="status" aria-label={label} style={{ width: 46, height: 46, border: "3px solid rgba(0, 212, 255, 0.25)",
        borderTopColor: "#00d4ff", borderRadius: "50%", animation: "regatta-spin 0.9s linear infinite" }} />
      <style>{"@keyframes regatta-spin { to { transform: rotate(360deg); } }"}</style>
    </Html>
  );
}

export function Ready() {
  useEffect(() => { reportScene("scene-ready"); }, []);
  return null;
}

export const Race3DView = memo(function Race3DView({ boatsRef, courseRef, windDirRef, venue, camera = "stern", maxDpr = 1.75, labels }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  courseRef: MutableRefObject<Race3DCourse>;
  windDirRef: MutableRefObject<number>;
  venue: Venue;
  camera?: RaceCamera;
  maxDpr?: number;
  labels: Race3DLabels;
}) {
  const originRef = useRef({ x: 0, z: 0 });
  const playerStateRef = useRef<MutableRefObject<YachtState> | null>(null);
  // The ocean reads the player's travel from this ref every frame.
  const oceanStateRef = useRef<YachtState>({ ...NEUTRAL_YACHT });
  // Rivals come and go with each race (restart, other difficulty), and their
  // places change: follow both twice a second for the name tags.
  const [rivals, setRivals] = useState<{ id: string; color: string; label: string }[]>([]);
  const [targetLabel, setTargetLabel] = useState("");
  const metresUnit = labels.metres;
  const arrowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const read = () => {
      const ranks = raceRanks(boatsRef.current, STANDARD_COURSE);
      const next = boatsRef.current.filter((b) => !b.isPlayer)
        .map((b) => ({ id: b.id, color: b.color, label: `${ranks.get(b.id) ?? ""}  ${b.name ?? ""}`.trim() }));
      const key = (list: { id: string; label: string }[]) => list.map((r) => `${r.id}:${r.label}`).join();
      setRivals((prev) => (key(prev) === key(next) ? prev : next));
      // How far the next target is, in steps of 10 m so the tag is not redrawn every frame.
      const player = playerOf(boatsRef.current);
      const target = player ? nextTarget(player, STANDARD_COURSE) : null;
      const metres = player && target ? Math.round((distance(player.pos, target) * METRES_PER_UNIT) / 10) * 10 : null;
      setTargetLabel(metres === null ? "" : `${metres} ${metresUnit}`);
    };
    read();
    const id = window.setInterval(read, 500);
    return () => window.clearInterval(id);
  }, [boatsRef, metresUnit]);

  return (
    <SceneBoundary modelUrl={YACHT_MODEL_URL} errorLabel={labels.error} retryLabel={labels.retry}>
      <div className="relative h-full w-full">
      <Canvas
        fallback={<span>{labels.scene}</span>}
        shadows="percentage"
        dpr={[1, maxDpr]}
        camera={{ position: [0, 11, 31], fov: 48, near: 0.5, far: 4200 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <color attach="background" args={[SKY.horizon]} />
        {/* The windward mark from the start (about 520 m) stays clear; by the
            edge of the waves (1.4 km) the sea has faded into the horizon. */}
        <fog attach="fog" args={[SKY.horizon, 300, 1700]} />
        <hemisphereLight args={["#cfe6ff", "#33454f", 0.45]} />
        <directionalLight
          position={SUN}
          intensity={2.2}
          color="#fff2dc"
          castShadow
          shadow-normalBias={0.025}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={1}
          shadow-camera-far={200}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <mesh renderOrder={-100}>
          <sphereGeometry args={[3600, 24, 12]} />
          <shaderMaterial side={THREE.BackSide} depthWrite={false} toneMapped={false} fog={false}
            uniforms={{ horizon: { value: new THREE.Color(SKY.horizon) }, zenith: { value: new THREE.Color(SKY.zenith) }, sunDir: { value: new THREE.Vector3(...SUN).normalize() } }}
            vertexShader={"varying vec3 vSky; void main() { vSky = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"}
            fragmentShader={`uniform vec3 horizon; uniform vec3 zenith; uniform vec3 sunDir; varying vec3 vSky;
              void main() {
                vec3 direction = normalize(vSky);
                float blend = pow(max(direction.y, 0.0), 0.45);
                vec3 sky = mix(horizon, zenith, blend);
                float facing = max(dot(direction, sunDir), 0.0);
                // A bright band along the horizon and a warm glow round the sun.
                sky += vec3(0.10, 0.10, 0.08) * exp(-abs(direction.y) * 16.0);
                sky += vec3(0.30, 0.22, 0.10) * pow(facing, 12.0);
                float disc = smoothstep(0.9993, 0.9997, facing);
                gl_FragColor = vec4(mix(sky, vec3(1.0, 0.95, 0.82), disc), 1.0);
                #include <colorspace_fragment>
              }`} />
        </mesh>
        {/* Local image-based light, no external HDR (the CSP blocks it). */}
        <Environment resolution={128} frames={1} background={false}>
          <Lightformer form="rect" intensity={4} color="#fff3da" position={[30, 22, 12]} scale={[14, 14, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.9} color="#bfe0f2" position={[0, 40, 0]} rotation-x={Math.PI / 2} scale={[120, 120, 1]} />
          <Lightformer form="rect" intensity={0.35} color="#9dc4d8" position={[0, 6, -60]} scale={[160, 30, 1]} />
          <Lightformer form="rect" intensity={0.35} color="#9dc4d8" position={[0, 6, 60]} rotation-y={Math.PI} scale={[160, 30, 1]} />
          <Lightformer form="rect" intensity={0.22} color="#274a5a" position={[0, -12, 0]} rotation-x={-Math.PI / 2} scale={[160, 160, 1]} />
        </Environment>

        <OceanFollow playerStateRef={playerStateRef} oceanStateRef={oceanStateRef} />
        <Ocean stateRef={oceanStateRef} size={2800} seg={288} roughness={0.32} skyReflection={0.5} farCalm={FAR_CALM} sunGlint={0.18} />
        {/* Flat sea beyond the waves, under them, out to the fog. */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -1.6, 0]}>
          <planeGeometry args={[9000, 9000]} />
          <meshStandardMaterial color="#0e4256" roughness={0.6} metalness={0.07} />
        </mesh>

        <World venue={venue} courseRef={courseRef} boatsRef={boatsRef} originRef={originRef} targetLabel={targetLabel} />
        <NoGoWedge windDirRef={windDirRef} />
        <TargetArrow boatsRef={boatsRef} courseRef={courseRef} originRef={originRef} arrowRef={arrowRef} />
        <Suspense fallback={<Loading label={labels.loading} />}>
          <Player boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} playerStateRef={playerStateRef} />
          {rivals.map((r) => <Rival key={r.id} id={r.id} color={r.color} label={r.label} boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} />)}
          <Ready />
        </Suspense>
        <ChaseCamera stateRef={playerStateRef} mode={camera} />
      </Canvas>
      {/* Off-screen pointer to the next target, moved by TargetArrow. */}
      <div ref={arrowRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 hidden h-11 w-11 items-center justify-center rounded-full"
        style={{ background: "rgba(10, 22, 40, 0.82)", border: "1px solid rgba(0, 212, 255, 0.6)" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </div>
      </div>
    </SceneBoundary>
  );
});

/** Copies the player's travel into the ocean's state, so the waves scroll under the boat. */
function OceanFollow({ playerStateRef, oceanStateRef }: {
  playerStateRef: MutableRefObject<MutableRefObject<YachtState> | null>;
  oceanStateRef: MutableRefObject<YachtState>;
}) {
  useFrame(() => {
    const s = playerStateRef.current?.current;
    if (s) oceanStateRef.current = s;
  });
  return null;
}
