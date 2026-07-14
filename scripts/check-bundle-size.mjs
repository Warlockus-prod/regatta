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
const BUDGET_MB_TOTAL = 6.5;

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
    process.exit(1);
  }

  console.log('Within budget.');
}

main();
