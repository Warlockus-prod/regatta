import { build } from "esbuild";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const source = join(here, "offline-sailing");
const target = join(root, "mobile/assets/sailing-offline.html");
const manifestPath = join(root, "mobile/assets/sailing-offline.manifest.json");
const check = process.argv.includes("--check");
const digest = value => createHash("sha256").update(value).digest("hex");
const model = readFileSync(join(root, "public/models/regatta_sloop_sailing.glb"));
const gltf = JSON.parse(model.subarray(20, 20 + model.readUInt32LE(12)).toString().trim());
if ([...(gltf.buffers ?? []), ...(gltf.images ?? [])].some(item => item.uri && !item.uri.startsWith("data:"))) {
  throw new Error("Offline yacht must not reference external buffers or images");
}
if ((gltf.extensionsRequired ?? []).some(name => /draco|basisu|meshopt/i.test(name))) {
  throw new Error("Add a bundled decoder before shipping a compressed offline yacht");
}

// GLTFLoader normally makes blob URLs for bufferView images. WebKit can fail
// those image loads in offline mode, despite the bytes already being local.
// Keep the same PNG bytes but reference them directly with a data URI.
const jsonEnd = 20 + model.readUInt32LE(12);
if (model.readUInt32LE(jsonEnd + 4) !== 0x004e4942) throw new Error("Expected a binary GLB chunk");
const binary = model.subarray(jsonEnd + 8, jsonEnd + 8 + model.readUInt32LE(jsonEnd));
for (const image of gltf.images ?? []) {
  if (image.bufferView === undefined) continue;
  const view = gltf.bufferViews[image.bufferView];
  const start = view?.byteOffset ?? 0;
  if (!view || view.buffer !== 0 || !image.mimeType || start + view.byteLength > binary.length) throw new Error("Invalid embedded image");
  image.uri = `data:${image.mimeType};base64,${binary.subarray(start, start + view.byteLength).toString("base64")}`;
  delete image.bufferView;
}
const jsonText = Buffer.from(JSON.stringify(gltf));
const jsonChunk = Buffer.alloc(Math.ceil(jsonText.length / 4) * 4, 0x20);
jsonText.copy(jsonChunk);
const header = Buffer.from(model.subarray(0, 20));
header.writeUInt32LE(20 + jsonChunk.length + 8 + binary.length, 8);
header.writeUInt32LE(jsonChunk.length, 12);
const runtimeModel = Buffer.concat([header, jsonChunk, model.subarray(jsonEnd, jsonEnd + 8), binary]);

const result = await build({
  absWorkingDir: root,
  entryPoints: [join(source, "entry.tsx")],
  bundle: true, write: false, minify: true, outfile: "sailing.js",
  format: "iife", platform: "browser", target: ["ios15", "safari15", "chrome100"],
  jsx: "automatic", legalComments: "none", metafile: true,
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{
    name: "sailing-offline",
    setup(api) {
      api.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, args => ({ path: import.meta.resolve(args.path).replace("file://", "") }));
      api.onResolve({ filter: /^next\// }, args => {
        if (!["next/link", "next/dynamic", "next/navigation"].includes(args.path)) throw new Error(`Unsupported dependency ${args.path}`);
        return { path: args.path, namespace: "sailing-next" };
      });
      api.onLoad({ filter: /.*/, namespace: "sailing-next" }, args => ({
        contents: args.path === "next/navigation" ? `export { usePathname, useSearchParams } from ${JSON.stringify(join(source, "next.tsx"))};`
          : `export { ${args.path === "next/link" ? "Link" : "dynamic"} as default } from ${JSON.stringify(join(source, "next.tsx"))};`,
        loader: "ts", resolveDir: root,
      }));
      api.onResolve({ filter: /^@\/lib\/i18n$/ }, () => ({ path: join(source, "i18n.tsx") }));
      api.onLoad({ filter: /simulator-3d\/config\.ts$/ }, () => ({
        contents: `export const YACHT_MODEL_URL = ${JSON.stringify(`data:model/gltf-binary;base64,${runtimeModel.toString("base64")}`)};`, loader: "ts",
      }));
    },
  }],
});
const js = result.outputFiles.find(file => file.path.endsWith(".js"))?.text;
const modulesCss = result.outputFiles.find(file => file.path.endsWith(".css"))?.text ?? "";
if (!js) throw new Error("No sailing JavaScript generated");
const cssPath = join(root, "src/app/globals.css");
const cssInput = readFileSync(cssPath, "utf8").replace('@import "tailwindcss";', '@import "tailwindcss" source(none);\n@source "../features/simulator-3d";\n@source "../features/simulator-v3";');
const css = (await postcss([tailwindcss()]).process(cssInput, { from: cssPath })).css + modulesCss;
const html = [
  "<!doctype html>", '<html lang="en" data-theme="dark"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' \'wasm-unsafe-eval\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src data: blob:; worker-src blob:; media-src data: blob:; font-src data:; base-uri \'none\'; form-action \'none\'">',
  `<style>${css.replaceAll("</style", "<\\/style")}html,body,#root{height:100%;margin:0;overflow:hidden}body{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif}</style>`,
  '</head><body><div id="root"></div>',
  `<script>${js.replaceAll("</script", "<\\/script")}</script></body></html>`,
].join("\n");
const manifest = JSON.stringify({
  schema: 1, entry: "sailing-offline.html", sha256: digest(html), bytes: Buffer.byteLength(html),
  model: { sha256: digest(model), bytes: model.length, embeddedSha256: digest(runtimeModel), embeddedBytes: runtimeModel.length },
  inputs: Object.keys(result.metafile.inputs).sort(),
}, null, 2) + "\n";
if (Buffer.byteLength(html) > 8 * 1024 * 1024) throw new Error("Offline sailing exceeds the initial 8 MiB package budget");
for (const [file, content] of [[target, html], [manifestPath, manifest]]) {
  if (check) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== content) throw new Error(`Stale offline sailing artifact: ${file}`);
  } else {
    writeFileSync(file, content);
  }
}
console.log(`${check ? "Verified" : "Built"} offline sailing: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB, ${digest(html).slice(0, 12)}`);
