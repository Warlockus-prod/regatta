// Event feedback of the race scene (M3-5): spray at the player's bow and a
// short camera shake. Pure math, no three.js, so the contracts are tested on
// their own:
// - the spray grows with boat speed and heel, is none while drifting, and is
//   off on the "low" quality profile and with reduced motion;
// - the camera shakes only on a contact and at the start gun, decays to zero
//   within its duration and is zero without an event; off on "low" and with
//   reduced motion. It is an offset added for one drawn frame and taken back
//   right after it, so the orbit and its target never move.
// The spray particles live in the yacht's frame (+X bow, +Y up, +Z starboard,
// as the GLB): thrown up and out from the bow and falling back, they ride with
// the boat instead of streaking behind at the race's visual speed-up.

import type { SceneQuality } from "./quality";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth01 = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

/** No spray below the first speed (knots), the full speed share from the second. */
export const SPRAY_SPEED_KN: readonly [number, number] = [2, 8];
/** Heel (degrees) at which the bow buries fully into the waves. */
export const SPRAY_FULL_HEEL_DEG = 25;
/** Share of the spray an upright boat throws at a given speed; heel adds the rest. */
const SPRAY_UPRIGHT = 0.55;

/**
 * How much spray the player's bow throws, 0..1. Speed through the water is
 * the main term (none while drifting); heel buries the bow and adds to it.
 * Scaled by the quality profile's `spray` share (none on "low"); zero with
 * reduced motion. Non-finite inputs give zero.
 */
export function sprayIntensity(speedKn: number, heelDeg: number, profile: Pick<SceneQuality, "spray">, reducedMotion: boolean): number {
  if (reducedMotion || !(profile.spray > 0) || !Number.isFinite(speedKn)) return 0;
  const speed = smooth01((speedKn - SPRAY_SPEED_KN[0]) / (SPRAY_SPEED_KN[1] - SPRAY_SPEED_KN[0]));
  if (speed <= 0) return 0;
  const heel = Number.isFinite(heelDeg) ? clamp01(Math.abs(heelDeg) / SPRAY_FULL_HEEL_DEG) : 0;
  return clamp01(profile.spray * speed * (SPRAY_UPRIGHT + (1 - SPRAY_UPRIGHT) * heel));
}

// ---------------------------------------------------------------------------
// Spray particles: one fixed pool, allocated once, stepped without allocation.

/** Most particles alive at once (the instanced mesh is sized to it). */
export const SPRAY_CAPACITY = 72;
/** Particles thrown a second at intensity 1. */
export const SPRAY_RATE = 110;
/** Where the stem meets the water, metres forward of the yacht's centre (GLB frame). */
export const SPRAY_BOW_X = 6.1;
const GRAVITY = 9.8;
/** The player's boat that has not moved or turned this long (a paused race or
 * replay, a frozen frame) throws no new spray, whatever its stored speed. */
export const SPRAY_STILL_MS = 250;
/** A particle that falls this far below the water line is gone. */
const SPRAY_FLOOR = -0.3;

export interface SprayField {
  readonly capacity: number;
  /** Particles alive: indices 0..live-1 of the arrays. */
  readonly live: number;
  readonly x: Float32Array; readonly y: Float32Array; readonly z: Float32Array;
  /** Drawn size of each live particle, metres (shrinks as it ages). */
  readonly size: Float32Array;
  /** Advance by `dt` seconds and throw new spray at `intensity` (0..1). Returns `live`. */
  step(dt: number, intensity: number): number;
  /** Drop every particle at once (the spray was switched off). */
  clear(): void;
}

export function createSprayField(capacity = SPRAY_CAPACITY, seed = 0x2f6b1d): SprayField {
  const x = new Float32Array(capacity), y = new Float32Array(capacity), z = new Float32Array(capacity);
  const vx = new Float32Array(capacity), vy = new Float32Array(capacity), vz = new Float32Array(capacity);
  const age = new Float32Array(capacity), life = new Float32Array(capacity);
  const base = new Float32Array(capacity), size = new Float32Array(capacity);
  let live = 0, carry = 0, side = 1, state = seed >>> 0 || 1;
  // A small deterministic generator: the same race throws the same spray, and tests can rely on it.
  const random = () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
  const kill = (i: number) => {
    const last = --live;
    if (i === last) return;
    x[i] = x[last]; y[i] = y[last]; z[i] = z[last];
    vx[i] = vx[last]; vy[i] = vy[last]; vz[i] = vz[last];
    age[i] = age[last]; life[i] = life[last]; base[i] = base[last]; size[i] = size[last];
  };
  const spawn = (k: number) => {
    const i = live++;
    side = -side;
    x[i] = SPRAY_BOW_X - random() * 0.7;
    y[i] = 0.15;
    z[i] = side * (0.3 + random() * 0.35);
    vx[i] = -(0.6 + random() * 1.8);
    vy[i] = 1.6 + random() * (1.2 + 2.2 * k);
    vz[i] = side * (1.2 + random() * (1 + 2 * k));
    age[i] = 0;
    life[i] = 0.45 + random() * 0.35;
    base[i] = (0.1 + random() * 0.14) * (0.7 + 0.6 * k);
    size[i] = base[i];
  };
  const field: SprayField = {
    capacity,
    get live() { return live; },
    x, y, z, size,
    step(dt, intensity) {
      const t = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
      const k = Number.isFinite(intensity) ? clamp01(intensity) : 0;
      for (let i = live - 1; i >= 0; i--) {
        age[i] += t;
        vy[i] -= GRAVITY * t;
        x[i] += vx[i] * t; y[i] += vy[i] * t; z[i] += vz[i] * t;
        if (age[i] >= life[i] || y[i] < SPRAY_FLOOR) { kill(i); continue; }
        const a = age[i] / life[i];
        size[i] = base[i] * (1 - a * a);
      }
      if (k <= 0) { carry = 0; return live; }
      carry += k * SPRAY_RATE * t;
      while (carry >= 1 && live < capacity) { spawn(k); carry -= 1; }
      if (live >= capacity) carry = 0;
      return live;
    },
    clear() { live = 0; carry = 0; },
  };
  return field;
}

// ---------------------------------------------------------------------------
// Camera shake: only on a contact and at the start gun.

export type ShakeKind = "contact" | "gun";

/** Duration (s), strength as a share of the camera's distance to its target, and frequency (Hz). */
export const SHAKE: Readonly<Record<ShakeKind, { duration: number; amplitude: number; hz: number }>> = {
  contact: { duration: 0.45, amplitude: 0.012, hz: 17 },
  gun: { duration: 0.5, amplitude: 0.006, hz: 11 },
};

/** Strength of a shake `elapsed` seconds after its event: falls to zero by its duration; zero without an event. */
export function shakeEnvelope(kind: ShakeKind | null, elapsed: number): number {
  if (!kind) return 0;
  const { duration, amplitude } = SHAKE[kind];
  if (!(elapsed >= 0) || elapsed >= duration) return 0;
  const left = 1 - elapsed / duration;
  return amplitude * left * left;
}

export interface Vec3Like { x: number; y: number; z: number }

export interface CameraShake {
  /** Start a shake at `now` seconds; a stronger shake already running is kept. */
  trigger(kind: ShakeKind, now: number): void;
  /** Writes the camera offset at `now` for a camera `distance` metres from its target into `out`; false (and a zero offset) when still. */
  offset(now: number, distance: number, out: Vec3Like): boolean;
}

export function createCameraShake(): CameraShake {
  let kind: ShakeKind | null = null;
  let at = 0;
  return {
    trigger(next, now) {
      if (!Number.isFinite(now)) return;
      if (kind && shakeEnvelope(kind, now - at) > SHAKE[next].amplitude) return;
      kind = next; at = now;
    },
    offset(now, distance, out) {
      const elapsed = now - at;
      const strength = shakeEnvelope(kind, elapsed) * (Number.isFinite(distance) ? Math.max(0, distance) : 0);
      if (!(strength > 0)) {
        if (kind && !(elapsed < SHAKE[kind].duration)) kind = null;
        out.x = 0; out.y = 0; out.z = 0;
        return false;
      }
      const w = 2 * Math.PI * SHAKE[kind!].hz * elapsed;
      out.x = strength * Math.sin(w);
      out.y = strength * 0.7 * Math.sin(w * 1.37 + 1.1);
      out.z = strength * 0.8 * Math.sin(w * 0.83 + 2.3);
      return true;
    },
  };
}

/**
 * Turns the scene's event props into shakes. `contact` is the id of the
 * current contact frame (a new id is a new contact); `started` turns true at
 * the start gun. The first reading is the baseline, so a scene mounted
 * mid-race or mid-contact does not shake.
 */
export function createShakeEvents() {
  let seen = false, lastContact: number | null = null, lastStarted = false;
  return (contact: number | null | undefined, started: boolean | undefined): ShakeKind | null => {
    const id = typeof contact === "number" ? contact : null;
    const on = started === true;
    if (!seen) { seen = true; lastContact = id; lastStarted = on; return null; }
    const newContact = id !== null && id !== lastContact;
    const gun = on && !lastStarted;
    if (id !== null) lastContact = id;
    lastStarted = on;
    return newContact ? "contact" : gun ? "gun" : null;
  };
}

/** A shake waiting for the next drawn frame, and whether this device and setting allow it (RaceScene). */
export interface ShakeControl {
  shake: CameraShake;
  pending: ShakeKind | null;
  allowed: () => boolean;
}

/** A ShakeControl that also turns the scene's event props into pending shakes (createShakeEvents). */
export interface SceneShake extends ShakeControl {
  /** Called with the scene's `contactId` and `started` props whenever they change. */
  feed(contact: number | null | undefined, started: boolean | undefined): void;
}

/**
 * RaceScene's shake: allowed only while the current quality profile has
 * `cameraShake` (not "low") and reduced motion is off, both read live from
 * their refs, so a step down to "low" or switching reduced motion on stops
 * the next shake.
 */
export function createSceneShake(profile: { readonly current: Pick<SceneQuality, "cameraShake"> }, reduced: { readonly current: boolean }): SceneShake {
  const events = createShakeEvents();
  const control: SceneShake = {
    shake: createCameraShake(),
    pending: null,
    allowed: () => profile.current.cameraShake === true && !reduced.current,
    feed(contact, started) {
      const kind = events(contact, started);
      if (kind) control.pending = kind;
    },
  };
  return control;
}

/**
 * Start of one drawn frame: takes a pending event (dropped when shaking is
 * not allowed), then adds this frame's offset to the camera `position`.
 * Returns true when it did; the caller then calls endShakenFrame after the
 * draw, so the offset never outlives the frame and the controls, the chase
 * camera and the orbit target never see it.
 */
export function beginShakenFrame(control: ShakeControl, seconds: number, reach: number, position: Vec3Like, offset: Vec3Like): boolean {
  const allowed = control.allowed();
  if (control.pending) { if (allowed) control.shake.trigger(control.pending, seconds); control.pending = null; }
  if (!allowed || !control.shake.offset(seconds, reach, offset)) return false;
  position.x += offset.x; position.y += offset.y; position.z += offset.z;
  return true;
}

/** Takes back the offset beginShakenFrame added. */
export function endShakenFrame(position: Vec3Like, offset: Vec3Like): void {
  position.x -= offset.x; position.y -= offset.y; position.z -= offset.z;
}
