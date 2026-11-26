'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { pinRaceSound, readRaceSound, subscribeRaceSound, writeRaceSound } from '@/lib/race-sound-pref';

// ============================================================================
// useSailAudio - procedural ambience via WebAudio (ported from the 3dnew
// handoff sailsim-audio.js). Three filtered noise beds with no assets:
//  - wind  : bandpass hiss, louder with apparent wind speed
//  - water : lowpass rush, louder with boat speed
//  - flog  : pulsed bandpass when the sails luff / the boat is in irons
//
// Off by default. The AudioContext is created on the first user gesture
// (toggle), per browser autoplay policy, and closed on unmount.
//
// M3-2 (ADR-0019): it follows the shared race sound setting. While race
// sound is off the ambience stays off, no AudioContext is created, and a
// running ambience goes silent. Pressing Sound asks for sound, so it turns
// race sound on as well; turning the ambience off leaves race sound alone.
// This screen still has its own context; moving it onto the race context of
// src/lib/sounds.ts is an open ADR item.
// ============================================================================

export interface AudioNodes {
  ctx: AudioContext;
  master: GainNode;
  windG: GainNode;
  waterG: GainNode;
  flogG: GainNode;
}

function noiseBuffer(c: AudioContext) {
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function build(): AudioNodes {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  const nb = noiseBuffer(ctx);
  const source = () => {
    const s = ctx.createBufferSource();
    s.buffer = nb;
    s.loop = true;
    s.start();
    return s;
  };
  const bed = (type: BiquadFilterType, freq: number, q: number) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    const s = source();
    s.connect(f);
    f.connect(g);
    g.connect(master);
    return g;
  };

  return {
    ctx,
    master,
    windG: bed('bandpass', 650, 0.6),
    waterG: bed('lowpass', 420, 0.4),
    flogG: bed('bandpass', 1300, 1.1),
  };
}

/** The toggle's next state. It never turns on (nor builds a context) while race sound is off. */
export function toggleSailAudio(prev: boolean, ref: { current: AudioNodes | null }, raceSoundOn: boolean, create: () => AudioNodes = build): boolean {
  const next = !prev && raceSoundOn;
  if (next && !ref.current) ref.current = create();
  const n = ref.current;
  if (n) {
    n.master.gain.setTargetAtTime(next ? 0.9 : 0.0, n.ctx.currentTime, 0.05);
    if (next && n.ctx.state === 'suspended') void n.ctx.resume();
  }
  return next;
}

/**
 * One press of the Boat 3D Sound button; returns the ambience state it
 * applied. The race sound in force is saved as an explicit choice first, so
 * the trainer `sound` preference the screen writes next (mirrored into the
 * old race key) can never switch the race silent. A press that asks for
 * sound while race sound is off turns race sound on: the button never does
 * nothing.
 */
export function pressSailSound(current: boolean, ref: { current: AudioNodes | null }, create: () => AudioNodes = build): boolean {
  if (!current && !readRaceSound()) writeRaceSound(true, 'boat');
  else pinRaceSound();
  return toggleSailAudio(current, ref, readRaceSound(), create);
}

/** Race sound switched off elsewhere (another tab): the ambience goes silent and its context sleeps. */
export function silenceSailAudio(ref: { current: AudioNodes | null }): void {
  const n = ref.current;
  if (!n) return;
  n.master.gain.setTargetAtTime(0, n.ctx.currentTime, 0.05);
  if (n.ctx.state === 'running') void n.ctx.suspend().catch(() => undefined);
}

export function useSailAudio() {
  const [wanted, setWanted] = useState(false);
  const wantedRef = useRef(false);
  const ref = useRef<AudioNodes | null>(null);
  const raceSoundOn = useSyncExternalStore(subscribeRaceSound, readRaceSound, () => false);
  const enabled = wanted && raceSoundOn;

  /** Returns the state it applied, for the screen's own preference write. */
  const toggle = useCallback((): boolean => {
    const next = pressSailSound(wantedRef.current && readRaceSound(), ref);
    wantedRef.current = next;
    setWanted(next);
    return next;
  }, []);
  useEffect(() => {
    if (!raceSoundOn) { silenceSailAudio(ref); return; }
    const n = ref.current;
    if (wanted && n && n.ctx.state === 'suspended') void n.ctx.resume().catch(() => undefined);
  }, [raceSoundOn, wanted]);

  const update = useCallback(
    (awsKn: number, twsKn: number, speedKn: number, luffing: boolean, t: number) => {
      const n = ref.current;
      if (!n) return;
      const now = n.ctx.currentTime;
      const k = 0.12;
      const a = awsKn || twsKn || 0;
      n.windG.gain.setTargetAtTime(Math.min(0.06 + a * 0.012, 0.28), now, k);
      n.waterG.gain.setTargetAtTime(Math.min((speedKn || 0) * 0.03, 0.22), now, k);
      const flap = luffing ? 0.1 + 0.08 * Math.abs(Math.sin(t * 9)) : 0.0;
      n.flogG.gain.setTargetAtTime(flap, now, 0.05);
    },
    [],
  );

  useEffect(() => {
    return () => {
      const n = ref.current;
      if (n) {
        void n.ctx.close();
        ref.current = null;
      }
    };
  }, []);

  const setActive = useCallback((active: boolean) => {
    const nodes = ref.current;
    if (nodes) nodes.master.gain.setTargetAtTime(active && enabled ? 0.9 : 0, nodes.ctx.currentTime, 0.05);
  }, [enabled]);
  return { enabled, toggle, update, setActive };
}
