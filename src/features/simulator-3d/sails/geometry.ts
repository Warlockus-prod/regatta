import * as THREE from "three";

export type SailKind = "main" | "jib";
export interface SailShape { camber: number; twist: number; luff: number; reef: number; side: number; time: number }
export const FORESTAY_AXIS = new THREE.Vector3(-6, 16.7, 0).normalize();
const UP = new THREE.Vector3(0, 1, 0);
const anchor = new THREE.Vector3();
const chord = new THREE.Vector3();

/** A section from the fixed luff to the free leech. All deformation vanishes
 * at the luff, head and corners. Twist rotates about the actual luff axis. */
export function sailPoint(kind: SailKind, u: number, v: number, shape: SailShape, out: THREE.Vector3) {
  const reef = kind === "main" ? THREE.MathUtils.clamp(shape.reef, 0, 1) : 0;
  const height = kind === "main" ? 17 * (1 - 0.45 * reef) : 16.1433333333;
  const luffX = kind === "main" ? 0 : -5.8 * v;
  anchor.set(luffX, height * v, 0);
  const foot = kind === "main" ? 5.2 * (1 - 0.18 * reef) : 5.4;
  const roach = kind === "main" ? 0.5 * Math.sin(Math.PI * v) : -0.14 * Math.sin(Math.PI * v);
  const width = Math.max(0, foot * (1 - v) + roach);
  const rise = (kind === "main" ? 0.16 : 1.05) * (1 - v);
  chord.set(-width * u, rise * u, 0);
  // Broad forward draft, shallow near the head. Reverses with the tack.
  const draft = Math.sin(Math.PI * Math.pow(u, 0.8));
  const depth = width * (0.055 + 0.12 * shape.camber) * (0.45 + 0.55 * Math.sin(Math.PI * v));
  const flutter = shape.luff * width * 0.045 * Math.sin(u * Math.PI) *
    Math.sin(shape.time * 15 - v * 17 + u * 8) * Math.sin(Math.PI * v);
  chord.z = shape.side * (draft * depth * (1 - shape.luff * 0.75) + flutter);
  const twist = shape.side * shape.twist * THREE.MathUtils.degToRad(20) * Math.pow(v, 1.6);
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
  const point = new THREE.Vector3();
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
  const point = new THREE.Vector3();
  let index = 0;
  for (let row = 1; row <= 8; row++) for (let segment = 0; segment < 20; segment++) {
    for (const u of [segment / 20, (segment + 1) / 20]) {
      sailPoint(kind, u, row / 9, shape, point);
      position.setXYZ(index++, point.x, point.y, point.z + shape.side * 0.006);
    }
  }
  position.needsUpdate = true;
}
