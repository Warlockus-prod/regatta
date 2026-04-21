'use client';

import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';

// ============================================================================
// V2 premium 3D sailing scene.
//
// react-three-fiber + drei, procedural yacht, no asset pipeline.
// - multi-layer wave shader for water
// - chase camera rig that trails the stern
// - stern wake that scales with boat speed
// - ring of distant coast silhouettes to anchor the horizon
// - cambered sails and cleaner hull
// Renders strictly from props passed in by the page.
// ============================================================================

export interface SceneProps {
  /** TWA in degrees, positive = starboard tack (wind from starboard). */
  twaSigned: number;
  /** Wind speed in knots (drives wave amplitude). */
  windSpeed: number;
  /** Boat speed in knots (drives wake length and chase distance). */
  boatSpeed: number;
  /** Heel angle in degrees, positive = heel to leeward. */
  heel: number;
  /** Main angle off centerline, degrees. */
  mainAngle: number;
  /** Jib angle off centerline, degrees. */
  jibAngle: number;
  /** Main raised flag. */
  mainOn: boolean;
  /** Jib raised flag. */
  jibOn: boolean;
  /** 0..1 reef depth for visual main-area shrink. */
  reef: number;
  /** Slow-rotating camera drift for the preview / showroom feel. */
  autoRotate?: boolean;
}

// ---------------------------------------------------------------------------
// ChaseCam - trails the stern using boat yaw. Smooth lerp, speed-aware pull.
// ---------------------------------------------------------------------------

function ChaseCam({ twaSigned, boatSpeed, autoDrift }: {
  twaSigned: number;
  boatSpeed: number;
  autoDrift: boolean;
}) {
  const yawRad = THREE.MathUtils.degToRad(-twaSigned);
  const tmpTarget = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const camera = state.camera;
    const speedFactor = Math.min(1, boatSpeed / 10);
    const chaseDist = 14 + speedFactor * 3;
    const chaseHeight = 5.5 + speedFactor * 0.6;
    const drift = autoDrift ? state.clock.elapsedTime * 0.08 : 0;
    const camYaw = yawRad + drift;

    tmpTarget.current.set(
      Math.sin(camYaw) * chaseDist,
      chaseHeight,
      Math.cos(camYaw) * chaseDist,
    );
    // Look slightly ahead of the boat so the bow gets screen priority
    tmpLook.current.set(
      -Math.sin(yawRad) * 1.8,
      1.8,
      -Math.cos(yawRad) * 1.8,
    );

    const alpha = 1 - Math.pow(0.0025, delta);
    camera.position.lerp(tmpTarget.current, alpha);
    camera.lookAt(tmpLook.current);
  });

  return null;
}

// ---------------------------------------------------------------------------
// Water - multi-layer sine wave, larger plane, distance-based color mix.
// ---------------------------------------------------------------------------

function Water({ windSpeed }: { windSpeed: number }) {
  const amplitude = 0.07 + Math.min(1, windSpeed / 25) * 0.28;

  const { geometry, material, uniforms } = useMemo(() => {
    const geom = new THREE.PlaneGeometry(420, 420, 180, 180);
    const uni = {
      uTime: { value: 0 },
      uAmplitude: { value: amplitude },
      uSurface: { value: new THREE.Color('#14527a') },
      uDeep: { value: new THREE.Color('#040f1e') },
      uCrest: { value: new THREE.Color('#3b8fb8') },
    };

    const mat = new THREE.MeshStandardMaterial({
      color: '#14527a',
      metalness: 0.25,
      roughness: 0.4,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uni.uTime;
      shader.uniforms.uAmplitude = uni.uAmplitude;
      shader.uniforms.uSurface = uni.uSurface;
      shader.uniforms.uDeep = uni.uDeep;
      shader.uniforms.uCrest = uni.uCrest;

      shader.vertexShader = `
        uniform float uTime;
        uniform float uAmplitude;
        varying vec3 vWorldPos;
        varying float vWaveHeight;
      ` + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
          vec3 transformed = position;
          float w1 = sin(transformed.x * 0.15 + uTime * 0.6) * uAmplitude * 0.45;
          float w2 = sin(transformed.y * 0.23 + uTime * 0.9) * uAmplitude * 0.35;
          float w3 = sin((transformed.x + transformed.y) * 0.08 + uTime * 0.35) * uAmplitude * 0.55;
          float w4 = sin((transformed.x * 0.7 - transformed.y * 0.5) * 0.11 + uTime * 0.7) * uAmplitude * 0.25;
          float wave = w1 + w2 + w3 + w4;
          transformed.z += wave;
          vWaveHeight = wave / max(uAmplitude, 0.0001);
          vWorldPos = transformed;
        `,
      );

      shader.fragmentShader = `
        uniform vec3 uSurface;
        uniform vec3 uDeep;
        uniform vec3 uCrest;
        varying vec3 vWorldPos;
        varying float vWaveHeight;
      ` + shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
          float depthMix = smoothstep(-0.3, 1.0, vWaveHeight);
          vec3 color = mix(uDeep, uSurface, depthMix);
          float crestMix = smoothstep(0.4, 1.0, vWaveHeight);
          color = mix(color, uCrest, crestMix * 0.35);
          float dist = length(vWorldPos.xy);
          float distMix = smoothstep(40.0, 220.0, dist);
          color = mix(color, uDeep, distMix * 0.65);
          diffuseColor.rgb = color;
        `,
      );
    };

    return { geometry: geom, material: mat, uniforms: uni };
  }, [amplitude]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh geometry={geometry}
          material={material}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow />
  );
}

// ---------------------------------------------------------------------------
// Wake - foam plane trailing the stern, length and alpha ride boat speed.
// ---------------------------------------------------------------------------

function Wake({ twaSigned, boatSpeed, active }: {
  twaSigned: number;
  boatSpeed: number;
  active: boolean;
}) {
  const yawRad = THREE.MathUtils.degToRad(-twaSigned);
  const length = Math.max(3, Math.min(26, boatSpeed * 2.4));
  const intensity = active ? Math.min(1, boatSpeed / 7) : 0;

  const material = useMemo(() => {
    const uni = {
      uTime: { value: 0 },
      uIntensity: { value: intensity },
    };
    return new THREE.ShaderMaterial({
      uniforms: uni,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          float along = vUv.y;
          float across = vUv.x;
          float lengthFade = pow(1.0 - along, 1.4);
          float edgeFade = smoothstep(0.0, 0.22, across) * smoothstep(1.0, 0.78, across);
          float centreBoost = clamp(1.0 - abs(across - 0.5) * 1.4, 0.0, 1.0);
          float scroll = fract(along * 2.4 - uTime * 0.35);
          float streak = smoothstep(0.28, 0.5, scroll) * smoothstep(0.72, 0.5, scroll);
          float cross = smoothstep(0.44, 0.56, fract(across * 9.0 + uTime * 0.3));
          float noise = streak * 0.55 + cross * 0.2 + 0.25;
          float alpha = lengthFade * edgeFade * centreBoost * noise * uIntensity * 0.9;
          vec3 foam = mix(vec3(0.55, 0.75, 0.88), vec3(1.0, 1.0, 1.0), noise);
          gl_FragColor = vec4(foam, alpha);
        }
      `,
    });
  }, [intensity]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  if (intensity < 0.05) return null;

  return (
    <group rotation={[0, yawRad, 0]}>
      <mesh position={[0, 0.05, 3.2 + length / 2]}
            rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, length]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Horizon - deterministic ring of low coast shapes to anchor the eye.
// ---------------------------------------------------------------------------

function Horizon() {
  const items = useMemo(() => {
    const arr: Array<{ x: number; z: number; sx: number; sy: number; sz: number; rotY: number; tint: number }> = [];
    const count = 34;
    const radius = 175;
    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * Math.PI * 2;
      const jitter = Math.sin(i * 13.7) * 0.08;
      const angle = baseAngle + jitter;
      const r = radius + Math.sin(i * 5.3) * 18;
      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;
      const sx = 22 + Math.sin(i * 2.1) * 10;
      const syRaw = 2.2 + Math.sin(i * 7.9) * 1.4;
      const sz = 6 + Math.sin(i * 3.3) * 3;
      const tint = 0.5 + Math.sin(i * 11.1) * 0.22;
      arr.push({ x, z, sx, sy: Math.max(0.6, syRaw), sz, rotY: angle + Math.PI / 2, tint });
    }
    return arr;
  }, []);

  const sharedGeom = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i}
              position={[it.x, it.sy / 2 - 0.25, it.z]}
              rotation={[0, it.rotY, 0]}
              scale={[it.sx, it.sy, it.sz]}
              geometry={sharedGeom}>
          <meshStandardMaterial
            color={new THREE.Color().setHSL(0.58, 0.1 + it.tint * 0.1, 0.1 + it.tint * 0.08)}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Yacht: hull + mast + cambered sails + bow marker.
// ---------------------------------------------------------------------------

function Yacht(props: SceneProps) {
  const { twaSigned, heel, mainAngle, jibAngle, mainOn, jibOn, reef } = props;

  const yawRad = THREE.MathUtils.degToRad(-twaSigned);
  const rollRad = THREE.MathUtils.degToRad(twaSigned >= 0 ? -heel : heel);
  const mainReefScale = 1 - 0.45 * reef;
  const sailSide = twaSigned >= 0 ? -1 : 1;

  return (
    <group rotation={[rollRad, yawRad, 0]} position={[0, 0.35, 0]}>
      <HullShape />

      {/* Cockpit */}
      <mesh position={[0, 0.52, 0.8]} castShadow>
        <boxGeometry args={[0.6, 0.06, 1.1]} />
        <meshStandardMaterial color="#0a1628" roughness={0.8} />
      </mesh>

      {/* Mast */}
      <mesh position={[0, 3.6, -0.4]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 7.2, 18]} />
        <meshStandardMaterial color="#2d4159" metalness={0.5} roughness={0.45} />
      </mesh>

      {/* Forestay (visual rigging line to bow) */}
      <mesh position={[0, 2.6, -1.4]} rotation={[THREE.MathUtils.degToRad(-26), 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 4.6, 6]} />
        <meshStandardMaterial color="#55708a" />
      </mesh>

      {/* Main + boom */}
      {mainOn && (
        <group position={[0, 1.0, -0.4]}
               rotation={[0, THREE.MathUtils.degToRad(sailSide * mainAngle), 0]}>
          <mesh position={[0, 0, 1.45]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 2.95, 12]} />
            <meshStandardMaterial color="#2d4159" metalness={0.5} roughness={0.5} />
          </mesh>
          <MainSail scaleY={mainReefScale} sailSide={sailSide} />
        </group>
      )}

      {/* Jib */}
      {jibOn && (
        <group position={[0, 0.95, -2.2]}
               rotation={[0, THREE.MathUtils.degToRad(sailSide * jibAngle), 0]}>
          <JibSail sailSide={sailSide} />
        </group>
      )}

      {/* Bow marker */}
      <mesh position={[0, 0.58, -3.28]}>
        <coneGeometry args={[0.12, 0.32, 8]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.65} />
      </mesh>
    </group>
  );
}

function HullShape() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -3.55);
    shape.quadraticCurveTo(1.15, -1.7, 0.95, 1.0);
    shape.quadraticCurveTo(0.75, 2.45, 0, 2.7);
    shape.quadraticCurveTo(-0.75, 2.45, -0.95, 1.0);
    shape.quadraticCurveTo(-1.15, -1.7, 0, -3.55);
    const extrudeSettings = {
      depth: 0.75,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.1,
      bevelSegments: 4,
      curveSegments: 16,
    };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.rotateX(Math.PI / 2);
    geom.translate(0, -0.12, 0);
    geom.computeVertexNormals();
    return geom;
  }, []);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#eef3f7" roughness={0.4} metalness={0.15} />
    </mesh>
  );
}

function buildCamberedSail({ rows, cols, height, footLen, maxCamber, sailSide, baseY = 0 }: {
  rows: number;
  cols: number;
  height: number;
  footLen: number;
  maxCamber: number;
  sailSide: number;
  baseY?: number;
}) {
  const verts: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const y = baseY + t * height;
    const chord = footLen * (1 - t);
    for (let c = 0; c <= cols; c++) {
      const u = cols === 0 ? 0 : c / cols;
      const z = chord * u;
      const cm = Math.sin(u * Math.PI) * maxCamber * (1 - t * 0.4);
      const x = -sailSide * cm;
      verts.push(x, y, z);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + 1;
      const d = a + (cols + 1);
      const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geom.setIndex(idx);
  geom.computeVertexNormals();
  return geom;
}

function MainSail({ scaleY = 1, sailSide = 1 }: { scaleY?: number; sailSide?: number }) {
  const geometry = useMemo(() => buildCamberedSail({
    rows: 10, cols: 10, height: 5.7, footLen: 2.9, maxCamber: 0.38, sailSide,
  }), [sailSide]);

  return (
    <mesh geometry={geometry} scale={[1, scaleY, 1]} castShadow>
      <meshStandardMaterial color="#f7fbff" roughness={0.6} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

function JibSail({ sailSide = 1 }: { sailSide?: number }) {
  const geometry = useMemo(() => buildCamberedSail({
    rows: 8, cols: 8, height: 4.5, footLen: 1.9, maxCamber: 0.3, sailSide, baseY: 0.3,
  }), [sailSide]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color="#f7fbff" roughness={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// WindArrow - floating cyan marker above the scene.
// ---------------------------------------------------------------------------

function WindArrow({ windSpeed }: { windSpeed: number }) {
  const intensity = 0.4 + windSpeed / 40;
  return (
    <group position={[0, 9, 9]}>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2.5, 8]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={intensity} />
      </mesh>
      <mesh position={[0, -1.9, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.22, 0.5, 8]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={intensity} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main scene (dynamic-imported from the page)
// ---------------------------------------------------------------------------

export default function SailingScene(props: SceneProps) {
  const { autoRotate = false } = props;
  const sunPos: [number, number, number] = [120, 50, 80];

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [5, 4.5, 13], fov: 50, near: 0.1, far: 600 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0a1c30']} />
      <fog attach="fog" args={['#0a1c30', 70, 260]} />

      <Suspense fallback={null}>
        <Sky
          distance={450000}
          sunPosition={sunPos}
          inclination={0.55}
          azimuth={0.25}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
          rayleigh={2.5}
          turbidity={6}
        />
      </Suspense>

      {/* Local lights only, no external HDR (CSP-safe) */}
      <ambientLight intensity={0.6} />
      <hemisphereLight intensity={0.45} color="#bfe2f2" groundColor="#0a1628" />
      <directionalLight
        position={sunPos}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Water windSpeed={props.windSpeed} />
      <Horizon />
      <Wake twaSigned={props.twaSigned}
            boatSpeed={props.boatSpeed}
            active={props.mainOn || props.jibOn} />
      <Yacht {...props} />
      <WindArrow windSpeed={props.windSpeed} />

      <ChaseCam twaSigned={props.twaSigned}
                boatSpeed={props.boatSpeed}
                autoDrift={autoRotate} />
    </Canvas>
  );
}

export type { ThreeElements };
