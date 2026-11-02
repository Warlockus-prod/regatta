import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { SAILING_ROUTES } from "./embed";

const root = resolve(__dirname, "../../..");
const read = (path: string) => readFileSync(resolve(root, path));
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const html = read("mobile/assets/sailing-offline.html");
const manifest = JSON.parse(read("mobile/assets/sailing-offline.manifest.json").toString());

test("all offline surfaces share original sources and retain an HTTP-free runtime", () => {
  expect(html.toString()).toContain('<html lang="en" data-theme="light">');
  expect(manifest.routes).toEqual(SAILING_ROUTES);
  expect(manifest.inputs).toContain("src/features/ads-lab/AdsLab.tsx");
  for (const path of ["src/features/manoeuvres/ManoeuvresApp.tsx", "src/lib/harbour-physics/step.ts", "src/data/manoeuvres.ts"]) expect(manifest.inputs).toContain(path);
  expect(manifest.sha256).toBe(sha(html)); expect(manifest.bytes).toBe(html.length);
  expect(html.length).toBeLessThan(8 * 1024 * 1024);
  for (const path of ["src/app/simulator/page.tsx", "src/app/anatomy/page.tsx", "src/components/YachtViewer3D.tsx", "src/components/AnatomyPosters.tsx", "src/features/race-scene/RaceScene.tsx", "src/features/simulator-v3/SimulatorV3Page.tsx"])
    expect(manifest.inputs).toContain(path);
  expect(html.toString()).toContain("connect-src data: blob:");
  expect(html.toString()).not.toMatch(/<script[^>]+src=|<link[^>]+href=["']https?:/);
  expect(html.toString()).toContain(`name="regatta-sailing-offline-version" content="${manifest.version}"`);
});

test("the anatomy model, every full poster, thumbnail, font and shared source are current", () => {
  const names = readdirSync(resolve(root, "public/anatomy/posters")).filter(name => name.endsWith(".jpg"));
  expect(names).toHaveLength(8);
  for (const name of names) expect(manifest.embeddedAssets.some((a: { path: string }) => a.path === `public/anatomy/posters/${name}`)).toBe(true);
  expect(manifest.embeddedAssets.some((a: { path: string }) => a.path.startsWith("public/fonts/"))).toBe(true);
  for (const file of [...manifest.sourceFiles, ...manifest.embeddedAssets]) {
    const bytes = read(file.path);
    expect(file.bytes).toBe(bytes.length); expect(file.sha256).toBe(sha(bytes));
  }
  expect(manifest.model.sha256).toBe(sha(read("public/models/regatta_sloop_sailing.glb")));
  const model = Buffer.from(html.toString().match(/data:model\/gltf-binary;base64,([A-Za-z0-9+/=]+)/)![1], "base64");
  expect(manifest.model.embeddedSha256).toBe(sha(model));
  const scene = JSON.parse(model.subarray(20, 20 + model.readUInt32LE(12)).toString());
  expect(scene.images.every((image: { uri: string }) => image.uri.startsWith("data:"))).toBe(true);
});
