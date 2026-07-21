// Pre-generate the fixed radio phrase clips ONCE, so the "listen" buttons in the
// cheat sheet / theory play instantly at zero runtime cost (no OpenAI per tap).
//
// Run:  node --experimental-strip-types scripts/pregen-radio-audio.mjs
// Idempotent: existing clips are skipped, so it is cheap to re-run.
//
// Generator: by default it POSTs the DEPLOYED /api/radio-tts (which holds the
// working OpenAI key on the VPS and already applies the exact radio voice) - so
// a static clip is byte-for-byte what a live tap would return, and no local
// OpenAI key is needed. Set PREGEN_VIA=openai with a working OPENAI_API_KEY to
// hit OpenAI directly instead. The clips are CLEAN speech; the radio band-pass
// is applied at playback (radioPlayback.ts).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHONETIC, DIGITS, PROWORDS, SMCP } from '../src/app/radio/cheatData.ts';
import { REACTION_LINES } from '../src/app/radio/symulator/stationReaction.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'radio-audio');
const MANIFEST_PATH = join(ROOT, 'src', 'app', 'radio', 'audio', 'pregenManifest.json');

const TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const VOICE = process.env.OPENAI_TTS_VOICE || 'ash';
const STYLE = [
  'You are a Polish coast radio station operator on marine VHF.',
  'Delivery: clipped, flat, procedural. No warmth, no rising intonation, no drama.',
  'Even pace, short pauses between call signs and between groups of digits.',
  'Enunciate every digit separately. Speak proper nouns clearly.',
  'You are reading a routine radio transmission, not performing it.',
].join(' ');

function apiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*OPENAI_API_KEY\s*=\s*(.*)$/);
      if (m) return m[1].replace(/^["']|["']$/g, '').trim();
    }
  } catch { /* no .env.local */ }
  return null;
}

// dialogues.ts cross-imports dialogueGrading, so it will not import standalone
// under strip-types. The youSay model lines are plain single-quoted literals, so
// extract them from the source text instead.
function dialogueLines() {
  const src = readFileSync(join(ROOT, 'src', 'app', 'radio', 'rozmowa', 'dialogues.ts'), 'utf8');
  const out = [];
  for (const m of src.matchAll(/youSay:\s*'([^']*)'/g)) out.push(m[1]);
  return out;
}

// The phrases to bake. Keep this the single source of what is "static"; the
// SpeakButton just looks the text up in the manifest.
function phrases() {
  const out = new Set();
  for (const [, word] of PHONETIC) out.add(word);          // Alfa, Bravo, ...
  for (const [, word] of DIGITS) out.add(word);            // Nadazero, Unaone, ...
  for (const [pw] of PROWORDS) out.add(pw.replace(/\s*\/\s*/g, ', ')); // OVER, ROGER, RECEIVED, ...
  for (const [phrase] of SMCP) out.add(phrase);            // How do you read me? ...
  for (const line of REACTION_LINES) out.add(line);        // SAY AGAIN, OVER. ...
  for (const line of dialogueLines()) out.add(line);       // the model transmissions
  return [...out];
}

const fileFor = (text) => createHash('sha1').update(text).digest('hex').slice(0, 16) + '.mp3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIA = process.env.PREGEN_VIA || 'prod';
const PROD_ENDPOINT = process.env.PREGEN_ENDPOINT || 'https://weektoregatta.com/api/radio-tts';

async function synthOpenAI(text, key) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: TTS_MODEL, voice: VOICE, input: text, instructions: STYLE, response_format: 'mp3' }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function synthProd(text) {
  const res = await fetch(PROD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('application/json')) throw new Error('endpoint returned JSON (no key / fallback)');
  return Buffer.from(await res.arrayBuffer());
}

let key = null;
if (VIA === 'openai') {
  key = apiKey();
  if (!key) { console.error('FATAL: PREGEN_VIA=openai but no OPENAI_API_KEY'); process.exit(1); }
}
const synth = (text) => (VIA === 'openai' ? synthOpenAI(text, key) : synthProd(text));
console.log(`generator: ${VIA === 'openai' ? 'OpenAI direct' : PROD_ENDPOINT}`);
mkdirSync(OUT_DIR, { recursive: true });

const manifest = {};
let made = 0, skipped = 0;
for (const text of phrases()) {
  const file = fileFor(text);
  manifest[text] = file;
  const path = join(OUT_DIR, file);
  if (existsSync(path)) { skipped += 1; continue; }
  try {
    const buf = await synth(text);
    writeFileSync(path, buf);
    made += 1;
    console.log(`  made  ${text}  ->  ${file}  (${buf.length} B)`);
    await sleep(400); // stay well under the endpoint rate limit
  } catch (e) {
    console.error(`  FAIL  ${text}: ${e.message}`);
    delete manifest[text]; // do not claim a clip we failed to write
  }
}

// Sort keys so the committed manifest diff is stable.
const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n');
console.log(`\npregen done: ${made} made, ${skipped} skipped, ${Object.keys(sorted).length} in manifest`);
