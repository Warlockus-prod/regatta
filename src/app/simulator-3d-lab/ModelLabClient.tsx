'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Sky, useGLTF } from '@react-three/drei';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const MODEL_URL = '/models/Andryu_Yacht_ProductionReadyPrototype_v3.glb';
const MODEL_DIAGNOSTICS: MeshDiagnostics = {
  nodes: 143,
  meshes: 142,
  triangles: 7892,
  missingNormals: 142,
  missingUvs: 142,
  materials: [
    'MAT_Aluminium_Mast',
    'MAT_Dark_Tinted_Glass',
    'MAT_Debug_Collider',
    'MAT_Deck_AntiSlip_White',
    'MAT_Hull_Gelcoat_White',
    'MAT_Keel_Rudder',
    'MAT_Rigging_Dark',
    'MAT_Rubber_Black',
    'MAT_Sail_Cloth_Translucent',
    'MAT_Sail_Seams',
    'MAT_Teak_Deck',
  ],
};

type LabSettings = {
  showColliders: boolean;
  showLod1: boolean;
  showRigging: boolean;
  showPivots: boolean;
  animateParts: boolean;
  sailAngle: number;
};

type MeshDiagnostics = {
  nodes: number;
  meshes: number;
  triangles: number;
  missingNormals: number;
  missingUvs: number;
  materials: string[];
};

type RigRefs = {
  rudderPivot?: THREE.Group;
  mainPivot?: THREE.Group;
  jibPivot?: THREE.Group;
  mainSail?: THREE.Object3D;
  jib?: THREE.Object3D;
};

const PIVOTS = [
  { id: 'rudder', label: 'Rudder', pos: [-6.05, 0, -0.45] },
  { id: 'boom', label: 'Boom', pos: [-0.25, 0, 2.38] },
  { id: 'main', label: 'Main luff', pos: [-0.25, 0, 2.32] },
  { id: 'jib', label: 'Jib tack', pos: [6.58, 0, 1.03] },
  { id: 'com', label: 'COM', pos: [-0.4, 0, 0.12] },
] as const;

function toThreePos(pos: readonly [number, number, number]): [number, number, number] {
  // Source asset is Z-up: x = stern/bow, y = beam, z = up.
  return [pos[0], pos[2], -pos[1]];
}

function materialList(material: THREE.Material | THREE.Material[] | null | undefined): THREE.Material[] {
  if (!material) return [];
  return Array.isArray(material) ? material : [material];
}

function collectDiagnostics(scene: THREE.Object3D): MeshDiagnostics {
  const materials = new Set<string>();
  const out: MeshDiagnostics = {
    nodes: 0,
    meshes: 0,
    triangles: 0,
    missingNormals: 0,
    missingUvs: 0,
    materials: [],
  };

  scene.traverse((obj) => {
    out.nodes += 1;
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;

    out.meshes += 1;
    const geometry = mesh.geometry;
    const pos = geometry.getAttribute('position');
    const index = geometry.getIndex();
    out.triangles += index ? Math.floor(index.count / 3) : Math.floor((pos?.count ?? 0) / 3);
    if (!geometry.getAttribute('normal')) out.missingNormals += 1;
    if (!geometry.getAttribute('uv')) out.missingUvs += 1;

    for (const mat of materialList(mesh.material)) {
      if (mat.name) materials.add(mat.name);
    }
  });

  out.materials = [...materials].sort();
  return out;
}

function makeMaterial(mat: THREE.Material, nodeName: string): THREE.Material {
  const cloned = mat.clone();
  const materialName = cloned.name.toLowerCase();

  if (nodeName.startsWith('COL_') || materialName.includes('debug')) {
    const debug = new THREE.MeshBasicMaterial({
      color: '#00d4ff',
      wireframe: true,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    debug.name = 'LAB_Debug_Collider';
    return debug;
  }

  if (materialName.includes('sail')) {
    const sail = new THREE.MeshStandardMaterial({
      color: '#f5f8f2',
      roughness: 0.82,
      metalness: 0,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    sail.name = `${cloned.name || 'Sail'}_LAB`;
    return sail;
  }

  if (materialName.includes('teak')) {
    const teak = new THREE.MeshStandardMaterial({
      color: '#8a6138',
      roughness: 0.74,
      metalness: 0.03,
    });
    teak.name = `${cloned.name || 'Teak'}_LAB`;
    return teak;
  }

  if (materialName.includes('glass')) {
    const glass = new THREE.MeshStandardMaterial({
      color: '#071423',
      roughness: 0.16,
      metalness: 0.1,
      transparent: true,
      opacity: 0.72,
    });
    glass.name = `${cloned.name || 'Glass'}_LAB`;
    return glass;
  }

  if (materialName.includes('aluminium') || materialName.includes('rigging')) {
    const metal = new THREE.MeshStandardMaterial({
      color: materialName.includes('rigging') ? '#151a20' : '#8b9baa',
      roughness: 0.34,
      metalness: 0.62,
    });
    metal.name = `${cloned.name || 'Metal'}_LAB`;
    return metal;
  }

  return cloned;
}

function sourceVector(pos: readonly [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(pos[0], pos[1], pos[2]);
}

function createPivotGroup(
  scene: THREE.Object3D,
  groupName: string,
  pivot: THREE.Vector3,
  match: (name: string) => boolean,
): THREE.Group | undefined {
  const targets: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && match(mesh.name)) targets.push(mesh);
  });
  if (targets.length === 0) return undefined;

  const group = new THREE.Group();
  group.name = groupName;
  group.position.copy(pivot);
  scene.add(group);

  for (const target of targets) {
    target.parent?.remove(target);
    target.geometry = target.geometry.clone();
    target.geometry.translate(-pivot.x, -pivot.y, -pivot.z);
    target.position.set(0, 0, 0);
    target.rotation.set(0, 0, 0);
    target.scale.set(1, 1, 1);
    group.add(target);
  }

  return group;
}

function prepareModelScene(source: THREE.Object3D): { scene: THREE.Object3D; refs: RigRefs } {
  const scene = source.clone(true);

  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const name = obj.name;

    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
    mesh.castShadow = !name.startsWith('COL_');
    mesh.receiveShadow = !name.startsWith('COL_');
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((mat) => makeMaterial(mat, name))
      : makeMaterial(mesh.material, name);
  });

  // The source GLB stores animated mesh vertices in world coordinates and all
  // animated nodes at origin. These synthetic groups provide real yaw pivots.
  const rudderPivot = createPivotGroup(
    scene,
    'LAB_PIVOT_Rudder_Yaw',
    sourceVector([-6.05, 0, -0.45]),
    (name) => name === 'LOD0_Rudder_Animated_Yaw_Pivot',
  );
  const mainPivot = createPivotGroup(
    scene,
    'LAB_PIVOT_Main_Boom_Yaw',
    sourceVector([-0.25, 0, 2.38]),
    (name) =>
      name === 'LOD0_Boom_Animated_Yaw_Pivot' ||
      name === 'LOD0_MainSail_Grot_Animated_ClothSurface' ||
      name.startsWith('LOD0_MainSail_Batten_Seam_') ||
      name === 'LOD1_MainSail_Simplified',
  );
  const jibPivot = createPivotGroup(
    scene,
    'LAB_PIVOT_Jib_Tack_Yaw',
    sourceVector([6.58, 0, 1.03]),
    (name) =>
      name === 'LOD0_Jib_Staksel_Genoa_Animated_ClothSurface' ||
      name.startsWith('LOD0_Jib_Seam_') ||
      name === 'LOD1_Jib_Simplified',
  );

  return {
    scene,
    refs: {
      rudderPivot,
      mainPivot,
      jibPivot,
      mainSail: scene.getObjectByName('LOD0_MainSail_Grot_Animated_ClothSurface') ?? undefined,
      jib: scene.getObjectByName('LOD0_Jib_Staksel_Genoa_Animated_ClothSurface') ?? undefined,
    },
  };
}

function usePreparedModel(settings: LabSettings) {
  const gltf = useGLTF(MODEL_URL);
  const prepared = useMemo(() => prepareModelScene(gltf.scene), [gltf.scene]);
  const { scene } = prepared;
  const diagnostics = useMemo(() => collectDiagnostics(gltf.scene), [gltf.scene]);
  const animated = useRef<RigRefs>(prepared.refs);

  useEffect(() => {
    animated.current = prepared.refs;
  }, [prepared.refs]);

  useEffect(() => {
    scene.traverse((obj) => {
      const name = obj.name;

      obj.visible = true;
      if (name.startsWith('COL_')) obj.visible = settings.showColliders;
      if (name.startsWith('LOD1_')) obj.visible = settings.showLod1;
      if (
        !settings.showRigging &&
        (name.includes('Rigging') || name.includes('Lifeline') || name.includes('Stanchion'))
      ) {
        obj.visible = false;
      }
    });
  }, [scene, settings.showColliders, settings.showLod1, settings.showRigging]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const refs = animated.current;
    const sign = Math.sin(t * 0.65) >= 0 ? 1 : -1;
    const sweep = settings.animateParts ? Math.sin(t * 0.65) : 1;
    const angle = THREE.MathUtils.degToRad(settings.sailAngle * sweep);

    if (refs.rudderPivot) refs.rudderPivot.rotation.z = THREE.MathUtils.degToRad(22 * sweep);
    if (refs.mainPivot) refs.mainPivot.rotation.z = angle;
    if (refs.jibPivot) refs.jibPivot.rotation.z = angle * 0.82;
    if (refs.mainSail) refs.mainSail.scale.y = 1 + (settings.animateParts ? 0.045 * Math.sin(t * 1.7) : 0);
    if (refs.jib) refs.jib.scale.y = 1 - (settings.animateParts ? 0.035 * Math.sin(t * 1.4 + sign) : 0);
  });

  return { scene, diagnostics };
}

function YachtModel({ settings }: { settings: LabSettings }) {
  const { scene } = usePreparedModel(settings);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}

function WaterPlane() {
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0c4f72',
    roughness: 0.55,
    metalness: 0.16,
    transparent: true,
    opacity: 0.9,
  }), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80, 1, 1]} />
        <primitive object={material} attach="material" />
      </mesh>
      <gridHelper args={[80, 80, '#1c8db4', '#14364c']} position={[0, 0.01, 0]} />
    </group>
  );
}

function PivotMarkers({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group>
      {PIVOTS.map((pivot) => {
        const pos = toThreePos(pivot.pos);
        return (
          <group key={pivot.id} position={pos}>
            <mesh>
              <sphereGeometry args={[pivot.id === 'com' ? 0.12 : 0.08, 16, 16]} />
              <meshBasicMaterial color={pivot.id === 'com' ? '#ffaa00' : '#00d4ff'} />
            </mesh>
            <Html distanceFactor={8} position={[0, 0.24, 0]}>
              <div className="rounded bg-[#071423]/90 px-2 py-1 text-[10px] font-semibold text-white ring-1 ring-cyan-300/30">
                {pivot.label}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function DiagnosticsPanel({ settings, setSettings }: {
  settings: LabSettings;
  setSettings: (next: LabSettings) => void;
}) {
  const diagnostics = MODEL_DIAGNOSTICS;
  const toggle = (key: keyof Omit<LabSettings, 'sailAngle'>) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <aside className="pointer-events-auto w-full max-w-sm rounded-2xl border border-cyan-300/15 bg-[#071423]/90 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">3D asset lab</div>
        <h1 className="text-xl font-bold text-white">Andryu Yacht GLB</h1>
        <p className="mt-1 text-sm text-slate-300">
          Web preview для проверки модели перед интеграцией в 3D-симулятор.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Metric label="Nodes" value={diagnostics.nodes} />
        <Metric label="Meshes" value={diagnostics.meshes} />
        <Metric label="Tris" value={diagnostics.triangles} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Toggle label="COL_*" active={settings.showColliders} onClick={() => toggle('showColliders')} />
        <Toggle label="LOD1" active={settings.showLod1} onClick={() => toggle('showLod1')} />
        <Toggle label="Rigging" active={settings.showRigging} onClick={() => toggle('showRigging')} />
        <Toggle label="Pivots" active={settings.showPivots} onClick={() => toggle('showPivots')} />
        <Toggle label="Animate" active={settings.animateParts} onClick={() => toggle('animateParts')} />
      </div>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Sail sweep: {settings.sailAngle} deg
        <input
          type="range"
          min="0"
          max="65"
          value={settings.sailAngle}
          onChange={(e) => setSettings({ ...settings, sailAngle: Number(e.target.value) })}
          className="mt-2 w-full accent-cyan-300"
        />
      </label>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
        <div>Missing normals: {diagnostics.missingNormals}</div>
        <div>Missing UVs: {diagnostics.missingUvs}</div>
        <div>Materials: {diagnostics.materials.length}</div>
        <div className="mt-2 text-cyan-100">Lab pivots: synthetic groups</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Link className="rounded-full border border-cyan-300/30 px-3 py-1.5 text-cyan-100 hover:bg-cyan-300/10" href="/simulator">
          V1
        </Link>
        <Link className="rounded-full border border-emerald-300/30 px-3 py-1.5 text-emerald-100 hover:bg-emerald-300/10" href="/simulator-v3">
          V3
        </Link>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">
      <div className="font-mono text-lg font-bold text-white">{value.toLocaleString('en-US')}</div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
    </div>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border px-3 py-2 text-xs font-semibold transition"
      style={{
        borderColor: active ? 'rgba(0, 212, 255, 0.5)' : 'rgba(148, 163, 184, 0.22)',
        background: active ? 'rgba(0, 212, 255, 0.14)' : 'rgba(255, 255, 255, 0.03)',
        color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  );
}

function LoadingModel() {
  return (
    <Html center>
      <div className="rounded-2xl border border-cyan-300/20 bg-[#071423]/90 px-5 py-3 text-sm font-semibold text-cyan-100">
        Loading yacht GLB...
      </div>
    </Html>
  );
}

function LabScene({ settings }: { settings: LabSettings }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [17, 10, 18], fov: 42, near: 0.1, far: 500 }}
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#06111f']} />
      <fog attach="fog" args={['#092139', 45, 160]} />
      <Sky
        distance={450000}
        sunPosition={[-120, 50, 80]}
        rayleigh={0.8}
        turbidity={3}
        mieCoefficient={0.006}
        mieDirectionalG={0.82}
      />
      <ambientLight intensity={0.42} />
      <hemisphereLight intensity={0.52} color="#95c8ff" groundColor="#03101d" />
      <directionalLight
        position={[-12, 18, 10]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <WaterPlane />
      <axesHelper args={[6]} />
      <PivotMarkers visible={settings.showPivots} />
      <Suspense fallback={<LoadingModel />}>
        <YachtModel settings={settings} />
      </Suspense>
      <OrbitControls
        makeDefault
        target={[0, 2.2, 0]}
        minDistance={5}
        maxDistance={70}
        maxPolarAngle={Math.PI * 0.48}
      />
    </Canvas>
  );
}

export default function ModelLabClient() {
  const [settings, setSettings] = useState<LabSettings>({
    showColliders: false,
    showLod1: false,
    showRigging: true,
    showPivots: true,
    animateParts: true,
    sailAngle: 34,
  });

  return (
    <div className="relative h-[calc(100vh-56px)] min-h-[720px] overflow-hidden bg-[#06111f]">
      <LabScene settings={settings} />
      <div className="pointer-events-none absolute left-3 top-3 z-10 sm:left-5 sm:top-5">
        <DiagnosticsPanel settings={settings} setSettings={setSettings} />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 rounded-2xl border border-white/10 bg-[#071423]/75 px-4 py-3 text-xs text-slate-300 backdrop-blur sm:left-auto sm:w-[520px]">
        Model notes: GLB is compact and browser-safe, but asset still needs Blender cleanup for production:
        real UVs, verified normals, baked pivots, and final sail cloth shape.
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
