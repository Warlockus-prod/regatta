import { build } from "esbuild";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, "../..");
const source = join(here, "offline-sternik");
const target = join(root, "mobile/assets/sternik-offline.html"), manifestPath = join(root, "mobile/assets/sternik-offline.manifest.json");
const check = process.argv.includes("--check"), validate = process.argv.includes("--validate");
const digest = value => createHash("sha256").update(value).digest("hex");
const fileSource = path => [path, `${path}.ts`, `${path}.tsx`, `${path}.js`, join(path, "index.ts"), join(path, "index.tsx")].find(existsSync) ?? path;
const embeddedAssets = [];
const cloudPhotos = Object.fromEntries(readdirSync(join(root, "public/sternik/clouds")).filter(name => name.endsWith(".jpg")).sort().map(name => {
  const path = `public/sternik/clouds/${name}`, bytes = readFileSync(join(root, path));
  embeddedAssets.push({ path, bytes: bytes.length, sha256: digest(bytes) });
  return [name.slice(0, -4), `data:image/jpeg;base64,${bytes.toString("base64")}`];
}));
// The website fetches the question bank at run time; this package has no
// network, so it bundles the SAME generated JSON file and preloads it. The
// TS source (src/data/sternik.ts) must not be bundled as well: one copy only.
const bankModule = readFileSync(join(root, "src/data/sternik-bank-file.generated.ts"), "utf8");
const bankUrl = /url: '(\/sternik-bank\/bank\.[0-9a-f]{12}\.json)'/.exec(bankModule)?.[1];
if (!bankUrl) throw new Error("No sternik bank url in src/data/sternik-bank-file.generated.ts");
const bankJson = join(root, "public", bankUrl);
if (!existsSync(bankJson)) throw new Error(`Missing ${bankUrl}: run node scripts/build-sternik-bank.mjs`);
const bankFileImport = `import file from ${JSON.stringify(bankJson)};`;
const exactAliases = new Map([
  ["@/lib/i18n", join(source, "i18n.tsx")], ["@/lib/funnel", join(source, "funnel.ts")],
  ["next/dynamic", join(here, "offline-radio/next-dynamic.tsx")],
]);
const result = await build({
  absWorkingDir: root, entryPoints: [join(source, "entry.tsx")], bundle: true, write: false, minify: true,
  outfile: "sternik.js", format: "iife", platform: "browser", target: ["ios15", "safari15", "chrome100"], jsx: "automatic",
  metafile: true, legalComments: "none", define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "sternik-offline", setup(api) {
    api.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, args => ({ path: fileURLToPath(import.meta.resolve(args.path)) }));
    api.onResolve({ filter: /.*/ }, args => {
      const alias = exactAliases.get(args.path);
      if (alias) return { path: alias };
      if (args.path === "next/navigation" || args.path === "next/link") return { path: args.path, namespace: "sternik-next" };
      if (args.path.startsWith("next/")) throw new Error(`Unsupported Sternik dependency: ${args.path}`);
      if (/\/?OralTrainer$/.test(args.path)) return { path: join(source, "OfflineOralTrainer.tsx") };
      if (args.path.endsWith("radio/symulator/trainerText")) return { path: "polish-trainer-i18n", namespace: "sternik-next" };
      if (args.path === "offline-sternik-clouds") return { path: args.path, namespace: "sternik-clouds" };
      // src/app/sternik/bank.ts reads the bank through ./bank-source; the hub
      // page (a server component on the website) reads @/data/sternik.
      if (/\/bank-source$/.test(args.path) && args.importer.endsWith(join("src/app/sternik/bank.ts"))) return { path: "bank-source", namespace: "sternik-bank" };
      if (args.path === "@/data/sternik") return { path: "sternik-data", namespace: "sternik-bank" };
      if (args.path.startsWith("@/")) return { path: fileSource(join(root, "src", args.path.slice(2))) };
      return null;
    });
    api.onLoad({ filter: /.*/, namespace: "sternik-next" }, args => ({ contents: args.path === "next/navigation"
      ? `export {usePathname,useSearchParams} from ${JSON.stringify(join(source, "router.tsx"))};`
      : args.path === "next/link" ? `export {OfflineLink as default} from ${JSON.stringify(join(source, "router.tsx"))};`
      : `export {useI18n as useTrainerI18n} from ${JSON.stringify(join(source, "i18n.tsx"))};`, loader: "tsx", resolveDir: root }));
    api.onLoad({ filter: /.*/, namespace: "sternik-bank" }, args => ({ contents: args.path === "bank-source"
      ? `${bankFileImport}export const PRELOADED_STERNIK_BANK_FILE=file;export function readSternikBankFile(){return Promise.resolve(file);}`
      : `${bankFileImport}export * from ${JSON.stringify(join(root, "src/data/sternik-core.ts"))};export const STERNIK_BANK=file.questions;`,
      loader: "js", resolveDir: root }));
    api.onLoad({ filter: /.*/, namespace: "sternik-clouds" }, () => ({ contents: `const photos=${JSON.stringify(cloudPhotos)};export const offlineCloudPhoto=name=>photos[name]??"";`, loader: "js" }));
    // Same shared components; only root-relative asset URLs change in this file-origin build.
    api.onLoad({ filter: /sternik\/(QuestionFigure|teoria\/SignsWeather)\.tsx$/ }, args => {
      const contents = readFileSync(args.path, "utf8");
      const expression = args.path.endsWith("QuestionFigure.tsx") ? "photo" : "c.file";
      const before = '`/sternik/clouds/${' + expression + '}.jpg`';
      if (!contents.includes(before)) throw new Error(`Sternik photo resolver needs updating: ${args.path}`);
      return { contents: `import {offlineCloudPhoto as __offlineCloudPhoto} from "offline-sternik-clouds";\n${contents.replaceAll(before, `__offlineCloudPhoto(${expression})`)}`, loader: "tsx", resolveDir: dirname(args.path) };
    });
  } }],
});
const js = result.outputFiles.find(file => file.path.endsWith(".js"))?.text;
if (!js) throw new Error("No Sternik JavaScript generated");
if (Object.keys(result.metafile.inputs).some(name => /(?:lib\/db|better-sqlite|SternikChat|\/usePushToTalk)/.test(name))) throw new Error("Offline Sternik pulled a server or online-only module");
if (Object.keys(result.metafile.inputs).some(name => name === "src/data/sternik.ts")) throw new Error("Offline Sternik bundled the TS bank next to the JSON bank");
if (!Object.keys(result.metafile.inputs).includes(relative(root, bankJson))) throw new Error("Offline Sternik did not bundle the generated bank JSON");
const globalsPath = join(root, "src/app/globals.css");
const globals = readFileSync(globalsPath, "utf8").replace('@import "tailwindcss";', '@import "tailwindcss" source(none);\n@source "./sternik";\n@source "../../../mobile/scripts/offline-sternik";');
const cssResult = await postcss([tailwindcss()]).process(globals + "\n" + readFileSync(join(source, "offline.css"), "utf8"), { from: globalsPath });
const css = cssResult.css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (match, _quote, url) => {
  if (/^(data:|blob:|#)/.test(url)) return match;
  if (!url.startsWith("/") || url.startsWith("//") || url.includes("..")) throw new Error(`Unsupported Sternik CSS asset: ${url}`);
  const path = `public${url}`, bytes = readFileSync(join(root, path));
  const type = url.endsWith(".woff2") ? "font/woff2" : url.endsWith(".woff") ? "font/woff" : url.endsWith(".ttf") ? "font/ttf" : null;
  if (!type) throw new Error(`Unsupported Sternik asset type: ${url}`);
  embeddedAssets.push({ path, sha256: digest(bytes), bytes: bytes.length });
  return `url("data:${type};base64,${bytes.toString("base64")}")`;
});
const version = digest(js + css).slice(0, 12);
const html = ["<!doctype html>", '<html lang="pl" data-theme="light"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; connect-src \'none\'; media-src \'none\'; worker-src \'none\'; base-uri \'none\'; form-action \'none\'">',
  `<meta name="regatta-sternik-offline-version" content="${version}"><title>Sternik motorowodny offline</title>`,
  `<style>${css.replaceAll("</style", "<\\/style")}</style></head><body><div id="root"></div>`,
  `<script>${js.replaceAll("</script", "<\\/script")}</script></body></html>`, ""].join("\n");
const inputs = Object.keys(result.metafile.inputs).sort();
const sourcePaths = [...new Set([...inputs.filter(path => !path.includes(":") && !path.startsWith("node_modules/")), relative(root, globalsPath), relative(root, fileURLToPath(import.meta.url)), relative(root, join(source, "offline.css"))])].sort();
const sourceFiles = sourcePaths.map(path => { const bytes = readFileSync(join(root, path)); return { path, bytes: bytes.length, sha256: digest(bytes) }; });
const manifest = JSON.stringify({ schema: 1, entry: "sternik-offline.html", version, lang: "pl", sha256: digest(html), bytes: Buffer.byteLength(html),
  routes: ["/sternik", "/sternik/teoria", "/sternik/test", "/sternik/egzamin", "/sternik/ustny"],
  inputs, sourceFiles, embeddedAssets }, null, 2) + "\n";
if (Buffer.byteLength(html) > 6 * 1024 * 1024) throw new Error("Offline Sternik exceeds its 6 MiB budget");
for (const [path, contents] of [[target, html], [manifestPath, manifest]]) {
  if (validate) continue;
  if (check) { if (!existsSync(path) || readFileSync(path, "utf8") !== contents) throw new Error(`Stale offline Sternik artifact: ${path}`); }
  else writeFileSync(path, contents);
}
console.log(`${validate ? "Validated without writing" : check ? "Verified" : "Built"} offline Sternik: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB, ${version}, ${sourceFiles.length} source files`);
