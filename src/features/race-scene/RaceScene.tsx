'use client';

import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Yacht } from "@/features/simulator-3d/Yacht";
import { sampleWave } from "@/features/simulator-3d/ocean/waves";
import { SceneBoundary } from "@/features/simulator-3d/SceneBoundary";
import { FirstSceneFrame, SceneStartup } from "@/features/simulator-3d/SceneStartup";
import { YACHT_MODEL_URL } from "@/features/simulator-3d/config";
import { NEUTRAL_YACHT } from "@/features/simulator-3d/types";
import type { Venue } from "@/data/venues/venues";
import { raceLight, venueLook } from "@/data/venues/look";
import {
  Rival, World,
  playerOf, useBoatPose, type OriginRef, type Race3DLabels,
} from "@/features/race-3d/Race3DView";
import { METRES_PER_UNIT, nextTarget, racePose, raceRanks, toWorld, type Race3DBoat, type Race3DCourse, type RaceCamera } from "@/features/race-3d/pose";
import { distance } from "@/lib/race-physics";
import type { RaceGuidance } from "@/lib/race-guidance";
import { chaseCameraPose, createChasePose, raceCameraPose } from "./orbit-camera";
import { CHASE_START, chaseStep, type ChaseState } from "./camera";
import type { OrbitControls } from "three-stdlib";
import { prefersReducedMotion } from "@/features/race-hud/feedback";
import { SailingCameraRig } from "@/features/simulator-3d/SailingCameraRig";
import { VIEW_SIGNATURE_LENGTH, createQualityGovernor, createRenderGate, createSceneDraw, initialDpr, loadQualityStep, qualityAt, saveQualityStep, settle, type RenderGate } from "./quality";
import { guidancePath, nextTurnIndex } from "./guidance";
import { raceTacticsModel, tacticalSizes, type RaceTacticsModel } from "./tactics";
import { TacticalOverlay, TacticalScreenLayer } from "./TacticalOverlay";
import type { PhysicalRaceProfile } from "@/lib/race-context";
import { calmFactor } from "./materials";
import { SailingEnvironment } from "./SailingEnvironment";
import { rendererBackend, sailingRenderer, warmUpShaders } from "./renderer";
import { INITIAL_GPU_RECOVERY, afterGpuLoss, afterGpuRetry, recordGpuEvent, type GpuRecovery } from "./gpu-loss";
import { startPerfJournal } from "./perf-journal";
import { WindFlow } from "@/features/simulator-3d/ocean/WindFlow";
import { raceWindReading } from "@/features/race-hud/navigation-model";
import { recordSceneLifecycle } from "@/features/simulator-3d/scene-diagnostics";
import { BowSpray, useReducedMotionRef } from "./BowSpray";
import { SailFlow } from "./SailFlow";
import { raceWindLayers } from "./sail-flow";
import type { CoachKey } from "@/features/sailing-lab/runtime/trim-coach";
import { beginShakenFrame, createSceneShake, endShakenFrame, type ShakeControl } from "./effects";
import type { SceneQuality } from "./quality";

// ============================================================================
// RaceScene - the race presentation using the shared sailing renderer.
//
// The same race as Race3DView (it reads the refs GameClient steps and reuses
// its course and rivals), drawn by WebGPURenderer with TSL materials:
// WebGPU where the browser has it, WebGL2 otherwise. Stylized: water that
// shows the wind and the shallows, white wakes that keep every tack, soft
// shadows under the hulls, trees on the shore. Three cameras (M2-1, a tap on
// the scene steps through them): the default is a close, freely rotatable
// view fitted exactly like the trainer (owner decision #5 after TestFlight
// TF07); "Behind" follows the course and comes back behind the stern after a
// manual orbit (ChaseCamera); "Above" is the tactical camera that keeps
// upwind at the top like the race map.
// Performance (M2-5..M2-7): one quality ladder (pixel ratio, then the scene
// profile) chosen from the measured frame time and remembered on the device,
// a few frames a second while the race is held, rivals merged and drawn as
// far boats when small on screen, shaders compiled behind the loading screen.
// Event feedback (M3-5, effects.ts): spray at the player's bow from speed and
// heel, and a short camera shake on a contact and at the start gun, both off
// on the "low" profile and with reduced motion.
// Light by venue (M3-6, src/data/venues/look.ts): sun, sky, fog, water,
// exposure and warmth come from the venue's look; glow only on glints and
// foam, built only on "medium" and "high", no bloom pass on any profile.
// Wind on the sails (F6, SailFlow.tsx): optional apparent-wind ribbons along
// the player's sails, two instanced draws, mounted only when switched on; they
// take the place of the 3D wind arrows (raceWindLayers), never both.
// ============================================================================

const GUIDANCE_POINTS = 80;
const GUIDANCE_MARKERS = 14;
/** One index buffer for both route ribbons: two triangles per segment. */
const GUIDANCE_INDICES = Array.from({ length: (GUIDANCE_POINTS - 1) * 6 }, (_, k) => {
  const v = Math.floor(k / 6) * 2;
  return [v, v + 1, v + 2, v + 1, v + 3, v + 2][k % 6];
});
/** Route colours (M2-2): high contrast on water, never the action cyan. */
const GUIDANCE_LEG = "#f4f7fa";
const GUIDANCE_TURN = "#ffd23f";
const GUIDANCE_OUTLINE = "#0a1a2a";

export interface RaceSceneStats { backend: string; fps: number; dpr: number }

/** Optional teaching route, painted on the water rather than over the yacht.
 * A bright core over a dark outline reads on any water (M2-2): white for a
 * sailing leg, yellow for a change of course, a yellow turn point where the
 * next one starts and a white ring at the end. Sizes from the race model. */
function WaterGuidance({ boatsRef, windDirRef, originRef, guidance, model }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  windDirRef: MutableRefObject<number>;
  originRef: OriginRef;
  guidance?: RaceGuidance | null;
  model: RaceTacticsModel;
}) {
  const resources = useMemo(() => {
    const sizes = tacticalSizes(model);
    const ribbon = (opacity: number, order: number, vertexColors: boolean, color?: string) => {
      const positions = new Float32Array(GUIDANCE_POINTS * 6);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      const colors = vertexColors ? new Float32Array(GUIDANCE_POINTS * 6) : null;
      if (colors) geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setIndex(GUIDANCE_INDICES);
      const material = new THREE.MeshBasicMaterial({ vertexColors, ...(color ? { color } : {}), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      return { mesh, geometry, material, positions, colors };
    };
    const outline = ribbon(0.55, 2, false, GUIDANCE_OUTLINE);
    const core = ribbon(0.92, 3, true);
    const c = sizes.chevronHalfWidth;
    const chevron = new THREE.BufferGeometry();
    chevron.setAttribute("position", new THREE.Float32BufferAttribute([
      -c, 0, c * 0.8, 0, 0, -c * 0.8, -c * 0.45, 0, c * 0.8,
      0, 0, -c * 0.8, c, 0, c * 0.8, c * 0.45, 0, c * 0.8,
    ], 3));
    const markerMaterial = new THREE.MeshBasicMaterial({ color: GUIDANCE_OUTLINE, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const markers = new THREE.InstancedMesh(chevron, markerMaterial, GUIDANCE_MARKERS);
    markers.frustumCulled = false;
    markers.renderOrder = 4;
    const ringGeometry = new THREE.RingGeometry(sizes.targetRingRadius * 0.86, sizes.targetRingRadius, 32);
    ringGeometry.rotateX(-Math.PI / 2);
    const targetMaterial = new THREE.MeshBasicMaterial({ color: GUIDANCE_LEG, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const target = new THREE.Mesh(ringGeometry, targetMaterial);
    target.frustumCulled = false;
    target.renderOrder = 4;
    const turnGeometry = new THREE.RingGeometry(sizes.turnPointRadius * 0.45, sizes.turnPointRadius, 24);
    turnGeometry.rotateX(-Math.PI / 2);
    const turnMaterial = new THREE.MeshBasicMaterial({ color: GUIDANCE_TURN, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const turn = new THREE.Mesh(turnGeometry, turnMaterial);
    turn.frustumCulled = false;
    turn.renderOrder = 5;
    return { sizes, outline, core, chevron, markerMaterial, markers, ringGeometry, targetMaterial, target, turnGeometry, turnMaterial, turn,
      dummy: new THREE.Object3D(), leg: new THREE.Color(GUIDANCE_LEG), turning: new THREE.Color(GUIDANCE_TURN) };
  }, [model]);
  const resourceRef = useRef(resources);
  useEffect(() => {
    resourceRef.current = resources;
    return () => {
      resources.outline.geometry.dispose(); resources.outline.material.dispose();
      resources.core.geometry.dispose(); resources.core.material.dispose();
      resources.chevron.dispose(); resources.markerMaterial.dispose(); resources.markers.dispose();
      resources.ringGeometry.dispose(); resources.targetMaterial.dispose();
      resources.turnGeometry.dispose(); resources.turnMaterial.dispose();
    };
  }, [resources]);
  useFrame(({ clock }) => {
    const r = resourceRef.current;
    const player = playerOf(boatsRef.current);
    const points = player && guidance ? guidancePath(player.pos, player.heading, windDirRef.current, guidance) : [];
    const count = Math.min(GUIDANCE_POINTS, points.length);
    r.outline.mesh.visible = r.core.mesh.visible = r.markers.visible = r.target.visible = count >= 2;
    const turnAt = count >= 2 ? nextTurnIndex(points, count) : -1;
    r.turn.visible = turnAt >= 0;
    if (count < 2) return;
    const origin = originRef.current;
    const now = clock.elapsedTime;
    const height = (x: number, z: number) => sampleWave(x, z, now).y * calmFactor(Math.hypot(x - origin.x, z - origin.z)) + 0.2;
    const core = r.sizes.routeHalfWidth, edge = r.sizes.routeOutlineHalfWidth;
    let travelled = 0;
    let nextMarker = r.sizes.chevronFirst;
    let markerCount = 0;
    for (let i = 0; i < count; i++) {
      const point = points[i];
      const before = points[Math.max(0, i - 1)];
      const after = points[Math.min(count - 1, i + 1)];
      const dx = after.x - before.x;
      const dz = after.y - before.y;
      const norm = Math.hypot(dx, dz) || 1;
      const sideX = -dz / norm;
      const sideZ = dx / norm;
      const wx = point.x * METRES_PER_UNIT, wz = point.y * METRES_PER_UNIT;
      const y = height(wx, wz);
      const color = point.turning ? r.turning : r.leg;
      for (let e = 0; e < 2; e++) {
        const offset = i * 6 + e * 3;
        const sign = e === 0 ? -1 : 1;
        r.core.positions[offset] = wx - origin.x + sideX * core * sign;
        r.core.positions[offset + 1] = y + 0.02;
        r.core.positions[offset + 2] = wz - origin.z + sideZ * core * sign;
        r.outline.positions[offset] = wx - origin.x + sideX * edge * sign;
        r.outline.positions[offset + 1] = y;
        r.outline.positions[offset + 2] = wz - origin.z + sideZ * edge * sign;
        const colors = r.core.colors!;
        colors[offset] = color.r; colors[offset + 1] = color.g; colors[offset + 2] = color.b;
      }
      travelled += Math.hypot(point.x - before.x, point.y - before.y) * METRES_PER_UNIT;
      if (travelled >= nextMarker && markerCount < GUIDANCE_MARKERS) {
        r.dummy.position.set(wx - origin.x, y + 0.05, wz - origin.z);
        r.dummy.rotation.y = Math.atan2(-dx, -dz);
        r.dummy.updateMatrix();
        r.markers.setMatrixAt(markerCount, r.dummy.matrix);
        markerCount++;
        nextMarker = travelled + r.sizes.chevronSpacing;
      }
      if (i === turnAt) r.turn.position.set(wx - origin.x, y + 0.06, wz - origin.z);
    }
    r.outline.geometry.setDrawRange(0, (count - 1) * 6);
    r.outline.geometry.getAttribute("position").needsUpdate = true;
    r.core.geometry.setDrawRange(0, (count - 1) * 6);
    r.core.geometry.getAttribute("position").needsUpdate = true;
    r.core.geometry.getAttribute("color").needsUpdate = true;
    r.markers.count = markerCount;
    r.markers.instanceMatrix.needsUpdate = true;
    const endX = points[count - 1].x * METRES_PER_UNIT, endZ = points[count - 1].y * METRES_PER_UNIT;
    r.target.position.set(endX - origin.x, height(endX, endZ) + 0.06, endZ - origin.z);
  });
  return <group>
    <primitive object={resources.outline.mesh} /><primitive object={resources.core.mesh} />
    <primitive object={resources.markers} /><primitive object={resources.target} /><primitive object={resources.turn} />
  </group>;
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

/**
 * M2-1 chase camera ("Behind"): every frame it moves the shared orbit camera
 * part of the way to the stern view of the boat's current course (chaseStep
 * in camera.ts). While the player orbits or pinches the camera is theirs; a
 * moment after the gesture ends it comes back behind the boat at the zoom the
 * player chose. A refit (camera switch, "Reset view") forgets that zoom.
 * Runs after SailingCameraRig's controls update, so it sets the final pose.
 */
function ChaseCamera({ boatsRef, revision }: { boatsRef: MutableRefObject<Race3DBoat[]>; revision: number }) {
  const controls = useThree((state) => state.controls) as OrbitControls | null;
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const chase = useRef<ChaseState>(CHASE_START);
  const held = useRef(false);
  const zoom = useRef<number | null>(null);
  const reduced = useRef(false);
  const pose = useMemo(() => createChasePose(), []);
  useEffect(() => { chase.current = CHASE_START; zoom.current = null; }, [revision]);
  useEffect(() => {
    reduced.current = prefersReducedMotion();
    let query: MediaQueryList | null = null;
    try { query = window.matchMedia("(prefers-reduced-motion: reduce)"); } catch { return; }
    const changed = () => { reduced.current = prefersReducedMotion(); };
    query.addEventListener?.("change", changed);
    return () => query?.removeEventListener?.("change", changed);
  }, []);
  useEffect(() => {
    if (!controls) return;
    const start = () => { held.current = true; };
    const end = () => {
      held.current = false;
      zoom.current = camera.position.distanceTo(controls.target);
      chase.current = { ...chase.current, idle: 0 };
    };
    controls.addEventListener("start", start);
    controls.addEventListener("end", end);
    return () => { controls.removeEventListener("start", start); controls.removeEventListener("end", end); held.current = false; };
  }, [controls, camera]);
  useFrame((_, dt) => {
    const player = playerOf(boatsRef.current);
    if (!controls || !player) return;
    const step = chaseStep(chase.current, { heading: player.heading, dt, held: held.current, reducedMotion: reduced.current });
    chase.current = step.state;
    if (step.blend <= 0 || step.state.yaw === null) return;
    chaseCameraPose(step.state.yaw, size.width / Math.max(1, size.height), zoom.current, pose);
    camera.position.lerp(pose.position, step.blend);
    controls.target.lerp(pose.target, step.blend);
    camera.lookAt(controls.target);
  });
  return null;
}

/** Frame rate and backend over 2 s windows (quality.ts): steps the quality
 * ladder down while slow, remembers the step on the device. Held, hidden and
 * warm-up frames are not measured. */
function Quality({ onStats, cap, start, onStep, gateRef, heldRef }: {
  onStats?: (s: RaceSceneStats) => void;
  cap: number;
  start: number;
  onStep: (index: number) => void;
  gateRef: MutableRefObject<RenderGate>;
  heldRef: MutableRefObject<boolean>;
}) {
  const gl = useThree((state) => state.gl);
  // Built once per mount from the step drawn now: a Canvas rebuilt after a
  // lost GPU (key={gpu.generation}) keeps the reached step instead of going
  // back to the race's start step, which would step the quality up mid-race.
  const [governor] = useState(() => createQualityGovernor(start, cap));
  const windows = useRef(0);
  const backend = rendererBackend(gl) === "webgpu" ? "WebGPU" : "WebGL2";
  // The step the next race on this device starts at, kept when the scene leaves.
  useEffect(() => () => saveQualityStep(governor.remembered()), [governor]);
  useFrame(({ clock }) => {
    const counted = !gateRef.current.warming && !heldRef.current && document.visibilityState !== "hidden";
    const changed = governor.frame(clock.elapsedTime, counted);
    if (changed !== null) { saveQualityStep(changed); onStep(changed); }
    if (governor.windows !== windows.current && governor.fps !== null) {
      windows.current = governor.windows;
      onStats?.({ backend, fps: Math.round(governor.fps), dpr: qualityAt(governor.index, cap).dpr });
    }
  });
  return null;
}

/**
 * The scene draws itself (M2-5): while the race is held (paused: the race
 * clock stopped and the whole fleet still) it draws IDLE_FPS frames a second,
 * and at once when the camera, the canvas size or the pixel ratio changes.
 * The loop, the clock and the controls run as before, so nothing jumps on
 * resume. While shaders warm up behind the loading screen it draws nothing.
 */
function GatedRender({ gateRef, heldRef, racingRef, boatsRef, firstFrameRef, shakeRef }: {
  gateRef: MutableRefObject<RenderGate>;
  heldRef: MutableRefObject<boolean>;
  racingRef: MutableRefObject<boolean>;
  boatsRef: MutableRefObject<Race3DBoat[]>;
  firstFrameRef: MutableRefObject<number | null>;
  shakeRef: MutableRefObject<ShakeControl>;
}) {
  const draw = useMemo(() => createSceneDraw(), []);
  const viewRef = useRef(new Float64Array(VIEW_SIGNATURE_LENGTH));
  const offset = useMemo(() => new THREE.Vector3(), []);
  const controls = useThree((state) => state.controls) as OrbitControls | null;
  useFrame((state) => {
    const now = performance.now();
    const { camera, size, viewport } = state;
    // M3-5 shake: an offset added for this drawn frame only and taken back
    // after it, so the controls, the chase camera and the orbit target never
    // see it. Scaled by the camera's distance, so every camera shakes alike.
    const reach = controls ? camera.position.distanceTo(controls.target) : camera.position.length();
    const shaking = beginShakenFrame(shakeRef.current, state.clock.elapsedTime, reach, camera.position, offset);
    try {
      const view = viewRef.current;
      const p = camera.position, q = camera.quaternion, m = camera.projectionMatrix.elements;
      view[0] = p.x; view[1] = p.y; view[2] = p.z; view[3] = q.x; view[4] = q.y; view[5] = q.z; view[6] = q.w;
      view[7] = m[0]; view[8] = m[5]; view[9] = size.width; view[10] = size.height; view[11] = viewport.dpr;
      const render = draw.frame(gateRef.current, now, racingRef.current, firstFrameRef.current !== null, boatsRef.current, view);
      heldRef.current = draw.held;
      if (render) state.gl.render(state.scene, state.camera);
    } finally {
      if (shaking) endShakenFrame(camera.position, offset);
    }
  }, 1);
  return null;
}

/** Holds the first-frame report until the shaders are compiled (warmUpShaders, M2-7). */
function WarmShaders({ gateRef, children }: { gateRef: MutableRefObject<RenderGate>; children: ReactNode }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const gate = gateRef.current;
    let live = true;
    gate.warming = true;
    void warmUpShaders(gl, scene, camera).then(() => {
      if (!live) return;
      gate.warming = false;
      setWarm(true);
    });
    return () => { live = false; gate.warming = false; };
  }, [gl, scene, camera, gateRef]);
  return warm ? <>{children}</> : null;
}

/** The on-device performance journal (M0-9), see perf-journal.ts. */
function PerfJournal({ boatsRef, racingRef, firstFrameRef }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  racingRef: MutableRefObject<boolean>;
  firstFrameRef: MutableRefObject<number | null>;
}) {
  const gl = useThree((state) => state.gl);
  useEffect(() => startPerfJournal(gl, {
    backend: rendererBackend(gl),
    player: () => playerOf(boatsRef.current),
    racing: () => racingRef.current,
    firstFrameMs: () => firstFrameRef.current,
  }), [gl, boatsRef, racingRef, firstFrameRef]);
  return null;
}

/** Inside the failure boundary: a second lost device becomes the scene's error screen. */
function GpuFailure({ failed }: { failed: boolean }) {
  if (failed) throw new Error("GPU device lost twice");
  return null;
}

export const RaceScene = memo(function RaceScene({ boatsRef, courseRef, windDirRef, venue, camera = "orbit", cameraRevision = 0, maxDpr = 2, labels, onStats, onReady, guidance, showWind = false, ghostRef, ghostLabel, racing, raceProfile = null, contactId, started, softLight = false, sailFlow = false, sailFlowCoachRef, sailFlowOwnTrim = false }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  courseRef: MutableRefObject<Race3DCourse>;
  windDirRef: MutableRefObject<number>;
  venue: Venue;
  /** All three presets support free orbit and pinch/scroll zoom; "stern"
   * (Behind) also follows the course and returns after a manual orbit. */
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
  /** Your recorded ghost (P09). Drawn like a rival from its own ref, so it is
   * never part of the fleet, ranks, collisions or rules. */
  ghostRef?: MutableRefObject<Race3DBoat[]>;
  ghostLabel?: string;
  /** Optional: true only while the race clock runs (not countdown, pause or results).
   * Without it the performance journal counts the time the fleet is moving. */
  racing?: boolean;
  /** The physical trial being sailed (ADR-0014), or null for the legacy race.
   * The tactical overlays take their sizes and the course boundary from it. */
  raceProfile?: PhysicalRaceProfile | null;
  /** M3-5: id of the current contact frame (the race feedback bus); a new id shakes the camera. */
  contactId?: number | null;
  /** M3-5: false through the countdown, true from the start gun; the change shakes the camera once. */
  started?: boolean;
  /** F4: the player's "Softer light, clearer marks" (race Settings): less glare, larger marks with a dark ring. */
  softLight?: boolean;
  /** F6: the player's "Wind on the sails" (race Settings): apparent-wind ribbons along the player's sails only. */
  sailFlow?: boolean;
  /** F6: the Pro trim advice the player is shown (null without it); colours the ribbons like telltales. */
  sailFlowCoachRef?: MutableRefObject<CoachKey | null>;
  /** F6: the player trims the sails (Pro); without advice the ribbons then only show the arriving air. */
  sailFlowOwnTrim?: boolean;
}) {
  const originRef = useRef({ x: 0, z: 0 });
  const windLayers = raceWindLayers(showWind, sailFlow);
  const markLook = useMemo(() => raceLight(venueLook(venue.id), softLight).mark, [venue.id, softLight]);
  const tactics = useMemo(() => raceTacticsModel(raceProfile), [raceProfile]);
  const arrowRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const mountedAt = useRef<number | null>(null);
  const firstFrameRef = useRef<number | null>(null);
  const racingRef = useRef(racing ?? true);
  useEffect(() => { racingRef.current = racing ?? true; }, [racing]);
  // M2-5 quality: one ladder step for pixel ratio and scene profile, from the
  // device memory, then measured (quality.ts). The Canvas takes the step's
  // pixel ratio as a number: a range would be re-applied on every re-render.
  const cap = useMemo(() => Math.min(maxDpr, initialDpr(typeof window === "undefined" ? 1 : window.devicePixelRatio)), [maxDpr]);
  const [qualityStart] = useState(loadQualityStep);
  const [qualityStep, setQualityStep] = useState(() => settle(qualityStart, cap));
  const { dpr, profile } = qualityAt(qualityStep, cap);
  const farPxRef = useRef(profile.rivalFarPx);
  useEffect(() => { farPxRef.current = profile.rivalFarPx; }, [profile]);
  const profileRef = useRef<SceneQuality>(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  // M3-5: contact and start gun become a camera shake on the next drawn frame.
  const reducedMotion = useReducedMotionRef();
  const [shakeControl] = useState(() => createSceneShake(profileRef, reducedMotion));
  const shakeRef = useRef<ShakeControl>(shakeControl);
  useEffect(() => { shakeControl.feed(contactId, started); }, [contactId, started, shakeControl]);
  const gateRef = useRef<RenderGate>(createRenderGate());
  const heldRef = useRef(false);
  useEffect(() => { mountedAt.current = performance.now(); recordSceneLifecycle("scene", "begin"); }, []);
  const sceneReady = useCallback(() => {
    if (firstFrameRef.current === null && mountedAt.current !== null) firstFrameRef.current = performance.now() - mountedAt.current;
    onReady?.();
  }, [onReady]);
  // M0-8: one remount on WebGL2 after a lost device, then the failure screen.
  const [gpu, setGpu] = useState<GpuRecovery>(INITIAL_GPU_RECOVERY);
  const gl = useMemo(() => {
    const generation = gpu.generation;
    return sailingRenderer({ forceWebGL: gpu.forceWebGL, onLost: () => setGpu((state) => afterGpuLoss(state, generation)) });
  }, [gpu.generation, gpu.forceWebGL]);
  const retryAfterGpuFailure = useCallback(() => setGpu(afterGpuRetry), []);
  // The automatic retry and the final failure, once each; the loss itself is
  // journalled by the renderer with the backend that lost its device.
  const gpuJournalled = useRef("");
  useEffect(() => {
    const key = gpu.failed ? `failed:${gpu.generation}` : gpu.generation === 1 ? "retry" : "";
    if (!key || gpuJournalled.current === key) return;
    gpuJournalled.current = key;
    recordGpuEvent(gpu.failed ? "failed" : "retry", "webgl2", gpu.generation);
  }, [gpu.failed, gpu.generation]);
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
    <SceneBoundary modelUrl={YACHT_MODEL_URL} errorLabel={labels.error} retryLabel={labels.retry} onRetry={retryAfterGpuFailure}>
      <GpuFailure failed={gpu.failed} />
      <SceneStartup label={labels.loading} onReady={sceneReady}>{ready =>
      <div className="relative h-full w-full" data-scene="next">
        <Canvas
          key={gpu.generation}
          fallback={<span>{labels.scene}</span>}
          gl={gl}
          dpr={dpr}
          camera={{ position: [26, 18, 32], fov: 42, near: 0.5, far: 4200 }}
        >
          <SailingEnvironment venue={venue} look={venueLook(venue.id)} soft={softLight} readState={readState} readBoats={readBoats} originRef={originRef} quality={profile} />
          <World venue={venue} courseRef={courseRef} boatsRef={boatsRef} originRef={originRef} targetLabel={targetLabel} land={false} marks={markLook} />
          {guidance && <WaterGuidance boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} guidance={guidance} model={tactics} />}
          <TacticalOverlay boatsRef={boatsRef} courseRef={courseRef} windDirRef={windDirRef} originRef={originRef} model={tactics} arrowRef={arrowRef} hintRef={hintRef} />
          <Suspense fallback={null}>
            <Player boatsRef={boatsRef} windDirRef={windDirRef} showWind={windLayers.arrows} />
            <BowSpray boatsRef={boatsRef} profileRef={profileRef} />
            {windLayers.ribbons && <SailFlow boatsRef={boatsRef} windDirRef={windDirRef} coachRef={sailFlowCoachRef} ownTrim={sailFlowOwnTrim} />}
            {rivals.map((r) => <Rival key={r.id} id={r.id} color={r.color} label={r.label} boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} farPxRef={farPxRef} />)}
            {ghostRef && ghostLabel && <Rival id="ghost" color="#9aa7b4" label={ghostLabel} boatsRef={ghostRef} windDirRef={windDirRef} originRef={originRef} farPxRef={farPxRef} />}
            <WarmShaders gateRef={gateRef}><FirstSceneFrame onReady={ready} /></WarmShaders>
          </Suspense>
          <SailingCameraRig poseForAspect={cameraPose} revision={cameraRevision} />
          {camera === "stern" && <ChaseCamera boatsRef={boatsRef} revision={cameraRevision} />}
          <Quality key={cap} onStats={onStats} cap={cap} start={qualityStep} onStep={setQualityStep} gateRef={gateRef} heldRef={heldRef} />
          <GatedRender gateRef={gateRef} heldRef={heldRef} racingRef={racingRef} boatsRef={boatsRef} firstFrameRef={firstFrameRef} shakeRef={shakeRef} />
          <PerfJournal boatsRef={boatsRef} racingRef={racingRef} firstFrameRef={firstFrameRef} />
        </Canvas>
        <TacticalScreenLayer arrowRef={arrowRef} hintRef={hintRef} />
      </div>
      }</SceneStartup>
    </SceneBoundary>
  );
});
