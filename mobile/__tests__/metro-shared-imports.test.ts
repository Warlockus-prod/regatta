import fs from "node:fs";
import path from "node:path";

// Metro resolves code outside mobile/ only from its watchFolders. jest and
// tsc resolve any relative path, so an app import of a web-only folder (for
// example src/app) passed every check and only broke the release bundle of
// TestFlight 73. Every import that leaves mobile/ must land in a watched folder.
const MOBILE = path.resolve(__dirname, "..");
// Read from the config text: requiring it pulls expo/metro-config into jest.
const metroConfig = fs.readFileSync(path.join(MOBILE, "metro.config.js"), "utf8");
const physicsDir = metroConfig.match(/PHYSICS_DIR = path\.resolve\(__dirname, '([^']+)'\)/)![1];
const watchFolders = [
  path.dirname(path.resolve(MOBILE, physicsDir)),
  ...[...metroConfig.matchAll(/^\s*path\.resolve\(__dirname, '([^']+)'\),/gm)].map(match => path.resolve(MOBILE, match[1])),
];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("app imports outside mobile/ (Metro watchFolders)", () => {
  it("reads the watched folders from metro.config.js", () => {
    expect(watchFolders.map(folder => path.relative(MOBILE, folder))).toEqual(expect.arrayContaining(["../src/lib", "../src/data"]));
  });

  it("lands every import that leaves mobile/ in a folder Metro watches", () => {
    const outside: string[] = [];
    for (const file of [...sourceFiles(path.join(MOBILE, "src")), ...sourceFiles(path.join(MOBILE, "app"))]) {
      const text = fs.readFileSync(file, "utf8");
      for (const match of text.matchAll(/(?:from|import\()\s*["'](\.{1,2}\/[^"']+)["']/g)) {
        const target = path.resolve(path.dirname(file), match[1]);
        if (target.startsWith(MOBILE + path.sep)) continue;
        if (!watchFolders.some(folder => target === folder || target.startsWith(folder + path.sep))) {
          outside.push(`${path.relative(MOBILE, file)} -> ${match[1]}`);
        }
      }
    }
    expect(outside).toEqual([]);
  });
});
