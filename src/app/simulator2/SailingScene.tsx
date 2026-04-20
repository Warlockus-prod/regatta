'use client';

import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';

// ============================================================================
// eSail-style 3D sailing scene.
//
// Uses react-three-fiber + drei. Procedural yacht (no GLB dependency) so it
// ships without extra asset pipeline. Water is a subdivided plane with a
// simple vertex shader for wave motion; sky via drei's Sky component.
//
// Props come from the physics engine - same BoatState + TickDiagnostics as
// the other simulator routes. This component is strictly a renderer.
// ============================================================================

export interface SceneProps {
  /** TWA in degrees, positive = starboard tack (wind from starboard). */
  twaSigned: number;
  /** Wind speed in knots (used for visual wave amplitude). */
  windSpeed: number;
  /** Boat speed in knots (used for wake length). */
  boatSpeed: number;
  /** Heel angle in degrees, positive = heel to leeward. */
  heel: number;
  /** Main angle off centerline, degrees. */
  mainAngle: number;
  /** Jib angle off centerline, degrees. */
  jibAngle: number;
  /** Main raised flag. */
  mainOn: boolean;
  /** Jib raised flag + optional furl percent. */
  jibOn: boolean;
  /** 0..1 reef depth for visual main-area shrink. */
  reef: number;
  /** Camera autorotate around the yacht. */
  autoRotate?: boolean;
}

// ---------------------------------------------------------------------------
// Water plane with simple sine-wave vertex displacement via onBeforeCompile.
// ---------------------------------------------------------------------------

function Water({ windSpeed }: { windSpeed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const amplitude = 0.05 + (windSpeed / 25) * 0.25; // 0.05 to ~0.3

  const { geometry, material, uniforms } = useMemo(() => {
    const geom = new THREE.PlaneGeometry(160, 160, 96, 96);
    const uni = {
      uTime: { value: 0 },
      uAmplitude: { value: amplitude },
      uColor: { value: new THREE.Color('#0e2945') },
      uDeep: { value: new THREE.Color('#041020') },
    };
    const mat = new THREE.MeshStandardMaterial({
      color: '#0e2945',
      metalness: 0.4,
      roughness: 0.5,
      transparent: true,
      opacity: 0.95,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uni.uTime;
      shader.uniforms.uAmplitude = uni.uAmplitude;
      shader.uniforms.uColor = uni.uColor;
      shader.uniforms.uDeep = uni.uDeep;
      shader.vertexShader =
        `uniform float uTime;\nuniform float uAmplitude;\nvarying vec3 vWorldPos;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          vec3 transformed = position;
          float waveA = sin(transformed.x * 0.35 + uTime * 0.8) * uAmplitude;
          float waveB = sin(transformed.y * 0.5 + uTime * 1.2) * uAmplitude * 0.6;
          float waveC = sin((transformed.x + transformed.y) * 0.22 + uTime * 0.45) * uAmplitude * 0.4;
          transformed.z += waveA + waveB + waveC;
          vWorldPos = transformed;
          `,
        );
      shader.fragmentShader =
        `uniform vec3 uColor;\nuniform vec3 uDeep;\nvarying vec3 vWorldPos;\n` +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          float d = smoothstep(0.0, 12.0, abs(vWorldPos.z) * 10.0);
          vec3 mixed = mix(uColor, uDeep, d);
          diffuseColor.rgb = mixed;
          `,
        );
    };
    return { geometry: geom, material: mat, uniforms: uni };
  }, [amplitude]);

  useFrame((state) => {
    // Uniforms object is stable across renders (useMemo with static deps),
    // so updating its value is safe here.
    // eslint-disable-next-line react-hooks/immutability
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={ref}
          geometry={geometry}
          material={material}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow />
  );
}

// ---------------------------------------------------------------------------
// Procedural yacht: hull (extruded), mast, sails
// ---------------------------------------------------------------------------

function Yacht(props: SceneProps) {
  const { twaSigned, heel, mainAngle, jibAngle, mainOn, jibOn, reef } = props;
  const group = useRef<THREE.Group>(null);

  // Yaw: boat heading in world frame. We keep wind coming from +Z world
  // direction, so the boat yaw equals -TWA (so that TWA=0 points the bow at
  // the wind, TWA=90 means boat sideways, TWA=180 means downwind).
  const yawRad = THREE.MathUtils.degToRad(-twaSigned);
  // Heel direction: positive heel = to leeward. On starboard tack (twa > 0),
  // leeward is port = negative x = negative roll.
  const rollRad = THREE.MathUtils.degToRad(twaSigned >= 0 ? -heel : heel);
  const mainReefScale = 1 - 0.45 * reef;
  const sailSide = twaSigned >= 0 ? -1 : 1;

  return (
    <group ref={group} rotation={[rollRad, yawRad, 0]} position={[0, 0.3, 0]}>
      {/* Hull */}
      <HullShape />

      {/* Cockpit hint */}
      <mesh position={[0, 0.45, 0.7]} castShadow>
        <boxGeometry args={[0.6, 0.05, 1.0]} />
        <meshStandardMaterial color="#0a1628" roughness={0.7} />
      </mesh>

      {/* Mast */}
      <mesh position={[0, 3.6, -0.4]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 7.0, 16]} />
        <meshStandardMaterial color="#3a5272" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Boom (positioned at gooseneck, extends aft on leeward side) */}
      {mainOn && (
        <group position={[0, 0.9, -0.4]}
               rotation={[0, THREE.MathUtils.degToRad(sailSide * mainAngle), 0]}>
          <mesh position={[0, 0, 1.4]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 2.8, 12]} />
            <meshStandardMaterial color="#3a5272" metalness={0.4} roughness={0.5} />
          </mesh>
          {/* Mainsail - flat but curved via plane subdivision */}
          <MainSail scaleY={mainReefScale} />
        </group>
      )}

      {/* Jib - mounted on forestay, rotates to leeward */}
      {jibOn && (
        <group position={[0, 0.9, -2.2]}
               rotation={[0, THREE.MathUtils.degToRad(sailSide * jibAngle), 0]}>
          <JibSail />
        </group>
      )}

      {/* Bow indicator (small cyan marker) */}
      <mesh position={[0, 0.5, -3.2]}>
        <coneGeometry args={[0.12, 0.3, 8]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function HullShape() {
  // Extruded hull shape from a yacht-like outline.
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -3.4);
    shape.quadraticCurveTo(1.1, -1.6, 0.9, 1.2);
    shape.quadraticCurveTo(0.7, 2.4, 0, 2.6);
    shape.quadraticCurveTo(-0.7, 2.4, -0.9, 1.2);
    shape.quadraticCurveTo(-1.1, -1.6, 0, -3.4);
    const extrudeSettings = {
      depth: 0.65,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.08,
      bevelSegments: 3,
      curveSegments: 14,
    };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.rotateX(Math.PI / 2);
    // Now the extruded depth is vertical (y axis). Center vertically so the
    // deck is at y=~0.3 and keel/bottom below.
    geom.translate(0, -0.1, 0);
    geom.computeVertexNormals();
    return geom;
  }, []);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#e8eef3" roughness={0.45} metalness={0.1} />
    </mesh>
  );
}

function MainSail({ scaleY = 1 }: { scaleY?: number }) {
  const geometry = useMemo(() => {
    // Triangular sail: luff along mast (y axis), foot along boom (z axis)
    const geom = new THREE.BufferGeometry();
    const verts = new Float32Array([
      0, 0, 0,         // tack (mast bottom)
      0, 5.5, 0,       // head (mast top)
      0, 0, 2.7,       // clew (end of boom)
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geom.setIndex([0, 1, 2, 0, 2, 1]); // double sided via reverse winding too
    geom.computeVertexNormals();
    return geom;
  }, []);

  return (
    <mesh geometry={geometry} scale={[1, scaleY, 1]} castShadow>
      <meshStandardMaterial
        color="#f6fbff"
        roughness={0.6}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function JibSail() {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const verts = new Float32Array([
      0, 0, 0,         // tack (deck)
      0, 4.4, 0,       // head (stay top)
      0, 0.3, 1.7,     // clew
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geom.setIndex([0, 1, 2, 0, 2, 1]);
    geom.computeVertexNormals();
    return geom;
  }, []);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        color="#f6fbff"
        roughness={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Wind arrow - floating above the scene, always pointing down from TW source
// ---------------------------------------------------------------------------

function WindArrow({ windSpeed }: { windSpeed: number }) {
  const intensity = 0.4 + windSpeed / 40;
  return (
    <group position={[0, 8, 8]}>
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
// Main scene component (what gets dynamic-imported from the page)
// ---------------------------------------------------------------------------

export default function SailingScene(props: SceneProps) {
  const { autoRotate = false } = props;

  // Sun position shifts slightly with time of day feel
  const sunPos: [number, number, number] = [80, 30, 60];

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [5, 4.5, 11], fov: 45, near: 0.1, far: 500 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0b1e38']} />
      <fog attach="fog" args={['#0b1e38', 30, 120]} />

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

      {/* Lighting - all local, no external HDR fetch (CSP-safe) */}
      <ambientLight intensity={0.7} />
      <hemisphereLight intensity={0.5} color="#87ceeb" groundColor="#0a1628" />
      <directionalLight
        position={sunPos}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Water windSpeed={props.windSpeed} />
      <Yacht {...props} />
      <WindArrow windSpeed={props.windSpeed} />

      <OrbitControls
        target={[0, 1, 0]}
        enablePan={false}
        minDistance={6}
        maxDistance={28}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate={autoRotate}
        autoRotateSpeed={0.4}
      />
    </Canvas>
  );
}

// ThreeElements is re-exported so the page can type-narrow if needed
export type { ThreeElements };
