// ============================================================================
// build-gallery-strip.mjs - optimize a folder of photos into a web strip.
//
//   node scripts/build-gallery-strip.mjs --in <srcDir> --out <outDir> \
//        [--prefix strip] [--height 700]
//
// Resizes each image to <=height px (keeps aspect, auto-orients), writes
// <prefix>-NN.jpg (JPEG q80) sorted by filename. Used for the homepage photo
// strip (public/gallery/regatta-2026/strip). HEIC inputs convert via `sips`.
// ============================================================================

import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

const args = process.argv.slice(2);
const getArg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const IN = getArg('in', '');
const OUT = getArg('out', '');
const PREFIX = getArg('prefix', 'strip');
const HEIGHT = parseInt(getArg('height', '700'), 10);

if (!IN || !OUT) {
  console.error('Usage: --in <srcDir> --out <outDir> [--prefix strip] [--height 700]');
  process.exit(1);
}
if (!existsSync(IN)) {
  console.error(`No input dir: ${IN}`);
  process.exit(1);
}

const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);
const HEIC = new Set(['.heic', '.heif']);

const files = readdirSync(IN)
  .filter((f) => !f.startsWith('.'))
  .filter((f) => RASTER.has(extname(f).toLowerCase()) || HEIC.has(extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const pad = files.length > 99 ? 3 : 2;
for (let i = 0; i < files.length; i++) {
  const ext = extname(files[i]).toLowerCase();
  let input = join(IN, files[i]);
  let tmp = null;
  if (HEIC.has(ext)) {
    tmp = join(tmpdir(), `${PREFIX}-${i}-${files.length}.jpg`);
    execFileSync('sips', ['-s', 'format', 'jpeg', input, '--out', tmp], { stdio: 'ignore' });
    input = tmp;
  }
  const name = `${PREFIX}-${String(i + 1).padStart(pad, '0')}.jpg`;
  await sharp(input)
    .rotate()
    .resize({ height: HEIGHT, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(join(OUT, name));
  if (tmp) rmSync(tmp, { force: true });
  console.log(`  ${name}  <- ${files[i]}`);
}
console.log(`\nWrote ${files.length} strip image(s) -> ${OUT}`);
