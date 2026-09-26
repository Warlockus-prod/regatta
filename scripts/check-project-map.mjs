#!/usr/bin/env node
// Guard the agent-facing project map: AGENTS.md, ARCHITECTURE.md, CHANGELOG.md.
//
// The map only works if it stays true. An agent that opens the repo cold trusts
// it completely, so a path that moved or a file nobody documented is worse than
// no map at all: it sends the next model confidently to the wrong place.
//
// Four checks:
//   1. entrypoint  - CLAUDE.md must import AGENTS.md, so Claude and Codex read
//                    the same rules instead of drifting apart.
//   2. paths       - every repo path quoted in the map must exist.
//   3. coverage    - every source file must have a line in ARCHITECTURE.md.
//   4. secrets     - no password-looking assignments leaked into the map.
//
// Usage: node scripts/check-project-map.mjs [--quiet]
// Exit 1 on any failure. CI runs this; so does the release gate.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const QUIET = process.argv.includes('--quiet');

const AGENTS = 'AGENTS.md';
const ARCH = 'ARCHITECTURE.md';
const CHANGELOG = 'CHANGELOG.md';
const CLAUDE = 'CLAUDE.md';

// Trees whose every tracked file must appear in ARCHITECTURE.md.
// mobile/ and public/ are deliberately excluded: mobile has its own map at
// docs/design/mobile/ARCHITECTURE.md, and public/ is static assets.
const COVERED_TREES = ['src', 'scripts', 'ws-server', 'ops', 'e2e'];

// Root-level files that must also be documented.
const COVERED_ROOT = [
  'next.config.ts', 'package.json', 'tsconfig.json', 'vitest.config.ts',
  'playwright.config.ts', 'eslint.config.mjs', 'postcss.config.mjs',
  'Dockerfile', 'docker-compose.yml', 'regatta.nginx.conf',
  '.dockerignore', '.gitignore',
];

// Files that legitimately need no line of their own. Keep this list short and
// justified: each entry is a hole in the map.
const COVERAGE_EXEMPT = new Set([
  'ws-server/package-lock.json',
]);

// Top-level names that make a backticked token look like a repo path.
const PATH_ROOTS = new Set([
  'src', 'docs', 'scripts', 'ops', 'e2e', 'mobile', 'ws-server', 'public',
  'assets', '.github', '.githooks', '.claude',
]);

// A backticked token with no slash is treated as a root file when it either
// carries a source/doc extension or is one of the extension-less configs.
const ROOT_FILE_RE = /^(?:[A-Za-z0-9_.-]+\.(?:md|ts|tsx|mjs|cjs|js|json|yml|yaml|conf|css|sh)|Dockerfile|Makefile)$/;

const fail = [];
const warn = [];

function read(file) {
  if (!existsSync(file)) {
    fail.push(`${file}: missing. The project map needs all three files (${AGENTS}, ${ARCH}, ${CHANGELOG}).`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

const agentsSrc = read(AGENTS);
const archSrc = read(ARCH);
const changelogSrc = read(CHANGELOG);

// ---------------------------------------------------------------- 1. entrypoint
// Codex, Cursor and Gemini CLI read AGENTS.md on their own; Claude reads
// CLAUDE.md. The @import is what keeps one set of rules instead of two.
if (existsSync(CLAUDE)) {
  const claudeSrc = readFileSync(CLAUDE, 'utf8');
  if (!/^@AGENTS\.md\s*$/m.test(claudeSrc)) {
    fail.push(
      `${CLAUDE}: must contain a line "@AGENTS.md" so Claude and other agents read the same rules. ` +
      `Put the shared rules in ${AGENTS} and keep only Claude-specific notes here.`,
    );
  }
} else {
  warn.push(`${CLAUDE}: not found. Claude Code will not pick up ${AGENTS} automatically.`);
}

// --------------------------------------------------------------------- 2. paths
// Only backticked tokens are checked. Prose mentions of a directory are not
// meant to be machine-checkable, and treating them as paths produces noise.
function extractPaths(src, file) {
  const out = [];
  for (const m of src.matchAll(/`([^`\n]+)`/g)) {
    let tok = m[1].trim();
    // Strip a trailing line reference (foo.ts:42) and sentence punctuation.
    tok = tok.replace(/:\d+(-\d+)?$/, '').replace(/[.,;:)]+$/, '');
    // Not a path if it has spaces, looks like a command, or has no separator.
    if (!tok || /\s/.test(tok)) continue;
    if (tok.startsWith('http://') || tok.startsWith('https://')) continue;
    if (tok.startsWith('@')) continue;          // npm scope or import alias
    if (tok.includes('://')) continue;
    if (!tok.includes('/')) {
      // A bare filename is checked only when it looks like a repo file at the
      // root: `next.config.ts`, `Dockerfile`, `FEATURES.md`. Without this the
      // ten root configs were never verified at all. Dotfiles are skipped
      // because the map legitimately names files that are gitignored
      // (.env, .env.local) or absent on a fresh clone.
      if (tok.startsWith('.')) continue;
      if (!ROOT_FILE_RE.test(tok)) continue;
      out.push({ tok, file, line: src.slice(0, m.index).split('\n').length });
      continue;
    }
    const root = tok.split('/')[0];
    if (!PATH_ROOTS.has(root)) continue;
    out.push({ tok, file, line: src.slice(0, m.index).split('\n').length });
  }
  return out;
}

const candidates = [
  ...extractPaths(agentsSrc, AGENTS),
  ...extractPaths(archSrc, ARCH),
  ...extractPaths(changelogSrc, CHANGELOG),
];

for (const { tok, file, line } of candidates) {
  // A glob points at the directory that contains it.
  const probe = tok.replace(/\/\*\*?$/, '').replace(/\/\*\*\/.*$/, '');
  if (existsSync(probe)) continue;
  // Some lines quote a directory with a trailing slash.
  if (existsSync(probe.replace(/\/$/, ''))) continue;
  fail.push(`${file}:${line}: path does not exist: ${tok}`);
}

// ------------------------------------------------------------------ 3. coverage
let tracked = [];
try {
  const args = ['ls-files', ...COVERED_TREES, ...COVERED_ROOT];
  tracked = execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);
} catch (err) {
  warn.push(`git ls-files failed, skipping coverage check: ${err.message}`);
}

// Collect the paths the map actually names, as whole tokens. A substring test
// would count `src/foo/bar.ts` as documented because `src/foo/bar.tsx` is
// mentioned, and with ~350 files in src such pairs are common - coverage would
// report itself green while real files had no line.
const documented = new Set();
const TREE_TOKEN_RE = new RegExp(
  String.raw`(?:${COVERED_TREES.join('|')})/[A-Za-z0-9_.\-\[\]/]+`,
  'g',
);
for (const m of archSrc.matchAll(TREE_TOKEN_RE)) {
  documented.add(m[0].replace(/[.,;:)]+$/, ''));
}
for (const name of COVERED_ROOT) {
  if (new RegExp(String.raw`(^|[^A-Za-z0-9_./-])${name.replace(/\./g, String.raw`\.`)}([^A-Za-z0-9_.-]|$)`, 'm').test(archSrc)) {
    documented.add(name);
  }
}

const undocumented = [];
for (const path of tracked) {
  if (COVERAGE_EXEMPT.has(path)) continue;
  if (!documented.has(path)) undocumented.push(path);
}

if (undocumented.length > 0) {
  const shown = undocumented.slice(0, 40);
  fail.push(
    `${ARCH}: ${undocumented.length} tracked file(s) have no line in the code map. ` +
    `Add one line per file saying what is inside, then re-run.\n` +
    shown.map((p) => `    ${p}`).join('\n') +
    (undocumented.length > shown.length ? `\n    ... and ${undocumented.length - shown.length} more` : ''),
  );
}

// Conversely: a file removed from the repo but still listed is a stale line.
// Covered by check 2 for backticked paths; bare paths are reported as a hint.
const STALE_LINE_RE = new RegExp(
  String.raw`^\s*[-*]?\s*\`?((?:${COVERED_TREES.join('|')})\/[^\s\`]+\.[a-z]+)\`?`,
  'gm',
);
for (const m of archSrc.matchAll(STALE_LINE_RE)) {
  const p = m[1];
  if (!existsSync(p)) {
    const line = archSrc.slice(0, m.index).split('\n').length;
    fail.push(`${ARCH}:${line}: code map lists a file that no longer exists: ${p}`);
  }
}

// ------------------------------------------------------------------- 4. secrets
// The map is the most-read set of files in the repo and the most likely to be
// pasted into a chat. Old docs in this repo carried a plaintext password, so
// this check exists to keep it from being copied forward.
const SECRET_RE = [
  // The quote class includes a backtick on purpose: the old docs carried the
  // /stats value as `value` in markdown, which the quote-only class missed.
  /\b(password|passwd|token|secret|api[_-]?key)\s*[:=]\s*["'`]?[A-Za-z0-9._\-]{6,}/gi,
  /\bsk-[A-Za-z0-9]{16,}/g,
  /\bghp_[A-Za-z0-9]{20,}/g,
  // "admin:value" on a line about the admin dashboard. The retired /stats
  // credential was documented exactly like that, and no rule above caught the
  // parenthetical form. Matching the shape instead of the literal keeps the
  // value itself out of this repo.
  /\b(?:admin|user|login)\s*:\s*["'`]?[A-Za-z0-9._\-]{4,40}/gi,
];
for (const [file, src] of [[AGENTS, agentsSrc], [ARCH, archSrc], [CHANGELOG, changelogSrc]]) {
  for (const re of SECRET_RE) {
    for (const m of src.matchAll(re)) {
      // Allow documenting the NAME of an env var without a value.
      if (/[:=]\s*["']?(<|\$\{|\.\.\.|see |смотри )/i.test(m[0])) continue;
      const line = src.slice(0, m.index).split('\n').length;
      fail.push(`${file}:${line}: looks like a secret in plain text: ${m[0].slice(0, 40)}...`);
    }
  }
}

// --------------------------------------------------------------------- report
if (!QUIET) {
  const counts = `${tracked.length} tracked files, ${candidates.length} quoted paths`;
  if (fail.length === 0) {
    console.log(`project map OK (${counts})`);
  }
}

for (const w of warn) console.warn(`warning: ${w}`);

if (fail.length > 0) {
  console.error(`\nProject map check failed (${fail.length} problem(s)):\n`);
  for (const f of fail) console.error(`  ${f}\n`);
  console.error(
    'The map is how the next agent finds its way. Fix it in the same commit as the change that broke it.\n' +
    `See the "Правило поддержки карты" section of ${AGENTS}.`,
  );
  process.exit(1);
}
