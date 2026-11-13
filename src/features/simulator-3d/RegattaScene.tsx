'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, memo, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Yacht } from './Yacht';
import { WindFlow } from "./ocean/WindFlow";
import type { Venue } from '../../data/venues/venues';
import type { YachtState } from './types';
import { fitYachtCamera, type CameraView } from "./camera";
import { StageCameraRig, StageView } from "./stage-view";
import { SceneBoundary } from "./SceneBoundary";
import { FirstSceneFrame, SceneStartup } from "./SceneStartup";
import { YACHT_MODEL_URL } from "./config";
import { SailingEnvironment } from "@/features/race-scene/SailingEnvironment";
import { createSailingRenderer } from "@/features/race-scene/renderer";
import { trainerChartOrigin } from "@/features/race-scene/environment-state";
import { METRES_PER_UNIT } from "@/features/race-3d/pose";
import { RACE_AREA } from "@/data/venues/geometry";
import { venueLook } from "@/data/venues/look";
import { createQualityGovernor, initialDpr, loadQualityStep, qualityAt, settle } from "@/features/race-scene/quality";

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

/**
 * Package 32 stage D: the trainers use the race's quality ladder (pixel ratio
 * and scene profile, src/features/race-scene/quality.ts) instead of a fixed
 * low pixel ratio, so the picture is sharp on a fast phone and steps down on a
 * slow one. They start from the step the race reached on this device and do
 * not write it back: the race stays the one that remembers.
 */
function TrainerQuality({ cap, start, onStep }: { cap: number; start: number; onStep: (index: number) => void }) {
  const [governor] = useState(() => createQualityGovernor(start, cap));
  useFrame(({ clock }) => {
    const changed = governor.frame(clock.elapsedTime, document.visibilityState !== "hidden");
    if (changed !== null) onStep(changed);
  });
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
  children,
  cameraRig,
  onReady,
  onError,
}: {
  stateRef: MutableRefObject<YachtState>;
  /** The same venue geometry as the race, centred on the trainer's start. */
  venue?: Venue;
  /** Optional inspection-lab content; regular training keeps its own camera. */
  children?: ReactNode;
  cameraRig?: ReactNode;
  onReady?: () => void;
  onError?: () => void;
  view?: CameraView;
  revision?: number;
  showFlow?: boolean;
  loadingLabel: string;
  sceneLabel: string;
  errorLabel: string;
  retryLabel: string;
  /** Highest pixel ratio the quality ladder may use; 1 keeps the scene on its lightest picture (weak devices). */
  maxDpr?: number;
  /** Legacy caller compatibility. The shared TSL renderer uses its own tone
   * mapping; the old WebGL-only EffectComposer is no longer mounted. */
  postFx?: boolean;
}) {
  const originRef = useRef({ x: 0, z: 0 });
  const readState = useCallback(() => stateRef.current, [stateRef]);
  const cameraPose = useCallback((aspect: number) => fitYachtCamera(view, stateRef.current, aspect), [stateRef, view]);
  const chartOrigin = useMemo(() => trainerChartOrigin(RACE_AREA, METRES_PER_UNIT), []);
  const look = useMemo(() => venueLook(venue?.id), [venue?.id]);
  const cap = useMemo(() => Math.min(maxDpr, initialDpr(typeof window === "undefined" ? 1 : window.devicePixelRatio)), [maxDpr]);
  const [qualityStart] = useState(loadQualityStep);
  const [qualityStep, setQualityStep] = useState(() => settle(qualityStart, cap));
  const { dpr, profile } = qualityAt(settle(qualityStep, cap), cap);
  // The light yacht (coarser cloth, slower cloth updates) goes with the lowest profile and with an explicit cap of 1.
  const lightYacht = maxDpr <= 1 || profile.id === "low";
  return (
    <SceneBoundary modelUrl={YACHT_MODEL_URL} errorLabel={errorLabel} retryLabel={retryLabel} onError={onError}>
    <SceneStartup label={loadingLabel} onReady={onReady}>{ready =>
    <Canvas
      role="img"
      aria-label={sceneLabel}
      fallback={<span>{sceneLabel}</span>}
      dpr={dpr}
      camera={{ position: [26, 18, 32], fov: 42, near: 0.5, far: 4200 }}
      gl={createSailingRenderer}
    >
      {/* Package 32 stage D: the trainers draw the venue's own light and colours, as the race does
          (src/data/venues/look.ts), so the race and the trainers are one world. */}
      <SailingEnvironment venue={venue} look={look} quality={profile} readState={readState} originRef={originRef} chartOrigin={chartOrigin} />

      <Suspense fallback={null}>
        <Yacht stateRef={stateRef} light={lightYacht} />
        {children}
        <FirstSceneFrame onReady={ready} />
      </Suspense>

      {showFlow && <WindFlow stateRef={stateRef} />}

      {cameraRig ?? <StageCameraRig
        poseForAspect={cameraPose}
        revision={revision}
        minDistance={view === "mainsheet" ? 2.5 : 9}
        maxDistance={120}
      />}
      <StageView />
      <TrainerQuality cap={cap} start={qualityStep} onStep={setQualityStep} />
      <ContextHealth />
    </Canvas>
    }</SceneStartup>
    </SceneBoundary>
  );
});
