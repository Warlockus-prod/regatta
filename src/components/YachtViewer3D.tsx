'use client';

// ============================================================================
// YachtViewer3D
//
// Interactive 3D viewer for the production-ready Bavaria-46-inspired GLB on
// /anatomy. Built on @react-three/fiber + @react-three/drei (already
// installed for V2 simulator). Lazy-loaded by the consumer so users who
// never toggle 3D don't pay the Three.js bundle cost.
//
// Model: /public/models/Andryu_Yacht_ProductionReadyPrototype_v3.glb
//   ~176 KB. 142 objects, 4404 vertices, 7892 faces. Has LOD0_/LOD1_
//   prefixes and COL_* debug colliders (we hide the colliders at load).
//   See public/models/asset_metadata_v3.json for full coord conventions.
//
// Hotspots: each anatomy part with a `three: { x, y, z }` field gets a
// clickable sphere + label rendered as a child of the same group as the
// model. Local coordinate convention from the GLB metadata:
//   X = stern -> bow (~ -7..+7), Y = port/starboard, Z = vertical.
// We rotate the wrapper -90deg around X so Three.js Y-up is satisfied.
//
// The active hotspot scales up + glows; clicking any sphere fires
// onSelect(id). The same setActiveId function drives the 2D side-profile,
// so 2D and 3D share state.
// ============================================================================

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, ContactShadows, Environment, Html } from '@react-three/drei';
import type { Group } from 'three';
import type { AnatomyPart } from '@/data/anatomy';

const MODEL_URL = '/models/Andryu_Yacht_ProductionReadyPrototype_v3.glb';
useGLTF.preload(MODEL_URL);

interface MarkerProps {
  position: [number, number, number];
  label: string;
  active: boolean;
  onSelect: () => void;
}

function Hotspot({ position, label, active, onSelect }: MarkerProps) {
  const color = active ? '#00d4ff' : '#ffaa00';
  const scale = active ? 0.18 : 0.12;
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[scale, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.95 : 0.85} />
      </mesh>
      {/* Outer glow ring - only on the active hotspot to avoid clutter */}
      {active && (
        <mesh>
          <ringGeometry args={[scale * 1.6, scale * 2.0, 32]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.5} />
        </mesh>
      )}
      <Html
        center
        distanceFactor={12}
        style={{
          pointerEvents: 'none',
          color: active ? '#00d4ff' : '#ffffff',
          fontSize: active ? 13 : 11,
          fontWeight: active ? 700 : 500,
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          transform: 'translate(0, -22px)',
        }}
      >
        {label}
      </Html>
    </group>
  );
}

interface BoatProps {
  spinning: boolean;
  parts: AnatomyPart[];
  activeId: string | null;
  onSelect: (id: string) => void;
  pickName: (p: AnatomyPart) => string;
}

function Boat({ spinning, parts, activeId, onSelect, pickName }: BoatProps) {
  const ref = useRef<Group>(null);
  // Slow auto-rotate while idle so the user sees the model is interactive
  // even before they click. Yaw on world Y after the X rotation.
  useFrame((_, delta) => {
    if (spinning && ref.current) {
      ref.current.rotation.z += delta * 0.18;
    }
  });
  // GLB axis convention is X=stern->bow, Z=up. Three.js wants Y=up. Rotate
  // -90deg around X to bring deck up, then the children's local positions
  // (defined in GLB-local coords) end up where they belong.
  const { scene } = useGLTF(MODEL_URL);

  // Hide debug colliders (COL_*) and LOD1 mirror geometry so we don't
  // double-render. Per asset_metadata_v3.json the production convention is
  // to use COL_* for physics colliders and LOD0_* for the visible mesh; on
  // the web we only need LOD0 visuals.
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.name.startsWith('COL_') || obj.name.startsWith('LOD1_')) {
        obj.visible = false;
      }
    });
  }, [scene]);

  return (
    <group ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={scene} />
      {parts.map((p) => {
        if (!p.three) return null;
        return (
          <Hotspot
            key={p.id}
            position={[p.three.x, p.three.y, p.three.z]}
            label={pickName(p)}
            active={p.id === activeId}
            onSelect={() => onSelect(p.id)}
          />
        );
      })}
    </group>
  );
}

export interface YachtViewer3DProps {
  loadingLabel: string;
  hintLabel: string;
  parts: AnatomyPart[];
  activeId: string | null;
  onSelect: (id: string) => void;
  pickName: (p: AnatomyPart) => string;
  /** Auto-rotate while idle. Default true; pauses on hover via OrbitControls. */
  autoRotate?: boolean;
}

export default function YachtViewer3D({
  loadingLabel,
  hintLabel,
  parts,
  activeId,
  onSelect,
  pickName,
  autoRotate = true,
}: YachtViewer3DProps) {
  return (
    <div
      className="relative w-full"
      style={{
        aspectRatio: '16 / 10',
        background: 'linear-gradient(180deg, rgba(13, 40, 71, 0.4) 0%, rgba(6, 20, 40, 0.7) 100%)',
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [16, 10, 16], fov: 35, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Stage
            adjustCamera={1.6}
            intensity={0.45}
            shadows={{ type: 'contact', opacity: 0.4, blur: 1.5 }}
            environment="sunset"
          >
            <Boat
              spinning={autoRotate && !activeId}
              parts={parts}
              activeId={activeId}
              onSelect={onSelect}
              pickName={pickName}
            />
          </Stage>
          <ContactShadows position={[0, -2, 0]} opacity={0.3} scale={30} blur={2} />
          <Environment preset="sunset" background={false} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={8}
          maxDistance={40}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2 - 0.05}
          autoRotate={false}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>

      <noscript>
        <div
          className="absolute inset-0 flex items-center justify-center text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          {loadingLabel}
        </div>
      </noscript>

      <div
        className="absolute bottom-2 left-2 right-2 text-[10px] sm:text-xs text-center pointer-events-none"
        style={{ color: 'rgba(255, 255, 255, 0.55)' }}
      >
        {hintLabel}
      </div>
    </div>
  );
}
