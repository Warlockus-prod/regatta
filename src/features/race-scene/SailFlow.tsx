'use client';

import { useEffect, useMemo, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { METRES_PER_UNIT, NO_GO_DEG, racePose, type Race3DBoat } from "@/features/race-3d/pose";
import { raceWindReading } from "@/features/race-hud/navigation-model";
import { sampleWave } from "@/features/simulator-3d/ocean/waves";
import type { CoachKey } from "@/features/sailing-lab/runtime/trim-coach";
import { useReducedMotionRef } from "./BowSpray";
import {
  SAIL_FLOW_MAX_RIBBONS, sailFlowColour, sailFlowFromCoach, sailFlowFromWind, sailFlowIntensity,
  sailFlowRibbons, sailFlowSpeed, sampleSailFlow, type SailFlowRibbon,
} from "./sail-flow";

const DEG = Math.PI / 180;
/** Dashes travelling along each ribbon. */
export const SAIL_FLOW_DASHES = 6;
const CAPACITY = SAIL_FLOW_MAX_RIBBONS * SAIL_FLOW_DASHES;
/** The ribbon paths are rebuilt ten times a second; the sails' angles, the heel, the swell and the dashes move every frame. */
const REBUILD_S = 0.1;
const DASH_M = 1.4;
/** Where the static arrowhead of a ribbon sits with reduced motion. */
const HEAD_AT = 0.96;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** The yacht's ride on the swell: heave (m), roll and pitch (rad). */
export interface SwellAttitude { heave: number; roll: number; pitch: number }

/**
 * The swell under a yacht at (x, z) world metres turned by `yaw` (rad), sampled
 * at the same four hull points and with the same gains as Yacht.tsx, so
 * anything that sits on the yacht's sails rides the waves with them. Writes
 * into `out`, no allocation.
 */
export function yachtSwellAttitude(x: number, z: number, yaw: number, t: number, out: SwellAttitude): SwellAttitude {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const at = (lx: number, lz: number) => sampleWave(lx * c + lz * s + x, -lx * s + lz * c + z, t).y;
  out.heave = at(0, 0);
  out.roll = Math.atan2(at(0, 1.6) - at(0, -1.6), 3.2) * 0.5;
  out.pitch = Math.atan2(at(5.8, 0) - at(-5.8, 0), 11.6) * 0.6;
  return out;
}

/**
 * F6 "Wind on the sails" (race Settings, off by default): apparent-wind
 * ribbons at the player's yacht (sail-flow.ts), drawn as two instanced meshes
 * (dashes and arrowheads), so two draws however many ribbons. The ribbons live
 * in the yacht's frame under groups posed like the yacht's own (Yacht.tsx):
 * turned, heeled and riding the swell's heave, roll and pitch, with the boom,
 * jib and heel eased every frame at the yacht's rate, so they stay on the
 * sails through a tack and in waves. Direction and strength come from the
 * race state each frame (raceWindReading, the same apparent wind as the wind
 * instrument). With trim advice (Pro with trim hints: the race's own trim
 * coach in `coachRef`) the ribbons take telltale colours and each sail's shape
 * of flow; without it they are white: in Simple mode (the race trims) they
 * bend along drawing sails, in Pro (`ownTrim`, the flow is unknown) they only
 * show the air arriving at the luff, and in the no-go zone they pass straight.
 * Reduced motion: the dashes stand still and an arrowhead shows the direction.
 * Hidden as one zero-size dash and head, never `visible = false`, so the
 * shader warm-up compiles both pipelines (as BowSpray does). Rivals get none:
 * only the player's boat.
 */
export function SailFlow({ boatsRef, windDirRef, coachRef, ownTrim = false }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  windDirRef: MutableRefObject<number>;
  /** The Pro trim advice shown to the player, or null (Simple mode, trim hints off). */
  coachRef?: MutableRefObject<CoachKey | null>;
  /** The player trims the sails (Pro): without advice the flow round them is not drawn. */
  ownTrim?: boolean;
}) {
  const reduced = useReducedMotionRef();
  const r = useMemo(() => {
    const dashGeometry = new THREE.BoxGeometry(1, 0.2, 0.2);
    const headGeometry = new THREE.ConeGeometry(0.3, 0.8, 6);
    headGeometry.rotateZ(-Math.PI / 2); // the tip along +X, the dashes' axis
    const dashMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
    const headMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
    const dashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, CAPACITY);
    const heads = new THREE.InstancedMesh(headGeometry, headMaterial, SAIL_FLOW_MAX_RIBBONS);
    const white = new THREE.Color("#ffffff");
    for (const [mesh, n] of [[dashes, CAPACITY], [heads, SAIL_FLOW_MAX_RIBBONS]] as const) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.renderOrder = 6;
      // Colours exist from the start, so the pipeline does not change when the first colour arrives.
      for (let i = 0; i < n; i++) mesh.setColorAt(i, white);
      // One instance of zero size keeps the pipeline in the shader warm-up while nothing is drawn.
      mesh.setMatrixAt(0, ZERO);
      mesh.count = 1;
    }
    const heel = new THREE.Group();
    heel.add(dashes, heads);
    const yaw = new THREE.Group();
    yaw.add(heel);
    return {
      dashGeometry, headGeometry, dashMaterial, headMaterial, dashes, heads, heel, yaw,
      ribbons: [] as SailFlowRibbon[], colours: [] as string[], rebuiltAt: -Infinity, travel: 0, drawn: false,
      smooth: { boom: 0, jib: 0, heel: 0, primed: false },
      swell: { heave: 0, roll: 0, pitch: 0 } as SwellAttitude,
      matrix: new THREE.Matrix4(), quaternion: new THREE.Quaternion(), position: new THREE.Vector3(), scale: new THREE.Vector3(),
      direction: new THREE.Vector3(), at: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: 0 }, colour: new THREE.Color(),
    };
  }, []);
  useEffect(() => () => {
    r.dashGeometry.dispose(); r.headGeometry.dispose(); r.dashMaterial.dispose(); r.headMaterial.dispose();
    r.dashes.dispose(); r.heads.dispose();
  }, [r]);
  /** Back to the one zero-size dash; `forget` (no boat or no wind) also drops the eased pose and the paths. */
  const hide = (forget: boolean) => {
    if (forget) { r.smooth.primed = false; r.ribbons = []; r.rebuiltAt = -Infinity; }
    if (!r.drawn) return;
    r.drawn = false;
    for (const mesh of [r.dashes, r.heads]) {
      mesh.setMatrixAt(0, ZERO);
      mesh.count = 1;
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  useFrame(({ clock }, dt) => {
    const boats = boatsRef.current;
    let player: Race3DBoat | undefined;
    for (let i = 0; i < boats.length; i++) if (boats[i].isPlayer) { player = boats[i]; break; }
    const reading = player ? raceWindReading({ heading: player.heading, boatSpeedKn: player.speed, windFrom: windDirRef.current,
      windKnots: player.physics?.trueWindSpeed, leeway: player.physics?.leeway }) : null;
    const aws = reading?.apparentKnots ?? Number.NaN;
    const intensity = sailFlowIntensity(aws);
    if (!player || !reading || reading.awaSigned === null || intensity === 0) { hide(true); return; }
    const t = clock.elapsedTime;
    // The sails and the heel ease toward the race pose every frame at Yacht.tsx's rate, snapping on the first frame.
    const pose = racePose(player, windDirRef.current);
    const k = r.smooth.primed ? Math.min(1, dt * 8) : 1;
    r.smooth.boom += (pose.boomAngle - r.smooth.boom) * k;
    r.smooth.jib += (pose.jibAngle - r.smooth.jib) * k;
    r.smooth.heel += (pose.heel - r.smooth.heel) * k;
    r.smooth.primed = true;
    if (t - r.rebuiltAt >= REBUILD_S || t < r.rebuiltAt) {
      r.rebuiltAt = t;
      const coach = sailFlowFromCoach(coachRef?.current ?? null);
      const fallback = sailFlowFromWind(Math.abs(reading.twaSigned) < NO_GO_DEG, ownTrim);
      r.ribbons = sailFlowRibbons({ awa: reading.awaSigned, aws, boomAngle: r.smooth.boom, jibAngle: r.smooth.jib,
        mainTwist: pose.twist, jibTwist: pose.jibShape?.twist, reef: pose.reef, jibFurl: pose.jibShape?.furl, mainHoisted: pose.mainHoisted,
        main: coach?.main ?? fallback, jib: coach?.jib ?? fallback });
      let changed = false;
      for (let i = 0; i < r.ribbons.length; i++) {
        const colour = sailFlowColour(r.ribbons[i].shape, coach !== null);
        if (r.colours[i] === colour) continue;
        r.colours[i] = colour;
        changed = true;
        r.colour.set(colour);
        for (let d = 0; d < SAIL_FLOW_DASHES; d++) r.dashes.setColorAt(i * SAIL_FLOW_DASHES + d, r.colour);
        r.heads.setColorAt(i, r.colour);
      }
      if (changed) {
        if (r.dashes.instanceColor) r.dashes.instanceColor.needsUpdate = true;
        if (r.heads.instanceColor) r.heads.instanceColor.needsUpdate = true;
      }
    }
    const ribbons = r.ribbons;
    if (ribbons.length === 0) { hide(false); return; }
    const x = player.pos.x * METRES_PER_UNIT, z = player.pos.y * METRES_PER_UNIT;
    const yaw = (90 - player.heading) * DEG;
    const swell = yachtSwellAttitude(x, z, yaw, t, r.swell);
    r.yaw.rotation.y = yaw;
    r.yaw.position.y = swell.heave;
    r.heel.rotation.x = r.smooth.heel * DEG + swell.roll;
    r.heel.rotation.z = swell.pitch;
    const still = reduced.current;
    if (!still) r.travel += Math.min(dt, 0.1) * sailFlowSpeed(aws);
    r.dashMaterial.opacity = 0.3 + 0.6 * intensity;
    r.headMaterial.opacity = 0.4 + 0.55 * intensity;
    const thickness = 0.6 + 0.4 * intensity;
    for (let i = 0; i < ribbons.length; i++) {
      const ribbon = ribbons[i];
      for (let d = 0; d < SAIL_FLOW_DASHES; d++) {
        // Evenly spaced along the ribbon, moving downwind with the air; standing still with reduced motion.
        const along = still ? (d + 0.5) / SAIL_FLOW_DASHES
          : (((r.travel / ribbon.length + d / SAIL_FLOW_DASHES) % 1) + 1) % 1;
        sampleSailFlow(ribbon, along, r.at, r.dir);
        // Thin at both ends, so a dash fades in upwind and out downwind instead of popping.
        const fade = Math.sin(Math.PI * along);
        r.position.set(r.at.x, r.at.y, r.at.z);
        r.quaternion.setFromUnitVectors(X_AXIS, r.direction.set(r.dir.x, r.dir.y, r.dir.z));
        r.scale.set(DASH_M * (0.35 + 0.65 * fade), thickness * fade, thickness * fade);
        r.dashes.setMatrixAt(i * SAIL_FLOW_DASHES + d, r.matrix.compose(r.position, r.quaternion, r.scale));
      }
      if (still) {
        sampleSailFlow(ribbon, HEAD_AT, r.at, r.dir);
        r.position.set(r.at.x, r.at.y, r.at.z);
        r.quaternion.setFromUnitVectors(X_AXIS, r.direction.set(r.dir.x, r.dir.y, r.dir.z));
        r.heads.setMatrixAt(i, r.matrix.compose(r.position, r.quaternion, r.scale.set(1, 1, 1)));
      }
    }
    // Without arrowheads (moving dashes) one zero-size head stays, so its pipeline stays compiled.
    if (!still) r.heads.setMatrixAt(0, ZERO);
    r.dashes.count = ribbons.length * SAIL_FLOW_DASHES;
    r.heads.count = still ? ribbons.length : 1;
    r.dashes.instanceMatrix.needsUpdate = true;
    r.heads.instanceMatrix.needsUpdate = true;
    r.drawn = true;
  });
  return <primitive object={r.yaw} />;
}
