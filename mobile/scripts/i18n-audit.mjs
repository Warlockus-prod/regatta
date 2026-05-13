#!/usr/bin/env node
/**
 * mobile/scripts/i18n-audit.mjs
 *
 * Sprint 10 i18n audit. Walks the mobile codebase and emits a markdown
 * report listing every i18n issue we can detect statically. Designed to
 * run in CI plus as a one-shot before release.
 *
 * Findings categories:
 *   1. cyrillic-leak   : Cyrillic string literals NOT inside the first
 *                        arg of `tp(...)`, NOT inside a `legacyPick(...)`
 *                        call. The first-arg case is the canonical RU
 *                        source and is intentionally Cyrillic.
 *   2. tp-arity        : `tp(...)` calls passed fewer than 3 args
 *                        (missing PL).
 *   3. tp-no-extras    : `tp(ru, en, pl)` without the {es, fr, de, it}
 *                        overlay. P3 - falls back to EN, but inconsistent
 *                        with the rest of the codebase.
 *   4. hardcoded-jsx   : JSX text node containing 3+ English words that
 *                        is NOT wrapped in a function call (heuristic).
 *   5. non-english-leak: Non-Latin / accented strings outside `tp()` /
 *                        `tl()` / `legacyPick()`. Catches PL/ES/FR/DE/IT
 *                        leaks even when no Cyrillic is present.
 *
 * Output:
 *   - docs/design/mobile/audits/sprint10-i18n-audit.md
 *   - console summary (counts per category) plus a `process.exitCode`
 *     of 0 (we want CI to surface the report, not block on it).
 */

import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = join(HERE, '..');
const REPO_ROOT = join(MOBILE_ROOT, '..');
const REPORT_PATH = join(
  REPO_ROOT,
  'docs/design/mobile/audits/sprint10-i18n-audit.md',
);

// ---------- file walk ----------

const SCAN_ROOTS = [join(MOBILE_ROOT, 'app'), join(MOBILE_ROOT, 'src')];
const SCAN_EXTENSIONS = new Set(['.tsx']);
// Persistence / data layers can have legitimate non-translated string
// literals (storage keys, schema fields, etc) - skip them.
const SKIP_DIRS = new Set([
  'node_modules',
  '__tests__',
  '__mocks__',
  'data', // synced JSON, not source
  '.expo',
]);

async function walkSource(root) {
  const out = [];
  if (!existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        const dot = entry.name.lastIndexOf('.');
        const ext = dot >= 0 ? entry.name.slice(dot) : '';
        if (SCAN_EXTENSIONS.has(ext)) {
          out.push(full);
        }
      }
    }
  }
  return out;
}

// ---------- string scanners ----------

const CYRILLIC_RE = /[Ѐ-ӿ]/;
// Common ASCII-letter accented forms used by ES/FR/DE/IT/PL.
const ACCENTED_RE = /[À-ſ]/;

/**
 * Strip block + line comments AND string-template/escape sequences from
 * a chunk of source for line-by-line scanning. Quick and dirty - good
 * enough for the heuristics we care about.
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

/** True if the line is inside a `tp(`/`tl(`/`legacyPick(` first-arg ru position. */
function isInsideTpFirstArg(line, col) {
  // Heuristic: the position must be inside a quoted string AND the
  // immediately-preceding non-whitespace char before the open quote is
  // `(` AND that `(` is preceded by `tp` or `tl` or `legacyPick`.
  const before = line.slice(0, col);
  const m = before.match(/(tp|tl|legacyPick)\s*\(\s*['"`]$/);
  return Boolean(m);
}

/**
 * Walks a string-literal occurrence's surrounding source to decide if
 * it is inside a `tp(...)` call (any positional slot). We only care
 * about excluding leaks that ARE genuine translation keys.
 */
function withinTranslationCall(text, idx) {
  // Walk backwards to the nearest `(` and check the identifier before it.
  // Handles only one nesting level - good enough for screen code.
  let depth = 0;
  for (let i = idx; i >= 0; i -= 1) {
    const c = text[i];
    if (c === ')') depth += 1;
    else if (c === '(') {
      if (depth === 0) {
        const before = text.slice(Math.max(0, i - 24), i).trim();
        if (/(?:^|[^A-Za-z0-9_])(tp|tl|legacyPick|legacyPickArray|t)$/.test(before)) {
          return true;
        }
        return false;
      }
      depth -= 1;
    }
  }
  return false;
}

/**
 * For a template-literal raw body, check that every Cyrillic substring
 * is enclosed in a `tp(...)` / `tl(...)` / `legacyPick(...)` call. A
 * cheap heuristic: scan for runs of Cyrillic characters and confirm the
 * preceding 24 chars contain `tp(` / `tl(` / `legacyPick(` / `t(` plus
 * the matching opening quote.
 */
function cyrillicAllInsideTpInside(body) {
  let i = 0;
  while (i < body.length) {
    if (CYRILLIC_RE.test(body[i])) {
      // Walk left to find the surrounding quote then check what precedes
      // that quote.
      const before = body.slice(0, i);
      const quoteIdx = Math.max(
        before.lastIndexOf("'"),
        before.lastIndexOf('"'),
      );
      if (quoteIdx < 0) return false;
      const ctx = before.slice(Math.max(0, quoteIdx - 24), quoteIdx).trim();
      if (!/(?:^|[^A-Za-z0-9_])(tp|tl|legacyPick|t)\s*\(\s*$/.test(ctx)) {
        return false;
      }
      // Skip past the closing quote.
      const closing = body.indexOf(before[quoteIdx], i);
      i = closing < 0 ? body.length : closing + 1;
      continue;
    }
    i += 1;
  }
  return true;
}

/**
 * Walk backwards from `idx` to the matching enclosing `{` (skipping
 * nested braces) and check whether the key immediately before that `{`
 * is a Lang code (`ru:` / `en:` / `pl:` / `es:` / `fr:` / `de:` / `it:`).
 * If yes, the string literal is inside a translation table and should
 * not be flagged.
 */
function isInsideLangTableEntry(text, idx) {
  let depth = 0;
  for (let i = idx - 1; i >= 0; i -= 1) {
    const c = text[i];
    if (c === '}') depth += 1;
    else if (c === '{') {
      if (depth === 0) {
        // Found the innermost enclosing brace. Look at the colon-key
        // before it.
        const ctx = text.slice(Math.max(0, i - 24), i).trim();
        return /(?:^|[^A-Za-z0-9_])(ru|en|pl|es|fr|de|it)\s*:\s*$/.test(ctx);
      }
      depth -= 1;
    }
  }
  return false;
}

function findStringLiterals(text) {
  // Captures double, single, and template literals. Templates may span
  // multiple lines; we limit the body to non-backtick chars to avoid
  // catastrophic regex on large files. JSX string attributes (="...")
  // are picked up as double-quote strings too.
  const re = /(?:`((?:[^`\\]|\\.)*)`)|(?:"((?:[^"\\]|\\.)*)")|(?:'((?:[^'\\]|\\.)*)')/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const value = m[1] ?? m[2] ?? m[3] ?? '';
    out.push({ index: m.index, value, raw: m[0] });
  }
  return out;
}

function indexToLineCol(text, idx) {
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < idx; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
      lastNl = i;
    }
  }
  return { line, col: idx - lastNl - 1 };
}

// ---------- tp() arity scan ----------

const TP_CALL_RE = /\btp\s*\(/g;

function findTpCalls(text) {
  const out = [];
  let m;
  while ((m = TP_CALL_RE.exec(text)) !== null) {
    const start = m.index + m[0].length;
    // Walk forward to the matching paren, respecting nesting and quotes.
    let depth = 1;
    let i = start;
    let inStr = null; // null | "'" | '"' | '`'
    while (i < text.length && depth > 0) {
      const c = text[i];
      if (inStr) {
        if (c === '\\') {
          i += 2;
          continue;
        }
        if (c === inStr) inStr = null;
      } else {
        if (c === '"' || c === "'" || c === '`') inStr = c;
        else if (c === '(') depth += 1;
        else if (c === ')') depth -= 1;
      }
      i += 1;
    }
    if (depth === 0) {
      const body = text.slice(start, i - 1);
      out.push({ start: m.index, end: i, body });
    }
  }
  return out;
}

/**
 * Splits the comma-separated args of a tp(...) body, respecting nested
 * parens / brackets / braces / template strings. Returns the argument
 * list as an array of trimmed strings.
 */
function splitArgs(body) {
  const out = [];
  let depth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inStr = null;
  let last = 0;
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (inStr) {
      if (c === '\\') {
        i += 1;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if (c === '{') braceDepth += 1;
    else if (c === '}') braceDepth -= 1;
    else if (c === '[') bracketDepth += 1;
    else if (c === ']') bracketDepth -= 1;
    else if (c === ',' && depth === 0 && braceDepth === 0 && bracketDepth === 0) {
      out.push(body.slice(last, i).trim());
      last = i + 1;
    }
  }
  const tail = body.slice(last).trim();
  if (tail.length > 0) out.push(tail);
  return out;
}

// ---------- JSX hardcoded-text scan ----------

/**
 * Heuristic: a JSX text node sits between `>` and `<`, contains 3+ words,
 * is mostly ASCII letters, and is not entirely whitespace / numeric /
 * punctuation. We strip leading/trailing whitespace and skip nodes that
 * already contain `{` (the runtime expression sentinel).
 *
 * To filter the false positives we must also gate on:
 *   - The match must not contain `=>` (arrow function returns).
 *   - The match must not look like a TS generic body (`useState<X>`).
 *   - The opening `>` must be preceded by something that plausibly looks
 *     like a JSX closing token: `</Identifier`, `<Identifier ...`, or a
 *     `}` / `)` from an interpolation. We do not track JSX context fully
 *     - false positives are flagged but each is reviewed manually.
 */
function findJsxText(text) {
  const re = />([^<>{}]+)</g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1];
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (/^[\s\d\W_]+$/.test(trimmed)) continue;

    // Drop arrow / TS noise: `=> something`, `useState<X>` etc.
    if (/=>/.test(trimmed)) continue;
    if (/^\s*\(/.test(trimmed)) continue;
    if (/^\s*[a-z]+\s*\(/.test(trimmed)) continue; // method calls
    if (/^\s*[a-z]+\s*[?:]/.test(trimmed)) continue; // ternary fragments
    if (/[;}=]/.test(trimmed)) continue; // statement noise
    if (/^[A-Za-z_]+\s*<\s*[A-Za-z_]+/.test(trimmed)) continue;

    // Actual JSX text rarely contains parentheses around full clauses.
    if (/[()]/.test(trimmed)) continue;

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    if (wordCount < 3) continue;
    // Skip pure-CSS / JSX-attribute-ish leftovers.
    if (/^[\s'":,.]+$/.test(trimmed)) continue;

    // The opening `>` is the last char of `m[0][0]`. Look at the chars
    // before to see if this looks like a JSX context.
    const before = text.slice(Math.max(0, m.index - 60), m.index);
    if (!/<[A-Za-z][A-Za-z0-9.]*[^<>]*$/.test(before) && !/[)}]\s*$/.test(before)) {
      continue;
    }

    out.push({ index: m.index + 1, value: trimmed });
  }
  return out;
}

// ---------- main scan ----------

function classifyTpCall(call) {
  // Returns 'ok' | 'no-extras' | 'arity' | 'brand-stable'
  const args = splitArgs(call.body);
  if (args.length < 3) return 'arity';
  if (args.length < 4) {
    // If all three args are the same string literal (brand names like
    // 'Bootcamp', 'RRS', 'COLREGS'), treat as a deliberate stable
    // string and skip the extras requirement.
    if (
      args[0] === args[1] &&
      args[1] === args[2] &&
      /^['"`].*['"`]$/.test(args[0])
    ) {
      return 'brand-stable';
    }
    return 'no-extras';
  }
  // 4+ args: assume the last is an extras object.
  return 'ok';
}

function fileShouldSkipNonEnglishLeaks(rel) {
  // The persistence layer can carry storage-key strings that contain
  // accented chars only for fixtures - these are not user-facing.
  // Scripts directory is also fine. (The scanner already excludes
  // these via SCAN_ROOTS / extensions, but keep the safety net.)
  return rel.includes('/data/') || rel.includes('/scripts/');
}

async function scanFile(absPath) {
  const text = await readFile(absPath, 'utf8');
  const stripped = stripComments(text);
  const findings = [];
  const rel = relative(REPO_ROOT, absPath);

  // 1) Cyrillic + non-English leaks (string literals).
  const literals = findStringLiterals(stripped);
  for (const lit of literals) {
    if (lit.value.length === 0) continue;
    const inTrans = withinTranslationCall(stripped, lit.index);
    if (inTrans) continue;
    // LegacyLocalized<> flat-shape fields (`titleRu: '...'`, `bodyEn: '...'`,
    // and the lookup-table form `ru: '...'`) are an accepted pattern - skip.
    const before = stripped.slice(Math.max(0, lit.index - 32), lit.index);
    if (/(?:[A-Za-z]+(?:Ru|En|Pl|Es|Fr|De|It)|(?:^|[\s,{])(?:ru|en|pl|es|fr|de|it))\s*:\s*$/.test(before)) {
      continue;
    }
    // Nested-translation-table form: a string literal inside a value
    // whose nearest enclosing key is `ru:` / `en:` / etc (e.g.
    // `ru: { title: '...' }`). Walk backwards through the file to find
    // the innermost open `{` and confirm the preceding key matches.
    if (isInsideLangTableEntry(stripped, lit.index)) {
      continue;
    }
    if (CYRILLIC_RE.test(lit.value)) {
      // Template literals carry their interpolations verbatim in their
      // raw value; if every Cyrillic run inside the literal is itself
      // wrapped in `tp(...)` / `tl(...)` / `legacyPick(...)` (e.g. an
      // `accessibilityLabel`), the literal is fine.
      if (lit.raw.startsWith('`') && cyrillicAllInsideTpInside(lit.value)) continue;
      const { line, col } = indexToLineCol(text, lit.index);
      findings.push({
        kind: 'cyrillic-leak',
        line,
        col,
        snippet: truncate(lit.value),
      });
      continue;
    }
    if (ACCENTED_RE.test(lit.value) && !fileShouldSkipNonEnglishLeaks(rel)) {
      // Skip values that look like email addresses, URL fragments, file paths.
      if (/[a-z0-9._%+-]+@/.test(lit.value)) continue;
      if (/https?:\/\//.test(lit.value)) continue;
      const { line, col } = indexToLineCol(text, lit.index);
      findings.push({
        kind: 'non-english-leak',
        line,
        col,
        snippet: truncate(lit.value),
      });
    }
  }

  // 2) tp() arity / extras.
  const tpCalls = findTpCalls(stripped);
  for (const call of tpCalls) {
    const verdict = classifyTpCall(call);
    if (verdict === 'ok' || verdict === 'brand-stable') continue;
    const { line, col } = indexToLineCol(text, call.start);
    findings.push({
      kind: verdict === 'arity' ? 'tp-arity' : 'tp-no-extras',
      line,
      col,
      snippet: truncate(stripped.slice(call.start, Math.min(call.end, call.start + 80))),
    });
  }

  // 3) JSX hardcoded English text.
  const jsxNodes = findJsxText(stripped);
  for (const node of jsxNodes) {
    const inTrans = withinTranslationCall(stripped, node.index);
    if (inTrans) continue;
    // Many false positives are legitimate (numbers, glyphs, separators,
    // punctuation-only). The 3+ word filter inside `findJsxText` already
    // helps; here we add a second filter: must have at least one ASCII
    // letter sequence of length >= 3.
    if (!/[A-Za-z]{3,}/.test(node.value)) continue;
    const { line, col } = indexToLineCol(text, node.index);
    findings.push({
      kind: 'hardcoded-jsx',
      line,
      col,
      snippet: truncate(node.value),
    });
  }

  return findings;
}

function truncate(s, max = 80) {
  if (s.length <= max) return s.replace(/\n/g, ' ');
  return `${s.slice(0, max - 1).replace(/\n/g, ' ')}...`;
}

function fmtRow({ rel, line, col, kind, snippet }) {
  return `| \`${rel}:${line}\` | ${kind} | ${escapeMd(snippet)} |`;
}

function escapeMd(s) {
  return s.replace(/\|/g, '\\|').replace(/`/g, '\\`');
}

// ---------- report renderer ----------

function summarize(findings) {
  const counts = {
    'cyrillic-leak': 0,
    'non-english-leak': 0,
    'tp-arity': 0,
    'tp-no-extras': 0,
    'hardcoded-jsx': 0,
  };
  for (const f of findings) {
    counts[f.kind] = (counts[f.kind] ?? 0) + 1;
  }
  return counts;
}

function renderReport(allFindings, counts, fileCount) {
  const lines = [];
  lines.push('# Sprint 10 mobile i18n audit');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Files scanned: ${fileCount}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Category | Count |');
  lines.push('| --- | --- |');
  for (const k of Object.keys(counts)) {
    lines.push(`| ${k} | ${counts[k]} |`);
  }
  lines.push(`| **TOTAL** | **${allFindings.length}** |`);
  lines.push('');
  lines.push('## Categories');
  lines.push('');
  lines.push(
    '- **cyrillic-leak**: Cyrillic string literal outside `tp(...)` / `tl(...)` / `legacyPick(...)`. Always a P0 - the language switcher cannot move it.',
  );
  lines.push(
    '- **non-english-leak**: PL/ES/FR/DE/IT accented string literal outside `tp(...)`. Heuristic - email / URL fragments excluded.',
  );
  lines.push(
    '- **tp-arity**: `tp(...)` invocation with < 3 args (missing PL even though it is required). Always a P1.',
  );
  lines.push(
    '- **tp-no-extras**: `tp(ru, en, pl)` without the `{es, fr, de, it}` overlay. P3 - those langs fall back to EN.',
  );
  lines.push(
    '- **hardcoded-jsx**: 3+ word English string in a JSX text node, not wrapped in a function call. Heuristic - some false positives.',
  );
  lines.push('');

  // Group by file for easier triage.
  const byFile = new Map();
  for (const f of allFindings) {
    const list = byFile.get(f.rel) ?? [];
    list.push(f);
    byFile.set(f.rel, list);
  }

  if (byFile.size === 0) {
    lines.push('## Findings');
    lines.push('');
    lines.push('_No findings._');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('## Findings by file');
  lines.push('');
  const sortedFiles = Array.from(byFile.keys()).sort();
  for (const file of sortedFiles) {
    const entries = byFile.get(file);
    lines.push(`### \`${file}\` (${entries.length})`);
    lines.push('');
    lines.push('| Location | Kind | Snippet |');
    lines.push('| --- | --- | --- |');
    for (const f of entries) {
      lines.push(fmtRow({ ...f, rel: file }));
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------- entry point ----------

async function main() {
  const allFiles = (await Promise.all(SCAN_ROOTS.map(walkSource))).flat();
  const findings = [];
  for (const abs of allFiles) {
    const fileFindings = await scanFile(abs);
    if (fileFindings.length === 0) continue;
    const rel = relative(REPO_ROOT, abs);
    for (const f of fileFindings) findings.push({ ...f, rel });
  }

  const counts = summarize(findings);
  const md = renderReport(findings, counts, allFiles.length);
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, md, 'utf8');

  // Console summary.
  const totalLine = `i18n audit: ${findings.length} finding${findings.length === 1 ? '' : 's'} across ${allFiles.length} file${allFiles.length === 1 ? '' : 's'}.`;
  const breakdown = Object.entries(counts)
    .map(([k, n]) => `${k}=${n}`)
    .join('  ');
  process.stdout.write(`${totalLine}\n  ${breakdown}\n`);
  process.stdout.write(`Report: ${relative(process.cwd(), REPORT_PATH)}\n`);

  // Always exit 0 - report is informational.
  process.exitCode = 0;
}

await main();

async function statSafe(p) {
  try {
    return await stat(p);
  } catch {
    return null;
  }
}
// referenced to keep imports tidy; helper used during development.
void statSafe;
