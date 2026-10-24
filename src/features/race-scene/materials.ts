// TSL node materials of the race scene (ADR-0008). One shader source runs on
// WebGPU and, through three.js' fallback, on WebGL2 (the iOS Simulator, older
// phones). Stylized, not photoreal: the water shows the wind (streaks running
// downwind), lightens over the shallows and foams along the beach; the sky is
// a gradient with soft clouds. Everything is procedural (the CSP allows no
// external textures).

import * as THREE from "three/webgpu";
import {
  abs, cameraPosition, color, dot, exp, float, length, max, mix, mx_fractal_noise_float, mx_noise_float, normalize,
  positionLocal, positionWorld, pow, reflect, sin, cos, smoothstep, texture, uniform, uv, vec2, vec3,
} from "three/tsl";
import { WAVES } from "@/features/simulator-3d/ocean/waves";
import type { ShoreField } from "./shore";

// TSL nodes are typed per operator chain; the builders below pass them around loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;

/** A palette colour as a shader constant (converted to the linear working space). */
const tone = (hex: string): N => color(new THREE.Color(hex));

/** Waves flatten from CALM[0] metres from the boat and are gone by CALM[1] (as in the old ocean). */
export const CALM: [number, number] = [45, 420];

export const PALETTE = {
  deep: "#0d5873",
  shallow: "#36b8b4",
  streak: "#0a4058",
  foam: "#f4fbfd",
  horizon: "#a9cfdc",
  zenith: "#2a628c",
  sun: "#fff2d6",
} as const;

/** Height and slope of the shared wave field at race position `p` (x, z): vec3(h, dh/dx, dh/dz) negated as in waves.ts. */
function waveField(p: N, t: N): N {
  let h: N = float(0);
  let nx: N = float(0);
  let nz: N = float(0);
  for (const w of WAVES) {
    const k = (2 * Math.PI) / w.len;
    const phase = p.x.mul(w.dirX).add(p.y.mul(w.dirZ)).mul(k).add(t.mul(w.speed));
    h = h.add(sin(phase).mul(w.amp));
    const d = cos(phase).mul(w.amp * k);
    nx = nx.sub(d.mul(w.dirX));
    nz = nz.sub(d.mul(w.dirZ));
  }
  return vec3(h, nx, nz);
}

/** The same calm-out with distance on the CPU, so wakes and buoys sit on the water the GPU draws. */
export function calmFactor(distance: number): number {
  const t = Math.min(1, Math.max(0, (distance - CALM[0]) / (CALM[1] - CALM[0])));
  return 1 - t * t * (3 - 2 * t);
}

export interface WaterUniforms {
  time: { value: number };
  travel: { value: THREE.Vector2 };
  /** Unit vector the wind blows towards, race frame (x east, y south). */
  flow: { value: THREE.Vector2 };
  /** Wind strength 0..1, scales how busy the streaks are. */
  windiness: { value: number };
  sunDir: { value: THREE.Vector3 };
}

export function waterUniforms(): WaterUniforms {
  return {
    time: uniform(0),
    travel: uniform(new THREE.Vector2()),
    flow: uniform(new THREE.Vector2(0, 1)),
    windiness: uniform(0.6),
    sunDir: uniform(new THREE.Vector3(0.6, 0.7, 0.3).normalize()),
  } as unknown as WaterUniforms;
}

/** The shore field as a texture over its rectangle of the race area. */
export function shoreTexture(field: ShoreField): THREE.DataTexture {
  const rgba = new Uint8Array(field.cols * field.rows * 4);
  for (let i = 0; i < field.data.length; i++) {
    rgba[i * 4] = field.data[i];
    rgba[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(rgba, field.cols, field.rows, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

export function waterMaterial(u: WaterUniforms, shore: { texture: THREE.Texture; min: { x: number; z: number }; size: { x: number; z: number } }): THREE.MeshBasicNodeMaterial {
  const m = new THREE.MeshBasicNodeMaterial();
  const U = u as unknown as Record<keyof WaterUniforms, N>;
  const t = U.time;

  // Vertex: the shared waves, calmed with distance from the boat.
  const local: N = positionLocal;
  const raceV = local.xz.add(U.travel);
  const calmV: N = smoothstep(CALM[0], CALM[1], length(local.xz));
  m.positionNode = local.add(vec3(0, waveField(raceV, t).x.mul(float(1).sub(calmV)), 0));

  // Fragment.
  const world: N = positionWorld;
  const race = world.xz.add(U.travel);
  const calm: N = smoothstep(CALM[0], CALM[1], length(world.xz));
  const wave = waveField(race, t);
  const flow = U.flow;
  const across = vec2(flow.y.negate(), flow.x);
  const along = dot(race, flow);
  const side = dot(race, across);
  // Wind streaks: noise stretched along the wind and drifting downwind.
  const streakNoise = mx_noise_float(vec3(side.mul(0.05), along.mul(0.007).sub(t.mul(0.05)), t.mul(0.04)));
  const streak: N = smoothstep(0.12, 0.55, streakNoise).mul(U.windiness).mul(float(1).sub(calm.mul(0.6)));
  // Fine ripples moving with the wind, a small tilt of the normal.
  const rippleP = race.mul(0.32).sub(flow.mul(t.mul(1.6)));
  const rx = mx_noise_float(vec3(rippleP, t.mul(0.5))).mul(0.06);
  const rz = mx_noise_float(vec3(rippleP.add(17.3), t.mul(0.5))).mul(0.06);
  const slope = float(1).sub(calm.mul(0.85));
  const normal = normalize(vec3(wave.y.mul(slope).add(rx), 1, wave.z.mul(slope).add(rz)));

  const view = normalize(cameraPosition.sub(world));
  const facing: N = max(dot(normal, view), 0);
  const fresnel: N = pow(float(1).sub(facing), 4).mul(0.85).add(0.04);
  const r = reflect(view.negate(), normal);
  const horizon = tone(PALETTE.horizon);
  const zenith = tone(PALETTE.zenith);
  const sky = mix(horizon, zenith, pow(max(r.y, 0), 0.5));
  const glint: N = pow(max(dot(r, U.sunDir), 0), 220).mul(1.6).mul(float(1).sub(calm));

  // Shallows and beach foam from the shore field (0 at the beach, 1 at maxDist and beyond).
  const shoreUv = race.sub(vec2(shore.min.x, shore.min.z)).div(vec2(shore.size.x, shore.size.z));
  const toShore: N = texture(shore.texture, shoreUv).r;
  const shallow: N = smoothstep(0.85, 0.08, toShore);
  const surf: N = mx_noise_float(vec3(race.mul(0.12), t.mul(0.35))).mul(0.5).add(0.5);
  const beachFoam: N = smoothstep(0.16, 0.03, toShore).mul(mix(0.45, 1, surf));

  const deep = tone(PALETTE.deep);
  const shallowC = tone(PALETTE.shallow);
  const streakC = tone(PALETTE.streak);
  let col: N = mix(deep, shallowC, shallow.mul(0.85));
  // Troughs a touch darker, crests a touch lighter: the swell reads from above.
  col = col.mul(wave.x.mul(float(1).sub(calm)).mul(0.35).add(1));
  col = mix(col, streakC, streak.mul(0.55));
  col = mix(col, sky, fresnel);
  col = col.add(tone(PALETTE.sun).mul(glint));
  col = mix(col, tone(PALETTE.foam), beachFoam);
  m.colorNode = col;
  m.fog = true;
  return m;
}

/** A sky dome: gradient, a warm glow round the sun, a band of haze on the horizon, soft clouds. */
export function skyMaterial(sunDir: THREE.Vector3, time: { value: number }): THREE.MeshBasicNodeMaterial {
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
  const dir: N = normalize(positionLocal);
  const sun = vec3(sunDir.x, sunDir.y, sunDir.z);
  const horizon = tone(PALETTE.horizon);
  const zenith = tone(PALETTE.zenith);
  let sky: N = mix(horizon, zenith, pow(max(dir.y, 0), 0.45));
  sky = sky.add(vec3(0.1, 0.1, 0.08).mul(exp(abs(dir.y).mul(-16))));
  const facing: N = max(dot(dir, sun), 0);
  sky = sky.add(vec3(0.3, 0.22, 0.1).mul(pow(facing, 12)));
  // Clouds on a flat layer overhead, thinning towards the horizon haze.
  const layer = dir.xz.div(dir.y.add(0.12)).mul(1.4).add(vec2((time as unknown as N).mul(0.004), 0));
  const cloud = smoothstep(0.05, 0.45, mx_fractal_noise_float(vec3(layer, 0.5), 3, 2.0, 0.5, 1.0));
  sky = mix(sky, vec3(0.96, 0.97, 0.98), cloud.mul(smoothstep(0.03, 0.25, dir.y)).mul(0.75));
  const disc = smoothstep(0.9993, 0.9997, facing);
  m.colorNode = mix(sky, vec3(1.0, 0.95, 0.82), disc);
  return m;
}

/** The wake: white edges of the V and churned foam near the stern, breaking up and fading with age. */
export function wakeMaterial(travel: { value: THREE.Vector2 }): THREE.MeshBasicNodeMaterial {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const T = travel as unknown as N;
  const across: N = abs(uv().x.sub(0.5)).mul(2);
  const age: N = uv().y;
  const edge: N = smoothstep(0.55, 0.95, across);
  const core: N = float(1).sub(smoothstep(0.0, 0.45, across)).mul(float(1).sub(smoothstep(0.0, 0.35, age)));
  const race = (positionWorld as N).xz.add(T);
  const breakup: N = mx_noise_float(vec3(race.mul(0.3), 0.0)).mul(0.5).add(0.5);
  const alpha: N = edge.mul(0.62).add(core.mul(0.85)).mul(pow(float(1).sub(age), 1.6)).mul(mix(0.3, 1.0, breakup));
  m.colorNode = tone(PALETTE.foam);
  m.opacityNode = alpha;
  m.fog = true;
  return m;
}

/** A soft dark ellipse under a hull: grounds the boat on the water from above. */
export function shadowMaterial(): THREE.MeshBasicNodeMaterial {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const d: N = length(uv().sub(0.5).mul(2));
  m.colorNode = vec3(0.01, 0.06, 0.09);
  m.opacityNode = float(1).sub(smoothstep(0.25, 1.0, d)).mul(0.38);
  m.fog = true;
  return m;
}
