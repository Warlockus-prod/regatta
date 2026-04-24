#!/usr/bin/env node
// ============================================================================
// translate-data-flat.mjs
//
// Extend a data file's existing flat-shape translation trios
// (`fooRu / fooEn / fooPl`) with new-language equivalents (`fooEs`, `fooFr`,
// `fooDe`, `fooIt`) via the Claude API.
//
// Unlike translate-data.mjs (which expects the new LocalizedText object
// shape), this script operates on the ORIGINAL data structure so no
// pre-migration is needed.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-... node scripts/translate-data-flat.mjs \
//       --file src/data/missions.ts --lang es,fr,de,it
//
//   node scripts/translate-data-flat.mjs --file <f> --lang es --dry
//
// Supported field base names (detected automatically based on *Ru/*En/*Pl
// trio pattern): any field like `titleRu + titleEn + titlePl` on the same
// object, single-line or multi-line.
//
// Safety:
// - Never overwrites an existing target-lang value (skips if present).
// - Dry run prints the plan without touching files or calling API.
// - Idempotent: running twice produces the same result.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function parseArgs() {
  const out = { file: null, langs: [], dry: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') out.file = argv[++i];
    else if (a === '--lang') out.langs = argv[++i].split(',').map((s) => s.trim());
    else if (a === '--dry') out.dry = true;
  }
  return out;
}

const args = parseArgs();
if (!args.file || args.langs.length === 0) {
  console.error('usage: node scripts/translate-data-flat.mjs --file <path> --lang <code[,code]> [--dry]');
  process.exit(1);
}

const LANG_META = {
  es: { name: 'Spanish (Castilian)', suffix: 'Es' },
  fr: { name: 'French (standard France)', suffix: 'Fr' },
  de: { name: 'German (standard Hochdeutsch)', suffix: 'De' },
  it: { name: 'Italian (standard)', suffix: 'It' },
};

for (const l of args.langs) {
  if (!LANG_META[l]) {
    console.error(`Unsupported lang: ${l}. Supported: ${Object.keys(LANG_META).join(', ')}`);
    process.exit(1);
  }
}

const glossaryPath = path.join(__dirname, 'sailing-glossary.md');
const glossary = fs.readFileSync(glossaryPath, 'utf8');

const systemPrompt = (targetLangName) => `You are translating sailing-app strings from Russian (source) into ${targetLangName}.

Context: Regatta is a teaching app for sailboat racing. The audience is
adult hobbyist sailors preparing for a weekend race. Translation must use
real sailing terminology used by native speakers of the target language,
not literal/dictionary translations.

TERMINOLOGY REFERENCE (authoritative - use these exact terms):

${glossary}

CRITICAL RULES:
1. Use the glossary terms verbatim. Do not paraphrase or use "safer" synonyms.
2. Never use em-dash (U+2014) or en-dash (U+2013). Use plain ASCII hyphen "-".
3. Polish specifically: strip all diacritics (ą ę ż ł ó ć ń ś ź). Use plain
   ASCII. "swiatlo", not "światło". (Does not apply when target is not Polish.)
4. Keep proper nouns unchanged: Bavaria 46, Regatta, World Sailing, Claude, AI coach.
5. Keep English acronyms unchanged: TWA, AWA, AWS, TWS, VMG, RRS, COLREGS, MOB.
6. Preserve sentence tone and length: short UI labels stay short, long lesson
   paragraphs stay at similar length.
7. If the source has emoji or markdown, preserve them exactly.
8. Output ONLY the translation. No explanations, no quotes around it, no
   "Translation:" prefix, no trailing period unless the original has one.`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

// ---------------------------------------------------------------------------
// File scan: find every {fooRu + fooEn + fooPl} trio, with surrounding info
// so we know where to splice in the new-lang fields.
// ---------------------------------------------------------------------------

const filePath = path.resolve(args.file);
if (!fs.existsSync(filePath)) {
  console.error('file not found:', filePath);
  process.exit(1);
}
const src = fs.readFileSync(filePath, 'utf8');

// Find all `<field>Ru: '<value>'` positions; for each, confirm the sibling
// `<field>En` and `<field>Pl` exist on the same object.
const RU_FIELD_RE = /(\s*)(\w+?)Ru:\s*(['"`])([\s\S]*?)\3,?/g;

/** A translation trio found in the source file. */
const trios = [];
let m;
while ((m = RU_FIELD_RE.exec(src)) !== null) {
  const [full, _indent, baseField, _quote, ruValue] = m;
  // Look for matching En and Pl within a reasonable window after the Ru field.
  const after = src.slice(m.index + full.length, m.index + full.length + 5000);
  const enRe = new RegExp(`(\\s*)${baseField}En:\\s*(['"\`])([\\s\\S]*?)\\2,?`);
  const plRe = new RegExp(`(\\s*)${baseField}Pl:\\s*(['"\`])([\\s\\S]*?)\\2,?`);
  const enM = after.match(enRe);
  const plM = after.match(plRe);
  if (!enM || !plM) continue;
  trios.push({
    baseField,
    ruValue,
    ruStart: m.index,
    ruEnd: m.index + full.length,
    // Track where plPl closes so we know where to insert new-lang fields
    plEnd: m.index + full.length + (plM.index ?? 0) + plM[0].length,
  });
}

console.log(`File: ${path.relative(ROOT, filePath)}`);
console.log(`Target langs: ${args.langs.join(', ')}`);
console.log(`Translation trios detected: ${trios.length}`);

// Filter: skip trios that already have all target-lang fields.
const pending = [];
for (const t of trios) {
  const missing = args.langs.filter((l) => {
    const fieldName = t.baseField + LANG_META[l].suffix;
    const exists = new RegExp(`\\b${fieldName}:\\s*['"\`]`).test(
      src.slice(t.ruStart, t.plEnd + 200),
    );
    return !exists;
  });
  if (missing.length > 0) pending.push({ ...t, missing });
}

console.log(`Trios needing translation (at least 1 target lang): ${pending.length}`);

if (args.dry) {
  console.log('\nDry run - no API calls. First 5 trios:');
  for (const p of pending.slice(0, 5)) {
    console.log(`  ${p.baseField}Ru: "${p.ruValue.slice(0, 70)}..."`);
    console.log(`    missing: ${p.missing.join(', ')}`);
  }
  const totalChars = pending.reduce((a, p) => a + p.ruValue.length * p.missing.length, 0);
  console.log('\nTotal RU source chars to translate:', totalChars);
  console.log('Estimated tokens:', Math.round(totalChars / 3));
  console.log('Estimated cost (Haiku 4.5 roughly $0.80/1M tok blended):', '$' + (totalChars / 3 / 1_000_000 * 0.8).toFixed(3));
  console.log('Estimated wallclock at 1s/call:', Math.round(pending.reduce((a, p) => a + p.missing.length, 0) / 60), 'min');
  process.exit(0);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Translate + splice. We work back-to-front so earlier offsets stay valid.
// ---------------------------------------------------------------------------

async function translate(ruText, targetLang) {
  const meta = LANG_META[targetLang];
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt(meta.name),
    messages: [{ role: 'user', content: ruText }],
  });
  const text = response.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
  return text;
}

let working = src;
let totalCalls = 0;
let failed = 0;

// Sort pending by plEnd descending so splicing doesn't shift earlier offsets
pending.sort((a, b) => b.plEnd - a.plEnd);

for (const p of pending) {
  const additions = [];
  // Need to know indentation for the inserted lines. Peek at the original
  // Ru line to see leading whitespace.
  const ruLineStart = working.lastIndexOf('\n', p.ruStart) + 1;
  const ruLineIndent = working.slice(ruLineStart, p.ruStart + (working.slice(ruLineStart, p.ruStart).length));
  // simpler: capture indentation by regex on the Ru line
  const indentMatch = working.slice(ruLineStart).match(/^(\s*)/);
  const indent = indentMatch?.[1] ?? '    ';

  for (const lang of p.missing) {
    try {
      const translated = await translate(p.ruValue, lang);
      totalCalls += 1;
      // Escape single quotes in the result
      const escaped = translated.replace(/'/g, "\\'");
      additions.push(`${indent}${p.baseField}${LANG_META[lang].suffix}: '${escaped}',`);
      console.log(`  ${lang}: ${p.baseField} <- ${p.ruValue.slice(0, 45)}... => ${translated.slice(0, 45)}...`);
    } catch (err) {
      failed += 1;
      console.error(`  FAIL ${lang} on ${p.baseField}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  if (additions.length > 0) {
    // Insert right after the Pl line. Need to find the end-of-line after plEnd.
    const insertAt = working.indexOf('\n', p.plEnd);
    const pos = insertAt === -1 ? p.plEnd : insertAt;
    working = working.slice(0, pos) + '\n' + additions.join('\n') + working.slice(pos);
  }
}

fs.writeFileSync(filePath, working, 'utf8');
console.log(`\nDone. API calls: ${totalCalls}, failures: ${failed}`);
console.log(`File rewritten: ${path.relative(ROOT, filePath)}`);
console.log('\nNext: npx tsc --noEmit && npm run build');
