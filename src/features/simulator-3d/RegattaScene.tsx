'use client';

import { Suspense, type MutableRefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Yacht } from './Yacht';
import { Ocean } from './ocean/Ocean';
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
}: {
  stateRef: MutableRefObject<YachtState>;
  /** Cap devicePixelRatio (1.5 in the mobile WebView embed to save fill rate). */
  maxDpr?: number;
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
      <color attach="background" args={['#bcd6e4']} />
      <fog attach="fog" args={['#bcd6e4', 80, 320]} />

      <hemisphereLight args={['#cfe6ff', '#33454f', 0.55]} />
      <directionalLight
        position={[28, 36, 14]}
        intensity={2.4}
        color={'#fff2dc'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <Sky sunPosition={[28, 14, 14]} turbidity={6} rayleigh={1.4} mieCoefficient={0.005} />

      <Suspense fallback={<YachtLoading />}>
        <Yacht stateRef={stateRef} />
      </Suspense>

      <Ocean />
      <ContactShadows position={[0, 0.02, 0]} scale={44} blur={2.4} far={8} opacity={0.35} frames={1} />

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
