import * as THREE from "three";
import { sectionTwistDegrees } from "@/lib/sailing-physics/forces";
import { SAIL_PLAN, sailDimensions } from "@/lib/sailing-physics/sail-plan";

export type SailKind = "main" | "jib";
export interface SailShape { camber: number; twist: number; luff: number; reef: number; furl?: number; side: number; time: number; fill?: number; airSpeed?: number }
export const FORESTAY_AXIS = new THREE.Vector3(SAIL_PLAN.jib.luffOffset, SAIL_PLAN.jib.height, 0).normalize();
const UP = new THREE.Vector3(0, 1, 0);
const anchor = new THREE.Vector3();
const chord = new THREE.Vector3();
const scratchPoint = new THREE.Vector3();

/** Smooth camber line with an explicit maximum instead of a sine-shaped sheet.
 * These are design choices for our synthetic cruiser, not measured sail polars. */
export function draftProfile(u: number, kind: SailKind) {
  const peak = kind === "main" ? 0.45 : 0.38;
  return u <= peak
    ? 1 - Math.pow((u - peak) / peak, 2)
    : 1 - Math.pow((u - peak) / (1 - peak), 2);
}

/** A section from the fixed luff to the free leech. All deformation vanishes
 * at the luff, head and corners. Twist rotates about the actual luff axis. */
export function sailPoint(kind: SailKind, u: number, v: number, shape: SailShape, out: THREE.Vector3) {
  const plan = sailDimensions(kind, shape.reef, shape.furl ?? 0);
  anchor.set(plan.luffOffset * v, plan.height * v, 0);
  const width = Math.max(0, plan.foot * (1 - v) + plan.roach * Math.sin(Math.PI * v));
  const rise = plan.rise * (1 - v);
  chord.set(-width * u, rise * u, 0);
  // Broad forward draft, shallow near the head. Reverses with the tack.
  const draft = draftProfile(u, kind);
  const depth = width * (0.08 + 0.08 * THREE.MathUtils.clamp(shape.camber, 0, 1)) *
    (0.65 + 0.35 * Math.sin(Math.PI * v));
  const fill = THREE.MathUtils.clamp(shape.fill ?? 1, 0, 1);
  const air = Math.max(0, shape.airSpeed ?? 12);
  const flutterRate = 5 + Math.min(air, 30) * 0.65;
  const flutter = shape.luff * Math.min(1, air / 4) * width * 0.075 * Math.sin(u * Math.PI) *
    Math.sin(shape.time * flutterRate - v * 17 + u * 8) * Math.sin(Math.PI * v);
  // Unloaded cloth hangs between its corners. Filled cloth takes the cut draft.
  chord.y -= (1 - fill) * width * 0.08 * draft * Math.sin(Math.PI * v);
  chord.z = shape.side * (draft * depth * (0.08 + 0.92 * fill) * (1 - shape.luff * 0.65) + flutter);
  const twist = shape.side * THREE.MathUtils.degToRad(sectionTwistDegrees(shape.twist, v));
  chord.applyAxisAngle(kind === "main" ? UP : FORESTAY_AXIS, twist);
  return out.copy(anchor).add(chord);
}

export function createSailGeometry(columns = 20, rows = 32) {
  const geometry = new THREE.BufferGeometry();
  const position = new Float32Array((columns + 1) * (rows + 1) * 3);
  const uv = new Float32Array((columns + 1) * (rows + 1) * 2);
  const indices: number[] = [];
  for (let v = 0; v <= rows; v++) for (let u = 0; u <= columns; u++) {
    const i = v * (columns + 1) + u;
    uv[i * 2] = u / columns; uv[i * 2 + 1] = v / rows;
    if (v < rows && u < columns) {
      const a = i, b = i + 1, c = i + columns + 1, d = c + 1;
      indices.push(a, c, b);
      if (v < rows - 1) indices.push(b, c, d);
    }
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  return geometry;
}

export function updateSailGeometry(geometry: THREE.BufferGeometry, kind: SailKind, shape: SailShape) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const uv = geometry.getAttribute("uv");
  const point = scratchPoint;
  for (let i = 0; i < position.count; i++) {
    sailPoint(kind, uv.getX(i), uv.getY(i), shape, point);
    position.setXYZ(i, point.x, point.y, point.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

/** Subtle panel seams follow the exact same cloth surface. */
export function createSailSeams() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(8 * 20 * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: "#a4afb0", transparent: true, opacity: 0.38, depthWrite: false }));
  line.frustumCulled = false;
  return line;
}

export function updateSailSeams(line: THREE.LineSegments, kind: SailKind, shape: SailShape) {
  const position = line.geometry.getAttribute("position") as THREE.BufferAttribute;
  const point = scratchPoint;
  let index = 0;
  for (let row = 1; row <= 8; row++) for (let segment = 0; segment < 20; segment++) {
    for (const u of [segment / 20, (segment + 1) / 20]) {
      sailPoint(kind, u, row / 9, shape, point);
      position.setXYZ(index++, point.x, point.y, point.z + shape.side * 0.006);
    }
  }
  position.needsUpdate = true;
}
