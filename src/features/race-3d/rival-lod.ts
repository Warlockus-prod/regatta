import * as THREE from "three";
import { rivalIsFar } from "@/features/race-scene/quality";

// Cheap rivals (M2-6). A rival is the full GLB yacht, about 50 draw calls. Two
// savings, neither visible on a near boat:
// - its static parts (hull, deck, fittings, crew, mast, standing rigging) are
//   merged into one mesh per material: same triangles, same materials, same
//   place, about a third of the draw calls;
// - a boat too small on screen to show its fittings is drawn as a far boat:
//   a hull in its race colour, keel, cabin, mast and two flat sails turned
//   with its boom and jib, three draw calls and about 70 triangles.

/** Nodes the yacht moves every frame (Yacht.tsx, trim-rig.ts): never merged. */
export const DYNAMIC_PARTS: ReadonlySet<string> = new Set(["MainRig", "JibRig", "Rudder", "Teaching_MainTackle"]);

export interface MergeItem {
  id: number;
  /** Names from the mesh up to, not including, the model root. */
  chain: readonly string[];
  /** Material name: the GLB names one material per surface, and every rival
   * copy of a surface (gelcoat in its race colour) is identical. */
  material: string;
  /** Attribute names and index presence; only equal layouts merge. */
  layout: string;
  /** The mesh and all its parents are visible. */
  visible: boolean;
  /** Morph targets, several materials or anything else that must stay apart. */
  special: boolean;
}

/** Groups of static meshes to merge, each with two or more members, in traversal order. */
export function planStaticMerge(items: readonly MergeItem[]): number[][] {
  const groups = new Map<string, number[]>();
  for (const item of items) {
    if (!item.visible || item.special || item.chain.some((name) => DYNAMIC_PARTS.has(name))) continue;
    const key = `${item.material}|${item.layout}`;
    const group = groups.get(key);
    if (group) group.push(item.id); else groups.set(key, [item.id]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

const MERGED_ATTRIBUTES = ["position", "normal", "uv"] as const;

/** The attribute layout of a geometry, or null when it cannot be merged here. */
export function geometryLayout(geometry: THREE.BufferGeometry): string | null {
  const names = Object.keys(geometry.attributes).sort();
  if (!names.includes("position") || names.some((name) => !(MERGED_ATTRIBUTES as readonly string[]).includes(name))) return null;
  for (const name of names) {
    const attribute = geometry.getAttribute(name) as THREE.BufferAttribute;
    if (!attribute.isBufferAttribute || attribute.normalized || !(attribute.array instanceof Float32Array)) return null;
  }
  if (Object.keys(geometry.morphAttributes).length) return null;
  return `${names.join(",")}${geometry.index ? "+i" : ""}`;
}

/** Concatenate geometries already in one frame. Same layout required (see geometryLayout). */
export function mergeStaticGeometries(geometries: readonly THREE.BufferGeometry[]): THREE.BufferGeometry {
  const first = geometries[0];
  const names = Object.keys(first.attributes);
  const merged = new THREE.BufferGeometry();
  let vertices = 0, indices = 0;
  for (const g of geometries) { vertices += g.getAttribute("position").count; indices += g.index ? g.index.count : 0; }
  for (const name of names) {
    const size = first.getAttribute(name).itemSize;
    const array = new Float32Array(vertices * size);
    let offset = 0;
    for (const g of geometries) { const a = g.getAttribute(name).array as Float32Array; array.set(a, offset); offset += a.length; }
    merged.setAttribute(name, new THREE.BufferAttribute(array, size));
  }
  if (first.index) {
    const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
    let offset = 0, base = 0;
    for (const g of geometries) {
      const source = g.index!.array;
      for (let i = 0; i < source.length; i++) index[offset + i] = source[i] + base;
      offset += source.length; base += g.getAttribute("position").count;
    }
    merged.setIndex(new THREE.BufferAttribute(index, 1));
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/** Merged geometry, shared by every rival of one loaded GLB: keyed by the first member's source geometry. */
const mergedCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();

function chainOf(mesh: THREE.Object3D, root: THREE.Object3D): { chain: string[]; visible: boolean } {
  const chain: string[] = [];
  let visible = true;
  for (let o: THREE.Object3D | null = mesh; o && o !== root; o = o.parent) { chain.push(o.name); visible &&= o.visible; }
  return { chain, visible };
}

/**
 * Merge the static meshes of one rival's model (a clone of the GLB scene,
 * after Yacht has set its materials and hidden its decorations). The merged
 * meshes take the materials the originals wear now (the rival's paint), and
 * the originals are hidden. Returns the undo.
 */
export function mergeRivalStatics(model: THREE.Object3D): () => void {
  const meshes: THREE.Mesh[] = [];
  const items: MergeItem[] = [];
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const { chain, visible } = chainOf(mesh, model);
    const layout = geometryLayout(mesh.geometry);
    const material = mesh.material;
    items.push({ id: meshes.length, chain, visible, layout: layout ?? "", material: Array.isArray(material) ? "" : material.name,
      special: layout === null || Array.isArray(material) || !material.name || Boolean(mesh.morphTargetInfluences?.length) || (mesh as THREE.Mesh & { isInstancedMesh?: boolean }).isInstancedMesh === true });
    meshes.push(mesh);
  });
  const groups = planStaticMerge(items);
  if (!groups.length) return () => {};
  model.updateWorldMatrix(true, true);
  const toModel = model.matrixWorld.clone().invert();
  const relative = new THREE.Matrix4();
  const added: THREE.Mesh[] = [];
  const hidden: THREE.Mesh[] = [];
  for (const group of groups) {
    const members = group.map((id) => meshes[id]);
    let geometry = mergedCache.get(members[0].geometry);
    if (!geometry) {
      const placed = members.map((mesh) => {
        relative.multiplyMatrices(toModel, mesh.matrixWorld);
        return mesh.geometry.clone().applyMatrix4(relative);
      });
      geometry = mergeStaticGeometries(placed);
      placed.forEach((g) => g.dispose());
      mergedCache.set(members[0].geometry, geometry);
    }
    const merged = new THREE.Mesh(geometry, members[0].material);
    merged.name = `Merged_${(members[0].material as THREE.Material).name}`;
    merged.castShadow = members.some((m) => m.castShadow);
    merged.receiveShadow = members.some((m) => m.receiveShadow);
    model.add(merged);
    added.push(merged);
    for (const mesh of members) { mesh.visible = false; hidden.push(mesh); }
  }
  return () => {
    for (const mesh of added) model.remove(mesh);
    for (const mesh of hidden) mesh.visible = true;
  };
}

/**
 * One frame of the rival LOD switch: near or far with the band of rivalIsFar
 * (quality.ts), and exactly one of the two drawn. Returns the new far state.
 */
export function switchRivalLod(wasFar: boolean, screenPx: number, farPx: number, near: THREE.Object3D | null, far: THREE.Object3D | null): boolean {
  const isFar = rivalIsFar(wasFar, screenPx, farPx);
  if (near) near.visible = !isFar;
  if (far) far.visible = isFar;
  return isFar;
}

// ---------------------------------------------------------------------------
// The far boat, in the GLB frame: +X bow, +Y up, +Z starboard, origin at the
// waterline amidships. Sizes from the shipped GLB (checked by rival-lod.test).
// ---------------------------------------------------------------------------

/** Hull sections from bow to transom: x, deck half beam, bottom half beam. */
const HULL_SECTIONS: readonly (readonly [number, number, number])[] = [
  [6.93, 0.05, 0.02], [4.2, 1.55, 0.7], [0.6, 2.08, 1.3], [-3.6, 2.0, 1.2], [-6.84, 1.7, 0.95],
];
const DECK_Y = 1.4;
const BOTTOM_Y = -0.5;
const HULL_INSIDE = [0, (DECK_Y + BOTTOM_Y) / 2, 0] as const;
/** Mast foot and top, as the GLB's Mast node (translation 0.3, 1.2, 0; 18.7 m tall). */
export const FAR_MAST = { x: 0.3, foot: 1.2, top: 19.9, half: 0.13 } as const;
/** The main in its rig frame (MainRig at 0.3, 2.74, 0): luff on the mast, clew at the boom end. */
export const FAR_MAIN_RIG: readonly [number, number, number] = [0.3, 2.74, 0];
export const FAR_MAIN: readonly (readonly [number, number])[] = [[0.1, 0], [0.1, 17], [-5.1, 0.12]];
/** The jib in its rig frame (JibRig at the tack, 6.3, 1.5, 0): head at Attachment_JibHead. */
export const FAR_JIB_RIG: readonly [number, number, number] = [6.3, 1.5, 0];
export const FAR_JIB: readonly (readonly [number, number])[] = [[0, 0], [-5.8, 16.14], [-5.0, 0.45]];

/** Two triangles a-b-d and a-d-e, each turned to face away from `inside`. */
function pushQuad(out: number[], colors: number[], c: THREE.Color, inside: readonly number[], a: number[], b: number[], d: number[], e: number[]) {
  for (const [u, v, w] of [[a, b, d], [a, d, e]]) {
    const n = [
      (v[1] - u[1]) * (w[2] - u[2]) - (v[2] - u[2]) * (w[1] - u[1]),
      (v[2] - u[2]) * (w[0] - u[0]) - (v[0] - u[0]) * (w[2] - u[2]),
      (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]),
    ];
    const out_ = [0, 1, 2].reduce((sum, k) => sum + n[k] * ((u[k] + v[k] + w[k]) / 3 - inside[k]), 0);
    out.push(...u, ...(out_ >= 0 ? [...v, ...w] : [...w, ...v]));
    for (let i = 0; i < 3; i++) colors.push(c.r, c.g, c.b);
  }
}

function box(out: number[], colors: number[], c: THREE.Color, min: number[], max: number[]) {
  const [x0, y0, z0] = min, [x1, y1, z1] = max;
  const mid = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  pushQuad(out, colors, c, mid, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);
  pushQuad(out, colors, c, mid, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  pushQuad(out, colors, c, mid, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  pushQuad(out, colors, c, mid, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
  pushQuad(out, colors, c, mid, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
}

/** Linear colours of the GLB materials the far boat stands for. */
const DECK = new THREE.Color().setRGB(0.36, 0.23, 0.12);
const ANTIFOUL = new THREE.Color().setRGB(0.05, 0.055, 0.08);
const SPAR = new THREE.Color().setRGB(0.6, 0.62, 0.64);

/** Hull, keel, cabin and mast in one flat-shaded, vertex-coloured mesh. `topsides` is the rival's painted gelcoat. */
export function farHullGeometry(topsides: THREE.Color): THREE.BufferGeometry {
  const p: number[] = [], c: number[] = [];
  for (let s = 0; s < HULL_SECTIONS.length - 1; s++) {
    const [xa, da, ba] = HULL_SECTIONS[s], [xb, db, bb] = HULL_SECTIONS[s + 1];
    // Deck, both topsides and the bottom; every face turned away from the middle of the hull.
    pushQuad(p, c, DECK, HULL_INSIDE, [xa, DECK_Y, -da], [xa, DECK_Y, da], [xb, DECK_Y, db], [xb, DECK_Y, -db]);
    pushQuad(p, c, topsides, HULL_INSIDE, [xa, BOTTOM_Y, ba], [xb, BOTTOM_Y, bb], [xb, DECK_Y, db], [xa, DECK_Y, da]);
    pushQuad(p, c, topsides, HULL_INSIDE, [xb, BOTTOM_Y, -bb], [xa, BOTTOM_Y, -ba], [xa, DECK_Y, -da], [xb, DECK_Y, -db]);
    pushQuad(p, c, ANTIFOUL, HULL_INSIDE, [xa, BOTTOM_Y, -ba], [xb, BOTTOM_Y, -bb], [xb, BOTTOM_Y, bb], [xa, BOTTOM_Y, ba]);
  }
  const [xt, dt, bt] = HULL_SECTIONS[HULL_SECTIONS.length - 1];
  pushQuad(p, c, topsides, HULL_INSIDE, [xt, BOTTOM_Y, bt], [xt, DECK_Y, dt], [xt, DECK_Y, -dt], [xt, BOTTOM_Y, -bt]);
  box(p, c, ANTIFOUL, [-1.1, -2.2, -0.15], [1.2, BOTTOM_Y, 0.15]);
  box(p, c, topsides, [-0.9, DECK_Y, -1.15], [3.7, 2.18, 1.15]);
  box(p, c, SPAR, [FAR_MAST.x - FAR_MAST.half, FAR_MAST.foot, -FAR_MAST.half], [FAR_MAST.x + FAR_MAST.half, FAR_MAST.top, FAR_MAST.half]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** A flat sail triangle in its rig frame (z = 0), drawn from both sides. */
export function farSailGeometry(corners: readonly (readonly [number, number])[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(corners.flatMap(([x, y]) => [x, y, 0]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(corners.flatMap(() => [0, 0, 1]), 3));
  g.computeBoundingSphere();
  return g;
}

/** Triangles of the far boat (hull mesh plus both sails), for the measurements in rival-lod.test. */
export function farBoatTriangles(): number {
  const hull = farHullGeometry(new THREE.Color(1, 1, 1));
  const count = hull.getAttribute("position").count / 3 + 2;
  hull.dispose();
  return count;
}
