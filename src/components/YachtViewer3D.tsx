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

import { Suspense, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, ContactShadows, Html } from '@react-three/drei';
import type { Group } from 'three';
import type { AnatomyPart } from '@/data/anatomy';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Camera presets in world coords. Each one positions the camera at a
// classic technical drawing angle so users can flip between "naval-arch"
// projections of the model. The model spans roughly:
//   X: stern (-7) -> bow (+7)         (LOA 13.9m, half-length ~7m)
//   Y: keel (-2) -> deck (+1) -> mast top (+18)  (Mast height 18.2m)
//   Z: port/stbd  ~ +/- 2.2m
// Target the camera at (0, 4, 0) - the visual centroid roughly at
// mid-mast height - so all 5 presets show the whole boat without the
// mast top being clipped.
type ViewPreset = 'three-quarter' | 'top' | 'side' | 'bow' | 'stern';
const TARGET: [number, number, number] = [0, 5, 0];
const VIEW_PRESETS: Record<ViewPreset, [number, number, number]> = {
  'three-quarter': [28, 16, 28],
  'top':           [0, 42, 0.001],   // tiny z to avoid the gimbal-lock NaN
  'side':          [0, 6, 35],
  'bow':           [35, 7, 0.001],
  'stern':         [-35, 7, 0.001],
};

// Branded variant: Bavaria 46 production-ready GLB with the GIONO YACHTING
// logo applied as an alpha-blended decal on the mainsail. The decal is a
// separate ~1.6 m square plane parented to the mainsail mesh, so future
// boom rotation animation can pivot the sail and the logo follows.
// See public/brand/giono-yachting-transparent.png for the source PNG.
const MODEL_URL = '/models/Andryu_Yacht_v3_branded.glb';
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
  // Outer group handles YAW (rotation around world-Y, i.e. vertical axis).
  // Inner group converts GLB axis convention (Z-up) to Three.js (Y-up).
  // Spinning the OUTER group rotates the boat the way a real boat yaws,
  // not end-over-end like before.
  const yawRef = useRef<Group>(null);
  useFrame((_, delta) => {
    if (spinning && yawRef.current) {
      yawRef.current.rotation.y += delta * 0.25;
    }
  });

  const { scene } = useGLTF(MODEL_URL);

  // Hide debug colliders (COL_*) and LOD1 mirror geometry so we don't
  // double-render. Per asset_metadata_v3.json the production convention is
  // to use COL_* for physics colliders and LOD0_* for the visible mesh; on
  // the web we only need LOD0 visuals.
  //
  // Also force the mainsail logo decal to render double-sided. Blender's
  // `use_backface_culling = false` flag isn't always honored by three.js
  // GLTFLoader, so we set THREE.DoubleSide on the material directly here.
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.name.startsWith('COL_') || obj.name.startsWith('LOD1_')) {
        obj.visible = false;
      }
      if (obj.name.includes('Logo_Decal')) {
        // Three.js Mesh has a .material; cast safely.
        // 2 = THREE.DoubleSide (avoids importing the constant just for this)
        const mesh = obj as unknown as { material?: { side?: number; transparent?: boolean; depthWrite?: boolean } };
        if (mesh.material) {
          mesh.material.side = 2;
          mesh.material.transparent = true;
          mesh.material.depthWrite = false; // helps avoid z-fight at 3 cm gap
        }
      }
    });
  }, [scene]);

  return (
    <group ref={yawRef}>
      {/*
        Inner group: -90deg around world X brings the GLB's local +Z (up)
        into world +Y (Three.js up). Hotspot positions are in the GLB's
        local coord space (X=stern->bow, Y=port/stbd, Z=up), so we put
        them as children of THIS inner group and they ride along with the
        rotation correctly.
      */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
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
    </group>
  );
}

// Imperative camera handle used by the preset bar. Lives inside the canvas
// so it can call useThree() to grab the active camera + the OrbitControls
// installed via `makeDefault`. Re-runs when the parent toggles `view`.
function CameraDriver({ view }: { view: ViewPreset }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  useEffect(() => {
    const [x, y, z] = VIEW_PRESETS[view];
    camera.position.set(x, y, z);
    camera.lookAt(...TARGET);
    if (controls) {
      controls.target.set(...TARGET);
      controls.update();
    }
  }, [view, camera, controls]);
  return null;
}

export interface YachtViewer3DProps {
  loadingLabel: string;
  hintLabel: string;
  parts: AnatomyPart[];
  activeId: string | null;
  onSelect: (id: string) => void;
  pickName: (p: AnatomyPart) => string;
  /** Optional secondary name (e.g. English latin form) shown under the
   *  primary name in the fullscreen info bar. Returns falsy to skip. */
  pickAltName?: (p: AnatomyPart) => string | undefined;
  /** Auto-rotate while idle. Default true; pauses on hover via OrbitControls. */
  autoRotate?: boolean;
  /** Localized labels for the view-preset toolbar. */
  viewLabels?: {
    threeQuarter: string;
    top: string;
    side: string;
    bow: string;
    stern: string;
    /** aria-label / tooltip for the "enter fullscreen" toggle. */
    fullscreen?: string;
    /** aria-label / tooltip for the "exit fullscreen" toggle. */
    exitFullscreen?: string;
  };
}

export default function YachtViewer3D({
  loadingLabel,
  hintLabel,
  parts,
  activeId,
  onSelect,
  pickName,
  pickAltName,
  autoRotate = true,
  viewLabels,
}: YachtViewer3DProps) {
  const [view, setView] = useState<ViewPreset>('three-quarter');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const labels = {
    threeQuarter: viewLabels?.threeQuarter ?? '3/4',
    top: viewLabels?.top ?? 'Top',
    side: viewLabels?.side ?? 'Side',
    bow: viewLabels?.bow ?? 'Bow',
    stern: viewLabels?.stern ?? 'Stern',
    fullscreen: viewLabels?.fullscreen ?? 'Fullscreen',
    exitFullscreen: viewLabels?.exitFullscreen ?? 'Exit fullscreen',
  };

  // Lock body scroll while the viewer is in fullscreen, otherwise pinch /
  // swipe to rotate the model also scrolls the page underneath. Restore on
  // exit (or on unmount) so we never leave the page in a stuck state.
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isFullscreen]);

  // ESC closes fullscreen on desktop; mobile users tap the close icon.
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  const activePart = parts.find((p) => p.id === activeId) ?? null;
  const altName = activePart && pickAltName ? pickAltName(activePart) : undefined;

  // Fullscreen wrapper sits above the sticky nav (z-50) and the mobile menu
  // overlay (z-[60]). 100dvh / 100dvw use the dynamic viewport so iOS
  // Safari's auto-hiding URL bar doesn't crop the canvas at the bottom.
  const wrapperStyle: CSSProperties = isFullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100dvw',
        height: '100dvh',
        zIndex: 100,
        background: 'linear-gradient(180deg, rgba(6, 20, 40, 0.97) 0%, rgba(2, 8, 18, 0.99) 100%)',
      }
    : {
        aspectRatio: '16 / 10',
        background: 'linear-gradient(180deg, rgba(13, 40, 71, 0.4) 0%, rgba(6, 20, 40, 0.7) 100%)',
      };

  return (
    <div
      className={isFullscreen ? '' : 'relative w-full'}
      style={wrapperStyle}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: VIEW_PRESETS['three-quarter'], fov: 35, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/*
            Manual lighting rig (instead of drei's <Stage> + <Environment>).
            Stage and Environment with preset="sunset" both fetch a HDR from
            raw.githack.com, which our CSP `connect-src 'self'` blocks. The
            low-poly model doesn't need HDR-quality reflections - a key
            light, a fill, and a hemisphere give it readable shape.
          */}
          <ambientLight intensity={0.55} color="#cfe5ff" />
          <directionalLight
            position={[10, 18, 8]}
            intensity={1.4}
            color="#fff5e0"
            castShadow={false}
          />
          <directionalLight
            position={[-12, 6, -6]}
            intensity={0.4}
            color="#7faed8"
          />
          <hemisphereLight args={['#bfdfff', '#0a1628', 0.35]} />
          <Boat
            spinning={autoRotate && !activeId && view === 'three-quarter'}
            parts={parts}
            activeId={activeId}
            onSelect={onSelect}
            pickName={pickName}
          />
          <ContactShadows position={[0, -2.2, 0]} opacity={0.3} scale={30} blur={2} far={20} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          target={TARGET}
          minDistance={10}
          maxDistance={55}
          minPolarAngle={0.05}
          maxPolarAngle={Math.PI / 2 - 0.02}
          autoRotate={false}
          enableDamping
          dampingFactor={0.08}
        />
        <CameraDriver view={view} />
      </Canvas>

      <noscript>
        <div
          className="absolute inset-0 flex items-center justify-center text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          {loadingLabel}
        </div>
      </noscript>

      {/* Fullscreen toggle - top-left floating chip. Sits opposite the
          view-preset bar so the toolbars never collide on small screens.
          In fullscreen we offset top a touch more to clear iPhone notches. */}
      <div
        className="absolute left-2 pointer-events-auto"
        style={{ top: isFullscreen ? 'max(0.5rem, env(safe-area-inset-top))' : '0.5rem' }}
      >
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          aria-label={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
          aria-pressed={isFullscreen}
          title={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
          className="flex items-center justify-center rounded transition"
          style={{
            width: 32,
            height: 32,
            background: 'rgba(10, 22, 40, 0.7)',
            border: '1px solid rgba(139, 167, 184, 0.3)',
            color: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(6px)',
          }}
        >
          {isFullscreen ? (
            // Collapse: 4 corners pointing inward
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M8 3v5H3" />
              <path d="M16 3v5h5" />
              <path d="M8 21v-5H3" />
              <path d="M16 21v-5h5" />
            </svg>
          ) : (
            // Expand: 4 corners pointing outward
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 8V3h5" />
              <path d="M21 8V3h-5" />
              <path d="M3 16v5h5" />
              <path d="M21 16v5h-5" />
            </svg>
          )}
        </button>
      </div>

      {/* View-preset toolbar - top-right floating chip */}
      <div
        className="absolute right-2 flex flex-wrap gap-1 pointer-events-auto justify-end"
        style={{ top: isFullscreen ? 'max(0.5rem, env(safe-area-inset-top))' : '0.5rem', maxWidth: 'calc(100% - 56px)' }}
      >
        {(['three-quarter', 'top', 'side', 'bow', 'stern'] as const).map((v) => {
          const active = v === view;
          const label =
            v === 'three-quarter' ? labels.threeQuarter
            : v === 'top'  ? labels.top
            : v === 'side' ? labels.side
            : v === 'bow'  ? labels.bow
            : labels.stern;
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[10px] sm:text-xs px-2 py-1 rounded transition font-medium"
              style={{
                background: active ? 'rgba(0, 212, 255, 0.25)' : 'rgba(10, 22, 40, 0.7)',
                border: `1px solid ${active ? 'rgba(0, 212, 255, 0.6)' : 'rgba(139, 167, 184, 0.3)'}`,
                color: active ? '#00d4ff' : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(6px)',
              }}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Bottom strip: in fullscreen + a part is selected, show its name in
          a persistent card so users can read the label without hunting for
          the (potentially small / occluded) hotspot text in the canvas.
          Otherwise show the regular hint line. */}
      {isFullscreen && activePart ? (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg pointer-events-none text-center"
          style={{
            bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            background: 'rgba(10, 22, 40, 0.85)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            backdropFilter: 'blur(8px)',
            maxWidth: '90vw',
          }}
        >
          <div className="text-sm sm:text-base font-semibold leading-tight" style={{ color: '#00d4ff' }}>
            {pickName(activePart)}
          </div>
          {altName && altName !== pickName(activePart) && (
            <div className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {altName}
            </div>
          )}
        </div>
      ) : (
        <div
          className="absolute bottom-2 left-2 right-2 text-[10px] sm:text-xs text-center pointer-events-none"
          style={{ color: 'rgba(255, 255, 255, 0.55)' }}
        >
          {hintLabel}
        </div>
      )}
    </div>
  );
}
