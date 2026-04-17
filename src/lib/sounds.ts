/**
 * Procedural sound effects using Web Audio API.
 * No external assets — keeps bundle small.
 * All sounds respect the global mute flag (persisted in localStorage).
 */

const MUTE_KEY = 'regatta.muted.v1';

let ctx: AudioContext | null = null;
let _muted: boolean | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  // Browsers require user gesture to resume — callers should call this on an event.
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

export function isMuted(): boolean {
  if (_muted !== null) return _muted;
  if (typeof window === 'undefined') return true;
  try {
    _muted = localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    _muted = false;
  }
  return _muted;
}

export function setMuted(m: boolean): void {
  _muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
}

export function toggleMuted(): boolean {
  const next = !isMuted();
  setMuted(next);
  return next;
}

interface ToneOpts {
  freq: number;
  durMs: number;
  type?: OscillatorType;
  gain?: number;
  freqEnd?: number;     // pitch slide
  delayMs?: number;
}

function tone({ freq, durMs, type = 'sine', gain = 0.15, freqEnd, delayMs = 0 }: ToneOpts) {
  const c = getCtx();
  if (!c || isMuted()) return;
  const now = c.currentTime + delayMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + durMs / 1000);
  }
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + durMs / 1000 + 0.05);
}

function noise(durMs: number, filterFreq = 1000, gain = 0.08) {
  const c = getCtx();
  if (!c || isMuted()) return;
  const now = c.currentTime;
  const bufferSize = Math.floor(c.sampleRate * (durMs / 1000));
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start(now);
  src.stop(now + durMs / 1000 + 0.05);
}

// ============================================================================
// Public sound library
// ============================================================================

/** Start countdown beep */
export function playBeep() { tone({ freq: 660, durMs: 120, type: 'square', gain: 0.12 }); }

/** Race start fanfare */
export function playStart() {
  tone({ freq: 440, durMs: 120, type: 'square', gain: 0.12 });
  tone({ freq: 660, durMs: 200, type: 'square', gain: 0.14, delayMs: 120 });
}

/** Tack (sail shift) — whoosh */
export function playTack() { noise(180, 1800, 0.05); }

/** Mark rounded — cheerful chime */
export function playMarkRound() {
  tone({ freq: 880, durMs: 130, type: 'triangle', gain: 0.1 });
  tone({ freq: 1320, durMs: 160, type: 'triangle', gain: 0.09, delayMs: 80 });
}

/** Finish — victory trumpet */
export function playFinish() {
  tone({ freq: 523, durMs: 150, type: 'triangle', gain: 0.14 });
  tone({ freq: 659, durMs: 150, type: 'triangle', gain: 0.14, delayMs: 150 });
  tone({ freq: 784, durMs: 320, type: 'triangle', gain: 0.16, delayMs: 300 });
}

/** No-go zone warning — quick dip */
export function playNoGo() { tone({ freq: 220, durMs: 100, type: 'sawtooth', gain: 0.06, freqEnd: 140 }); }
