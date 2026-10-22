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
import type { Venue } from "@/data/venues/venues";
import { METRES_PER_UNIT, headingDelta, nextTarget, racePose, toWorld, type Race3DBoat, type Race3DCourse, type RaceCamera } from "./pose";

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

const SKY = { haze: "#6b93ac", horizon: "#8cb3c8", zenith: "#1f4a6e" } as const;
const DEG = Math.PI / 180;
/** The race shore stands taller than the horizon one: it is nearer and much wider. */
const LAND_HEIGHT = 1.8;
const MARK_COLOR = "#ff7a1a";
const PIN_COLOR = "#ffd23f";

export interface Race3DLabels {
  loading: string;
  scene: string;
  error: string;
  retry: string;
}

/** Player position in world metres, shared by everything that sits in the moving world. */
type Origin = MutableRefObject<{ x: number; z: number }>;

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

function Player({ boatsRef, windDirRef, origin, stateOut }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  windDirRef: MutableRefObject<number>;
  origin: Origin;
  stateOut: MutableRefObject<MutableRefObject<YachtState> | null>;
}) {
  const state = useBoatPose(boatsRef, windDirRef, null);
  useEffect(() => {
    stateOut.current = state;
    return () => { stateOut.current = null; };
  }, [state, stateOut]);
  useFrame(() => {
    const travel = state.current.travel;
    if (travel) origin.current = travel;
  });
  return (
    <>
      <Yacht stateRef={state} />
      <Wake stateRef={state} />
    </>
  );
}

function Rival({ id, color, boatsRef, windDirRef, origin }: {
  id: string;
  color: string;
  boatsRef: MutableRefObject<Race3DBoat[]>;
  windDirRef: MutableRefObject<number>;
  origin: Origin;
}) {
  const state = useBoatPose(boatsRef, windDirRef, id);
  const group = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    const travel = state.current.travel;
    if (!group.current || !travel) return;
    const x = travel.x - origin.current.x;
    const z = travel.z - origin.current.z;
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
      {/* The rival's colour from the canvas race, high above the mast so it reads from afar. */}
      <mesh position={[0, 23, 0]} rotation-x={Math.PI}>
        <coneGeometry args={[1.1, 2.2, 4]} />
        <meshBasicMaterial color={color} fog={false} />
      </mesh>
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
function World({ venue, courseRef, boatsRef, origin }: {
  venue: Venue;
  courseRef: MutableRefObject<Race3DCourse>;
  boatsRef: MutableRefObject<Race3DBoat[]>;
  origin: Origin;
}) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef<THREE.Mesh>(null);
  const course = courseRef.current;
  useFrame(() => {
    if (group.current) group.current.position.set(-origin.current.x, 0, -origin.current.z);
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
  const origin = useRef({ x: 0, z: 0 });
  const playerState = useRef<MutableRefObject<YachtState> | null>(null);
  // The ocean reads the player's travel from this ref every frame.
  const oceanState = useRef<YachtState>({ ...NEUTRAL_YACHT });
  // Rivals come and go with each race (restart, other difficulty): follow the ids.
  const [rivals, setRivals] = useState<{ id: string; color: string }[]>([]);
  useEffect(() => {
    const read = () => {
      const next = boatsRef.current.filter((b) => !b.isPlayer).map((b) => ({ id: b.id, color: b.color }));
      setRivals((prev) => (prev.map((r) => r.id).join() === next.map((r) => r.id).join() ? prev : next));
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
        <color attach="background" args={[SKY.haze]} />
        {/* Far enough to see the windward mark from the start (about 520 m) and the shore behind it. */}
        <fog attach="fog" args={[SKY.haze, 420, 2600]} />
        <hemisphereLight args={["#cfe6ff", "#33454f", 0.45]} />
        <directionalLight
          position={[56, 72, 28]}
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
            uniforms={{ horizon: { value: new THREE.Color(SKY.horizon) }, zenith: { value: new THREE.Color(SKY.zenith) } }}
            vertexShader={"varying vec3 vSky; void main() { vSky = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"}
            fragmentShader={`uniform vec3 horizon; uniform vec3 zenith; varying vec3 vSky;
              void main() {
                vec3 direction = normalize(vSky);
                float blend = pow(max(direction.y, 0.0), 0.45);
                vec3 sky = mix(horizon, zenith, blend);
                float sun = pow(max(dot(direction, normalize(vec3(56.0, 72.0, 28.0))), 0.0), 600.0);
                gl_FragColor = vec4(mix(sky, vec3(1.0, 0.93, 0.78), sun * 0.8), 1.0);
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

        <OceanFollow playerState={playerState} oceanState={oceanState} />
        <Ocean stateRef={oceanState} size={2000} seg={256} />
        {/* Flat sea beyond the waves, under them, out to the fog. */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -1.6, 0]}>
          <planeGeometry args={[9000, 9000]} />
          <meshStandardMaterial color="#0e4256" roughness={0.45} metalness={0.07} />
        </mesh>

        <World venue={venue} courseRef={courseRef} boatsRef={boatsRef} origin={origin} />
        <Suspense fallback={<Loading label={labels.loading} />}>
          <Player boatsRef={boatsRef} windDirRef={windDirRef} origin={origin} stateOut={playerState} />
          {rivals.map((r) => <Rival key={r.id} id={r.id} color={r.color} boatsRef={boatsRef} windDirRef={windDirRef} origin={origin} />)}
          <Ready />
        </Suspense>
        <ChaseCamera stateRef={playerState} mode={camera} />
      </Canvas>
    </SceneBoundary>
  );
});

/** Copies the player's travel into the ocean's state, so the waves scroll under the boat. */
function OceanFollow({ playerState, oceanState }: {
  playerState: MutableRefObject<MutableRefObject<YachtState> | null>;
  oceanState: MutableRefObject<YachtState>;
}) {
  useFrame(() => {
    const s = playerState.current?.current;
    if (s) oceanState.current = s;
  });
  return null;
}
