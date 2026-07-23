import { build } from "esbuild";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, "..");
const repoRoot = resolve(mobileRoot, "..");
const sourceRoot = join(here, "offline-radio");
const outputFile = join(mobileRoot, "assets", "radio-offline.html");
const checkMode = process.argv.includes("--check");

function resolveTypeScriptPath(path) {
  for (const candidate of [
    path,
    `${path}.ts`,
    `${path}.tsx`,
    `${path}.js`,
    `${path}.jsx`,
    join(path, "index.ts"),
    join(path, "index.tsx"),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return path;
}

function escapeInlineScript(value) {
  return value.replaceAll("</script", "<\\/script");
}

function escapeInlineStyle(value) {
  return value.replaceAll("</style", "<\\/style");
}

const aliasPlugin = {
  name: "radio-offline-aliases",
  setup(buildApi) {
    const exact = new Map([
      ["react", join(repoRoot, "node_modules", "react", "index.js")],
      ["react/jsx-runtime", join(repoRoot, "node_modules", "react", "jsx-runtime.js")],
      ["react/jsx-dev-runtime", join(repoRoot, "node_modules", "react", "jsx-dev-runtime.js")],
      ["react-dom", join(repoRoot, "node_modules", "react-dom", "index.js")],
      ["react-dom/client", join(repoRoot, "node_modules", "react-dom", "client.js")],
      ["next/link", join(sourceRoot, "next-link.tsx")],
      ["next/navigation", join(sourceRoot, "next-navigation.ts")],
      ["next/dynamic", join(sourceRoot, "next-dynamic.tsx")],
      ["next/font/google", join(sourceRoot, "next-font.ts")],
      ["@/lib/i18n", join(sourceRoot, "i18n.tsx")],
    ]);

    buildApi.onResolve({ filter: /.*/ }, (args) => {
      const aliased = exact.get(args.path);
      if (aliased) return { path: aliased };

      if (args.path.startsWith("@/")) {
        return {
          path: resolveTypeScriptPath(join(repoRoot, "src", args.path.slice(2))),
        };
      }

      if (/\/?VoicePtt$/.test(args.path)) {
        return { path: join(sourceRoot, "OfflineVoicePtt.tsx") };
      }

      if (/\/?MicCheck$/.test(args.path)) {
        return { path: join(sourceRoot, "OfflineMicCheck.tsx") };
      }

      return null;
    });
  },
};

const jsResult = await build({
  absWorkingDir: repoRoot,
  entryPoints: [join(sourceRoot, "entry.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["ios15", "safari15", "chrome100"],
  jsx: "automatic",
  sourcemap: false,
  legalComments: "none",
  plugins: [aliasPlugin],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

const js = jsResult.outputFiles[0]?.text;
if (!js) throw new Error("Offline radio JavaScript was not generated");

const globalsPath = join(repoRoot, "src", "app", "globals.css");
const globals = readFileSync(globalsPath, "utf8");
const offlineCss = readFileSync(join(sourceRoot, "offline.css"), "utf8");
const cssInput = [
  globals.replace(
    '@import "tailwindcss";',
    [
      '@import "tailwindcss" source(none);',
      '@source "./radio";',
      '@source "./sternik";',
      '@source "../../../mobile/scripts/offline-radio";',
    ].join("\n"),
  ),
  offlineCss,
].join("\n");
const cssResult = await postcss([tailwindcss()]).process(cssInput, {
  from: globalsPath,
});

const version = createHash("sha256")
  .update(js)
  .update(cssResult.css)
  .digest("hex")
  .slice(0, 12);

const html = [
  "<!doctype html>",
  '<html lang="pl" data-theme="dark">',
  "<head>",
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<meta name="color-scheme" content="dark">',
  `<meta name="regatta-offline-version" content="${version}">`,
  "<title>SRC Radio Offline</title>",
  `<style>${escapeInlineStyle(cssResult.css)}</style>`,
  "</head>",
  '<body class="ocean-bg">',
  '<div id="root"></div>',
  `<script>${escapeInlineScript(js)}</script>`,
  "</body>",
  "</html>",
  "",
].join("\n");

if (checkMode) {
  if (!existsSync(outputFile) || readFileSync(outputFile, "utf8") !== html) {
    console.error("[radio-offline] generated asset is stale");
    console.error("[radio-offline] run: npm run build:radio-offline");
    process.exit(1);
  }
  console.log(`[radio-offline] asset is current (${version}, ${Math.round(html.length / 1024)} KiB)`);
} else {
  writeFileSync(outputFile, html);
  console.log(`[radio-offline] wrote ${outputFile} (${version}, ${Math.round(html.length / 1024)} KiB)`);
}
