/**
 * Renders the app icon and the launch-screen mark from inline SVG to PNG.
 *
 * Logo "A. Sail" (owner's choice 2026-11-24): a white mainsail and a light
 * blue jib with a clear gap between them over two wake lines, on the app's
 * action blue fading into ink. No hull and no fine detail, so the mark stays
 * readable at home-screen size. The earlier clip-art boat (bowl hull with a
 * cyan outline, wave dashes) is in git history.
 *
 * App Store icons must be fully opaque (no alpha) and square - we flatten and
 * removeAlpha so Apple does not reject the large marketing icon.
 *
 * The splash is NOT the icon: a square opaque icon centred on the launch
 * screen showed as a dark square with paper-coloured bars above and below.
 * splash-icon.png is the mark alone, transparent, drawn in the app's ink and
 * action blue, on app.json `splash.backgroundColor` = SPLASH_BACKGROUND, the
 * paper of the first screen (app-surface.test.tsx keeps those equal), so the
 * launch screen is one full-screen colour that hands over without a flash.
 *
 * Source of truth for the shapes; mobile/assets/brand/icon.svg mirrors the
 * icon for design tools. sharp lives in the regatta web project, not in
 * mobile, so we resolve it from there via createRequire.
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

export const SPLASH_BACKGROUND = '#f7f5f0';
const INK = '#123247';
const ACTION_BLUE = '#006ea6';

// Shapes shared by the icon and the splash, on a 1024 canvas.
const MAIN = 'M 500 170 L 500 700 L 800 700 C 760 520 650 330 500 170 Z';
const JIB = 'M 470 250 L 470 700 L 250 700 C 300 540 380 380 470 250 Z';
const WAKE_1 = 'M 150 790 C 330 740 690 740 874 790';
const WAKE_2 = 'M 260 862 C 400 830 620 830 764 862';

export const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#0b7fb8"/>
      <stop offset="1" stop-color="${INK}"/>
    </linearGradient>
    <linearGradient id="main" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dbe9f1"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <path d="${MAIN}" fill="url(#main)"/>
  <path d="${JIB}" fill="#8fd3f2"/>
  <path d="${WAKE_1}" stroke="#ffffff" stroke-width="34" stroke-linecap="round" fill="none"/>
  <path d="${WAKE_2}" stroke="#8fd3f2" stroke-width="22" stroke-linecap="round" fill="none" opacity="0.8"/>
</svg>`;

// Launch-screen mark: the same shapes in ink and action blue so they read on
// paper; transparent, with room around them so the splash `contain` sizing
// keeps the mark about half the screen width.
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="-250 -150 1524 1324">
  <path d="${MAIN}" fill="${INK}"/>
  <path d="${JIB}" fill="${ACTION_BLUE}"/>
  <path d="${WAKE_1}" stroke="${INK}" stroke-width="34" stroke-linecap="round" fill="none"/>
  <path d="${WAKE_2}" stroke="${ACTION_BLUE}" stroke-width="22" stroke-linecap="round" fill="none"/>
</svg>`;

async function main() {
  for (const name of ['icon.png', 'adaptive-icon.png']) {
    const out = join(ASSETS, name);
    await sharp(Buffer.from(iconSvg), { density: 384 })
      .resize(1024, 1024)
      .flatten({ background: INK })
      .removeAlpha()
      .png()
      .toFile(out);
    const meta = await sharp(out).metadata();
    console.log(`wrote ${name}: ${meta.width}x${meta.height} channels=${meta.channels} hasAlpha=${meta.hasAlpha}`);
  }
  const splashOut = join(ASSETS, 'splash-icon.png');
  await sharp(Buffer.from(splashSvg), { density: 384 }).resize(1024, 1024).png().toFile(splashOut);
  const meta = await sharp(splashOut).metadata();
  console.log(`wrote splash-icon.png: ${meta.width}x${meta.height} hasAlpha=${meta.hasAlpha}, background ${SPLASH_BACKGROUND}`);
  console.log('done');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
