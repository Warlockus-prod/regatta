/**
 * Mobile-lane bridging script per ADR-0003 (proposed).
 *
 * Reads the web source-of-truth content at `src/data/*.ts` and writes
 * JSON twins at `mobile/src/data/*.json` so the mobile bundle ships
 * the same content the web client uses, in all 7 languages.
 *
 * Removes itself once the Shared lane completes the workspace
 * extraction (`packages/content`, `@regatta/content`). At that point
 * mobile imports `@regatta/content/*` directly and this script
 * becomes obsolete.
 *
 * Runs on Node 22+ via `--experimental-strip-types` (TS source imports
 * web TS files; type-only imports are erased at runtime). All web data
 * files only have `import type { ... }` from `@/lib/languages`, so
 * Node never tries to resolve the `@/` path alias.
 *
 * Usage:
 *   npm run sync-content           # write JSON twins
 *   npm run sync-content:check     # exit 1 if any twin is stale
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BOOTCAMP_TOTAL_MINUTES,
  bootcampLessons,
  quickRefreshLessons,
} from '../../src/data/bootcamp.ts';
import { anatomyParts } from '../../src/data/anatomy.ts';
import { galleryItems } from '../../src/data/gallery.ts';
import { missions } from '../../src/data/missions.ts';
import { onboardSections } from '../../src/data/onboard.ts';
import { ruleScenarios } from '../../src/data/rules.ts';
import {
  glossaryCategories,
  glossaryTerms,
  maneuvers,
  pointsOfSail,
  racingRules,
  racingStrategies,
  tacks,
} from '../../src/data/sailing-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const outDir = join(here, '..', 'src', 'data');

interface Bundle {
  filename: string;
  data: unknown;
  count: number;
}

const bundles: Bundle[] = [
  {
    filename: 'bootcamp.json',
    data: { bootcampLessons, quickRefreshLessons, BOOTCAMP_TOTAL_MINUTES },
    count: bootcampLessons.length + quickRefreshLessons.length,
  },
  {
    filename: 'anatomy.json',
    data: { anatomyParts },
    count: anatomyParts.length,
  },
  {
    filename: 'gallery.json',
    data: { galleryItems },
    count: galleryItems.length,
  },
  {
    filename: 'missions.json',
    data: { missions },
    count: missions.length,
  },
  {
    filename: 'onboard.json',
    data: { onboardSections },
    count: onboardSections.length,
  },
  {
    filename: 'rules.json',
    data: { ruleScenarios },
    count: ruleScenarios.length,
  },
  {
    filename: 'sailing-data.json',
    data: {
      pointsOfSail,
      tacks,
      maneuvers,
      glossaryTerms,
      glossaryCategories,
      racingRules,
      racingStrategies,
    },
    count: pointsOfSail.length + glossaryTerms.length + maneuvers.length,
  },
];

const checkMode = process.argv.includes('--check');

mkdirSync(outDir, { recursive: true });

let staleCount = 0;
let writtenCount = 0;

for (const { filename, data, count } of bundles) {
  const target = join(outDir, filename);
  // 2-space indent + trailing newline for friendly diffs.
  const next = JSON.stringify(data, null, 2) + '\n';
  const current = existsSync(target) ? readFileSync(target, 'utf8') : '';

  if (next === current) continue;

  if (checkMode) {
    staleCount++;
    console.error(`[sync-content] stale: ${relative(repoRoot, target)}`);
  } else {
    writeFileSync(target, next);
    writtenCount++;
    console.log(
      `[sync-content] wrote ${relative(repoRoot, target)} (${count} entries)`,
    );
  }
}

if (checkMode) {
  if (staleCount > 0) {
    console.error(
      `\n[sync-content] ${staleCount} bundle(s) stale.\n` +
        `Run from mobile/: npm run sync-content`,
    );
    process.exit(1);
  }
  console.log('[sync-content] all bundles up to date.');
} else {
  console.log(
    writtenCount > 0
      ? `[sync-content] done. ${writtenCount} bundle(s) written.`
      : '[sync-content] all bundles already current.',
  );
}
