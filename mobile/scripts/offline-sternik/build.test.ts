import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STERNIK_BANK } from "../../../src/data/sternik";
const root = resolve(__dirname, "../../..");
const read = (path: string) => readFileSync(resolve(root, path));
const sha = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(read("mobile/assets/sternik-offline.manifest.json").toString());
const html = read("mobile/assets/sternik-offline.html");

test("the packaged Polish course is fresh, within budget and has no online-only runtime dependency", () => {
  expect(manifest.lang).toBe("pl"); expect(manifest.schema).toBe(1);
  expect(manifest.sha256).toBe(sha(html));
  expect(manifest.bytes).toBe(html.length);
  expect(html.length).toBeLessThan(6 * 1024 * 1024);
  expect(manifest.routes).toEqual(["/sternik", "/sternik/teoria", "/sternik/test", "/sternik/egzamin", "/sternik/ustny"]);
  for (const path of ["src/data/sternik.ts", "src/app/sternik/teoria/page.tsx", "src/app/sternik/test/page.tsx", "src/app/sternik/egzamin/page.tsx", "mobile/scripts/offline-sternik/OfflineOralTrainer.tsx"]) expect(manifest.inputs).toContain(path);
  expect(manifest.inputs.some((p: string) => /SternikChat|usePushToTalk|lib\/db|better-sqlite/.test(p))).toBe(false);
  expect(html.toString()).toContain("connect-src 'none'");
  expect(html.toString()).not.toMatch(/<script[^>]+src=|<link[^>]+href=["']https?:/);
});

test("every shared source, photograph and font is represented by its actual content hash", () => {
  expect(manifest.embeddedAssets.filter((a: { path: string }) => a.path.startsWith("public/sternik/clouds/"))).toHaveLength(8);
  for (const question of STERNIK_BANK) if (question.photo) expect(manifest.embeddedAssets.some((a: { path: string }) => a.path === `public/sternik/clouds/${question.photo}.jpg`)).toBe(true);
  expect(manifest.embeddedAssets.some((a: { path: string }) => a.path.startsWith("public/fonts/"))).toBe(true);
  for (const file of [...manifest.sourceFiles, ...manifest.embeddedAssets]) {
    const bytes = read(file.path);
    expect(file.bytes).toBe(bytes.length); expect(file.sha256).toBe(sha(bytes));
  }
});
