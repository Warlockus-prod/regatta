#!/usr/bin/env node
// Scan source files for em-dash (U+2014) and en-dash (U+2013).
// CLAUDE.md typography rule: only ASCII hyphen is allowed in this repo.
// Used by CI to block PRs that introduce typographic dashes.
// Pre-commit hook does the same on staged content; this one walks the tree.
//
// Usage: node scripts/check-no-dash.mjs [path1] [path2] ...
//        Defaults to scanning src, docs, scripts, .githooks.
//
// All dash chars are written via String.fromCharCode so this script itself
// is ASCII-clean (otherwise it would flag its own file).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';

const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);
const DASH_RE = new RegExp(`[${EN_DASH}${EM_DASH}]`);
const DASH_RE_G = new RegExp(`[${EN_DASH}${EM_DASH}]`, 'g');

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.md', '.mdx', '.json', '.yml', '.yaml', '.css', '.html', '.txt']);
// Skip vendored / generated / lockfile trees.
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'out', 'coverage', 'playwright-report']);
const SKIP_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

const roots = process.argv.slice(2);
const targets = roots.length > 0 ? roots : ['src', 'docs', 'scripts', '.githooks'];

const cwd = process.cwd();
const hits = [];

function walk(p) {
  let st;
  try { st = statSync(p); } catch { return; }
  if (st.isDirectory()) {
    const base = p.split(sep).pop();
    if (base && SKIP_DIRS.has(base)) return;
    let entries;
    try { entries = readdirSync(p); } catch { return; }
    for (const name of entries) walk(join(p, name));
    return;
  }
  if (!st.isFile()) return;
  const ext = extname(p).toLowerCase();
  if (!EXT.has(ext)) return;
  const base = p.split(sep).pop();
  if (base && SKIP_FILES.has(base)) return;

  let content;
  try { content = readFileSync(p, 'utf8'); } catch { return; }
  if (!DASH_RE.test(content)) return;

  const lines = content.split('\n');
  const rel = relative(cwd, p) || p;
  lines.forEach((line, i) => {
    if (DASH_RE.test(line)) {
      hits.push({ file: rel, line: i + 1, text: line });
    }
  });
}

for (const t of targets) walk(t);

if (hits.length === 0) {
  console.log(`OK: no em-dash (U+2014) or en-dash (U+2013) found in ${targets.join(', ')}`);
  process.exit(0);
}

console.error(`ERROR: em-dash (U+2014) or en-dash (U+2013) found in ${hits.length} location(s).`);
console.error('CLAUDE.md typography rule: only ASCII hyphen (-) is allowed.');
console.error('');
for (const h of hits) {
  const hl = h.text.replace(DASH_RE_G, (m) => `[${m === EM_DASH ? 'EM-DASH' : 'EN-DASH'}]`);
  console.error(`  ${h.file}:${h.line}: ${hl}`);
}
console.error('');
console.error('Replace each typographic dash with ASCII hyphen and commit again.');
process.exit(1);
