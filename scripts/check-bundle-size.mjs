#!/usr/bin/env node
/**
 * Bundle-size budget check (crude but robust).
 *
 * Next 16 + Turbopack does not expose per-route first-load sizes in a stable
 * machine-readable way (the build output table is TTY-oriented and
 * app-build-manifest.json isn't produced for the app-router). Until that
 * changes, we do a coarse check: total size of .next/static/chunks.
 *
 * The idea is to catch obvious regressions ("someone imported a 2 MB lib
 * on the root route") without pretending we have per-route granularity we
 * don't.
 *
 * Usage:
 *   npm run build
 *   node scripts/check-bundle-size.mjs
 *
 * Raise the budget deliberately after inspecting what caused growth.
 *
 * Also a server-bundle guard: a package that reads files next to its own code
 * must stay in `serverExternalPackages` (next.config.ts). When Turbopack
 * bundles one, the chunk points at a fake `/ROOT/node_modules/...` path and the
 * package fails at runtime. fast-geoip did exactly that and swallowed the
 * error, so no event got a country for months. Unit tests cannot catch it
 * (they mock the module), so the built chunks are checked here.
 */

import fs from 'node:fs';
import path from 'node:path';

// Total size of all JS chunks in .next/static/chunks/. Tight-ish so we catch
// "someone imported moment.js" or "some vendor got un-tree-shaken".
// Current (2026-04-20): ~2 MB. Budget allows ~2.5x growth before failing.
// 2026-07-10: raised 5 -> 5.5 MB after landing the /radio learning section
// (SRC guide + ICOM simulator + the official 324-question UKE bank in
// src/data/src-radio.ts). Inspected: growth is legitimate feature content,
// largest single chunk stays ~0.95 MB (well under BUDGET_MB_SINGLE), no
// stray heavy dependency. Baseline after this change: ~5.02 MB.
//
// 2026-07-14: raised 5.5 -> 6.5 MB. The radio section grew again, and every bit
// of it is text and data rather than code: per-button inspect (27 entries), deep
// what/why/when for 15 lessons, the printable crib, the 26 UKE tasks, and now six
// live conversations with their checklists. Inspected before raising: the largest
// single chunk is still ~0.95 MB, no new dependency, and the WebAudio engine ships
// zero audio files (every sound is synthesized). Baseline after this change:
// ~5.47 MB. If this creeps again, the answer is to split the section's data out
// of the client bundle - not to keep nudging the number.
//
// 2026-10-29: raised 6.5 -> 6.6 MB by the owner's decision. Stages 2-5 added
// ~114 KB: the shared boat step, the trial race, the ghost, the stage-4 review
// and the judge. The trial race engine (~33 KB) and the judge (~32 KB) already
// load lazily, only where used. Inspected before raising: largest single chunk
// still ~0.94 MB, no new dependency. Baseline after this change: 6,905,257
// bytes (~6.59 MB), so the headroom is ~15 KB on purpose. Next growth means
// moving radio and course data out of the client bundle.
//
// 2026-11-21: baseline on main 4438ded1 after `npm ci` is 6,821,736 bytes
// (~6.51 MB, headroom ~96 KB). A 9.35 MB reading on the same commit came from
// a stale install, not from code; see checkInstalledMatchesLock below.
const BUDGET_MB_TOTAL = 6.6;

// Single largest chunk. If one chunk balloons past this, something got
// bundled into a non-code-split vendor blob (often three.js / drei).
// Current largest: ~0.87 MB. Budget allows ~2.3x growth.
const BUDGET_MB_SINGLE = 2;

function dirSizeSync(dir) {
  let total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = dirSizeSync(full);
      total += sub.total;
      files.push(...sub.files);
    } else {
      const s = fs.statSync(full).size;
      total += s;
      files.push({ path: full, size: s });
    }
  }
  return { total, files };
}

// Strings that must never appear in a built server chunk.
const FORBIDDEN_SERVER_STRINGS = [
  { needle: '/ROOT/node_modules/fast-geoip', why: 'fast-geoip was bundled; keep it in serverExternalPackages (next.config.ts)' },
];
const SERVER_DIRS = ['.next/server', '.next/standalone/.next/server'];

function listJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (/\.(?:c|m)?js$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Returns one line per forbidden string found in a server chunk. */
function checkServerChunks() {
  const problems = [];
  for (const rel of SERVER_DIRS) {
    const dir = path.resolve(rel);
    if (!fs.existsSync(dir)) continue;
    for (const file of listJsFiles(dir)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const { needle, why } of FORBIDDEN_SERVER_STRINGS) {
        if (text.includes(needle)) problems.push(`${path.relative(process.cwd(), file)}: ${needle} (${why})`);
      }
    }
  }
  return problems;
}

/**
 * Chunk sizes only mean something when the build ran on the dependencies the
 * lockfile pins. 2026-11-21: main at 4438ded1 measured 9.35 MB on a copy of
 * the root checkout's node_modules (Next 16.2.11, lockfile pins 16.3.8) and
 * 6.51 MB after `npm ci`. The older Turbopack gave several routes their own
 * copy of the ~0.94 MB three.js vendor chunk. Returns one line per runtime
 * dependency whose installed version differs from package-lock.json.
 */
function checkInstalledMatchesLock() {
  const pkgPath = path.resolve('package.json');
  const lockPath = path.resolve('package-lock.json');
  if (!fs.existsSync(pkgPath) || !fs.existsSync(lockPath)) return [];
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const problems = [];
  for (const name of Object.keys(pkg.dependencies ?? {})) {
    const wanted = lock.packages?.[`node_modules/${name}`]?.version;
    if (!wanted) continue;
    const installedPath = path.resolve('node_modules', name, 'package.json');
    const installed = fs.existsSync(installedPath)
      ? JSON.parse(fs.readFileSync(installedPath, 'utf8')).version
      : 'missing';
    if (installed !== wanted) problems.push(`${name}: installed ${installed}, lockfile ${wanted}`);
  }
  // The build stamps the Next version it ran on, which catches a .next left
  // over from an older install even after node_modules was fixed.
  const frameworkPath = path.resolve('.next/diagnostics/framework.json');
  const wantedNext = lock.packages?.['node_modules/next']?.version;
  if (wantedNext && fs.existsSync(frameworkPath)) {
    const builtWith = JSON.parse(fs.readFileSync(frameworkPath, 'utf8')).version;
    if (builtWith && builtWith !== wantedNext) {
      problems.push(`.next was built with Next ${builtWith}, lockfile ${wantedNext}`);
    }
  }
  return problems;
}

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function main() {
  const staticDir = path.resolve('.next/static/chunks');
  if (!fs.existsSync(staticDir)) {
    console.error(`Directory not found: ${staticDir}`);
    console.error('Run `npm run build` first.');
    process.exit(2);
  }
  const drift = checkInstalledMatchesLock();
  if (drift.length > 0) {
    console.error('FAIL: the install or the build does not match package-lock.json, so these sizes are not comparable:');
    for (const line of drift) console.error(`  ${line}`);
    console.error('Run `npm ci`, then `npm run build` and this check again.');
    process.exit(1);
  }

  const { total, files } = dirSizeSync(staticDir);
  files.sort((a, b) => b.size - a.size);

  const totalMB = total / 1024 / 1024;
  const largestMB = files[0] ? files[0].size / 1024 / 1024 : 0;

  console.log('');
  console.log(`Total static chunks:  ${fmtMB(total)} MB   (budget ${BUDGET_MB_TOTAL} MB)`);
  console.log(`Largest single chunk: ${fmtMB(files[0]?.size ?? 0)} MB  (budget ${BUDGET_MB_SINGLE} MB)`);
  console.log(`Total files:          ${files.length}`);
  console.log('');
  console.log('Top 5 chunks by size:');
  for (const f of files.slice(0, 5)) {
    const rel = path.relative(staticDir, f.path);
    console.log(`  ${fmtMB(f.size).padStart(6)} MB  ${rel}`);
  }
  console.log('');

  let failed = false;
  if (totalMB > BUDGET_MB_TOTAL) {
    console.error(`FAIL: total ${fmtMB(total)} MB > budget ${BUDGET_MB_TOTAL} MB`);
    failed = true;
  }
  if (largestMB > BUDGET_MB_SINGLE) {
    console.error(`FAIL: largest chunk ${fmtMB(files[0].size)} MB > budget ${BUDGET_MB_SINGLE} MB`);
    failed = true;
  }

  if (failed) {
    console.error('');
    console.error('A new heavy dep or a bad import likely landed.');
    console.error('Inspect, then either trim the route OR raise the budget in scripts/check-bundle-size.mjs after agreeing on the new baseline.');
  }

  const serverProblems = checkServerChunks();
  if (serverProblems.length > 0) {
    console.error('');
    console.error('FAIL: server chunks reference a path that does not exist at runtime:');
    for (const line of serverProblems) console.error(`  ${line}`);
    failed = true;
  }

  if (failed) process.exit(1);

  console.log('Within budget. Server chunks clean.');
}

main();
