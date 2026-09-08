import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { YACHT_MODEL_URL } from "../config";
import { anatomyParts } from "@/data/anatomy";

interface Node { name: string; mesh?: number; children?: number[]; translation?: number[] }
interface Mesh { weights?: number[]; extras?: {targetNames?: string[]}; primitives: {attributes: {POSITION: number}}[] }
const bytes = readFileSync(join(process.cwd(), "public", YACHT_MODEL_URL));
const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as {
  nodes: Node[]; meshes: Mesh[]; accessors: {min: number[]; max: number[]}[];
};
const named = (name: string) => gltf.nodes.find(n => n.name === name)!;

describe("Blender game asset contract", () => {
  it("exports all teaching anchors in the same Y-up frame as the shared yacht", () => {
    expect(anatomyParts).toHaveLength(17);
    for (const part of anatomyParts) {
      const p = part.three!;
      const anchor = named("AnatomyPoint_" + part.id);
      expect(anchor).toBeDefined();
      [p.x,p.z,-p.y].forEach((value, i) => expect(anchor.translation![i]).toBeCloseTo(value, 5));
    }
    expect(named("Anatomy_Fender_1")).toBeDefined();
    expect(named("Anatomy_Sheets")).toBeDefined();
  });
  it("preserves named sail rigs and starts with the full sail, not summed shape keys", () => {
    for (const [rig, sail] of [["MainRig", "MainSail"], ["JibRig", "Jib"]]) {
      const node = named(sail);
      expect(named(rig).children).toContain(gltf.nodes.indexOf(node));
      const mesh = gltf.meshes[node.mesh!];
      expect(mesh.weights).toHaveLength(6);
      expect(mesh.weights?.every(weight => weight === 0)).toBe(true);
      expect(mesh.extras?.targetNames).toContain("Unloaded");
      expect(mesh.extras?.targetNames).toContain("Reduced");
      const bounds = gltf.accessors[mesh.primitives[0].attributes.POSITION];
      expect(bounds.max[1]).toBeGreaterThan(16);
    }
  });
  it("keeps standing rigging above the deck and inside the hull length", () => {
    const mesh = gltf.meshes[named("Rigging").mesh!];
    const bounds = gltf.accessors[mesh.primitives[0].attributes.POSITION];
    expect(bounds.min[1]).toBeGreaterThan(1.4);
    expect(bounds.min[0]).toBeGreaterThan(-6.93);
    expect(bounds.max[0]).toBeLessThan(6.93);
    expect(bounds.max[1]).toBeLessThan(20);
  });
});
