'use client';

import { Suspense, useEffect, useState, memo, type MutableRefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Yacht } from './Yacht';
import { Ocean } from './ocean/Ocean';
import { WindFlow } from "./ocean/WindFlow";
import { Wake } from './ocean/Wake';
import type { YachtState } from './types';
import type { OrbitControls as Controls } from "three-stdlib";
import { fitCamera, fitSailCamera, type CameraView } from "./camera";
import { SceneBoundary, reportScene } from "./SceneBoundary";
import { YACHT_MODEL_URL } from "./config";

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
    const fit = view === "main" || view === "jib"
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
// Manual sun, hemisphere rig and procedural sky. We do NOT use drei
// <Environment preset>, which fetches an external HDR from a CDN blocked by
// the app CSP. Reflection lighting is generated locally.
// OrbitControls let the user spin the boat; water is a glossy plane at y = 0.
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
  postFx = false,
  view = "whole",
  revision = 0,
  loadingLabel,
  showFlow = true,
  sceneLabel,
  errorLabel,
  retryLabel,
}: {
  stateRef: MutableRefObject<YachtState>;
  view?: CameraView;
  revision?: number;
  showFlow?: boolean;
  loadingLabel: string;
  sceneLabel: string;
  errorLabel: string;
  retryLabel: string;
  /** Cap devicePixelRatio (1.5 in the mobile WebView embed to save fill rate). */
  maxDpr?: number;
  /** Subtle Bloom + Vignette. Desktop only - the extra full-res passes are
   *  exactly what tanks iOS WebView FPS, so the embed never enables this. */
  postFx?: boolean;
}) {
  return (
    <SceneBoundary modelUrl={YACHT_MODEL_URL} errorLabel={errorLabel} retryLabel={retryLabel}>
    <Canvas
      fallback={<span>{sceneLabel}</span>}
      shadows="percentage"
      dpr={[1, maxDpr]}
      camera={{ position: [26, 18, 32], fov: 42, near: 0.5, far: 400 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <color attach="background" args={['#aecfdf']} />
      <fog attach="fog" args={['#aecfdf', 110, 340]} />

      <hemisphereLight args={['#cfe6ff', '#33454f', 0.4]} />
      <directionalLight
        position={[28, 36, 14]}
        shadow-normalBias={0.025}
        intensity={2.2}
        color={'#fff2dc'}
        castShadow
        shadow-mapSize={maxDpr <= 1.5 ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />
      <mesh renderOrder={-100}>
        <sphereGeometry args={[190, 24, 12]} />
        <shaderMaterial side={THREE.BackSide} depthWrite={false} toneMapped={false}
          uniforms={{ horizon: { value: new THREE.Color("#d2e3e9") }, zenith: { value: new THREE.Color("#72afd0") } }}
          vertexShader={"varying vec3 vSky; void main() { vSky = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"}
          fragmentShader={`uniform vec3 horizon; uniform vec3 zenith; varying vec3 vSky;
            void main() {
              vec3 direction = normalize(vSky);
              float blend = pow(max(direction.y, 0.0), 0.45);
              vec3 sky = mix(horizon, zenith, blend);
              float sun = pow(max(dot(direction, normalize(vec3(28.0,36.0,14.0))), 0.0), 600.0);
              gl_FragColor = vec4(mix(sky, vec3(1.0,0.93,0.78), sun * 0.8), 1.0);
              #include <colorspace_fragment>
            }`} />
      </mesh>

      {/* Image-based lighting WITHOUT any external HDR (CSP-safe): a small
          procedural env scene - sun disc + sky/horizon gradient panels -
          prefiltered once. This is what makes stainless, gelcoat, glass and
          the water actually reflect something instead of a void (the audit's
          number-one visual finding). */}
      <Environment resolution={256} frames={1} background={false}>
        <Lightformer form="rect" intensity={4} color="#fff3da" position={[30, 22, 12]} scale={[14, 14, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#bfe0f2" position={[0, 40, 0]} rotation-x={Math.PI / 2} scale={[120, 120, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#9dc4d8" position={[0, 6, -60]} scale={[160, 30, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#9dc4d8" position={[0, 6, 60]} rotation-y={Math.PI} scale={[160, 30, 1]} />
        <Lightformer form="rect" intensity={0.22} color="#274a5a" position={[0, -12, 0]} rotation-x={-Math.PI / 2} scale={[160, 160, 1]} />
      </Environment>

      <Suspense fallback={<YachtLoading label={loadingLabel} />}>
        <Yacht stateRef={stateRef} light={maxDpr <= 1} />
        <Ready />
      </Suspense>

      <Ocean stateRef={stateRef} />
      <Wake stateRef={stateRef} />
      {showFlow && <WindFlow stateRef={stateRef} />}


      {postFx && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.12} luminanceThreshold={1.1} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.2} />
        </EffectComposer>
      )}

      <OrbitControls
        makeDefault
        target={[0, 10, 0]}
        enablePan={false}
        minDistance={9}
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
