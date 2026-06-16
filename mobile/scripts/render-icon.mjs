/**
 * Renders the app icon from an inline SVG to PNG at 1024x1024.
 *
 * Why: the v1.0 icon had the boat at ~40% of the frame with thin outlines and
 * scattered tiny wind dashes that vanish at home-screen size. This redraws the
 * same brand (sailboat on dark ocean, cyan accent) bolder: boat ~55% of the
 * frame, thicker strokes, three bold waves instead of dash noise.
 *
 * App Store icons must be fully opaque (no alpha) and square - we flatten and
 * removeAlpha so Apple does not reject the large marketing icon.
 *
 * sharp lives in the regatta web project, not in mobile, so we resolve it from
 * there via createRequire.
 *
 * Run:  node scripts/render-icon.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire('/Users/Andrey/App/all/regatta/');
const sharp = require('sharp');

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, '..', 'assets');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b1d33"/>
      <stop offset="0.5" stop-color="#0a1a2e"/>
      <stop offset="1" stop-color="#081523"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.43" r="0.52">
      <stop offset="0" stop-color="#26d4f2" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#26d4f2" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d2746"/>
      <stop offset="1" stop-color="#0a1b2f"/>
    </linearGradient>
    <linearGradient id="main" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#d3e6f6"/>
    </linearGradient>
    <linearGradient id="jib" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3bdef7"/>
      <stop offset="1" stop-color="#0cb2d9"/>
    </linearGradient>
    <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#10243a"/>
      <stop offset="1" stop-color="#0a1626"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>

  <!-- water -->
  <path d="M0,704 Q512,668 1024,704 L1024,1024 L0,1024 Z" fill="url(#water)"/>
  <!-- bold soft waves (not tiny dashes) -->
  <g fill="none" stroke="#2bd6f2" stroke-linecap="round">
    <path d="M150,818 Q262,796 374,818" stroke-width="8" opacity="0.30"/>
    <path d="M648,802 Q760,780 872,802" stroke-width="8" opacity="0.24"/>
    <path d="M426,872 Q540,850 654,872" stroke-width="7" opacity="0.18"/>
  </g>

  <!-- boat -->
  <g stroke-linejoin="round" stroke-linecap="round">
    <line x1="512" y1="170" x2="512" y2="642" stroke="#eaf3fc" stroke-width="8"/>
    <path d="M512,184 L512,640 L756,640 Q706,408 512,184 Z" fill="url(#main)"/>
    <path d="M500,312 Q414,486 304,640 L500,640 Z" fill="url(#jib)"/>
    <path d="M276,644 L752,644 C735,718 664,756 514,756 C364,756 293,718 276,644 Z"
          fill="url(#hull)" stroke="#23d3ef" stroke-width="10"/>
    <path d="M318,656 L716,656" stroke="#1a3a55" stroke-width="6" opacity="0.6"/>
  </g>
</svg>`;

async function main() {
  const buf = Buffer.from(svg);
  const targets = ['icon.png', 'adaptive-icon.png', 'splash-icon.png'];
  for (const name of targets) {
    const out = join(ASSETS, name);
    await sharp(buf, { density: 384 })
      .resize(1024, 1024)
      .flatten({ background: '#081523' })
      .removeAlpha()
      .png()
      .toFile(out);
    const meta = await sharp(out).metadata();
    console.log(`wrote ${name}: ${meta.width}x${meta.height} channels=${meta.channels} hasAlpha=${meta.hasAlpha}`);
  }
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
