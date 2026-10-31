'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { WAVES } from "@/features/simulator-3d/ocean/waves";
import { prefersReducedMotion } from "@/features/race-hud/feedback";
import type { Race3DBoat } from "@/features/race-3d/pose";
import { METRES_PER_UNIT } from "@/features/race-3d/pose";
import { PALETTE } from "./materials";
import { createSprayField, sprayIntensity, SPRAY_CAPACITY, SPRAY_STILL_MS } from "./effects";
import { createFleetHeldWatch, type SceneQuality } from "./quality";

const DEG = Math.PI / 180;

/** prefers-reduced-motion as a ref, kept current when the setting changes. */
export function useReducedMotionRef(): MutableRefObject<boolean> {
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = prefersReducedMotion();
    let query: MediaQueryList | null = null;
    try { query = window.matchMedia("(prefers-reduced-motion: reduce)"); } catch { return; }
    const changed = () => { reduced.current = prefersReducedMotion(); };
    query?.addEventListener?.("change", changed);
    return () => query?.removeEventListener?.("change", changed);
  }, []);
  return reduced;
}

/** Heave of the shared wave field at race metres (x, z), as the yacht rides it; no allocation. */
function heave(x: number, z: number, t: number): number {
  let y = 0;
  for (const w of WAVES) y += w.amp * Math.sin(((2 * Math.PI) / w.len) * (w.dirX * x + w.dirZ * z) + t * w.speed);
  return y;
}

/** Half the hull length the yacht samples for its pitch (Yacht.tsx): bow and stern points, metres. */
const PITCH_HALF_M = 5.8;

/** Wave height at a point of the yacht's frame (+X bow, +Z starboard), as Yacht.tsx samples it. */
function heaveAt(localX: number, localZ: number, yaw: number, x: number, z: number, t: number): number {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return heave(localX * c + localZ * s + x, -localX * s + localZ * c + z, t);
}

/**
 * M3-5: white spray thrown from the player's bow (effects.ts). One instanced
 * mesh of SPRAY_CAPACITY small droplets, allocated once and drawn in the
 * scene's one pass; each frame only writes the live droplets' matrices. The
 * droplets live in the yacht's frame, under a group turned like the yacht,
 * so the spray rides with the boat: its heave and its pitch, sampled as
 * Yacht.tsx does. Hidden on the "low" profile and with reduced motion, emptied
 * while the player's boat is missing; a boat that has not moved for SPRAY_STILL_MS
 * (paused race or replay) throws no new spray, so the live droplets fall away. Rivals throw none: at their distance it would be a few
 * pixels for another draw and another update per boat.
 */
export function BowSpray({ boatsRef, profileRef }: {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  profileRef: MutableRefObject<SceneQuality>;
}) {
  const reduced = useReducedMotionRef();
  const resources = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshBasicMaterial({ color: PALETTE.foam, transparent: true, opacity: 0.82, depthWrite: false });
    const mesh = new THREE.InstancedMesh(geometry, material, SPRAY_CAPACITY);
    mesh.frustumCulled = false;
    mesh.renderOrder = 6;
    // One droplet of zero size keeps the pipeline in the shader warm-up while nothing sprays.
    mesh.count = 1;
    mesh.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0));
    const group = new THREE.Group();
    group.add(mesh);
    return { geometry, material, mesh, group, field: createSprayField(), matrix: new THREE.Matrix4(),
      still: createFleetHeldWatch(SPRAY_STILL_MS), one: [] as Race3DBoat[], drawn: { live: 0 } };
  }, []);
  useEffect(() => () => { resources.geometry.dispose(); resources.material.dispose(); resources.mesh.dispose(); }, [resources]);
  useFrame(({ clock }, dt) => {
    const { mesh, group, field, matrix, still, one, drawn } = resources;
    const boats = boatsRef.current;
    let player: Race3DBoat | undefined;
    for (let i = 0; i < boats.length; i++) if (boats[i].isPlayer) { player = boats[i]; break; }
    const profile = profileRef.current;
    const enabled = !reduced.current && profile.spray > 0;
    mesh.visible = enabled;
    if (!enabled || !player) {
      field.clear();
      // Off, or no player's boat (a frame without it): back to the one empty
      // droplet, so nothing is left hanging when the spray shows again.
      if (drawn.live > 0) {
        mesh.setMatrixAt(0, matrix.makeScale(0, 0, 0));
        mesh.count = 1;
        mesh.instanceMatrix.needsUpdate = true;
      }
      drawn.live = 0;
      return;
    }
    const t = clock.elapsedTime;
    one[0] = player;
    const moving = !still(t * 1000, one);
    const intensity = moving ? sprayIntensity(player.speed, player.physics?.heel ?? 0, profile, reduced.current) : 0;
    const live = field.step(dt, intensity);
    const yaw = (90 - player.heading) * DEG;
    const x = player.pos.x * METRES_PER_UNIT, z = player.pos.y * METRES_PER_UNIT;
    const pitch = Math.atan2(heaveAt(PITCH_HALF_M, 0, yaw, x, z, t) - heaveAt(-PITCH_HALF_M, 0, yaw, x, z, t), 2 * PITCH_HALF_M) * 0.6;
    group.rotation.y = yaw;
    group.rotation.z = pitch;
    group.position.y = heave(x, z, t);
    if (live === 0 && drawn.live === 0) return;
    for (let i = 0; i < live; i++) {
      const s = field.size[i];
      matrix.makeScale(s, s, s).setPosition(field.x[i], field.y[i], field.z[i]);
      mesh.setMatrixAt(i, matrix);
    }
    if (live === 0) mesh.setMatrixAt(0, matrix.makeScale(0, 0, 0));
    mesh.count = Math.max(1, live);
    drawn.live = live;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={resources.group} />;
}
