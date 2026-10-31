import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { YACHT_MODEL_URL } from "./config";
import { materialHasTexture, readGlb, stripUnusedTexcoords, writeGlb } from "./model-optimize";

// M2-7 contract: the shipped yacht carries no texture coordinates its
// materials never sample, and removing them changed no other byte a renderer
// reads: every remaining attribute, index, morph target and image is the
// exported data, bit for bit.

const shipped = new Uint8Array(readFileSync(join(process.cwd(), "public", YACHT_MODEL_URL)));
const COMPONENT_BYTES: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const ITEMS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

type Doc = ReturnType<typeof readGlb>;
/** The bytes an accessor reads (tightly packed source views, as Blender writes them). */
function accessorBytes(doc: Doc, index: number): Uint8Array {
  const json = doc.json as unknown as { accessors: { bufferView: number; byteOffset?: number; count: number; type: string; componentType: number }[]; bufferViews: { byteOffset?: number }[] };
  const a = json.accessors[index];
  const start = (json.bufferViews[a.bufferView].byteOffset ?? 0) + (a.byteOffset ?? 0);
  return doc.bin.subarray(start, start + a.count * ITEMS[a.type] * COMPONENT_BYTES[a.componentType]);
}

describe("yacht model without unused texture coordinates", () => {
  it("is already optimised: running the tool on the shipped file changes nothing", () => {
    expect(Buffer.from(stripUnusedTexcoords(shipped)).equals(Buffer.from(shipped))).toBe(true);
  });

  it("keeps coordinates only where a texture is sampled (the sail cloth)", () => {
    const { json } = readGlb(shipped);
    const materials = (json.materials ?? []) as Record<string, unknown>[];
    let textured = 0;
    for (const mesh of json.meshes ?? []) for (const p of mesh.primitives) {
      const has = materialHasTexture(p.material === undefined ? undefined : materials[p.material]);
      expect(Object.keys(p.attributes).some((name) => name.startsWith("TEXCOORD_"))).toBe(has);
      if (has) textured++;
    }
    expect(textured).toBe(2);
    // Measured: 1,304,944 bytes as exported, 1,152,492 shipped (gzip -9: 693,299 -> 677,411).
    expect(shipped.byteLength).toBeLessThanOrEqual(1_152_492);
  });

  it("changes no attribute, index, morph target or image byte of an exported model", () => {
    // Rebuild an "exported" file from the shipped one by giving every untextured
    // primitive a fresh coordinate set, then strip it again.
    const doc = readGlb(shipped);
    const json = structuredClone(doc.json) as unknown as {
      meshes: { primitives: { attributes: Record<string, number>; indices?: number; material?: number; targets?: Record<string, number>[] }[] }[];
      accessors: Record<string, unknown>[]; bufferViews: { buffer: number; byteOffset: number; byteLength: number }[]; buffers: { byteLength: number }[];
      images: { bufferView: number }[];
    };
    let bin = Buffer.from(doc.bin);
    for (const mesh of json.meshes) for (const p of mesh.primitives) {
      if (p.attributes.TEXCOORD_0 !== undefined) continue;
      const count = (json.accessors[p.attributes.POSITION] as { count: number }).count;
      const bytes = Buffer.alloc(count * 8, 7);
      const offset = Math.ceil(bin.length / 4) * 4;
      bin = Buffer.concat([bin, Buffer.alloc(offset - bin.length), bytes]);
      json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length });
      json.accessors.push({ bufferView: json.bufferViews.length - 1, componentType: 5126, count, type: "VEC2" });
      p.attributes.TEXCOORD_0 = json.accessors.length - 1;
    }
    json.buffers[0].byteLength = bin.length;
    const exported = writeGlb(json as unknown as Doc["json"], new Uint8Array(bin));
    const stripped = stripUnusedTexcoords(exported);
    expect(stripped.byteLength).toBeLessThan(exported.byteLength);
    const before = readGlb(exported), after = readGlb(stripped);
    const meshesBefore = before.json.meshes!, meshesAfter = after.json.meshes!;
    meshesBefore.forEach((mesh, m) => mesh.primitives.forEach((p, k) => {
      const q = meshesAfter[m].primitives[k];
      const textured = materialHasTexture((before.json.materials as Record<string, unknown>[])[p.material ?? 0]);
      expect(Object.keys(q.attributes).sort()).toEqual(Object.keys(p.attributes).filter((n) => textured || !n.startsWith("TEXCOORD_")).sort());
      for (const name of Object.keys(q.attributes)) expect(Buffer.from(accessorBytes(after, q.attributes[name])).equals(Buffer.from(accessorBytes(before, p.attributes[name])))).toBe(true);
      if (p.indices !== undefined) expect(Buffer.from(accessorBytes(after, q.indices!)).equals(Buffer.from(accessorBytes(before, p.indices)))).toBe(true);
      p.targets?.forEach((t, i) => { for (const name of Object.keys(t)) expect(Buffer.from(accessorBytes(after, q.targets![i][name])).equals(Buffer.from(accessorBytes(before, t[name])))).toBe(true); });
    }));
    const image = (doc_: Doc) => {
      const view = (doc_.json.bufferViews ?? [])[(doc_.json.images ?? [])[0].bufferView!];
      return Buffer.from(doc_.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
    };
    expect(image(after).equals(image(before))).toBe(true);
    // Nodes, materials and the sail shape keys are the exported document.
    expect(after.json.nodes).toEqual(before.json.nodes);
    expect(after.json.materials).toEqual(before.json.materials);
    expect(after.json.meshes!.map((mesh) => (mesh as Record<string, unknown>).extras)).toEqual(before.json.meshes!.map((mesh) => (mesh as Record<string, unknown>).extras));
  });

});
