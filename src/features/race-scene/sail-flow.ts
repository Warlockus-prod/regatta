// F6 "Wind on the sails" (race Settings, default off): the apparent wind at the
// player's yacht drawn as a few ribbons that arrive from the side the wind
// blows from and bend along the lee side of the sails, like the airflow of the
// trim trainer. Pure: no three.js, so the geometry is tested on its own and the
// scene (SailFlow.tsx) only places instanced dashes along these paths.
//
// Frame: the yacht's GLB frame (Yacht.tsx), metres: +x bow, +y up, +z
// starboard. Sail angles are YachtState's (racePose): positive = to starboard.
// Wind angles use the sailing engine's convention (sailing-physics/wind.ts):
// the apparent wind angle is signed from the bow to where the wind comes FROM,
// positive = from starboard.
//
// This is a reading aid, not a CFD solution: an attached ribbon follows the
// lee face, a luffing one passes the sail without bending, a stalled one
// leaves the lee face half way along, and on a run the air pushes into the
// windward face and stops there. When the race does not know how the sails
// are trimmed (Pro without trim hints) a ribbon only shows the air arriving at
// the luff and claims nothing about the flow round the cloth.

import { sectionTwistDegrees } from "@/lib/sailing-physics/forces";
import { sailDimensions } from "@/lib/sailing-physics/sail-plan";
import type { CoachKey } from "@/features/sailing-lab/runtime/trim-coach";

export type SailFlowState = "attached" | "luffing" | "stalled" | "unknown";
export type SailFlowShape = SailFlowState | "pushing";
export type SailFlowSail = "main" | "jib";

/** Rig anchors of the race yacht's GLB (regatta_sloop_sailing.glb nodes MainRig and JibRig). */
export const MAIN_TACK = { x: 0.3, y: 2.74 } as const;
export const JIB_TACK = { x: 6.3, y: 1.5 } as const;
/** Heights along each luff (0 foot, 1 head) where a ribbon crosses the sail. */
export const SAIL_FLOW_HEIGHTS: Readonly<Record<SailFlowSail, readonly number[]>> = { main: [0.22, 0.48, 0.72], jib: [0.3, 0.6] };
export const SAIL_FLOW_MAX_RIBBONS = SAIL_FLOW_HEIGHTS.main.length + SAIL_FLOW_HEIGHTS.jib.length;
export const SAIL_FLOW_POINTS = 12;
/** Air ahead of the luff that a ribbon shows arriving, and past the leech, metres. */
const LEAD_IN = 7;
const LEAD_OUT = 3;
/** The lee face clearance, metres: the ribbon runs just off the cloth. */
const LEE_GAP = 0.35;
/** Downwind the sails work by drag: past this apparent angle the air pushes into them. */
export const SAIL_FLOW_PUSH_AWA = 140;
/** Below this apparent wind nothing is drawn; at SAIL_FLOW_FULL_KN the ribbons are at full strength. */
export const SAIL_FLOW_MIN_KN = 1;
export const SAIL_FLOW_FULL_KN = 18;

export interface SailFlowInput {
  /** Apparent wind angle, deg, signed: positive = from starboard. */
  awa: number;
  /** Apparent wind speed, knots. */
  aws: number;
  /** YachtState angles, deg, positive = to starboard. */
  boomAngle: number;
  jibAngle: number;
  mainTwist?: number;
  jibTwist?: number;
  reef?: number;
  jibFurl?: number;
  mainHoisted?: boolean;
  main?: SailFlowState;
  jib?: SailFlowState;
}

export interface SailFlowRibbon {
  sail: SailFlowSail;
  shape: SailFlowShape;
  /** SAIL_FLOW_POINTS points, x y z each, from upwind to downwind. */
  points: Float32Array;
  /** Arc length from the first point to each point, metres. */
  cumulative: Float32Array;
  length: number;
}

const DEG = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 0 when the air is too light to show, rising with the apparent wind to 1 at SAIL_FLOW_FULL_KN. */
export function sailFlowIntensity(aws: number): number {
  if (!Number.isFinite(aws) || aws < SAIL_FLOW_MIN_KN) return 0;
  return clamp(0.2 + 0.8 * (aws - SAIL_FLOW_MIN_KN) / (SAIL_FLOW_FULL_KN - SAIL_FLOW_MIN_KN), 0.2, 1);
}

/** How fast a dash travels along its ribbon, metres per second: the real apparent air speed, never stalled at zero. */
export function sailFlowSpeed(aws: number): number {
  return Math.max(1.5, (Number.isFinite(aws) ? aws : 0) * 0.514444);
}

/**
 * Per-sail flow from the race's own trim coach (raceTrimCoach, the advice the
 * Pro trim hint shows), or null when no advice is given: then the ribbons are
 * not coloured and only the wind decides their shape (sailFlowFromWind).
 */
export function sailFlowFromCoach(key: CoachKey | null | undefined): { main: SailFlowState; jib: SailFlowState } | null {
  switch (key) {
    case "luffMain": return { main: "luffing", jib: "attached" };
    case "luffJib": return { main: "attached", jib: "luffing" };
    case "luffBoth": case "inIrons": case "pinching": return { main: "luffing", jib: "luffing" };
    case "stallMain": return { main: "stalled", jib: "attached" };
    case "stallJib": return { main: "attached", jib: "stalled" };
    case "stallBoth": return { main: "stalled", jib: "stalled" };
    case "good": case "reachOn": case "run": return { main: "attached", jib: "attached" };
    default: return null;
  }
}

/**
 * Without trim advice: the sails cannot draw inside the no-go zone. Outside it
 * the crew keeps them drawing in Simple mode (the race trims for the player);
 * in Pro the player trims and the race gives no advice, so the flow round the
 * sails is unknown and only the arriving air is drawn.
 */
export function sailFlowFromWind(inNoGo: boolean, ownTrim = false): SailFlowState {
  return inNoGo ? "luffing" : ownTrim ? "unknown" : "attached";
}

/**
 * The race's 3D wind layers: the 3D wind arrows (WindFlow, the "Wind arrows"
 * display) and the ribbons on the sails show the same apparent wind round the
 * same yacht, so with the ribbons on the arrows step aside: never both.
 */
export function raceWindLayers(arrows: boolean, ribbons: boolean): { arrows: boolean; ribbons: boolean } {
  return { arrows: arrows && !ribbons, ribbons };
}

/** The telltale colour of a ribbon. Never the action cyan; null = not coloured (no trim advice). */
export const SAIL_FLOW_COLOURS = { neutral: "#f4f7fa", attached: "#7be495", luffing: "#ffd23f", stalled: "#ff8a6a" } as const;
export function sailFlowColour(shape: SailFlowShape, coloured: boolean): string {
  if (!coloured || shape === "unknown") return SAIL_FLOW_COLOURS.neutral;
  return shape === "luffing" ? SAIL_FLOW_COLOURS.luffing : shape === "stalled" ? SAIL_FLOW_COLOURS.stalled : SAIL_FLOW_COLOURS.attached;
}

/** Mainsail and jib draft along the chord (geometry.ts draftProfile), 0 at luff and leech. */
function draft(u: number, sail: SailFlowSail): number {
  const peak = sail === "main" ? 0.45 : 0.38;
  return u <= peak ? 1 - ((u - peak) / peak) ** 2 : 1 - ((u - peak) / (1 - peak)) ** 2;
}

function ribbon(sail: SailFlowSail, v: number, input: SailFlowInput, state: SailFlowState): SailFlowRibbon {
  const dims = sailDimensions(sail, sail === "main" ? input.reef ?? 0 : 0, sail === "jib" ? input.jibFurl ?? 0 : 0);
  const tack = sail === "main" ? MAIN_TACK : JIB_TACK;
  const angle = sail === "main" ? input.boomAngle : input.jibAngle;
  const awa = input.awa;
  // The lee side is the side the sail is set on; a centred sail takes the side away from the wind.
  const side = Math.abs(angle) >= 0.5 ? Math.sign(angle) : awa > 0 ? -1 : 1;
  const twist = sectionTwistDegrees(sail === "main" ? input.mainTwist ?? 0.35 : input.jibTwist ?? 0.4, v);
  const theta = (angle + side * twist) * DEG;
  // Chord from luff to leech and the lee normal, in the horizontal plane.
  const dx = -Math.cos(theta), dz = Math.sin(theta);
  const nx = dz * side, nz = -dx * side;
  const chord = Math.max(0.6, dims.foot * (1 - v) + dims.roach * Math.sin(Math.PI * v));
  const lx = tack.x + dims.luffOffset * v, ly = tack.y + dims.height * v, lz = 0;
  // Where the air goes: away from where it comes from.
  const fx = -Math.cos(awa * DEG), fz = -Math.sin(awa * DEG);
  const shape: SailFlowShape = Math.abs(awa) >= SAIL_FLOW_PUSH_AWA ? "pushing" : state;
  const points = new Float32Array(SAIL_FLOW_POINTS * 3);
  const put = (i: number, x: number, z: number) => { points[i * 3] = x; points[i * 3 + 1] = ly; points[i * 3 + 2] = z; };
  if (shape === "luffing" || shape === "pushing" || shape === "unknown") {
    // Straight air: past the luff on its lee side without bending, on a run
    // into the windward face of the sail half way along and no further, or,
    // with the flow unknown, up to the windward side of the luff and no further.
    const pushing = shape === "pushing";
    const stops = pushing || shape === "unknown";
    const gap = stops ? -LEE_GAP : LEE_GAP;
    const ex = lx + (pushing ? dx * chord * 0.5 : 0) + nx * gap;
    const ez = lz + (pushing ? dz * chord * 0.5 : 0) + nz * gap;
    const reach = stops ? LEAD_IN : LEAD_IN + chord + LEAD_OUT;
    for (let i = 0; i < SAIL_FLOW_POINTS; i++) {
      const k = (i / (SAIL_FLOW_POINTS - 1)) * reach - LEAD_IN;
      put(i, ex + fx * k, ez + fz * k);
    }
  } else {
    // In from upwind to just off the lee face at the luff, along the lee face, out past the leech.
    const ax = lx + nx * LEE_GAP, az = lz + nz * LEE_GAP;
    const IN = 4, ALONG = 6, OUT = SAIL_FLOW_POINTS - IN - ALONG;
    for (let i = 0; i < IN; i++) {
      const k = LEAD_IN * (1 - i / IN);
      put(i, ax - fx * k, az - fz * k);
    }
    // A stalled sail: the air leaves the lee face from 40% of the chord.
    const breakAt = state === "stalled" ? 0.4 : 2;
    for (let j = 0; j < ALONG; j++) {
      const u = j / (ALONG - 1);
      const off = LEE_GAP + chord * 0.1 * draft(u, sail) + Math.max(0, u - breakAt) * chord * 0.9;
      put(IN + j, ax + dx * chord * u + nx * (off - LEE_GAP), az + dz * chord * u + nz * (off - LEE_GAP));
    }
    // Leaving: along the leech and back toward the wind's own direction (or away from the cloth when stalled).
    const last = (IN + ALONG - 1) * 3;
    let ox = dx * 0.6 + fx * 0.4, oz = dz * 0.6 + fz * 0.4;
    if (state === "stalled") { ox = dx * 0.4 + nx * 0.6; oz = dz * 0.4 + nz * 0.6; }
    const norm = Math.hypot(ox, oz) || 1;
    for (let k = 1; k <= OUT; k++) put(IN + ALONG - 1 + k, points[last] + (ox / norm) * LEAD_OUT * k / OUT, points[last + 2] + (oz / norm) * LEAD_OUT * k / OUT);
  }
  const cumulative = new Float32Array(SAIL_FLOW_POINTS);
  let length = 0;
  for (let i = 1; i < SAIL_FLOW_POINTS; i++) {
    length += Math.hypot(points[i * 3] - points[i * 3 - 3], points[i * 3 + 1] - points[i * 3 - 2], points[i * 3 + 2] - points[i * 3 - 1]);
    cumulative[i] = length;
  }
  return { sail, shape, points, cumulative, length };
}

/**
 * The ribbons for one yacht: three on the main and two on the jib, none on a
 * lowered main or a rolled jib, none when the air is too light or unknown.
 */
export function sailFlowRibbons(input: SailFlowInput): SailFlowRibbon[] {
  const values = [input.awa, input.aws, input.boomAngle, input.jibAngle];
  if (!values.every(Number.isFinite) || sailFlowIntensity(input.aws) === 0) return [];
  const out: SailFlowRibbon[] = [];
  if (input.mainHoisted !== false) for (const v of SAIL_FLOW_HEIGHTS.main) out.push(ribbon("main", v, input, input.main ?? "attached"));
  if ((input.jibFurl ?? 0) < 0.95) for (const v of SAIL_FLOW_HEIGHTS.jib) out.push(ribbon("jib", v, input, input.jib ?? "attached"));
  return out;
}

/** The point at fraction t (0..1) of a ribbon's length and the unit direction of the air there; no allocation. */
export function sampleSailFlow(r: SailFlowRibbon, t: number, at: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }) {
  const target = clamp(t, 0, 1) * r.length;
  let i = 1;
  while (i < SAIL_FLOW_POINTS - 1 && r.cumulative[i] < target) i++;
  const a = (i - 1) * 3, b = i * 3;
  const span = r.cumulative[i] - r.cumulative[i - 1];
  const k = span > 1e-6 ? (target - r.cumulative[i - 1]) / span : 0;
  const ddx = r.points[b] - r.points[a], ddy = r.points[b + 1] - r.points[a + 1], ddz = r.points[b + 2] - r.points[a + 2];
  at.x = r.points[a] + ddx * k; at.y = r.points[a + 1] + ddy * k; at.z = r.points[a + 2] + ddz * k;
  const n = Math.hypot(ddx, ddy, ddz) || 1;
  dir.x = ddx / n; dir.y = ddy / n; dir.z = ddz / n;
}
