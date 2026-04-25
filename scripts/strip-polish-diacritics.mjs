#!/usr/bin/env node
// Strip Polish diacritics ONLY from Polish-marked strings, per CLAUDE.md rule
// "Polish: no diacritics (no `ą ę ż ł ó ć ń ś ź`)". Leaves Spanish/French/
// German/Italian content intact (those languages allow diacritics).
//
// Detection patterns:
//   1. `<field>Pl: '...'`   - LegacyLocalized data files
//   2. `pl: '...'`          - tl({...}) object literals
//   3. `tp('...', '...', '...')` - 3rd arg = Polish (single-line or multi-line)
//
// Usage:
//   node scripts/strip-polish-diacritics.mjs           # rewrite all .ts/.tsx in src/
//   node scripts/strip-polish-diacritics.mjs --dry     # show what would change
//
// Safe to re-run; idempotent.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const DRY = process.argv.includes('--dry');

const DIACRITICS = {
  'ą': 'a', 'ę': 'e', 'ż': 'z', 'ł': 'l', 'ó': 'o', 'ć': 'c', 'ń': 'n', 'ś': 's', 'ź': 'z',
  'Ą': 'A', 'Ę': 'E', 'Ż': 'Z', 'Ł': 'L', 'Ó': 'O', 'Ć': 'C', 'Ń': 'N', 'Ś': 'S', 'Ź': 'Z',
};

function strip(s) {
  return s.replace(/[ąężłóćńśźĄĘŻŁÓĆŃŚŹ]/g, (c) => DIACRITICS[c] ?? c);
}

function findFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findFiles(p));
    } else if (entry.isFile() && (p.endsWith('.ts') || p.endsWith('.tsx'))) {
      out.push(p);
    }
  }
  return out;
}

function rewrite(src) {
  let out = src;
  let changes = 0;

  // 1. <field>Pl: '...'  (also `Pl: '...'` standalone)
  out = out.replace(/(\b\w*Pl:\s*)('[^'\n]*'|"[^"\n]*")/g, (m, prefix, str) => {
    const stripped = strip(str);
    if (stripped !== str) changes++;
    return prefix + stripped;
  });

  // 2. plain `pl: '...'` (tl object form). Watch for false positives like
  //    `repl:` - the prefix must be a non-word char or line start.
  out = out.replace(/(?<![A-Za-z0-9_])(pl:\s*)('[^'\n]*'|"[^"\n]*")/g, (m, prefix, str) => {
    const stripped = strip(str);
    if (stripped !== str) changes++;
    return prefix + stripped;
  });

  // 3. tp('ru', 'en', 'pl') - single line. The 3rd quoted string is Polish.
  out = out.replace(
    /tp\(\s*('[^'\n]*'|"[^"\n]*")\s*,\s*('[^'\n]*'|"[^"\n]*")\s*,\s*('[^'\n]*'|"[^"\n]*")(\s*[,)])/g,
    (m, ru, en, pl, tail) => {
      const stripped = strip(pl);
      if (stripped !== pl) changes++;
      return `tp(${ru}, ${en}, ${stripped}${tail}`;
    },
  );

  // 4. tp(ru, en, pl) across multiple lines.
  out = out.replace(
    /tp\(\s*('[^']*'|"[^"]*")\s*,\s*('[^']*'|"[^"]*")\s*,\s*('[^']*'|"[^"]*")(\s*[,)])/gs,
    (m, ru, en, pl, tail) => {
      const stripped = strip(pl);
      if (stripped !== pl) changes++;
      return `tp(${ru}, ${en}, ${stripped}${tail}`;
    },
  );

  return { out, changes };
}

const files = findFiles(SRC);
let totalChanges = 0;
let touched = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const { out, changes } = rewrite(src);
  if (changes > 0) {
    totalChanges += changes;
    touched += 1;
    if (DRY) {
      console.log(`[dry] ${path.relative(ROOT, file)}: ${changes} strings would change`);
    } else {
      fs.writeFileSync(file, out, 'utf8');
      console.log(`${path.relative(ROOT, file)}: ${changes} strings stripped`);
    }
  }
}

console.log(`\n${DRY ? 'Would modify' : 'Modified'} ${touched} files, ${totalChanges} strings.`);
