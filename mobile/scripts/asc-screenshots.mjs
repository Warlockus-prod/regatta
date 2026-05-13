/**
 * App Store Connect screenshot capture pipeline.
 *
 * For each device family x locale combination, boot the iOS Simulator,
 * cycle through the 5 routes documented in
 * `mobile/asc-metadata/SCREENSHOTS.md`, and capture each frame with
 * `xcrun simctl io <udid> screenshot`. Output goes to
 * `mobile/asc-metadata/screenshots/<device>/<lang>/<NN>-<screen>.png`.
 *
 * Usage:
 *   node scripts/asc-screenshots.mjs                # full sweep, 7 langs x 2 devices
 *   node scripts/asc-screenshots.mjs --lang en      # single locale
 *   node scripts/asc-screenshots.mjs --device 6.7   # single device family
 *   node scripts/asc-screenshots.mjs --dry-run      # print plan, no captures
 *   node scripts/asc-screenshots.mjs --no-build     # skip the install step
 *
 * Pre-requisites:
 *   - Xcode + iOS Simulator installed (xcrun simctl on PATH).
 *   - The dev build has been installed on the simulator at least once,
 *     OR `--no-build` is passed and you have the app open already.
 *   - The `regatta://` scheme is registered in app.json (it is - see
 *     "scheme": "regatta").
 *
 * Locale switching:
 *   The app reads its locale from AsyncStorage (`regatta_lang`). There
 *   is no public deep link that flips the locale on Sprint 8 build 9,
 *   so the script logs a manual prompt per locale: open Settings,
 *   tap the target language card, wait for the app to re-render. The
 *   user confirms with a key-press; the script then captures the 5
 *   frames and moves on to the next locale.
 *
 *   This is documented as a follow-up in the status note - a future
 *   build should accept `regatta://settings?lang=es` to remove the
 *   manual step.
 */

import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// ---------- CLI ----------

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => {
  const i = args.indexOf(n);
  return i === -1 ? null : args[i + 1] ?? null;
};

const DRY_RUN = flag('--dry-run');
const NO_BUILD = flag('--no-build');
const NO_PROMPT = flag('--no-prompt');
const ONLY_LANG = (value('--lang') || '').split(',').map((s) => s.trim()).filter(Boolean);
const ONLY_DEVICE = value('--device'); // "6.7" or "6.5"

// ---------- Constants ----------

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = join(HERE, '..', 'asc-metadata', 'screenshots');
const BUNDLE_ID = 'com.icoffio.regatta';

const DEVICES = [
  // Match Apple's required App Store classes. Names are matched by
  // `xcrun simctl list devices available` substring so they degrade
  // gracefully if the team upgrades Xcode.
  {
    family: 'iphone-6.7',
    label: '6.7',
    nameMatch: 'iPhone 16 Pro Max',
    fallback: 'iPhone 15 Pro Max',
  },
  {
    family: 'iphone-6.5',
    label: '6.5',
    nameMatch: 'iPhone 16 Plus',
    fallback: 'iPhone 14 Plus',
  },
];

const LOCALES = ['ru', 'en', 'pl', 'es', 'fr', 'de', 'it'];

const FRAMES = [
  { n: '01', name: 'home', deepLink: 'regatta://' },
  { n: '02', name: 'bootcamp', deepLink: 'regatta://bootcamp' },
  { n: '03', name: 'simulator', deepLink: 'regatta://simulator' },
  { n: '04', name: 'anatomy', deepLink: 'regatta://anatomy' },
  { n: '05', name: 'checklist', deepLink: 'regatta://checklist' },
];

// ---------- Helpers ----------

function exec(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

function tryExec(cmd) {
  const r = spawnSync(cmd, { shell: true });
  return {
    code: r.status,
    out: (r.stdout || '').toString(),
    err: (r.stderr || '').toString(),
  };
}

function log(msg) {
  console.log(msg);
}

function logHeader(text) {
  console.log(`\n=== ${text} ===`);
}

function devicesToProcess() {
  if (!ONLY_DEVICE) return DEVICES;
  return DEVICES.filter((d) => d.label === ONLY_DEVICE);
}

function localesToProcess() {
  if (!ONLY_LANG.length) return LOCALES;
  return LOCALES.filter((l) => ONLY_LANG.includes(l));
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

// ---------- Simulator control ----------

function findSimulatorUdid(device) {
  // `xcrun simctl list devices available --json` returns a structured
  // dump - parse + match by name.
  const r = tryExec('xcrun simctl list devices available --json');
  if (r.code !== 0) {
    throw new Error(`xcrun simctl list failed: ${r.err}`);
  }
  let json;
  try {
    json = JSON.parse(r.out);
  } catch (err) {
    throw new Error(`could not parse simctl JSON: ${err.message}`);
  }
  const all = Object.values(json.devices || {}).flat();
  const candidates = [device.nameMatch, device.fallback];
  for (const cand of candidates) {
    const hit = all.find(
      (d) => d.name === cand && d.isAvailable && !d.unavailable,
    );
    if (hit) return { udid: hit.udid, name: hit.name };
  }
  // Loose match: substring.
  for (const cand of candidates) {
    const hit = all.find(
      (d) =>
        d.name.includes(cand.split(' ').slice(-2).join(' ')) &&
        d.isAvailable,
    );
    if (hit) return { udid: hit.udid, name: hit.name };
  }
  throw new Error(
    `no simulator found matching ${candidates.join(' or ')}. Install one via Xcode > Settings > Components.`,
  );
}

function bootSimulator(udid) {
  const state = tryExec(`xcrun simctl bootstatus ${udid} 2>&1`);
  if (state.out.includes('booted') || state.out.includes('already')) {
    return;
  }
  tryExec(`xcrun simctl boot ${udid}`);
  // Wait for boot.
  for (let i = 0; i < 30; i++) {
    const s = tryExec(`xcrun simctl bootstatus ${udid}`);
    if (s.out.includes('booted') || s.code === 0) return;
    // 1s sleep
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
}

function isAppInstalled(udid) {
  const r = tryExec(`xcrun simctl get_app_container ${udid} ${BUNDLE_ID} 2>&1`);
  return r.code === 0 && !r.out.includes('No such file');
}

function openDeepLink(udid, url) {
  const r = tryExec(`xcrun simctl openurl ${udid} '${url}'`);
  if (r.code !== 0) {
    log(`  [warn] openurl ${url} -> ${r.err.trim()}`);
  }
}

function captureScreenshot(udid, outPath) {
  ensureDir(dirname(outPath));
  const r = tryExec(`xcrun simctl io ${udid} screenshot --type=png '${outPath}'`);
  if (r.code !== 0) {
    throw new Error(`screenshot failed: ${r.err}`);
  }
}

// ---------- Locale prompt ----------

let rl = null;
async function ask(prompt) {
  if (NO_PROMPT) {
    log(`  [no-prompt] ${prompt}  (skipping wait)`);
    return '';
  }
  if (!rl) rl = createInterface({ input: stdin, output: stdout });
  return rl.question(prompt);
}

async function switchLocale(udid, lang) {
  // Best-effort: try a deep link first (in case a future build supports it).
  // Then fall through to a manual prompt.
  openDeepLink(udid, `regatta://settings?lang=${lang}`);
  await ask(
    `\n  >> Set the app locale to "${lang}" via Settings on the simulator,\n  >> wait for the home screen to re-render, then press Enter to continue.\n  > `,
  );
}

// ---------- Main ----------

async function captureForDeviceLang(device, udid, lang) {
  logHeader(`capture ${device.family} / ${lang}`);
  if (!DRY_RUN) {
    await switchLocale(udid, lang);
  } else {
    log(`  [dry-run] would prompt for locale switch to ${lang}`);
  }
  for (const frame of FRAMES) {
    const out = join(OUT_ROOT, device.family, lang, `${frame.n}-${frame.name}.png`);
    log(`  [frame ${frame.n}] open ${frame.deepLink} -> ${out}`);
    if (DRY_RUN) continue;
    openDeepLink(udid, frame.deepLink);
    // Give the screen a moment to render. Best effort - 1.2s.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1200);
    captureScreenshot(udid, out);
  }
}

async function main() {
  logHeader(`ASC screenshot capture ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'}`);
  log(`out root: ${OUT_ROOT}`);
  log(`devices: ${devicesToProcess().map((d) => d.family).join(', ')}`);
  log(`locales: ${localesToProcess().join(', ')}`);

  // 1. Verify xcrun is available.
  const xc = tryExec('which xcrun');
  if (xc.code !== 0) {
    log('[fatal] xcrun not on PATH - install Xcode + Command Line Tools first');
    log('        on this machine, run: xcode-select --install');
    process.exit(1);
  }

  for (const device of devicesToProcess()) {
    let udid;
    try {
      const found = findSimulatorUdid(device);
      udid = found.udid;
      log(`\n[device] ${device.family} -> ${found.name} (${udid})`);
    } catch (err) {
      log(`[skip] ${device.family}: ${err.message}`);
      continue;
    }

    if (!DRY_RUN) {
      bootSimulator(udid);
      if (!NO_BUILD && !isAppInstalled(udid)) {
        log(
          `[warn] ${BUNDLE_ID} is not installed on ${device.family}. ` +
            `Install via "npx eas-cli build --profile preview --platform ios" + drag .app, ` +
            `or run "expo run:ios --device <udid>" first. ` +
            `Pass --no-build to suppress this check.`,
        );
        continue;
      }
    } else {
      log(`  [dry-run] would boot ${udid} and verify ${BUNDLE_ID} is installed`);
    }

    for (const lang of localesToProcess()) {
      try {
        await captureForDeviceLang(device, udid, lang);
      } catch (err) {
        log(`  [error] ${device.family} / ${lang}: ${err.message}`);
      }
    }
  }

  // Write a tiny manifest of what was captured.
  if (!DRY_RUN) {
    const manifest = {
      capturedAt: new Date().toISOString(),
      bundleId: BUNDLE_ID,
      devices: devicesToProcess().map((d) => d.family),
      locales: localesToProcess(),
      frames: FRAMES.map((f) => `${f.n}-${f.name}.png`),
    };
    const manifestPath = join(OUT_ROOT, 'manifest.json');
    ensureDir(OUT_ROOT);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    log(`\n[manifest] ${manifestPath}`);
  }

  if (rl) rl.close();
  log('\n[done]');
}

main().catch((err) => {
  if (rl) rl.close();
  console.error(err);
  process.exit(1);
});
