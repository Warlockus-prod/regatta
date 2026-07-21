'use client';

// ============================================================================
// "Listen" playback for the radio theory / cheat sheet phrases.
//
// Two-tier by design (the owner's choice, hybrid):
//   1. A fixed phrase is pre-generated once (scripts/pregen-radio-audio.mjs) and
//      committed as a static /radio-audio/<hash>.mp3. Listed in pregenManifest.
//      Zero runtime cost, instant, no OpenAI dependency.
//   2. Anything not in the manifest falls back to a live /api/radio-tts call
//      (same voice), cached in memory for the page session.
//
// The mp3 is CLEAN speech; the "sounds like a radio" flavor is added here at
// playback with a light band-pass, exactly like the trainer (which filters at
// playback too, RadioAudioEngine.ts). This is a plain listen button, not the
// full receiver simulation - no squelch, no noise floor, no unlock dance.
// ============================================================================

import manifest from './pregenManifest.json';

const MANIFEST = manifest as Record<string, string>;

/** True if `text` has a committed static clip (used to show a subtly different
 *  affordance, and to know a first tap will be instant). */
export function hasStaticClip(text: string): boolean {
  return Boolean(MANIFEST[text]);
}

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

const decoded = new Map<string, AudioBuffer>();
let current: AudioBufferSourceNode | null = null;

async function fetchAudio(text: string): Promise<ArrayBuffer | null> {
  const file = MANIFEST[text];
  try {
    if (file) {
      const r = await fetch(`/radio-audio/${file}`);
      if (r.ok) return await r.arrayBuffer();
      // static file missing on the server -> fall through to live TTS
    }
    const r = await fetch('/api/radio-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) return null;
    const type = r.headers.get('content-type') ?? '';
    if (type.includes('application/json')) return null; // {fallback:true} / error
    return await r.arrayBuffer();
  } catch {
    return null;
  }
}

/** Stop whatever is currently playing (e.g. before starting a new phrase). */
export function stopRadioSpeech(): void {
  if (current) {
    try { current.stop(); } catch { /* already stopped */ }
    current = null;
  }
}

/** Play `text` in the radio voice. Resolves when playback ends, or immediately
 *  if audio is unavailable (no key, offline, decode failure) - the caller keeps
 *  showing the written phrase either way. */
export async function playRadioSpeech(text: string): Promise<void> {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') { try { await c.resume(); } catch { /* ignore */ } }
  stopRadioSpeech();

  let buf = decoded.get(text) ?? null;
  if (!buf) {
    const raw = await fetchAudio(text);
    if (!raw) return;
    try { buf = await c.decodeAudioData(raw.slice(0)); } catch { return; }
    decoded.set(text, buf);
  }

  const src = c.createBufferSource();
  src.buffer = buf;
  // Telephone/VHF band: roll off below ~320 Hz and above ~3.1 kHz, lift the
  // presence around 1.8 kHz. Enough to read as "radio" without the squelch hiss.
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3100;
  const peak = c.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 1800; peak.gain.value = 6; peak.Q.value = 0.8;
  const gain = c.createGain(); gain.gain.value = 1.15;
  src.connect(hp); hp.connect(lp); lp.connect(peak); peak.connect(gain); gain.connect(c.destination);

  current = src;
  await new Promise<void>((resolve) => {
    src.onended = () => { if (current === src) current = null; resolve(); };
    try { src.start(); } catch { resolve(); }
  });
}
