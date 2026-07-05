'use client';

import { Suspense, type MutableRefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, ContactShadows, Html, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Yacht } from './Yacht';
import { Ocean } from './ocean/Ocean';
import { Wake } from './ocean/Wake';
import type { YachtState } from './types';

// ============================================================================
// RegattaScene - the R3F canvas for the V2 3D simulator.
//
// Manual sun + hemisphere rig plus drei <Sky>. We do NOT use drei
// <Environment preset>, which fetches an external HDR from a CDN blocked by
// the app CSP (a SELF-HOSTED .hdr under /public would pass - planned upgrade).
// OrbitControls let the user spin the boat; water is a glossy plane at y = 0.
// ============================================================================

// Shown while the 2.3 MB GLB downloads/parses. Before this existed the user
// stared at an empty ocean for up to tens of seconds with no feedback (live
// testing measured 26 s on a cold dev load).
function YachtLoading() {
  return (
    <Html center>
      <div
        aria-label="Loading 3D boat"
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

export function RegattaScene({
  stateRef,
  maxDpr = 2,
  postFx = false,
}: {
  stateRef: MutableRefObject<YachtState>;
  /** Cap devicePixelRatio (1.5 in the mobile WebView embed to save fill rate). */
  maxDpr?: number;
  /** Subtle Bloom + Vignette. Desktop only - the extra full-res passes are
   *  exactly what tanks iOS WebView FPS, so the embed never enables this. */
  postFx?: boolean;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, maxDpr]}
      camera={{ position: [18, 9, 22], fov: 42, near: 0.5, far: 400 }}
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
        intensity={2.2}
        color={'#fff2dc'}
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />
      <Sky sunPosition={[28, 14, 14]} turbidity={6} rayleigh={1.4} mieCoefficient={0.005} />

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

      <Suspense fallback={<YachtLoading />}>
        <Yacht stateRef={stateRef} />
      </Suspense>

      <Ocean />
      <Wake stateRef={stateRef} />
      <ContactShadows position={[0, 0.02, 0]} scale={44} blur={2.4} far={8} opacity={0.35} frames={1} />

      {postFx && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.35} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.55} />
        </EffectComposer>
      )}

      <OrbitControls
        target={[0, 6.5, 0]}
        enablePan={false}
        minDistance={9}
        maxDistance={70}
        maxPolarAngle={Math.PI / 2.04}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
