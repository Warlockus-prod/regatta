#!/usr/bin/env node
// ============================================================================
// Translate data file fields to a new language via Claude API.
//
// Reads an already-migrated data file (shape: `{ field: { ru, en, pl, ... }}`),
// finds every `LocalizedText` object missing the target lang, sends batches
// to Claude with the sailing-terminology system prompt, then writes back
// with the new key added.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-... node scripts/translate-data.mjs \
//       --file src/data/missions.ts --lang es
//
//   ANTHROPIC_API_KEY=sk-... node scripts/translate-data.mjs \
//       --file src/data/missions.ts --lang es,fr,de,it      # 4 at once
//
//   node scripts/translate-data.mjs --file <f> --lang es --dry   # plan only
//
// Prerequisites:
// - File already migrated via `scripts/migrate-data-fields.mjs` so fields
//   are `{ ru, en, pl }` (not `titleRu/titleEn/titlePl`).
// - npm install @anthropic-ai/sdk   (already in deps for /api/coach).
//
// Safety:
// - Never overwrites an existing target-lang value (skips if present).
// - Dry run prints the plan without touching files or calling API.
// - Rate-limit protected: sequential calls with a small delay. For bigger
//   batches, swap to Anthropic's message-batches API (example commented).
//
// Output:
// - Writes the file in-place with target lang inserted. Runs tsc would be
//   a NICE next step but this script doesn't force it - you check.
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
  console.error('usage: node scripts/translate-data.mjs --file <path> --lang <code[,code]> [--dry]');
  process.exit(1);
}

const LANG_NAMES = {
  ru: 'Russian',
  en: 'English',
  pl: 'Polish (no diacritics - use ASCII only)',
  es: 'Spanish (Castilian)',
  fr: 'French (standard France)',
  de: 'German (standard Hochdeutsch)',
  it: 'Italian (standard)',
};

const glossaryPath = path.join(__dirname, 'sailing-glossary.md');
const glossary = fs.readFileSync(glossaryPath, 'utf8');

const systemPrompt = `You are translating sailing-app strings from Russian (source) into {TARGET_LANG_NAME}.

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
   ASCII. "swiatlo", not "światło".
4. Keep proper nouns unchanged: Bavaria 46, Regatta, World Sailing, Claude, AI coach.
5. Keep English acronyms unchanged: TWA, AWA, AWS, TWS, VMG, RRS, COLREGS, MOB.
6. Preserve sentence tone and length: short UI labels stay short, long lesson
   paragraphs stay at similar length.
7. If the source has emoji or markdown, preserve them exactly.
8. Output ONLY the translation. No explanations, no quotes around it, no
   "Translation:" prefix, no trailing period unless the original has one.`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

// --- File parsing: find all LocalizedText-shaped objects in the file ---

const filePath = path.resolve(args.file);
if (!fs.existsSync(filePath)) {
  console.error('file not found:', filePath);
  process.exit(1);
}
const src = fs.readFileSync(filePath, 'utf8');

// Match objects that look like `{ ru: '...', en: '...', pl: '...' }`,
// possibly with more langs already. Capture the full match + the ru value.
// Intentionally line-based: a full TS AST would be heavier and the shape
// is consistent after the data-fields codemod.
//
// Pattern tolerates any ordering of ru/en/pl/es/etc and quotes them in any
// of '"` style.
const LOC_OBJECT = /\{\s*((?:\w+:\s*(?:'[^']*'|"[^"]*"|`[^`]*`)\s*,?\s*)+)\}/g;

function parseLocObject(bodyText) {
  const out = {};
  const entryRe = /(\w+):\s*(['"`])([\s\S]*?)\2\s*,?/g;
  let m;
  while ((m = entryRe.exec(bodyText)) !== null) {
    out[m[1]] = { quote: m[2], text: m[3] };
  }
  return out;
}

function buildLocObjectText(entries, order) {
  // order = desired key order: ru, en, pl, es, fr, de, it (catalog order)
  const parts = [];
  for (const key of order) {
    if (!entries[key]) continue;
    const { quote, text } = entries[key];
    parts.push(`${key}: ${quote}${text}${quote}`);
  }
  return `{ ${parts.join(', ')} }`;
}

const CATALOG_ORDER = ['ru', 'en', 'pl', 'es', 'fr', 'de', 'it'];

// Find all LocalizedText shaped objects in the file
const pending = []; // { match, entries, missing: Set<lang>, start, end }
let m;
const LOC_PROBE = /\{(\s*(?:ru|en|pl|es|fr|de|it):\s*['"`][\s\S]*?)\}/g;
while ((m = LOC_PROBE.exec(src)) !== null) {
  const body = m[1];
  const entries = parseLocObject(body);
  // Only interested if it has at least `ru` (source) and one of `en`/`ru`
  // - this filters out unrelated `{ ru: 'X' }` configs (unlikely but safe)
  if (!entries.ru) continue;
  const missing = args.langs.filter((l) => !entries[l]);
  if (missing.length === 0) continue;
  pending.push({
    start: m.index,
    end: m.index + m[0].length,
    entries,
    missing,
  });
}

console.log(`File: ${path.relative(ROOT, filePath)}`);
console.log(`Target langs: ${args.langs.join(', ')}`);
console.log(`LocalizedText objects with at least one target lang missing: ${pending.length}`);

if (args.dry) {
  console.log('\nDry run - no API calls. First 5 strings that would be translated:');
  for (const p of pending.slice(0, 5)) {
    console.log(`  RU: "${p.entries.ru.text.slice(0, 80)}..."`);
    console.log(`  missing: ${p.missing.join(', ')}`);
  }
  console.log('\nTotal RU characters to translate:', pending.reduce((a, p) => a + p.entries.ru.text.length * p.missing.length, 0));
  console.log('Estimated cost (rough):', '$', (pending.reduce((a, p) => a + p.entries.ru.text.length * p.missing.length, 0) * 3 / 4 / 1_000_000 * 0.8).toFixed(2), '- claude-haiku input+output at avg $0.80 per 1M tok (Haiku 4.5 list)');
  console.log('Estimated time at 1s/call:', Math.round(pending.reduce((a, p) => a + p.missing.length, 0) / 60), 'min');
  process.exit(0);
}

// --- API calls (sequential - small dataset, keep things simple) ---

async function translate(ruText, targetLang) {
  const system = systemPrompt.replace('{TARGET_LANG_NAME}', LANG_NAMES[targetLang] ?? targetLang);
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: ruText }],
  });
  const text = response.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
  return text;
}

// Work backward through file so offsets stay valid after each rewrite
let working = src;
let totalCalls = 0;
let failed = 0;

for (let idx = pending.length - 1; idx >= 0; idx--) {
  const p = pending[idx];
  const quoted = p.entries.ru.text;
  for (const lang of p.missing) {
    try {
      const translated = await translate(quoted, lang);
      totalCalls += 1;
      // Preserve the RU quote style
      p.entries[lang] = { quote: p.entries.ru.quote, text: translated };
      console.log(`  ${lang}: ${quoted.slice(0, 40)}... -> ${translated.slice(0, 40)}...`);
    } catch (err) {
      failed += 1;
      console.error(`  FAIL ${lang} on "${quoted.slice(0, 40)}...":`, err.message);
    }
    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 100));
  }

  // Rebuild this object in the file
  const newText = buildLocObjectText(p.entries, CATALOG_ORDER);
  working = working.slice(0, p.start) + newText + working.slice(p.end);
}

fs.writeFileSync(filePath, working, 'utf8');
console.log(`\nDone. API calls: ${totalCalls}, failures: ${failed}`);
console.log(`File rewritten: ${path.relative(ROOT, filePath)}`);
console.log('\nNext: npx tsc --noEmit && npm run build');
