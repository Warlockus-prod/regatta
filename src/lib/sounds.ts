/**
 * Race sound signals: procedural Web Audio, no external assets (CSP, offline
 * bundle). M1-5, owner decision #3 (2026-10-30):
 *
 * - Race sound is its own choice, separate from the trainer wheel clicks
 *   (`sound` in src/features/trainer-controls/prefs.ts). It is ON by default
 *   at a moderate volume and lives in `regatta.race.sound.v1` ("on" / "off").
 * - An older explicit mute stays muted: with no race sound choice yet, the old
 *   race key `regatta.muted.v1` = "1" while the shared sound setting is off
 *   means silence, as before.
 * - The AudioContext is created or resumed only inside a user gesture
 *   (iOS / Safari autoplay policy) and only while race sound is on, so a muted
 *   player never touches the audio session. Nothing plays before that gesture.
 * - Muting suspends the context, so already scheduled notes stop too.
 * - Where the browser supports the Audio Session API (Safari / WKWebView on
 *   iOS 16.4+) the page asks for the "ambient" session: it mixes with the
 *   player's music and is silenced by the ring/silent switch.
 * - The race soundscape (wind, water, slaps, flogging, winch, contact; M3-2,
 *   ADR-0019) plays on this same context and master through
 *   raceAudioOutput(); race-soundscape-audio.ts never makes a context.
 * - The start signals (M3-3: horn, short signals, gun, recall) go through
 *   playStartSignal() for both the solo race and multiplayer; which signal
 *   belongs to which countdown second is decided in race-start-signals.ts.
 */

import { readRaceSound, RACE_SOUND_EVENT } from "@/lib/race-sound-pref";
import type { StartSignal } from "@/lib/race-start-signals";

// The setting itself lives in race-sound-pref.ts (no audio code there); every
// race screen keeps importing it from here.
export { RACE_SOUND_KEY, RACE_SOUND_EVENT, readRaceSound, writeRaceSound, subscribeRaceSound } from "@/lib/race-sound-pref";
/** Master level for every race signal: moderate, under the note gains below. */
export const RACE_SOUND_VOLUME = 0.5;

// ============================================================================
// Audio context: created only inside a gesture and only while sound is on
// ============================================================================

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let primed = false;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

function createContext(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    // Ask for the session before the context exists: "ambient" mixes with other
    // apps and follows the silent switch. Older engines ignore the property.
    try {
      const session = (window.navigator as AudioSessionNavigator | undefined)?.audioSession;
      if (session && session.type !== "ambient") session.type = "ambient";
    } catch { /* not supported */ }
    const c = new AC();
    const g = c.createGain();
    g.gain.value = RACE_SOUND_VOLUME;
    g.connect(c.destination);
    ctx = c; master = g;
    return c;
  } catch {
    return null;
  }
}

/**
 * Must run inside a user gesture. Creates or resumes the context while race
 * sound is on; does nothing while muted.
 */
export function unlockRaceAudio(): void {
  if (typeof window === "undefined") return;
  if (ctx && ctx.state === "running" && primed) return;
  if (!readRaceSound()) return;
  const c = ctx ?? createContext();
  if (!c) return;
  const suspended = c.state !== "running";
  if (suspended) void c.resume().catch(() => undefined);
  // Older iOS WebKit unlocks output only after a source starts inside the
  // gesture. On a touch screen pointerdown comes first and is not an audio
  // gesture there, so prime again on every gesture that finds it suspended.
  if (!primed || suspended) {
    primed = true;
    try {
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    } catch { /* nothing to prime */ }
  }
}

function onSoundChoice() {
  if (!ctx) { unlockRaceAudio(); return; }
  if (readRaceSound()) unlockRaceAudio();
  else if (ctx.state === "running") void ctx.suspend().catch(() => undefined);
}

const GESTURES = ["pointerdown", "pointerup", "touchend", "keydown", "click"] as const;
let installed = false;

/** Listens for gestures (every one, so an iOS interruption can recover) and for the sound choice. Safe to call twice. */
export function installRaceAudioUnlock(): void {
  if (installed || typeof window === "undefined" || typeof window.addEventListener !== "function") return;
  installed = true;
  for (const type of GESTURES) window.addEventListener(type, unlockRaceAudio, { capture: true, passive: true });
  window.addEventListener(RACE_SOUND_EVENT, onSoundChoice);
}

installRaceAudioUnlock();

/** The live output, or null when muted, before the first gesture or while the context is suspended. */
function output(): { c: AudioContext; out: AudioNode } | null {
  if (!ctx || !master || ctx.state !== "running" || !readRaceSound()) return null;
  return { c: ctx, out: master };
}

/**
 * The shared context and master gain for the race soundscape
 * (race-soundscape-audio.ts), or null whenever a signal would not play.
 * It never creates or resumes the context: only a gesture does that.
 */
export function raceAudioOutput(): { c: AudioContext; out: AudioNode } | null {
  return output();
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
  const o = output();
  if (!o) return;
  const { c, out } = o;
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
  g.connect(out);
  osc.start(now);
  osc.stop(now + durMs / 1000 + 0.05);
}

function noise(durMs: number, filterFreq = 1000, gain = 0.08) {
  const o = output();
  if (!o) return;
  const { c, out } = o;
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
  g.connect(out);
  src.start(now);
  src.stop(now + durMs / 1000 + 0.05);
}

// ============================================================================
// Public sound library
// ============================================================================

/**
 * A committee-boat air horn: sawtooth voices a few cents apart through a
 * lowpass, held flat and released, not a decaying beep. One voice for the
 * short signals, two for the long ones.
 */
function horn(durMs: number, freq = 233, voices = 2, gain = 0.07) {
  const o = output();
  if (!o) return;
  const { c, out } = o;
  const now = c.currentTime, end = now + durMs / 1000;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1500;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.03);
  g.gain.setValueAtTime(gain, Math.max(now + 0.03, end - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  filter.connect(g);
  g.connect(out);
  for (let v = 0; v < voices; v++) {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * (1 + v * 0.006), now);
    osc.connect(filter);
    osc.start(now);
    osc.stop(end + 0.05);
  }
}

/** The start gun: a sharp noise crack with a falling low thump under it. */
function gun() {
  const o = output();
  if (!o) return;
  const { c, out } = o;
  const now = c.currentTime;
  const size = Math.floor(c.sampleRate * 0.45);
  const buffer = c.createBuffer(1, size, c.sampleRate);
  const data = buffer.getChannelData(0);
  const decay = c.sampleRate * 0.07;
  for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / decay);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2600;
  const g = c.createGain();
  g.gain.value = 0.32;
  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(now);
  src.stop(now + 0.5);
  tone({ freq: 110, freqEnd: 38, durMs: 320, type: 'sine', gain: 0.22 });
}

/** A short sound signal on each of the last countdown seconds (one horn voice). */
export function playBeep() { horn(160, 440, 1, 0.06); }

/** The start gun at zero. */
export function playStart() { gun(); }

/**
 * The start signals of M3-3 (race-start-signals.ts), one entry for the solo
 * race and multiplayer so both sound alike: the long horn when the countdown
 * begins, a short signal on each later second, the gun at zero, one horn for
 * an individual recall. Silent while race sound is off.
 */
export function playStartSignal(signal: StartSignal) {
  if (signal === "warning") horn(800);
  else if (signal === "tick") playBeep();
  else if (signal === "start") playStart();
  else horn(550, 208);
}

/** Tack (sail shift) - whoosh */
export function playTack() { noise(180, 1800, 0.05); }

/** Mark rounded - cheerful chime */
export function playMarkRound() {
  tone({ freq: 880, durMs: 130, type: 'triangle', gain: 0.1 });
  tone({ freq: 1320, durMs: 160, type: 'triangle', gain: 0.09, delayMs: 80 });
}

/** Finish - victory trumpet */
export function playFinish() {
  tone({ freq: 523, durMs: 150, type: 'triangle', gain: 0.14 });
  tone({ freq: 659, durMs: 150, type: 'triangle', gain: 0.14, delayMs: 150 });
  tone({ freq: 784, durMs: 320, type: 'triangle', gain: 0.16, delayMs: 300 });
}

/** No-go zone warning - quick dip */
export function playNoGo() { tone({ freq: 220, durMs: 100, type: 'sawtooth', gain: 0.06, freqEnd: 140 }); }
