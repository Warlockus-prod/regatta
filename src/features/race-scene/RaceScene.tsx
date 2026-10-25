'use client';

import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Yacht } from "@/features/simulator-3d/Yacht";
import { sampleWave } from "@/features/simulator-3d/ocean/waves";
import { SceneBoundary } from "@/features/simulator-3d/SceneBoundary";
import { FirstSceneFrame, SceneStartup } from "@/features/simulator-3d/SceneStartup";
import { YACHT_MODEL_URL } from "@/features/simulator-3d/config";
import { NEUTRAL_YACHT } from "@/features/simulator-3d/types";
import type { Venue } from "@/data/venues/venues";
import {
  Rival, World,
  playerOf, useBoatPose, type OriginRef, type Race3DLabels,
} from "@/features/race-3d/Race3DView";
import { METRES_PER_UNIT, nextTarget, racePose, raceRanks, toWorld, type Race3DBoat, type Race3DCourse, type RaceCamera } from "@/features/race-3d/pose";
import { distance } from "@/lib/race-physics";
import type { RaceGuidance } from "@/lib/race-guidance";
import { raceCameraPose } from "./orbit-camera";
import { SailingCameraRig } from "@/features/simulator-3d/SailingCameraRig";
import { initialDpr, nextDpr } from "./quality";
import { guidancePath } from "./guidance";
import { calmFactor } from "./materials";
import { SailingEnvironment } from "./SailingEnvironment";
import { createSailingRenderer } from "./renderer";
import { WindFlow } from "@/features/simulator-3d/ocean/WindFlow";
import { raceWindReading } from "@/features/race-hud/navigation-model";

// ============================================================================
// RaceScene - the race presentation using the shared sailing renderer.
//
// The same race as Race3DView (it reads the refs GameClient steps and reuses
// its course and rivals), drawn by WebGPURenderer with TSL materials:
// WebGPU where the browser has it, WebGL2 otherwise. Stylized: water that
// shows the wind and the shallows, white wakes that keep every tack, soft
// shadows under the hulls, trees on the shore. The tactical camera (the
// optional preset) keeps upwind at the top like the race map. The default
// is a close, freely rotatable view fitted exactly like the trainer.
// ============================================================================

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

/** The player's yacht, its pose shared with the camera and the water. */
function Player({ boatsRef, windDirRef, showWind }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  windDirRef: MutableRefObject<number>;
  showWind: boolean;
}) {
  const state = useBoatPose(boatsRef, windDirRef, null);
  const readWind = useCallback(() => {
    const boat = playerOf(boatsRef.current);
    if (!boat) return null;
    const reading = raceWindReading({ heading: boat.heading, boatSpeedKn: boat.speed, windFrom: windDirRef.current,
      windKnots: boat.physics?.trueWindSpeed, leeway: boat.physics?.leeway });
    return reading?.apparentFrom != null && reading.apparentKnots != null
      ? { from: reading.apparentFrom, knots: reading.apparentKnots } : null;
  }, [boatsRef, windDirRef]);
  return <><Yacht stateRef={state} />{showWind && <WindFlow stateRef={state} readWind={readWind} />}</>;
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

export const RaceScene = memo(function RaceScene({ boatsRef, courseRef, windDirRef, venue, camera = "orbit", cameraRevision = 0, maxDpr = 2, labels, onStats, onReady, guidance, showWind = false }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  courseRef: MutableRefObject<Race3DCourse>;
  windDirRef: MutableRefObject<number>;
  venue: Venue;
  /** All three presets support free orbit and pinch/scroll zoom. */
  camera?: RaceCamera;
  /** Increment to refit the selected preset after a manual camera gesture. */
  cameraRevision?: number;
  maxDpr?: number;
  labels: Race3DLabels;
  onStats?: (s: RaceSceneStats) => void;
  /** The loaded yacht has been submitted in a frame. Optional for server-clock consumers. */
  onReady?: () => void;
  /** Optional educational aid. Coordinates use race units, converted here to metres. */
  guidance?: RaceGuidance | null;
  /** Optional incoming apparent-air arrows from the shared trainer. */
  showWind?: boolean;
}) {
  const originRef = useRef({ x: 0, z: 0 });
  const readState = useCallback(() => {
    const player = playerOf(boatsRef.current);
    return player ? { travel: toWorld(player.pos), wind: { from: windDirRef.current, knots: player.physics?.trueWindSpeed ?? 12 } } : null;
  }, [boatsRef, windDirRef]);
  const cameraPose = useCallback((aspect: number) => {
    const player = playerOf(boatsRef.current);
    const target = player ? nextTarget(player, courseRef.current) : null;
    return raceCameraPose(camera, player ? racePose(player, windDirRef.current) : NEUTRAL_YACHT, aspect, { player: player ? toWorld(player.pos) : { x: 0, z: 0 },
      target: target ? toWorld(target) : null, windFrom: windDirRef.current });
  }, [camera, boatsRef, courseRef, windDirRef]);
  const readBoats = useCallback(() => boatsRef.current.map(boat => ({
    id: boat.id, travel: toWorld(boat.pos), heading: boat.heading, speedKn: boat.speed,
  })), [boatsRef]);
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
      <SceneStartup label={labels.loading} onReady={onReady}>{ready =>
      <div className="relative h-full w-full" data-scene="next">
        <Canvas
          fallback={<span>{labels.scene}</span>}
          gl={createSailingRenderer}
          dpr={[1, maxDpr]}
          camera={{ position: [26, 18, 32], fov: 42, near: 0.5, far: 4200 }}
        >
          <SailingEnvironment venue={venue} readState={readState} readBoats={readBoats} originRef={originRef} />
          <World venue={venue} courseRef={courseRef} boatsRef={boatsRef} originRef={originRef} targetLabel={targetLabel} land={false} />
          {guidance && <WaterGuidance boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} guidance={guidance} />}
          <Suspense fallback={null}>
            <Player boatsRef={boatsRef} windDirRef={windDirRef} showWind={showWind} />
            {rivals.map((r) => <Rival key={r.id} id={r.id} color={r.color} label={r.label} boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} />)}
            <FirstSceneFrame onReady={ready} />
          </Suspense>
          <SailingCameraRig poseForAspect={cameraPose} revision={cameraRevision} />
          <Quality onStats={onStats} maxDpr={maxDpr} />
        </Canvas>
      </div>
      }</SceneStartup>
    </SceneBoundary>
  );
});
