// Compile source aliases before executing the content bridge in Node.
import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const source = new URL("./sync-content.ts", import.meta.url);
const directory = await mkdtemp(join(tmpdir(), "regatta-content-"));
try {
  const result = await build({ entryPoints: [fileURLToPath(source)], bundle: true, write: false,
    platform: "node", format: "esm", tsconfig: fileURLToPath(new URL("../../tsconfig.json", import.meta.url)),
    define: { "import.meta.url": JSON.stringify(source.href) } });
  const output = join(directory, "sync.mjs");
  await writeFile(output, result.outputFiles[0].text);
  await import(pathToFileURL(output).href);
} finally { await rm(directory, { recursive: true, force: true }); }
