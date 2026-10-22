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
import { makeStandardCourse } from "@/lib/race-physics";
import type { Venue } from "@/data/venues/venues";
import { METRES_PER_UNIT, headingDelta, nextTarget, racePose, raceRanks, toWorld, type Race3DBoat, type Race3DCourse, type RaceCamera } from "./pose";

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
const SKY = { horizon: "#9ec1d3", zenith: "#1f4a6e" } as const;
const SUN: [number, number, number] = [56, 64, 28];
/** Waves flatten and roughen from 45 m out, gone by 420 m (see Ocean). */
const FAR_CALM: [number, number] = [45, 420];
const DEG = Math.PI / 180;
/** The race shore stands taller than the horizon one: it is nearer and much wider. */
const LAND_HEIGHT = 1.8;
const MARK_COLOR = "#ff7a1a";
const PIN_COLOR = "#ffd23f";
const STANDARD_COURSE: Race3DCourse = makeStandardCourse();

export interface Race3DLabels {
  loading: string;
  scene: string;
  error: string;
  retry: string;
}

/** Player position in world metres, shared by everything that sits in the moving world. */
type OriginRef = MutableRefObject<{ x: number; z: number }>;

function playerOf(boats: Race3DBoat[]): Race3DBoat | undefined {
  return boats.find((b) => b.isPlayer);
}

/** One boat's pose, refreshed every frame from the race. */
function useBoatPose(boatsRef: MutableRefObject<Race3DBoat[]>, windDirRef: MutableRefObject<number>, id: string | null) {
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
function NameTag({ text, color }: { text: string; color: string }) {
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
      g.fillStyle = color;
      g.beginPath();
      g.arc(32, 32, 11, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      g.font = "600 28px system-ui, -apple-system, Segoe UI, sans-serif";
      g.textBaseline = "middle";
      g.fillText(text, 54, 33, 190);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={[0, 22, 0]} scale={[0.17, 0.0425, 1]} renderOrder={10}>
      <spriteMaterial map={texture} sizeAttenuation={false} depthTest={false} transparent fog={false} />
    </sprite>
  );
}

function Rival({ id, color, label, boatsRef, windDirRef, originRef }: {
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

/** The start and finish line: a row of small floats between the two pins. */
function LineFloats({ a, b }: { a: { x: number; z: number }; b: { x: number; z: number } }) {
  const count = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 4));
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      dummy.position.set(x, sampleWave(x, z, clock.elapsedTime).y + 0.15, z);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[0.45, 10, 8]} />
      <meshStandardMaterial color={PIN_COLOR} roughness={0.6} />
    </instancedMesh>
  );
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
function World({ venue, courseRef, boatsRef, originRef }: {
  venue: Venue;
  courseRef: MutableRefObject<Race3DCourse>;
  boatsRef: MutableRefObject<Race3DBoat[]>;
  originRef: OriginRef;
}) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef<THREE.Mesh>(null);
  // The marks are the standard course every race sails (solo, multiplayer,
  // replay); the live course ref only drives the next-target marker.
  const course = STANDARD_COURSE;
  useFrame(() => {
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
  const start = { a: toWorld(course.startLine.a), b: toWorld(course.startLine.b) };
  const finishSame = course.finishLine.a.x === course.startLine.a.x && course.finishLine.a.y === course.startLine.a.y
    && course.finishLine.b.x === course.startLine.b.x && course.finishLine.b.y === course.startLine.b.y;
  return (
    <group ref={group}>
      <Land venue={venue} />
      {course.marks.map((m, i) => {
        const w = toWorld(m.pos);
        return <Buoy key={i} x={w.x} z={w.z} color={m.type === "windward" ? MARK_COLOR : PIN_COLOR} flag />;
      })}
      <LineFloats a={start.a} b={start.b} />
      {!finishSame && <LineFloats a={toWorld(course.finishLine.a)} b={toWorld(course.finishLine.b)} />}
      {/* Where to sail next: the same target the race counts. */}
      <mesh ref={pointer} rotation-x={Math.PI}>
        <coneGeometry args={[1.8, 3.2, 4]} />
        <meshBasicMaterial color="#00d4ff" fog={false} />
      </mesh>
    </group>
  );
}

/** Behind the stern, or high above it to read the course; turns lag the boat a little. */
function ChaseCamera({ stateRef, mode }: { stateRef: MutableRefObject<MutableRefObject<YachtState> | null>; mode: RaceCamera }) {
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

function Loading({ label }: { label: string }) {
  return (
    <Html center>
      <div role="status" aria-label={label} style={{ width: 46, height: 46, border: "3px solid rgba(0, 212, 255, 0.25)",
        borderTopColor: "#00d4ff", borderRadius: "50%", animation: "regatta-spin 0.9s linear infinite" }} />
      <style>{"@keyframes regatta-spin { to { transform: rotate(360deg); } }"}</style>
    </Html>
  );
}

function Ready() {
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
  useEffect(() => {
    const read = () => {
      const ranks = raceRanks(boatsRef.current, STANDARD_COURSE);
      const next = boatsRef.current.filter((b) => !b.isPlayer)
        .map((b) => ({ id: b.id, color: b.color, label: `${ranks.get(b.id) ?? ""}  ${b.name ?? ""}`.trim() }));
      const key = (list: { id: string; label: string }[]) => list.map((r) => `${r.id}:${r.label}`).join();
      setRivals((prev) => (key(prev) === key(next) ? prev : next));
    };
    read();
    const id = window.setInterval(read, 500);
    return () => window.clearInterval(id);
  }, [boatsRef]);

  return (
    <SceneBoundary modelUrl={YACHT_MODEL_URL} errorLabel={labels.error} retryLabel={labels.retry}>
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

        <World venue={venue} courseRef={courseRef} boatsRef={boatsRef} originRef={originRef} />
        <Suspense fallback={<Loading label={labels.loading} />}>
          <Player boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} playerStateRef={playerStateRef} />
          {rivals.map((r) => <Rival key={r.id} id={r.id} color={r.color} label={r.label} boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} />)}
          <Ready />
        </Suspense>
        <ChaseCamera stateRef={playerStateRef} mode={camera} />
      </Canvas>
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
