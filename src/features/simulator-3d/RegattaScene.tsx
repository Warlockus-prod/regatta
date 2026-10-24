'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, memo, type MutableRefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Yacht } from './Yacht';
import { WindFlow } from "./ocean/WindFlow";
import type { Venue } from '../../data/venues/venues';
import type { YachtState } from './types';
import type { OrbitControls as Controls } from "three-stdlib";
import { fitCamera, fitSailCamera, fitMainsheetCamera, type CameraView } from "./camera";
import { SceneBoundary, reportScene } from "./SceneBoundary";
import { YACHT_MODEL_URL } from "./config";
import { SailingEnvironment } from "@/features/race-scene/SailingEnvironment";
import { createSailingRenderer } from "@/features/race-scene/renderer";
import { trainerChartOrigin } from "@/features/race-scene/environment-state";
import { METRES_PER_UNIT } from "@/features/race-3d/pose";
import { RACE_AREA } from "@/data/venues/geometry";

function CameraFit({ view, revision, stateRef }: { view: CameraView; revision: number; stateRef: MutableRefObject<YachtState> }) {
  const { camera, controls, size } = useThree();
  useEffect(() => {
    const detail = view === "main" || view === "jib";
    const bounds = view === "deck"
      ? [new THREE.Vector3(-7, -0.2, -2.5), new THREE.Vector3(7, 4.5, 2.5)]
      : [new THREE.Vector3(-7, -0.5, -4), new THREE.Vector3(7, 20.5, 4)];
    const side = Math.sign(stateRef.current.boomAngle) || 1;
    const dir = view === "stern" ? new THREE.Vector3(-1, 0.14, side * 0.12)
      : view === "sails" ? new THREE.Vector3(0.3, 0.08, -side) : new THREE.Vector3(-0.8, view === "deck" ? 0.8 : 0.18, -side);
    const silhouette = view === "deck" || detail ? undefined : [
      [-7, 0, -2.3], [-7, 0, 2.3], [7, 0, -2.3], [7, 0, 2.3],
      [0.3, 20.5, 0], [-1, 19, -1], [1, 19, 1],
      [-5, 4, -5], [-5, 4, 5], [6.3, 1.5, 0],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const fit = view === "mainsheet" ? fitMainsheetCamera(stateRef.current, size.width / size.height) : view === "main" || view === "jib"
      ? fitSailCamera(view, stateRef.current, size.width / size.height)
      : fitCamera(bounds[0], bounds[1], dir, size.width / size.height, 42, 1.12, silhouette);
    // Presets are relative to the yacht, even after steering to another heading.
    const yaw = (90 - (stateRef.current.heading ?? 90)) * Math.PI / 180;
    fit.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    fit.target.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    camera.position.copy(fit.position);
    camera.lookAt(fit.target);
    if (controls) {
      (controls as Controls).target.copy(fit.target);
      (controls as Controls).update();
    }
  }, [camera, controls, size.width, size.height, view, revision, stateRef]);
  return null;
}

function ContextHealth() {
  const { gl } = useThree();
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (event: Event) => { event.preventDefault(); setLost(true); };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl]);
  if (lost) throw new Error("WebGL context lost");
  return null;
}

function Ready() {
  useEffect(() => { reportScene("scene-ready"); }, []);
  return null;
}

// ============================================================================
// RegattaScene - the R3F canvas for the V2 3D simulator.
//
// The race and trainer share the same TSL sea, shore, sky, lighting and
// WebGPU/WebGL2 renderer. OrbitControls and the equipment camera presets
// remain specific to training. All reflection lighting is generated locally.
// ============================================================================

// Shown while the 2.3 MB GLB downloads/parses. Before this existed the user
// stared at an empty ocean for up to tens of seconds with no feedback (live
// testing measured 26 s on a cold dev load).
function YachtLoading({ label }: { label: string }) {
  return (
    <Html center>
      <div
        role="status"
        aria-label={label}
        style={{
          width: 46,
          height: 46,
          border: '3px solid rgba(0,212,255,0.25)',
          borderTopColor: '#00d4ff',
          borderRadius: '50%',
          animation: 'regatta-spin 0.9s linear infinite',
        }}
      />
      <style>{'@keyframes regatta-spin { to { transform: rotate(360deg); } }'}</style>
    </Html>
  );
}

export const RegattaScene = memo(function RegattaScene({
  stateRef,
  maxDpr = 2,
  view = "whole",
  revision = 0,
  loadingLabel,
  showFlow = true,
  sceneLabel,
  errorLabel,
  retryLabel,
  venue,
}: {
  stateRef: MutableRefObject<YachtState>;
  /** The same venue geometry as the race, centred on the trainer's start. */
  venue?: Venue;
  view?: CameraView;
  revision?: number;
  showFlow?: boolean;
  loadingLabel: string;
  sceneLabel: string;
  errorLabel: string;
  retryLabel: string;
  /** Cap devicePixelRatio (1.5 in the mobile WebView embed to save fill rate). */
  maxDpr?: number;
  /** Legacy caller compatibility. The shared TSL renderer uses its own tone
   * mapping; the old WebGL-only EffectComposer is no longer mounted. */
  postFx?: boolean;
}) {
  const originRef = useRef({ x: 0, z: 0 });
  const readState = useCallback(() => stateRef.current, [stateRef]);
  const chartOrigin = useMemo(() => trainerChartOrigin(RACE_AREA, METRES_PER_UNIT), []);
  return (
    <SceneBoundary modelUrl={YACHT_MODEL_URL} errorLabel={errorLabel} retryLabel={retryLabel}>
    <Canvas
      fallback={<span>{sceneLabel}</span>}
      dpr={[1, maxDpr]}
      camera={{ position: [26, 18, 32], fov: 42, near: 0.5, far: 4200 }}
      gl={createSailingRenderer}
    >
      <SailingEnvironment venue={venue} readState={readState} originRef={originRef} chartOrigin={chartOrigin} />

      <Suspense fallback={<YachtLoading label={loadingLabel} />}>
        <Yacht stateRef={stateRef} light={maxDpr <= 1} />
        <Ready />
      </Suspense>

      {showFlow && <WindFlow stateRef={stateRef} />}

      <OrbitControls
        makeDefault
        target={[0, 10, 0]}
        enablePan={false}
        minDistance={view === "mainsheet" ? 2.5 : 9}
        maxDistance={120}
        maxPolarAngle={Math.PI / 2.04}
        enableDamping
        dampingFactor={0.08}
      />
      <ContextHealth />
      <CameraFit view={view} revision={revision} stateRef={stateRef} />
    </Canvas>
    </SceneBoundary>
  );
});
