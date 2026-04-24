#!/usr/bin/env node
// Fix orphaned `<field>Es/Fr/De/It: 'value',` lines that landed OUTSIDE a
// single-line object literal in sailing-data.ts after translate-data-flat.
//
// Pattern to repair:
//   { id: 'bow', ...termIt: 'Prua', },
//     definitionEs: 'Proa',
//     definitionFr: 'Etrave',
//     ...
//
// becomes:
//   { id: 'bow', ...termIt: 'Prua', definitionEs: 'Proa', definitionFr: 'Etrave', ... },

import fs from 'node:fs';
import path from 'node:path';

const fileArgIdx = process.argv.indexOf('--file');
if (fileArgIdx < 0 || !process.argv[fileArgIdx + 1]) {
  console.error('usage: node scripts/fix-orphan-lines.mjs --file <path>');
  process.exit(1);
}
const filePath = path.resolve(process.argv[fileArgIdx + 1]);
const src = fs.readFileSync(filePath, 'utf8');
const lines = src.split('\n');

const SUFFIX_RE = /^\s{2,}(\w+(Es|Fr|De|It|Ru|En|Pl)):\s*(['"`])/;
const out = [];
let fixes = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(SUFFIX_RE);
  if (!m) {
    out.push(line);
    continue;
  }
  // Is the previous output line a single-line object ending `},`? If yes, this
  // orphan needs to be grafted inside it.
  const prev = out[out.length - 1] ?? '';
  if (/},\s*$/.test(prev)) {
    const graft = line.trim().replace(/,?$/, ','); // ensure trailing comma
    out[out.length - 1] = prev.replace(/},\s*$/, ` ${graft} },`);
    fixes++;
    continue;
  }
  out.push(line);
}

fs.writeFileSync(filePath, out.join('\n'));
console.log(`Fixes applied: ${fixes}`);
