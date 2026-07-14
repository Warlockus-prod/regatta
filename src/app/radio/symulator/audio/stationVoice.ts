// ============================================================================
// Play the coast station's reply so it sounds like it came out of a radio.
//
// The TTS audio arrives clean and full-range. Marine VHF is not: it is a
// 300 Hz - 3 kHz channel out of a small speaker, with a click when the carrier
// keys and a burst of noise when it drops. Playing the raw file would train the
// wrong ear - on the exam you have to understand a voice that sounds like THIS.
//
// Fails silent by design: no key, no network, no WebAudio - the written reply
// the simulator already shows is still there, so nothing breaks.
// ============================================================================

const cache = new Map<string, ArrayBuffer>();

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (ctx) return ctx;
  type W = Window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? (window as W).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

async function fetchSpeech(text: string): Promise<ArrayBuffer | null> {
  const hit = cache.get(text);
  if (hit) return hit;
  try {
    const res = await fetch('/api/radio-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    // the route answers { fallback: true } as JSON when TTS is unavailable
    if ((res.headers.get('content-type') ?? '').includes('application/json')) return null;
    const buf = await res.arrayBuffer();
    cache.set(text, buf);
    return buf;
  } catch {
    return null;
  }
}

/**
 * Speak a station reply. Returns true if it was actually heard, so the caller
 * can tell the difference between "spoken" and "text only".
 */
export async function speakStation(text: string, muted: boolean): Promise<boolean> {
  if (muted || !text) return false;
  const c = audioCtx();
  if (!c) return false;
  const raw = await fetchSpeech(text);
  if (!raw) return false;

  try {
    await c.resume();
    const buf = await c.decodeAudioData(raw.slice(0));
    const src = c.createBufferSource();
    src.buffer = buf;

    // the radio channel: 300 Hz - 3 kHz, and a little grit
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 320; hp.Q.value = 0.7;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2900; lp.Q.value = 0.7;
    const presence = c.createBiquadFilter();
    presence.type = 'peaking'; presence.frequency.value = 1800; presence.Q.value = 1; presence.gain.value = 5;

    // gentle clipping: a radio speaker is not hi-fi
    const shaper = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 1.7);
    }
    shaper.curve = curve;

    const gain = c.createGain();
    gain.gain.value = 0.9;

    src.connect(hp).connect(lp).connect(presence).connect(shaper).connect(gain).connect(c.destination);

    // the carrier keys up before the voice, and drops after it
    keyClick(c, gain, 0);
    src.start(c.currentTime + 0.06);
    keyClick(c, gain, buf.duration + 0.1);

    return true;
  } catch {
    return false;
  }
}

/** the click of a transmitter keying / unkeying */
function keyClick(c: AudioContext, dest: AudioNode, delaySec: number): void {
  const t = c.currentTime + delaySec;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'square';
  osc.frequency.value = 1400;
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + 0.03);
}
