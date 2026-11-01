import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Every model is served from our origin and parsed without a decoder: drei
// fetches the Draco decoder from www.gstatic.com, which the production CSP
// blocks, and the yacht loader attaches no meshopt decoder (Yacht.tsx).

const FORBIDDEN = ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_meshopt_compression"];
const root = join(process.cwd(), "public");

function models(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return models(path);
    return /\.(glb|gltf)$/i.test(entry.name) ? [path] : [];
  });
}

/** The JSON chunk of a binary glTF, or a plain .gltf document. */
function gltfJson(path: string): Record<string, unknown> {
  const bytes = readFileSync(path);
  if (!path.toLowerCase().endsWith(".glb")) return JSON.parse(bytes.toString("utf8"));
  expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
  const length = bytes.readUInt32LE(12);
  expect(bytes.toString("ascii", 16, 20)).toBe("JSON");
  return JSON.parse(bytes.subarray(20, 20 + length).toString("utf8"));
}

/** Extension names anywhere in the document, not only the declared lists. */
function extensionNames(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const item of value) extensionNames(item, found);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "extensions" && child && typeof child === "object") for (const name of Object.keys(child)) found.add(name);
      if ((key === "extensionsUsed" || key === "extensionsRequired") && Array.isArray(child)) for (const name of child) found.add(String(name));
      extensionNames(child, found);
    }
  }
  return found;
}

describe("models load without a remote or missing decoder", () => {
  const files = models(root);

  it("finds the shipped yacht", () => {
    expect(files.map(file => relative(root, file))).toContain(join("models", "regatta_sloop_sailing.glb"));
  });

  it.each(files.map(file => [relative(root, file), file]))("%s uses no Draco or meshopt compression", (_name, file) => {
    const used = extensionNames(gltfJson(file));
    expect(FORBIDDEN.filter(name => used.has(name))).toEqual([]);
  });

  it("detects a compressed primitive even when the declared lists omit it", () => {
    const sneaky = { meshes: [{ primitives: [{ extensions: { KHR_draco_mesh_compression: { bufferView: 0 } } }] }] };
    expect(extensionNames(sneaky).has("KHR_draco_mesh_compression")).toBe(true);
    expect(extensionNames({ extensionsRequired: ["EXT_meshopt_compression"] }).has("EXT_meshopt_compression")).toBe(true);
  });

  it("every model loader in src asks for neither decoder", () => {
    // drei's useGLTF defaults to the gstatic Draco decoder, so each call must opt out.
    const files = ["src/features/simulator-3d/Yacht.tsx", "src/components/YachtViewer3D.tsx"];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      const calls = [...source.matchAll(/useGLTF(?:\.preload)?\(([^)]*)\)/g)].map(match => match[1].split(",").map(arg => arg.trim()));
      expect(calls.length, file).toBeGreaterThan(0);
      for (const args of calls) expect(args.slice(1, 3), file).toEqual(["false", "false"]);
    }
  });

  it("no other file in src loads a model with useGLTF unchecked", () => {
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [join(dir, entry.name)] : []);
    const loaders = walk(join(process.cwd(), "src"))
      .filter(file => /useGLTF(?:\.preload)?\(/.test(readFileSync(file, "utf8")))
      .map(file => file.slice(process.cwd().length + 1)).sort();
    expect(loaders).toEqual(["src/components/YachtViewer3D.tsx", "src/features/simulator-3d/Yacht.tsx"]);
  });
});
