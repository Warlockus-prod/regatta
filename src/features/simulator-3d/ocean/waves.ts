// ============================================================================
// waves - a small sum-of-sines (Gerstner-lite) wave field, shared by the
// Ocean mesh (to displace its surface) and the Yacht (to ride the swell).
// Pure math, no three/React, so it travels with the module and stays in phase
// because both callers pass the same Canvas clock time.
//
// World axes (glTF): X = bow direction, Y = up, Z = starboard. Heights are in
// meters; keep amplitudes modest so a cruiser sits ON the water, not in surf.
// ============================================================================

export interface Wave {
  dirX: number;
  dirZ: number;
  amp: number;
  len: number;
  speed: number;
}

export const WAVES: Wave[] = [
  { dirX: 1.0, dirZ: 0.0, amp: 0.24, len: 17, speed: 1.05 },
  { dirX: 0.6, dirZ: 0.8, amp: 0.16, len: 10, speed: 1.4 },
  { dirX: -0.4, dirZ: 0.9, amp: 0.09, len: 6, speed: 1.85 },
  { dirX: 0.2, dirZ: -0.95, amp: 0.05, len: 3.4, speed: 2.3 },
];

export interface WaveSample {
  y: number;
  nx: number;
  nz: number;
}

/** Height + horizontal surface gradient at world (x, z) and time t (seconds).
 * The gradient gives a cheap analytic normal: normalize(nx, 1, nz). */
export function sampleWave(x: number, z: number, t: number, scale = 1): WaveSample {
  let y = 0;
  let nx = 0;
  let nz = 0;
  for (const w of WAVES) {
    const k = (2 * Math.PI) / w.len;
    const phase = k * (w.dirX * x + w.dirZ * z) + t * w.speed;
    const amp = w.amp * scale;
    y += amp * Math.sin(phase);
    const d = amp * k * Math.cos(phase);
    nx -= w.dirX * d;
    nz -= w.dirZ * d;
  }
  return { y, nx, nz };
}
