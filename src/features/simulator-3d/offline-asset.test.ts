import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

describe("bundled 3D sailing", () => {
  const html = readFileSync("mobile/assets/sailing-offline.html", "utf8");
  const manifest = JSON.parse(readFileSync("mobile/assets/sailing-offline.manifest.json", "utf8"));
  it("has an integrity manifest and fits the package budget", () => {
    expect(manifest.sha256).toBe(createHash("sha256").update(html).digest("hex"));
    expect(manifest.bytes).toBe(Buffer.byteLength(html));
    expect(manifest.bytes).toBeLessThan(8 * 1024 * 1024);
    expect(manifest.inputs.some((path: string) => path.endsWith("Simulator3D.tsx"))).toBe(true);
    expect(manifest.inputs.some((path: string) => path.endsWith("SimulatorV3Page.tsx"))).toBe(true);
    expect(manifest.inputs.some((path: string) => path.endsWith("rig/main-trim.ts"))).toBe(true);
    expect(manifest.inputs.some((path: string) => path.endsWith("sailing-physics/forces.ts"))).toBe(true);
  });
  it("contains the yacht and disallows HTTP dependencies", () => {
    expect(html).toContain("data:model/gltf-binary;base64,");
    expect(html).toContain("connect-src data: blob:");
    expect(html).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=["']https?:/);
    expect(html).toContain("regatta-language");
  });
  it("embeds image bytes directly for cold offline WebKit texture loading", () => {
    const encoded = html.match(/data:model\/gltf-binary;base64,([A-Za-z0-9+/=]+)/)?.[1];
    expect(encoded).toBeTruthy();
    const embedded = Buffer.from(encoded!, "base64");
    expect(embedded.readUInt32LE(8)).toBe(embedded.length);
    expect(createHash("sha256").update(embedded).digest("hex")).toBe(manifest.model.embeddedSha256);
    const json = JSON.parse(embedded.subarray(20, 20 + embedded.readUInt32LE(12)).toString());
    const original = readFileSync("public/models/regatta_sloop_sailing.glb");
    const source = JSON.parse(original.subarray(20, 20 + original.readUInt32LE(12)).toString());
    expect(json.nodes).toEqual(source.nodes);
    expect(json.meshes).toEqual(source.meshes);
    for (let i = 0; i < json.images.length; i++) {
      expect(json.images[i].bufferView).toBeUndefined();
      expect(json.images[i].uri).toMatch(/^data:image\/png;base64,/);
      const view = source.bufferViews[source.images[i].bufferView];
      const start = 28 + original.readUInt32LE(12) + view.byteOffset;
      expect(Buffer.from(json.images[i].uri.split(",")[1], "base64")).toEqual(original.subarray(start, start + view.byteLength));
    }
  });
});
