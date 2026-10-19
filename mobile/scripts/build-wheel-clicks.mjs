#!/usr/bin/env node
// Writes the four wheel clicks of the native trainer (mobile/assets/sounds/
// wheel-*.wav). Same sounds as the web's procedural WebAudio clicks
// (src/features/trainer-controls/sound.ts): a triangle blip with an
// exponential fade, one blip per kind, two for a tack or gybe.
//
//   node scripts/build-wheel-clicks.mjs          # rewrite the files
//   node scripts/build-wheel-clicks.mjs --check  # fail if they differ

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

// [start s, frequency Hz, length s, gain], numbers from sound.ts.
const KINDS = {
  tick: [[0, 2400, 0.012, 0.08]],
  center: [[0, 1400, 0.03, 0.12]],
  stop: [[0, 180, 0.06, 0.25]],
  turn: [[0, 900, 0.04, 0.14], [0.07, 1200, 0.04, 0.14]],
};

function render(blips) {
  const end = Math.max(...blips.map(([at, , len]) => at + len + 0.01));
  const n = Math.ceil(end * RATE);
  const pcm = new Float64Array(n);
  for (const [at, freq, len, gain] of blips) {
    const start = Math.round(at * RATE);
    const count = Math.round(len * RATE);
    for (let i = 0; i < count; i++) {
      const t = i / RATE;
      const phase = (t * freq) % 1;
      const tri = 4 * Math.abs(phase - 0.5) - 1;
      // exponentialRampToValueAtTime(0.0001, len)
      const env = gain * Math.pow(0.0001 / gain, t / len);
      pcm[start + i] += tri * env;
    }
  }
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), i * 2);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

const check = process.argv.includes('--check');
let stale = 0;
mkdirSync(OUT, { recursive: true });
for (const [kind, blips] of Object.entries(KINDS)) {
  const file = join(OUT, `wheel-${kind}.wav`);
  const wav = render(blips);
  if (check) {
    if (!existsSync(file) || !readFileSync(file).equals(wav)) { console.error(`stale: ${file}`); stale++; }
  } else {
    writeFileSync(file, wav);
    console.log(`wrote ${file} (${wav.length} bytes)`);
  }
}
if (stale) process.exit(1);
