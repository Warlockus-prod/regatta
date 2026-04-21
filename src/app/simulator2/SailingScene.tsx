'use client';

import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { useRef, useMemo, useEffect, Suspense } from 'react';
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

export interface SceneCourseMark {
  pos: { x: number; z: number };
  radius: number;
  label: string;
}

export interface SceneOpponent {
  id: string;
  color: string;
  pos: { x: number; z: number };
  heading: number;
}

export interface SceneProps {
  /** TWA in degrees, positive = starboard tack. Drives sail side and heel. */
  twaSigned: number;
  /** Boat world compass heading (0-360). Drives yacht yaw and chase cam. */
  heading: number;
  /** True wind source in world compass (0-360). Places the wind marker. */
  trueWindDir: number;
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
  /** Boat's world 2D position in course units. Lets the scene render marks
   *  relative to the boat. */
  boatWorldPos?: { x: number; z: number };
  /** Course geometry for PR-4 race shell. If present, scene renders start
   *  line and marks in world space. */
  startLine?: { a: { x: number; z: number }; b: { x: number; z: number } } | null;
  marks?: SceneCourseMark[];
  /** Index of the mark the boat is currently heading for; used for the
   *  target arrow and highlighted buoy. */
  nextMarkIndex?: number;
  /** When true, target arrow/highlight renders above the next mark. */
  raceActive?: boolean;
  /** AI opponents to render as small boats in the world. */
  opponents?: SceneOpponent[];
}

// ---------------------------------------------------------------------------
// ChaseCam - trails the stern using boat yaw. Smooth lerp, speed-aware pull.
// ---------------------------------------------------------------------------

function ChaseCam({ heading, boatSpeed, autoDrift }: {
  heading: number;
  boatSpeed: number;
  autoDrift: boolean;
}) {
  const yawRad = THREE.MathUtils.degToRad(-heading);
  const tmpTarget = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const camera = state.camera;
    const speedFactor = Math.min(1, boatSpeed / 10);
    const chaseDist = 16.5 + speedFactor * 3.5;
    const chaseHeight = 6.2 + speedFactor * 0.8;
    const drift = autoDrift ? state.clock.elapsedTime * 0.08 : 0;
    const camYaw = yawRad + drift;

    tmpTarget.current.set(
      Math.sin(camYaw) * chaseDist,
      chaseHeight,
      Math.cos(camYaw) * chaseDist,
    );
    // Look slightly ahead of the boat so the bow gets screen priority
    tmpLook.current.set(
      -Math.sin(yawRad) * 2.2,
      1.9,
      -Math.cos(yawRad) * 2.2,
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

function Wake({ heading, boatSpeed, active }: {
  heading: number;
  boatSpeed: number;
  active: boolean;
}) {
  const yawRad = THREE.MathUtils.degToRad(-heading);
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
          // UV convention: after plane rotation, vUv.y = 1 is the edge nearest
          // the boat's stern and vUv.y = 0 is the far end of the wake.
          float along = vUv.y;
          float across = vUv.x;
          float lengthFade = pow(along, 1.3);
          float edgeFade = smoothstep(0.0, 0.24, across) * smoothstep(1.0, 0.76, across);
          float centreBoost = clamp(1.0 - abs(across - 0.5) * 1.3, 0.0, 1.0);
          // Streaks scroll from near-boat toward far end.
          float scroll = fract(along * 2.2 + uTime * 0.4);
          float streak = smoothstep(0.22, 0.5, scroll) * smoothstep(0.78, 0.5, scroll);
          float cross = smoothstep(0.42, 0.58, fract(across * 10.0 + uTime * 0.25));
          float noise = streak * 0.6 + cross * 0.2 + 0.35;
          float alpha = lengthFade * edgeFade * centreBoost * noise * uIntensity;
          vec3 foam = mix(vec3(0.75, 0.88, 0.96), vec3(1.0, 1.0, 1.0), noise);
          gl_FragColor = vec4(foam, clamp(alpha, 0.0, 1.0));
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
      {/* Lift wake slightly above peak wave height so it reads as surface foam
          rather than being occluded at wave crests. */}
      <mesh position={[0, 0.45, 3.2 + length / 2]}
            rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, length]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Horizon - ring of low irregular island silhouettes, varied sizes and gaps.
// ---------------------------------------------------------------------------

function makeIslandGeom() {
  const shape = new THREE.Shape();
  const outline: Array<[number, number]> = [
    [-1.0, 0.0], [-0.85, 0.25], [-0.55, 0.42], [-0.2, 0.48],
    [0.15, 0.4], [0.48, 0.45], [0.8, 0.28], [1.0, 0.05],
    [0.85, -0.18], [0.55, -0.3], [0.2, -0.35], [-0.15, -0.32],
    [-0.55, -0.28], [-0.85, -0.15],
  ];
  shape.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) shape.lineTo(outline[i][0], outline[i][1]);
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: 0.35,
    bevelSize: 0.28,
    bevelSegments: 3,
    curveSegments: 6,
  });
  geom.rotateX(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

function Horizon() {
  const islandGeom = useMemo(() => makeIslandGeom(), []);

  const items = useMemo(() => {
    // Hand-placed angular slots around the ring so gaps are natural, not regular.
    const slots: Array<{ angle: number; variance: number; size: number }> = [
      { angle: 0.1, variance: 0.08, size: 2.2 },
      { angle: 0.55, variance: 0.05, size: 1.4 },
      { angle: 1.05, variance: 0.1, size: 2.8 },
      { angle: 1.9, variance: 0.08, size: 1.6 },
      { angle: 2.45, variance: 0.06, size: 2.0 },
      { angle: 3.0, variance: 0.09, size: 2.6 },
      { angle: 3.7, variance: 0.05, size: 1.3 },
      { angle: 4.2, variance: 0.07, size: 2.1 },
      { angle: 4.8, variance: 0.05, size: 1.5 },
      { angle: 5.35, variance: 0.08, size: 2.4 },
      { angle: 5.95, variance: 0.06, size: 1.8 },
    ];
    return slots.map((slot, i) => {
      const angle = slot.angle + Math.sin(i * 7.3) * slot.variance;
      const r = 165 + Math.sin(i * 3.1) * 30;
      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;
      const s = slot.size;
      const sx = 18 * s + Math.sin(i * 2.4) * 6;
      const sy = 2.8 * s + Math.sin(i * 5.7) * 1.2;
      const sz = 9 * s + Math.sin(i * 8.3) * 4;
      const shade = 0.55 + Math.sin(i * 11.7) * 0.2;
      const rotY = angle + Math.PI / 2 + Math.sin(i * 1.7) * 0.4;
      return { x, z, sx, sy: Math.max(1.2, sy), sz, rotY, shade };
    });
  }, []);

  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i}
              position={[it.x, it.sy * 0.35 - 0.3, it.z]}
              rotation={[0, it.rotY, 0]}
              scale={[it.sx, it.sy, it.sz]}
              geometry={islandGeom}>
          <meshStandardMaterial
            color={new THREE.Color().setHSL(0.58, 0.14, 0.11 + it.shade * 0.07)}
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
  const { twaSigned, heading, heel, mainAngle, jibAngle, mainOn, jibOn, reef } = props;

  // Yaw comes from world heading; sail side and heel direction stay
  // TWA-driven (they depend on which tack, not on compass bearing).
  const yawRad = THREE.MathUtils.degToRad(-heading);
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
    rows: 12, cols: 12, height: 5.9, footLen: 3.0, maxCamber: 0.52, sailSide,
  }), [sailSide]);

  return (
    <mesh geometry={geometry} scale={[1, scaleY, 1]} castShadow>
      <meshStandardMaterial
        color="#f8fbfe"
        roughness={0.55}
        metalness={0}
        side={THREE.DoubleSide}
        emissive="#1a2838"
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

function JibSail({ sailSide = 1 }: { sailSide?: number }) {
  const geometry = useMemo(() => buildCamberedSail({
    rows: 10, cols: 10, height: 4.6, footLen: 2.0, maxCamber: 0.42, sailSide, baseY: 0.3,
  }), [sailSide]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        color="#f8fbfe"
        roughness={0.55}
        side={THREE.DoubleSide}
        emissive="#1a2838"
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Buoy / mark rendering. Buoys float on the water; the next mark is lit up
// and wears a target arrow hovering above it.
// ---------------------------------------------------------------------------

function Buoy({ x, z, highlighted }: { x: number; z: number; highlighted: boolean }) {
  const color = highlighted ? '#ffaa00' : '#ff4455';
  const intensity = highlighted ? 1.1 : 0.6;
  return (
    <group position={[x, 0.4, z]}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.75, 1.6, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity * 0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} />
      </mesh>
    </group>
  );
}

function StartLinePins({ ax, az, bx, bz }: { ax: number; az: number; bx: number; bz: number }) {
  return (
    <group>
      <Buoy x={ax} z={az} highlighted={false} />
      <Buoy x={bx} z={bz} highlighted={false} />
      {/* Connector strip on the water between pins so the line reads clearly */}
      <mesh position={[(ax + bx) / 2, 0.08, (az + bz) / 2]}
            rotation={[-Math.PI / 2, 0, Math.atan2(bx - ax, bz - az)]}>
        <planeGeometry args={[0.6, Math.hypot(bx - ax, bz - az)]} />
        <meshStandardMaterial color="#ffffff" emissive="#88c6e4" emissiveIntensity={0.4} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function TargetArrow({ x, z, time }: { x: number; z: number; time: number }) {
  // Hovers and bobs above the target mark, visible from far away.
  const bob = Math.sin(time * 2) * 0.3;
  return (
    <group position={[x, 6 + bob, z]}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.8, 1.6, 8]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <ringGeometry args={[0.6, 0.9, 24]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function OpponentBoat({ x, z, yaw, color }: { x: number; z: number; yaw: number; color: string }) {
  return (
    <group position={[x, 0.4, z]} rotation={[0, yaw, 0]}>
      {/* Hull */}
      <mesh>
        <boxGeometry args={[0.8, 0.25, 2.4]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.15} />
      </mesh>
      {/* Mast */}
      <mesh position={[0, 1.6, -0.2]}>
        <cylinderGeometry args={[0.05, 0.06, 3.0, 8]} />
        <meshStandardMaterial color="#2d4159" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Sail (simple triangle) */}
      <mesh position={[0, 1.55, 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.3, 2.4]} />
        <meshStandardMaterial color="#f7fbff" side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Opponents({ boatWorldPos, opponents }: {
  boatWorldPos: { x: number; z: number };
  opponents: SceneOpponent[];
}) {
  return (
    <group>
      {opponents.map((o) => (
        <OpponentBoat
          key={o.id}
          x={o.pos.x - boatWorldPos.x}
          z={o.pos.z - boatWorldPos.z}
          yaw={THREE.MathUtils.degToRad(-o.heading)}
          color={o.color}
        />
      ))}
    </group>
  );
}

function RaceObjects({
  boatWorldPos,
  startLine,
  marks,
  nextMarkIndex,
  raceActive,
}: {
  boatWorldPos: { x: number; z: number };
  startLine: { a: { x: number; z: number }; b: { x: number; z: number } } | null | undefined;
  marks: SceneCourseMark[];
  nextMarkIndex: number;
  raceActive: boolean;
}) {
  const timeRef = useRef(0);
  useFrame((_, delta) => {
    timeRef.current += delta;
  });

  // Positions in the scene are world - boatPos. Far marks are clipped by
  // fog so we don't need to cull explicitly for PR-4.
  const sx = (wx: number) => wx - boatWorldPos.x;
  const sz = (wz: number) => wz - boatWorldPos.z;

  const activeMarkIdx = Math.min(nextMarkIndex, marks.length - 1);

  return (
    <group>
      {startLine && (
        <StartLinePins
          ax={sx(startLine.a.x)} az={sz(startLine.a.z)}
          bx={sx(startLine.b.x)} bz={sz(startLine.b.z)}
        />
      )}
      {marks.map((m, i) => (
        <Buoy
          key={i}
          x={sx(m.pos.x)}
          z={sz(m.pos.z)}
          highlighted={raceActive && i === activeMarkIdx}
        />
      ))}
      {raceActive && marks[activeMarkIdx] && (
        <TargetArrow
          x={sx(marks[activeMarkIdx].pos.x)}
          z={sz(marks[activeMarkIdx].pos.z)}
          time={timeRef.current}
        />
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// WindArrow - floating cyan marker above the scene.
// ---------------------------------------------------------------------------

function WindArrow({ windSpeed, trueWindDir }: { windSpeed: number; trueWindDir: number }) {
  const intensity = 0.4 + windSpeed / 40;
  // Place the wind marker at the world compass direction where the wind is
  // coming from, ~9 units out. Compass 0 = -z, 90 = +x.
  const rad = (trueWindDir * Math.PI) / 180;
  const dist = 9;
  const x = Math.sin(rad) * dist;
  const z = -Math.cos(rad) * dist;
  return (
    <group position={[x, 9, z]}>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2.5, 8]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={intensity} />
      </mesh>
      <mesh position={[0, -1.9, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.22, 0.5, 8]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={intensity} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main scene (dynamic-imported from the page)
// ---------------------------------------------------------------------------

export default function SailingScene(props: SceneProps) {
  const { autoRotate = false } = props;
  // Low sun for a dusk mood; warmer color mix against the cool ocean.
  const sunPos: [number, number, number] = [-180, 30, -90];

  // Nudge R3F's ResizeObserver on mount. Under Next.js dynamic import + Turbopack,
  // the observer occasionally misses the initial non-zero container size and the
  // canvas stays stuck at the HTML default of 300x150 until a resize fires.
  // We fire over several timeouts to cover both the first paint and the moment
  // the observer is actually attached.
  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    for (const delay of [0, 50, 150, 400]) {
      timers.push(setTimeout(() => window.dispatchEvent(new Event('resize')), delay));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [5, 4.5, 13], fov: 50, near: 0.1, far: 600 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#071423']} />
      <fog attach="fog" args={['#1a324a', 70, 210]} />

      <Suspense fallback={null}>
        <Sky
          distance={450000}
          sunPosition={sunPos}
          mieCoefficient={0.006}
          mieDirectionalG={0.88}
          rayleigh={0.9}
          turbidity={3}
        />
      </Suspense>

      {/* Local lights only, no external HDR (CSP-safe) */}
      <ambientLight intensity={0.4} />
      <hemisphereLight intensity={0.5} color="#7aa1bf" groundColor="#05101c" />
      <directionalLight
        position={sunPos}
        intensity={1.35}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Water windSpeed={props.windSpeed} />
      <Horizon />
      <Wake heading={props.heading}
            boatSpeed={props.boatSpeed}
            active={props.mainOn || props.jibOn} />
      {props.marks && props.marks.length > 0 && (
        <RaceObjects
          boatWorldPos={props.boatWorldPos ?? { x: 0, z: 0 }}
          startLine={props.startLine}
          marks={props.marks}
          nextMarkIndex={props.nextMarkIndex ?? 0}
          raceActive={props.raceActive ?? false}
        />
      )}
      {props.opponents && props.opponents.length > 0 && (
        <Opponents
          boatWorldPos={props.boatWorldPos ?? { x: 0, z: 0 }}
          opponents={props.opponents}
        />
      )}
      <Yacht {...props} />
      <WindArrow windSpeed={props.windSpeed} trueWindDir={props.trueWindDir} />

      <ChaseCam heading={props.heading}
                boatSpeed={props.boatSpeed}
                autoDrift={autoRotate} />
    </Canvas>
  );
}

export type { ThreeElements };
