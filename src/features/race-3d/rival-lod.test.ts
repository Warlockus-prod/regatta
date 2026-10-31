import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { YACHT_MODEL_URL } from "@/features/simulator-3d/config";
import {
  DYNAMIC_PARTS, FAR_JIB, FAR_JIB_RIG, FAR_MAIN_RIG, FAR_MAST, farBoatTriangles, farHullGeometry,
  geometryLayout, mergeRivalStatics, mergeStaticGeometries, planStaticMerge, switchRivalLod, type MergeItem,
} from "./rival-lod";

// M2-6 contract: a near rival draws the same triangles with the same
// materials in far fewer draw calls, a far rival is a few dozen triangles,
// and the far boat stands where the GLB's hull, mast and sails stand.

interface GltfNode { name: string; mesh?: number; children?: number[]; translation?: number[] }
interface Gltf {
  scene?: number; scenes: { nodes: number[] }[]; nodes: GltfNode[];
  meshes: { primitives: { attributes: Record<string, number>; indices?: number; material?: number; targets?: unknown[] }[] }[];
  materials: { name: string }[]; accessors: { count: number; min?: number[]; max?: number[] }[];
}
const bytes = readFileSync(join(process.cwd(), "public", YACHT_MODEL_URL));
const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as Gltf;
/** Hidden by Yacht.tsx before a rival is merged (its exported decorations). */
const YACHT_HIDES = new Set(["Anatomy_Sheets", "Anatomy_Fender_-1", "Anatomy_Fender_1", "Anatomy_Fender_Line_-1", "Anatomy_Fender_Line_1"]);
/** Drawn per near rival besides the GLB meshes: sheets and two sail seam lines, the name tag. */
const RUNTIME_EXTRAS = 4;

/** The rival's meshes as GLTFLoader builds them: one Mesh per primitive. */
function glbItems() {
  const items: (MergeItem & { triangles: number })[] = [];
  const walk = (index: number, ancestors: string[]) => {
    const node = gltf.nodes[index];
    const chain = [node.name, ...ancestors];
    if (node.mesh !== undefined) {
      const primitives = gltf.meshes[node.mesh].primitives;
      primitives.forEach((p, i) => {
        const names = Object.keys(p.attributes).map((a) => ({ POSITION: "position", NORMAL: "normal", TEXCOORD_0: "uv" }[a] ?? a)).sort();
        items.push({
          id: items.length, chain: primitives.length > 1 ? [`${node.name}_${i}`, ...chain] : chain,
          material: gltf.materials[p.material ?? 0].name, layout: `${names.join(",")}${p.indices !== undefined ? "+i" : ""}`,
          visible: !chain.some((name) => YACHT_HIDES.has(name)), special: Boolean(p.targets?.length),
          triangles: (p.indices !== undefined ? gltf.accessors[p.indices].count : gltf.accessors[p.attributes.POSITION].count) / 3,
        });
      });
    }
    node.children?.forEach((child) => walk(child, chain));
  };
  gltf.scenes[gltf.scene ?? 0].nodes.forEach((n) => walk(n, []));
  return items;
}

describe("near rival: static parts merged per material", () => {
  const items = glbItems();
  const groups = planStaticMerge(items);
  const merged = new Set(groups.flat());
  const drawn = items.filter((i) => i.visible);
  const before = drawn.length + RUNTIME_EXTRAS;
  const after = groups.length + drawn.filter((i) => !merged.has(i.id)).length + RUNTIME_EXTRAS;

  it("cuts a near rival's draw calls by more than half, drawing the same triangles", () => {
    // Measured on the shipped GLB: 50 draw calls before, 22 after (24 with the exported texture coordinates).
    expect({ before, after }).toEqual({ before: 50, after: 22 });
    // Each drawn mesh is in at most one merged mesh, so every triangle is drawn exactly once.
    expect(merged.size).toBe(groups.flat().length);
    expect(groups.every((g) => g.length > 1)).toBe(true);
  });

  it("never merges a moving part, a hidden decoration or a morphing sail", () => {
    for (const id of merged) {
      const item = items[id];
      expect(item.visible).toBe(true);
      expect(item.special).toBe(false);
      expect(item.chain.some((name) => DYNAMIC_PARTS.has(name))).toBe(false);
    }
    const names = (id: number) => items[id].chain;
    for (const part of ["Boom", "MainSail", "Jib", "Rudder"]) expect([...merged].some((id) => names(id).includes(part))).toBe(false);
    for (const part of ["Hull", "Mast", "Rigging", "Deck_Rails"]) expect([...merged].some((id) => names(id).includes(part))).toBe(true);
  });

  it("groups only one material and one attribute layout per merged mesh", () => {
    for (const group of groups) {
      expect(new Set(group.map((id) => items[id].material)).size).toBe(1);
      expect(new Set(group.map((id) => items[id].layout)).size).toBe(1);
    }
  });
});

describe("far rival", () => {
  it("is a few dozen triangles instead of the full yacht", () => {
    const full = glbItems().filter((i) => i.visible).reduce((sum, i) => sum + i.triangles, 0);
    // Measured: the near rival draws 26751 GLB triangles (its runtime sails add more); the far boat 66.
    expect(full).toBe(26751);
    expect(farBoatTriangles()).toBe(66);
  });

  it("stands where the GLB's mast and sail rigs stand", () => {
    const node = (name: string) => gltf.nodes.find((n) => n.name === name)!;
    const mast = node("Mast");
    expect(FAR_MAST.x).toBeCloseTo(mast.translation![0], 5);
    expect(FAR_MAST.foot).toBeCloseTo(mast.translation![1], 5);
    expect(FAR_MAST.top - FAR_MAST.foot).toBeCloseTo(gltf.accessors[gltf.meshes[mast.mesh!].primitives[0].attributes.POSITION].max![1], 1);
    node("MainRig").translation!.forEach((v, i) => expect(FAR_MAIN_RIG[i]).toBeCloseTo(v, 5));
    node("JibRig").translation!.forEach((v, i) => expect(FAR_JIB_RIG[i]).toBeCloseTo(v, 5));
    // The jib head sits on the GLB's head attachment.
    const head = node("Attachment_JibHead").translation!;
    expect(FAR_JIB_RIG[0] + FAR_JIB[1][0]).toBeCloseTo(head[0], 1);
    expect(FAR_JIB_RIG[1] + FAR_JIB[1][1]).toBeCloseTo(head[1], 1);
    const hull = gltf.accessors[gltf.meshes[node("Hull").mesh!].primitives[0].attributes.POSITION];
    const far = farHullGeometry(new THREE.Color(1, 1, 1));
    far.computeBoundingBox();
    expect(far.boundingBox!.max.x).toBeCloseTo(hull.max![0], 1);
    expect(far.boundingBox!.min.x).toBeGreaterThanOrEqual(hull.min![0] - 0.01);
    expect(far.boundingBox!.max.z).toBeLessThanOrEqual(hull.max![2] + 0.01);
    far.dispose();
  });

  it("turns every hull face outwards and paints the topsides in the rival's colour", () => {
    const tint = new THREE.Color("#e4572e");
    const g = farHullGeometry(tint);
    const position = g.getAttribute("position"), color = g.getAttribute("color");
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), mid = new THREE.Vector3();
    // Built in order: 4 hull sections and the transom (34 triangles), then the
    // keel, cabin and mast boxes (10 each), each closed round its own middle.
    const middles: [number, THREE.Vector3][] = [[34, new THREE.Vector3(0, 0.45, 0)], [44, new THREE.Vector3(0.05, -1.35, 0)],
      [54, new THREE.Vector3(1.4, 1.79, 0)], [64, new THREE.Vector3(FAR_MAST.x, (FAR_MAST.foot + FAR_MAST.top) / 2, 0)]];
    expect(position.count / 3).toBe(64);
    let tinted = 0;
    for (let t = 0; t < position.count / 3; t++) {
      a.fromBufferAttribute(position, t * 3); b.fromBufferAttribute(position, t * 3 + 1); c.fromBufferAttribute(position, t * 3 + 2);
      n.subVectors(b, a).cross(c.clone().sub(a));
      mid.copy(a).add(b).add(c).divideScalar(3);
      const inside = middles.find(([end]) => t < end)![1];
      expect(n.dot(mid.sub(inside)), `triangle ${t}`).toBeGreaterThan(0);
      if (Math.abs(color.getX(t * 3) - tint.r) < 1e-6 && Math.abs(color.getY(t * 3) - tint.g) < 1e-6) tinted++;
    }
    expect(tinted).toBeGreaterThan(10);
    g.dispose();
  });
});

describe("merging at runtime", () => {
  function model() {
    const root = new THREE.Group();
    const material = (name: string) => Object.assign(new THREE.MeshStandardMaterial(), { name });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const hull = new THREE.Mesh(box, material("Gelcoat_White_Polished")); hull.name = "Hull";
    const cabin = new THREE.Mesh(box, material("Gelcoat_White_Polished")); cabin.name = "Cabin"; cabin.position.set(2, 1, 0);
    const rig = new THREE.Group(); rig.name = "MainRig";
    const boom = new THREE.Mesh(box, material("Gelcoat_White_Polished")); boom.name = "Boom";
    rig.add(boom);
    const fender = new THREE.Mesh(box, material("Gelcoat_White_Polished")); fender.name = "Anatomy_Fender_1"; fender.visible = false;
    root.add(hull, cabin, rig, fender);
    return { root, hull, cabin, boom, fender, box };
  }

  it("hides the merged originals, keeps moving and hidden parts, and undoes exactly", () => {
    const m = model();
    const undo = mergeRivalStatics(m.root);
    const merged = m.root.children.filter((o) => o.name.startsWith("Merged_")) as THREE.Mesh[];
    expect(merged).toHaveLength(1);
    expect([m.hull.visible, m.cabin.visible, m.boom.visible, m.fender.visible]).toEqual([false, false, true, false]);
    // The cabin's vertices moved by its offset: the merged mesh draws both boxes in place.
    const box = new THREE.Box3().setFromBufferAttribute(merged[0].geometry.getAttribute("position") as THREE.BufferAttribute);
    expect(box.min.toArray()).toEqual([-0.5, -0.5, -0.5]);
    expect(box.max.toArray()).toEqual([2.5, 1.5, 0.5]);
    expect(merged[0].geometry.index!.count).toBe(m.box.index!.count * 2);
    expect(merged[0].geometry.groups).toEqual([]);
    expect(merged[0].material).toBe(m.hull.material);
    undo();
    expect(m.root.children.some((o) => o.name.startsWith("Merged_"))).toBe(false);
    expect([m.hull.visible, m.cabin.visible, m.boom.visible, m.fender.visible]).toEqual([true, true, true, false]);
  });

  it("shares one merged geometry between rivals of the same model", () => {
    const m = model();
    const a = m.root.clone(true), b = m.root.clone(true);
    const undoA = mergeRivalStatics(a), undoB = mergeRivalStatics(b);
    const geometry = (o: THREE.Object3D) => (o.children.find((c) => c.name.startsWith("Merged_")) as THREE.Mesh).geometry;
    expect(geometry(a)).toBe(geometry(b));
    undoA(); undoB();
  });

  it("concatenates attributes and offsets indices", () => {
    const one = new THREE.PlaneGeometry(1, 1), two = new THREE.PlaneGeometry(1, 1).translate(3, 0, 0);
    expect(geometryLayout(one)).toBe("normal,position,uv+i");
    const merged = mergeStaticGeometries([one, two]);
    expect(merged.getAttribute("position").count).toBe(8);
    expect(Array.from(merged.index!.array.slice(6))).toEqual(Array.from(two.index!.array).map((i) => i + 4));
    expect(geometryLayout(new THREE.BufferGeometry().setAttribute("color", new THREE.Float32BufferAttribute([0, 0, 0], 3)))).toBeNull();
  });
});

describe("near or far, one frame at a time", () => {
  it("draws exactly one of the full yacht and the far boat, with the band", () => {
    const near = new THREE.Group(), far = new THREE.Group();
    const shown = () => [near.visible, far.visible];
    let isFar = switchRivalLod(false, 100, 36, near, far);
    expect([isFar, ...shown()]).toEqual([false, true, false]);
    isFar = switchRivalLod(isFar, 30, 36, near, far);
    expect([isFar, ...shown()]).toEqual([true, false, true]);
    // Inside the band it stays far, past it the full yacht comes back.
    isFar = switchRivalLod(isFar, 40, 36, near, far);
    expect([isFar, ...shown()]).toEqual([true, false, true]);
    isFar = switchRivalLod(isFar, 44, 36, near, far);
    expect([isFar, ...shown()]).toEqual([false, true, false]);
  });

  it("is what every rival and the ghost runs each frame", () => {
    const source = readFileSync(join(process.cwd(), "src/features/race-3d/Race3DView.tsx"), "utf8");
    expect(source).toMatch(/isFar\.current = switchRivalLod\(isFar\.current, screen, farPxRef\?\.current \?\? QUALITY_PROFILES\.high\.rivalFarPx, near\.current, farYaw\.current\);/);
    expect(source).toMatch(/<group ref=\{near\}><Yacht stateRef=\{state\} light \/><\/group>\n\s+<group ref=\{farYaw\}>/);
  });
});
