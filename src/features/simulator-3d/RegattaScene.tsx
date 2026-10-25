'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, memo, type MutableRefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Yacht } from './Yacht';
import { WindFlow } from "./ocean/WindFlow";
import type { Venue } from '../../data/venues/venues';
import type { YachtState } from './types';
import { fitYachtCamera, type CameraView } from "./camera";
import { SailingCameraRig } from "./SailingCameraRig";
import { SceneBoundary } from "./SceneBoundary";
import { FirstSceneFrame, SceneStartup } from "./SceneStartup";
import { YACHT_MODEL_URL } from "./config";
import { SailingEnvironment } from "@/features/race-scene/SailingEnvironment";
import { createSailingRenderer } from "@/features/race-scene/renderer";
import { trainerChartOrigin } from "@/features/race-scene/environment-state";
import { METRES_PER_UNIT } from "@/features/race-3d/pose";
import { RACE_AREA } from "@/data/venues/geometry";

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

// ============================================================================
// RegattaScene - the R3F canvas for the V2 3D simulator.
//
// The race and trainer share the same TSL sea, shore, sky, lighting and
// WebGPU/WebGL2 renderer. OrbitControls and the equipment camera presets
// remain specific to training. All reflection lighting is generated locally.
// ============================================================================

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
  const cameraPose = useCallback((aspect: number) => fitYachtCamera(view, stateRef.current, aspect), [stateRef, view]);
  const chartOrigin = useMemo(() => trainerChartOrigin(RACE_AREA, METRES_PER_UNIT), []);
  return (
    <SceneBoundary modelUrl={YACHT_MODEL_URL} errorLabel={errorLabel} retryLabel={retryLabel}>
    <SceneStartup label={loadingLabel}>{ready =>
    <Canvas
      fallback={<span>{sceneLabel}</span>}
      dpr={[1, maxDpr]}
      camera={{ position: [26, 18, 32], fov: 42, near: 0.5, far: 4200 }}
      gl={createSailingRenderer}
    >
      <SailingEnvironment venue={venue} readState={readState} originRef={originRef} chartOrigin={chartOrigin} />

      <Suspense fallback={null}>
        <Yacht stateRef={stateRef} light={maxDpr <= 1} />
        <FirstSceneFrame onReady={ready} />
      </Suspense>

      {showFlow && <WindFlow stateRef={stateRef} />}

      <SailingCameraRig
        poseForAspect={cameraPose}
        revision={revision}
        minDistance={view === "mainsheet" ? 2.5 : 9}
        maxDistance={120}
      />
      <ContextHealth />
    </Canvas>
    }</SceneStartup>
    </SceneBoundary>
  );
});
