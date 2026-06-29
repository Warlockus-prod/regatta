// ============================================================================
// build-gallery-year.mjs - turn a folder of raw photos into gallery assets.
//
// Drop full-res photos into:  public/gallery/regatta-<YEAR>/_incoming/
// Then run:                   node scripts/build-gallery-year.mjs --year 2026
//
// For each photo it:
//   - auto-orients (honors EXIF rotation),
//   - writes an optimized FULL image (<=1600px long edge, JPEG q80) to full/,
//   - writes a THUMB (<=600px long edge, JPEG q72) to thumb/,
//   - records real pixel size + aspect.
// Then it regenerates src/data/gallery-<YEAR>.generated.ts with one GalleryItem
// per photo (no per-photo captions - all share the album title; the year shows
// once as the section header). HEIC inputs are auto-converted via macOS `sips`.
//
// Re-run any time you add/remove photos in _incoming/ - it is idempotent and
// rewrites full/, thumb/ and the generated data from scratch.
// ============================================================================

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const YEAR = getArg('year', '2026');
const yy = YEAR.slice(-2);

// Album title shown in the lightbox / alt text (same for every photo of the
// year). Override per-language here if you want a different wording.
const TITLE = {
  ru: `Регата ${YEAR}`,
  en: `Regatta ${YEAR}`,
  pl: `Regata ${YEAR}`,
  es: `Regata ${YEAR}`,
  fr: `Regate ${YEAR}`,
  de: `Regatta ${YEAR}`,
  it: `Regata ${YEAR}`,
};

const ROOT = process.cwd();
const baseDir = join(ROOT, 'public', 'gallery', `regatta-${YEAR}`);
const inDir = join(baseDir, '_incoming');
const fullDir = join(baseDir, 'full');
const thumbDir = join(baseDir, 'thumb');
const outData = join(ROOT, 'src', 'data', `gallery-${YEAR}.generated.ts`);

const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);
const HEIC = new Set(['.heic', '.heif']);

function aspectOf(w, h) {
  const r = w / h;
  if (r > 1.2) return 'landscape';
  if (r < 0.83) return 'portrait';
  return 'square';
}

// ---- main -----------------------------------------------------------------
if (!existsSync(inDir)) {
  console.error(`No incoming folder: ${inDir}\nCreate it and drop photos there first.`);
  process.exit(1);
}

const files = readdirSync(inDir)
  .filter((f) => !f.startsWith('.'))
  .filter((f) => RASTER.has(extname(f).toLowerCase()) || HEIC.has(extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

if (files.length === 0) {
  console.warn(`No photos found in ${inDir}. Writing empty data file.`);
}

// fresh output dirs (so deleted-from-incoming photos drop out cleanly)
for (const d of [fullDir, thumbDir]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}

const pad = files.length > 99 ? 3 : 2;
const entries = [];

for (let i = 0; i < files.length; i++) {
  const srcFile = join(inDir, files[i]);
  const id = `r${yy}-${String(i + 1).padStart(pad, '0')}`;
  const outName = `${id}.jpg`;
  const ext = extname(files[i]).toLowerCase();

  // HEIC/HEIF: sharp often cannot decode it; convert to a temp JPEG via macOS sips first.
  let input = srcFile;
  let tmpFile = null;
  if (HEIC.has(ext)) {
    tmpFile = join(tmpdir(), `${id}-${Date.now()}.jpg`);
    execFileSync('sips', ['-s', 'format', 'jpeg', srcFile, '--out', tmpFile], { stdio: 'ignore' });
    input = tmpFile;
  }

  await sharp(input)
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(join(fullDir, outName));

  await sharp(input)
    .rotate()
    .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(join(thumbDir, outName));

  if (tmpFile) rmSync(tmpFile, { force: true });

  const meta = await sharp(join(fullDir, outName)).metadata();
  const w = meta.width ?? 1600;
  const h = meta.height ?? 1200;

  entries.push({ id, name: outName, w, h, aspect: aspectOf(w, h) });
  console.log(`  ${id}  <- ${files[i]}  (${w}x${h}, ${aspectOf(w, h)})`);
}

// ---- emit generated TS -----------------------------------------------------
const lit = (s) => JSON.stringify(s);
const body = entries
  .map((e) => `  {
    id: ${lit(e.id)},
    kind: 'image',
    src: ${lit(`/gallery/regatta-${YEAR}/full/${e.name}`)},
    thumb: ${lit(`/gallery/regatta-${YEAR}/thumb/${e.name}`)},
    width: ${e.w}, height: ${e.h},
    titleRu: ${lit(TITLE.ru)},
    titleEn: ${lit(TITLE.en)},
    titlePl: ${lit(TITLE.pl)},
    titleEs: ${lit(TITLE.es)},
    titleFr: ${lit(TITLE.fr)},
    titleDe: ${lit(TITLE.de)},
    titleIt: ${lit(TITLE.it)},
    badge: ${lit(YEAR)},
    aspect: ${lit(e.aspect)},
  },`)
  .join('\n');

const out = `// AUTO-GENERATED by scripts/build-gallery-year.mjs --year ${YEAR}
// Do not edit by hand. Drop photos in public/gallery/regatta-${YEAR}/_incoming/
// and re-run the script. ${entries.length} photo(s).
import type { GalleryItem } from './gallery';

export const items${YEAR}: GalleryItem[] = [
${body}
];
`;

writeFileSync(outData, out);
console.log(`\nWrote ${entries.length} entries -> ${outData}`);
console.log(`Optimized images -> ${fullDir} and ${thumbDir}`);
