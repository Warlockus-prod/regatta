// M2-7: a smaller yacht file without a decoder. The Blender export writes a
// texture coordinate for every surface, but only the sail cloth has a texture;
// the others never read theirs. Removing those coordinates (and the bytes no
// accessor reads any more) changes no pixel, needs no Draco or meshopt decoder
// (the CSP and glb-decoders.test keep models plain) and shrinks the web
// download and the iOS offline package alike. The sail coordinates stay: the
// anatomy viewer draws the exported sails, and the race reuses their texture.
//
// Run after every Blender export (scripts/blender/build_sailing_yacht.py):
//   node --experimental-strip-types src/features/simulator-3d/model-optimize.ts public/models/regatta_sloop_sailing.glb
// model-optimize.test.ts fails while the shipped file still has the extra bytes.

type Json = Record<string, unknown>;
interface Accessor extends Json { bufferView?: number; sparse?: { indices: { bufferView: number }; values: { bufferView: number } } }
interface BufferView extends Json { buffer: number; byteOffset?: number; byteLength: number }
interface Primitive extends Json { attributes: Record<string, number>; indices?: number; material?: number; targets?: Record<string, number>[] }
interface Gltf extends Json {
  accessors?: Accessor[]; bufferViews?: BufferView[]; buffers?: { byteLength: number; uri?: string }[];
  meshes?: { primitives: Primitive[] }[]; materials?: Json[]; images?: { bufferView?: number }[];
  skins?: { inverseBindMatrices?: number }[]; animations?: { samplers: { input: number; output: number }[] }[];
}

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

/** Split a binary glTF into its JSON document and BIN chunk. */
export function readGlb(glb: Uint8Array): { json: Gltf; bin: Uint8Array } {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) throw new Error("Not a glTF 2.0 binary");
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== JSON_CHUNK) throw new Error("Expected the JSON chunk first");
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLength))) as Gltf;
  const binStart = 20 + jsonLength;
  if (binStart >= glb.byteLength) return { json, bin: new Uint8Array(0) };
  if (view.getUint32(binStart + 4, true) !== BIN_CHUNK) throw new Error("Expected a BIN chunk");
  return { json, bin: glb.subarray(binStart + 8, binStart + 8 + view.getUint32(binStart, true)) };
}

/** Assemble a binary glTF; chunks padded to 4 bytes (JSON with spaces, BIN with zeros). */
export function writeGlb(json: Gltf, bin: Uint8Array): Uint8Array {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = Math.ceil(text.length / 4) * 4;
  const binLength = Math.ceil(bin.length / 4) * 4;
  const total = 12 + 8 + jsonLength + (bin.length ? 8 + binLength : 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, GLB_MAGIC, true); view.setUint32(4, 2, true); view.setUint32(8, total, true);
  view.setUint32(12, jsonLength, true); view.setUint32(16, JSON_CHUNK, true);
  out.set(text, 20); out.fill(0x20, 20 + text.length, 20 + jsonLength);
  if (bin.length) {
    const at = 20 + jsonLength;
    view.setUint32(at, binLength, true); view.setUint32(at + 4, BIN_CHUNK, true);
    out.set(bin, at + 8);
  }
  return out;
}

/** True when the material samples any texture (core slots or an extension). */
export function materialHasTexture(material: Json | undefined): boolean {
  if (!material) return false;
  let found = false;
  const walk = (value: unknown) => {
    if (found || !value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (/Texture$/.test(key) && child && typeof child === "object" && "index" in child) { found = true; return; }
      walk(child);
    }
  };
  walk(material);
  return found;
}

/** Remove TEXCOORD_n from primitives whose material has no texture, then drop
 * the accessors and bytes nothing reads. Same document otherwise. */
export function stripUnusedTexcoords(glb: Uint8Array): Uint8Array {
  const { json, bin } = readGlb(glb);
  if ((json.buffers ?? []).some((b, i) => i > 0 || b.uri !== undefined)) throw new Error("Only a single embedded buffer is supported");
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives) {
    if (materialHasTexture(primitive.material === undefined ? undefined : json.materials?.[primitive.material])) continue;
    for (const name of Object.keys(primitive.attributes)) if (/^TEXCOORD_\d+$/.test(name)) delete primitive.attributes[name];
  }
  // Accessors still read, in their original order.
  const accessors = json.accessors ?? [];
  const usedAccessors = new Set<number>();
  for (const mesh of json.meshes ?? []) for (const p of mesh.primitives) {
    Object.values(p.attributes).forEach((a) => usedAccessors.add(a));
    if (p.indices !== undefined) usedAccessors.add(p.indices);
    p.targets?.forEach((t) => Object.values(t).forEach((a) => usedAccessors.add(a)));
  }
  json.skins?.forEach((s) => { if (s.inverseBindMatrices !== undefined) usedAccessors.add(s.inverseBindMatrices); });
  json.animations?.forEach((a) => a.samplers.forEach((s) => { usedAccessors.add(s.input); usedAccessors.add(s.output); }));
  const accessorMap = new Map<number, number>();
  const keptAccessors = accessors.filter((_, i) => usedAccessors.has(i) && (accessorMap.set(i, accessorMap.size), true));
  const mapAccessor = (i: number) => accessorMap.get(i)!;
  for (const mesh of json.meshes ?? []) for (const p of mesh.primitives) {
    for (const name of Object.keys(p.attributes)) p.attributes[name] = mapAccessor(p.attributes[name]);
    if (p.indices !== undefined) p.indices = mapAccessor(p.indices);
    p.targets?.forEach((t) => { for (const name of Object.keys(t)) t[name] = mapAccessor(t[name]); });
  }
  json.skins?.forEach((s) => { if (s.inverseBindMatrices !== undefined) s.inverseBindMatrices = mapAccessor(s.inverseBindMatrices); });
  json.animations?.forEach((a) => a.samplers.forEach((s) => { s.input = mapAccessor(s.input); s.output = mapAccessor(s.output); }));
  if (json.accessors) json.accessors = keptAccessors;
  // Buffer views still read, copied in order into a packed BIN (4-byte aligned).
  const views = json.bufferViews ?? [];
  const usedViews = new Set<number>();
  for (const a of keptAccessors) {
    if (a.bufferView !== undefined) usedViews.add(a.bufferView);
    if (a.sparse) { usedViews.add(a.sparse.indices.bufferView); usedViews.add(a.sparse.values.bufferView); }
  }
  json.images?.forEach((image) => { if (image.bufferView !== undefined) usedViews.add(image.bufferView); });
  const viewMap = new Map<number, number>();
  let length = 0;
  const kept: BufferView[] = [];
  views.forEach((view, i) => {
    if (!usedViews.has(i)) return;
    length = Math.ceil(length / 4) * 4;
    viewMap.set(i, kept.length);
    kept.push({ ...view, byteOffset: length });
    length += view.byteLength;
  });
  const packed = new Uint8Array(Math.ceil(length / 4) * 4);
  views.forEach((view, i) => {
    const to = viewMap.get(i);
    if (to === undefined) return;
    packed.set(bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength), kept[to].byteOffset);
  });
  for (const a of keptAccessors) {
    if (a.bufferView !== undefined) a.bufferView = viewMap.get(a.bufferView)!;
    if (a.sparse) { a.sparse.indices.bufferView = viewMap.get(a.sparse.indices.bufferView)!; a.sparse.values.bufferView = viewMap.get(a.sparse.values.bufferView)!; }
  }
  json.images?.forEach((image) => { if (image.bufferView !== undefined) image.bufferView = viewMap.get(image.bufferView)!; });
  if (json.bufferViews) json.bufferViews = kept;
  if (json.buffers?.[0]) json.buffers[0].byteLength = packed.length;
  return writeGlb(json, packed);
}

// CLI: rewrite the given files in place, printing the bytes saved.
const argv = typeof process === "undefined" ? [] : process.argv;
if (argv[1] && /model-optimize\.ts$/.test(argv[1]) && argv.length > 2) {
  const { readFileSync, writeFileSync } = await import("node:fs");
  for (const file of argv.slice(2)) {
    const before = readFileSync(file);
    const after = stripUnusedTexcoords(new Uint8Array(before));
    writeFileSync(file, after);
    console.log(`${file}: ${before.length} -> ${after.length} bytes`);
  }
}
