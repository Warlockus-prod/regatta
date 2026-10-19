'use client';

// Wheel clicks as sound (owner decision 6: no vibration). Procedural WebAudio,
// no assets, so the CSP and the offline bundle need nothing new. The context
// is created on the first click, which always follows a user gesture, and
// clicks are capped at 25 per second so a fast spin stays a ratchet, not a buzz.

export type TickKind = "tick" | "stop" | "center" | "turn";

let ctx: AudioContext | null = null;
let lastAt = 0;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try { ctx = new Ctor(); } catch { ctx = null; }
  return ctx;
}

function blip(c: AudioContext, at: number, freq: number, length: number, gain: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(at);
  osc.stop(at + length + 0.01);
}

export function playTick(kind: TickKind) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (kind === "tick" && now - lastAt < 40) return;
  lastAt = now;
  const c = audio();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => undefined);
  const t = c.currentTime + 0.001;
  if (kind === "tick") blip(c, t, 2400, 0.012, 0.08);
  else if (kind === "center") blip(c, t, 1400, 0.03, 0.12);
  else if (kind === "stop") blip(c, t, 180, 0.06, 0.25);
  else { blip(c, t, 900, 0.04, 0.14); blip(c, t + 0.07, 1200, 0.04, 0.14); }
}
