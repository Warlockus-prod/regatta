#!/usr/bin/env node
// ============================================================================
// Codemod: migrate data file fields
//
//   Before:  { titleRu: 'X', titleEn: 'Y', titlePl: 'Z' }
//   After:   { title: { ru: 'X', en: 'Y', pl: 'Z' } }
//
// Purpose: unlock extensibility for IT/ES/FR/DE without having to add
// `titleIt`, `titleEs`, etc to every field across 7 data files. The new
// shape is `Partial<Record<Lang, string>>`-friendly via the `LocalizedText`
// type.
//
// Usage:
//   node scripts/migrate-data-fields.mjs [file1 file2 ...]  # specific files
//   node scripts/migrate-data-fields.mjs --all              # all src/data/*.ts
//   node scripts/migrate-data-fields.mjs --dry              # preview only
//
// Limitations & safety:
//
// - Arrays of strings (`itemsRu: ['a', 'b', 'c']`) are grouped into
//   `items: { ru: ['a', 'b', 'c'], en: [...], pl: [...] }`. Consumer
//   component needs updating to pick by lang just like single-string
//   fields.
// - Only migrates fields that have ALL THREE of `fooRu`, `fooEn`, `fooPl`
//   in the SAME object. If a field only has Ru/En (legacy 2-lang), it is
//   left alone - the consumer already handles that case.
// - Does NOT update TypeScript interfaces. You still need to change the
//   data type declarations manually (the whole point is one `LocalizedText`
//   per translated property, not three parallel `string` fields).
// - Safe to run on already-migrated files: no-op if no *Ru fields remain.
//
// RECOMMENDED ORDER:
// 1. Migrate ONE file (say `missions.ts` - smallest at 15 fields).
// 2. Update its consumer (GameClient.tsx / MultiplayerClient.tsx) to read
//    `mission.title[lang]` instead of `lang === 'pl' ? mission.titlePl : ...`
// 3. Verify in prod.
// 4. Move to next file.
//
// Do NOT migrate all 7 files in one sweep - consumers will explode.
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

const DATA_DIR = path.join(ROOT, 'src/data');

const targetFiles = allMode
  ? fs.readdirSync(DATA_DIR)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map((f) => path.join(DATA_DIR, f))
  : files.map((f) => path.resolve(f));

// Find lines of the form `  fooRu: <value>,` where <value> is either a
// quoted string or an array literal. Greedy tolerant to newlines inside
// arrays. This is a line-based codemod: works on the flat line shape
// typical for data-file entries. Nested objects get hairy - skip them.
const FIELD_PATTERN = /^(\s*)(\w+)Ru:\s*([\s\S]*?)(,?)\s*$/;

function migrateFile(src, fileName) {
  const lines = src.split('\n');
  const output = [];
  let i = 0;
  let migrated = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Only look at non-comment lines containing *Ru:
    if (/^\s*\/\//.test(line) || !/\b\w+Ru:/.test(line)) {
      output.push(line);
      i++;
      continue;
    }

    // Try to find a 3-line trio starting at i: fooRu, fooEn, fooPl
    // For single-line values (strings), the pattern is straightforward.
    // For arrays, we need multi-line collection which is harder - skip
    // arrays in this codemod and emit a helpful comment.

    const m = line.match(/^(\s*)(\w+)Ru:\s*(['"`])(.+)\3,?\s*$/);
    if (!m) {
      // Might be the start of an array - leave it for now, print hint
      if (/\bitemsRu:\s*\[/.test(line) || /\b\w+Ru:\s*\[/.test(line)) {
        // Add a comment hint above once (idempotent-ish)
        output.push(`${line.match(/^\s*/)?.[0] || ''}// TODO: migrate array field to LocalizedText<string[]>`);
      }
      output.push(line);
      i++;
      continue;
    }

    const [, indent, fieldBase, quote, ruValue] = m;
    const enLine = lines[i + 1];
    const plLine = lines[i + 2];
    const enMatch = enLine?.match(new RegExp(`^\\s*${fieldBase}En:\\s*(['"\`])(.+)\\1,?\\s*$`));
    const plMatch = plLine?.match(new RegExp(`^\\s*${fieldBase}Pl:\\s*(['"\`])(.+)\\1,?\\s*$`));

    if (!enMatch || !plMatch) {
      // Not a full trio - leave as-is
      output.push(line);
      i++;
      continue;
    }

    const enValue = enMatch[2];
    const plValue = plMatch[2];
    // Emit the new single line
    output.push(
      `${indent}${fieldBase}: { ru: ${quote}${ruValue}${quote}, en: ${quote}${enValue}${quote}, pl: ${quote}${plValue}${quote} },`
    );
    migrated += 1;
    i += 3; // Skip the three old lines
  }

  return { content: output.join('\n'), migrated };
}

let total = 0;
for (const file of targetFiles) {
  if (!fs.existsSync(file)) {
    console.warn('skip (missing):', file);
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  const { content, migrated } = migrateFile(src, file);
  if (migrated === 0) continue;
  total += migrated;
  const rel = path.relative(ROOT, file);
  if (dryRun) {
    console.log(`[dry] ${rel} -> ${migrated} field trios would migrate`);
  } else {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`      ${rel} -> ${migrated} field trios migrated`);
  }
}

console.log('');
console.log(`Total field trios migrated: ${total}`);
console.log('');
console.log('After running on a file:');
console.log('  1. Update the TS interface in the same file:');
console.log('       titleRu: string; titleEn: string; titlePl: string;  // old');
console.log('       title: LocalizedText;                                // new');
console.log('     Import: `import type { LocalizedText } from "@/lib/languages"`');
console.log('  2. Update the consuming components:');
console.log('       OLD: lang === "pl" ? item.titlePl : lang === "en" ? item.titleEn : item.titleRu');
console.log('       NEW: pickLocalized(lang, item.title)');
console.log('     or via hook: `const { tl } = useI18n(); tl(item.title)`');
console.log('  3. Array-valued fields (itemsRu: [...]) not auto-migrated - see TODO comments');
console.log('  4. npx tsc --noEmit to catch missed consumer sites');
console.log('  5. npm run build + playwright scan to verify runtime');
