'use client';

// ============================================================================
// YachtViewer3D
//
// Interactive 3D viewer for the low-poly Bavaria 46 GLB on /anatomy.
// Built on @react-three/fiber + @react-three/drei (already installed for V2
// simulator). Lazy-loaded by the consumer so users who never toggle 3D
// don't pay the Three.js bundle cost.
//
// Model file: /public/models/bavaria_46_lowpoly_sloop.glb (~76 KB).
// The GLB uses meters, X = stern->bow, Z = vertical (per the bundled
// README). Three.js conventions are different (Y = vertical), so we apply
// a simple rotation on the wrapper group and let users orbit freely.
// ============================================================================

import { Suspense, useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, ContactShadows, Environment } from '@react-three/drei';
import type { Group } from 'three';

const MODEL_URL = '/models/bavaria_46_lowpoly_sloop.glb';
useGLTF.preload(MODEL_URL);

interface BoatProps {
  spinning: boolean;
}

function Boat({ spinning }: BoatProps) {
  const ref = useRef<Group>(null);
  // Slow auto-rotate so the user sees the model is interactive even before
  // they click. Idle in non-spin mode lets them inspect at any angle.
  useFrame((_, delta) => {
    if (spinning && ref.current) {
      ref.current.rotation.y += delta * 0.25;
    }
  });
  // The bundled GLB axis convention is X = stern->bow, Z = up. Three.js
  // uses Y = up, so we rotate the group -90deg around X to bring the deck
  // up. The model itself stays unrotated inside.
  const { scene } = useGLTF(MODEL_URL);
  return (
    <group ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}

function Loading({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center text-xs"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </div>
  );
}

export interface YachtViewer3DProps {
  loadingLabel: string;
  hintLabel: string;
  /** When true, gently auto-rotates while idle. Default true. */
  autoRotate?: boolean;
}

export default function YachtViewer3D({ loadingLabel, hintLabel, autoRotate = true }: YachtViewer3DProps) {
  return (
    <div className="relative w-full" style={{ aspectRatio: '16 / 10', background: 'linear-gradient(180deg, rgba(13, 40, 71, 0.4) 0%, rgba(6, 20, 40, 0.7) 100%)' }}>
      <Canvas
        // Lower DPR cap on mobile to keep 60fps; drei's r3f handles HiDPI
        // automatically. Camera positioned high+forward so the user sees a
        // 3/4 hero shot on first paint.
        dpr={[1, 1.5]}
        camera={{ position: [10, 6, 10], fov: 35, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Stage centers + sizes the boat automatically and adds soft
              studio lighting. Environment "sunset" gives subtle PBR
              reflections on metal/sail materials when present. */}
          <Stage
            adjustCamera={1.4}
            intensity={0.4}
            shadows={{ type: 'contact', opacity: 0.4, blur: 1.5 }}
            environment="sunset"
          >
            <Boat spinning={autoRotate} />
          </Stage>
          <ContactShadows position={[0, -1.5, 0]} opacity={0.3} scale={20} blur={2} />
          <Environment preset="sunset" background={false} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={5}
          maxDistance={25}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2 - 0.05}
          autoRotate={false}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>

      {/* Suspense fallback layer (Canvas itself uses null for its
          internal fallback so users see the gradient bg immediately) */}
      <noscript>
        <Loading>{loadingLabel}</Loading>
      </noscript>

      <div
        className="absolute bottom-2 left-2 right-2 text-[10px] sm:text-xs text-center pointer-events-none"
        style={{ color: 'rgba(255, 255, 255, 0.5)' }}
      >
        {hintLabel}
      </div>
    </div>
  );
}
