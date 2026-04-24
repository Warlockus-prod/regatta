#!/usr/bin/env node
// ============================================================================
// Codemod: tp('ru', 'en', 'pl')  ->  tl({ ru: 'ru', en: 'en', pl: 'pl' })
//
// Purpose: migrate away from the hardcoded 3-arg `tp()` to the extensible
// object-based `tl()` helper. After this migration, adding IT/ES/FR/DE to
// a string is just `{ ..., it: '...' }` - no signature change needed.
//
// Usage:
//   node scripts/migrate-tp-to-tl.mjs [file1 file2 ...]   # specific files
//   node scripts/migrate-tp-to-tl.mjs --all                # all src/**/*.tsx|.ts
//   node scripts/migrate-tp-to-tl.mjs --dry               # don't write, preview
//
// Strategy:
// - Regex-based, intentionally simple. tp() calls are tightly scoped - we
//   have 413 unique sites total and they follow a very regular shape.
// - Preserves escaping (\n, \', template-literal backticks).
// - Preserves trailing commas + multi-line formatting.
// - Skips call sites that look weird (e.g. variable args) - logs them.
// - DOES NOT add the `tl` destructure to `useI18n()` - you run that sweep
//   separately via find + sed. Instructions printed at the end.
//
// Safe to run repeatedly (idempotent: tl({...}) is not matched by tp(...)
// pattern).
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const allMode = args.includes('--all');
const files = args.filter((a) => !a.startsWith('--'));

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
      out.push(...collectFiles(full));
    } else if (entry.isFile()) {
      if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
        out.push(full);
      }
    }
  }
  return out;
}

const targetFiles = allMode
  ? collectFiles(path.join(ROOT, 'src'))
  : files.map((f) => path.resolve(f));

// Matches tp('...', '...', '...') with single quotes, double quotes, or
// backticks. Captures the 3 argument strings with their original quotes.
// The pattern is deliberately conservative - only matches when all 3 args
// are literals (no variables, no function calls).
//
// Breakdown:
//   \btp\(              word boundary + tp(
//   \s*                 optional whitespace
//   (['"`])(.*?)\1      arg 1: quote + body + matching quote (lazy body)
//   \s*,\s*             comma separator
//   (['"`])(.*?)\3      arg 2
//   \s*,\s*             comma
//   (['"`])(.*?)\5      arg 3
//   \s*,?\s*\)          optional trailing comma + close paren
//
// Uses `s` flag so `.` matches newlines inside the strings (multi-line tp()).
// The `\1`/`\3`/`\5` backrefs ensure the closing quote matches the opening.
const TP_PATTERN = /\btp\(\s*(['"`])([\s\S]*?)\1\s*,\s*(['"`])([\s\S]*?)\3\s*,\s*(['"`])([\s\S]*?)\5\s*,?\s*\)/g;

let totalMatches = 0;
let totalRewrites = 0;
const skipped = [];

function migrateContent(src, fileName) {
  let count = 0;
  const rewritten = src.replace(TP_PATTERN, (_, q1, ru, q2, en, q3, pl) => {
    count += 1;
    totalMatches += 1;
    // Preserve each arg's original quote style.
    const ruStr = q1 + ru + q1;
    const enStr = q2 + en + q2;
    const plStr = q3 + pl + q3;
    totalRewrites += 1;
    return `tl({ ru: ${ruStr}, en: ${enStr}, pl: ${plStr} })`;
  });

  // Second pass: warn on tp( calls that DIDN'T match - probably dynamic args.
  const remaining = [...rewritten.matchAll(/\btp\(/g)].length;
  if (remaining > 0) {
    skipped.push({ file: fileName, count: remaining });
  }

  return { rewritten, count };
}

for (const file of targetFiles) {
  if (!fs.existsSync(file)) {
    console.warn('skip (missing):', file);
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  const { rewritten, count } = migrateContent(src, file);
  if (count === 0) continue;
  if (dryRun) {
    console.log(`[dry] ${path.relative(ROOT, file)} -> ${count} tp() calls would migrate`);
  } else {
    fs.writeFileSync(file, rewritten, 'utf8');
    console.log(`      ${path.relative(ROOT, file)} -> ${count} tp() calls migrated`);
  }
}

console.log('');
console.log(`Summary:`);
console.log(`  tp() call sites migrated: ${totalRewrites}`);
if (skipped.length) {
  console.log(`  files with unmigrated tp() (dynamic args, manual check needed):`);
  for (const s of skipped) console.log(`    - ${path.relative(ROOT, s.file)}: ${s.count} remaining`);
}
console.log('');
console.log('Next steps:');
console.log('  1. Update `useI18n()` destructuring in migrated files:');
console.log('     `const { tp }` -> `const { tl }`  (or add tl alongside)');
console.log('     Run: grep -rl "const { tp" src | xargs sed -i.bak -E "s/(const \\{)([^}]*)(tp)([^}]*\\} = useI18n)/\\1\\2tl\\4/g"');
console.log('     Or do it manually file-by-file - ~70 files.');
console.log('  2. npx tsc --noEmit   (will flag any stragglers)');
console.log('  3. npm run build      (sanity)');
console.log('  4. npm run test:physics (unchanged)');
console.log('  5. Playwright scan to verify no cyrillic leaks');
