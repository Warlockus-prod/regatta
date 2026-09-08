'use client';

// Anatomy and the sailing simulator share one Blender asset and metre scale.
// Teaching coordinates remain Z-up in anatomy.ts and are converted once below.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import { Box3, Vector3, type Group } from 'three';
import type { AnatomyPart } from '@/data/anatomy';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { fitCamera } from "@/features/simulator-3d/camera";
import { YACHT_MODEL_URL } from "@/features/simulator-3d/config";
import { SceneBoundary } from "@/features/simulator-3d/SceneBoundary";
import { useI18n } from "@/lib/i18n";

type ViewPreset = 'three-quarter' | 'top' | 'side' | 'bow' | 'stern';
const TARGET: [number, number, number] = [0, 7, 0];
const VIEW_PRESETS: Record<ViewPreset, [number, number, number]> = {
  'three-quarter': [32, 18, 32],
  'top':           [0, 48, 0.001],   // tiny z to avoid the gimbal-lock NaN
  'side':          [0, 8, 38],
  'bow':           [38, 9, 0.001],
  'stern':         [-38, 9, 0.001],
};

const MODEL_URL = YACHT_MODEL_URL;
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
      {active && <Html
        center
        style={{
          pointerEvents: 'none',
          color: '#e7f2f6',
          background: '#102738',
          padding: '5px 9px',
          borderRadius: 6,
          fontSize: active ? 13 : 11,
          fontWeight: active ? 700 : 500,
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          transform: 'translate(0, -22px)',
        }}
      >
        {label}
      </Html>}
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
  const yawRef = useRef<Group>(null);
  useFrame((_, delta) => {
    if (spinning && yawRef.current) {
      yawRef.current.rotation.y += delta * 0.25;
    }
  });

  const { scene: source } = useGLTF(MODEL_URL);
  const scene = useMemo(() => source.clone(true), [source]);

  return (
    <group ref={yawRef} name="anatomy-yacht">
      <group>
        <primitive object={scene} />
        {parts.map((p) => {
          if (!p.three) return null;
          return (
            <Hotspot
              key={p.id}
              position={[p.three.x, p.three.z, -p.three.y]}
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
function CameraDriver({ view, activePart, revision }: { view: ViewPreset; activePart: AnatomyPart | null; revision: number }) {
  const { camera, controls, size, scene } = useThree();
  const previousPart = useRef(activePart?.id);
  useEffect(() => {
    const boat = scene.getObjectByName("anatomy-yacht");
    if (!boat) return;
    boat.updateWorldMatrix(true, true);
    // Use the visible pose, not the conservative union of every shape key.
    const bounds = new Box3().setFromObject(boat, true);
    const focusChanged = previousPart.current !== activePart?.id;
    previousPart.current = activePart?.id;
    if (focusChanged && activePart?.three) {
      const p = activePart.three;
      const center = new Vector3(p.x, p.z, -p.y);
      bounds.setFromCenterAndSize(center, new Vector3(8, 8, 8));
    }
    const direction = new Vector3(...VIEW_PRESETS[view]).sub(new Vector3(...TARGET));
    const fit = fitCamera(bounds.min, bounds.max, direction, size.width / size.height, 35, 1.2);
    camera.position.copy(fit.position);
    camera.lookAt(fit.target);
    if (controls) {
      (controls as OrbitControlsImpl).target.copy(fit.target);
      (controls as OrbitControlsImpl).update();
    }
  }, [view, activePart, revision, camera, controls, size.width, size.height, scene]);
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
  /** Auto-rotate while idle. Default false; selected parts remain stationary. */
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
  autoRotate = false,
  viewLabels,
}: YachtViewer3DProps) {
  const [view, setView] = useState<ViewPreset>('three-quarter');
  const [revision, setRevision] = useState(0);
  const { tp } = useI18n();
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
        height: 'clamp(360px, 58svh, 620px)',
        background: 'linear-gradient(180deg, rgba(13, 40, 71, 0.9) 0%, rgba(6, 20, 40, 0.96) 100%)',
      };

  return (
    <div
      className={isFullscreen ? '' : 'relative w-full'}
      style={wrapperStyle}
    >
      <SceneBoundary modelUrl={MODEL_URL}
        errorLabel={tp("Не удалось загрузить яхту. Попробуй ещё раз.", "The yacht could not load. Try again.", "Nie udalo sie zaladowac jachtu. Sprobuj ponownie.", { es: "No se pudo cargar el yate. Reintenta.", fr: "Impossible de charger le bateau. Reessaie.", de: "Yacht konnte nicht geladen werden. Versuche es erneut.", it: "Impossibile caricare la barca. Riprova." })}
        retryLabel={tp("Повторить", "Try again", "Ponow", { es: "Reintentar", fr: "Reessayer", de: "Erneut versuchen", it: "Riprova" })}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: VIEW_PRESETS['three-quarter'], fov: 35, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={<Html center><div role="status" className="rounded-lg bg-slate-900 p-3 text-sm text-slate-100">{loadingLabel}</div></Html>}>
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
          <CameraDriver view={view} activePart={activePart} revision={revision} />

        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          target={TARGET}
          minDistance={10}
          maxDistance={140}
          minPolarAngle={0.05}
          maxPolarAngle={Math.PI / 2 - 0.02}
          autoRotate={false}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      </SceneBoundary>

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
            width: 44,
            height: 44,
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
        className="absolute right-2 flex flex-nowrap gap-1 overflow-x-auto pointer-events-auto"
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
              onClick={() => { setView(v); setRevision((value) => value + 1); }}
              className="min-h-11 shrink-0 whitespace-nowrap text-xs px-2 py-1 rounded transition font-medium"
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
