'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// useSailAudio - procedural ambience via WebAudio (ported from the 3dnew
// handoff sailsim-audio.js). Three filtered noise beds with no assets:
//  - wind  : bandpass hiss, louder with apparent wind speed
//  - water : lowpass rush, louder with boat speed
//  - flog  : pulsed bandpass when the sails luff / the boat is in irons
//
// Off by default. The AudioContext is created on the first user gesture
// (toggle), per browser autoplay policy, and closed on unmount.
// ============================================================================

interface AudioNodes {
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

export function useSailAudio() {
  const [enabled, setEnabled] = useState(false);
  const ref = useRef<AudioNodes | null>(null);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (next && !ref.current) ref.current = build();
      const n = ref.current;
      if (n) {
        n.master.gain.setTargetAtTime(next ? 0.9 : 0.0, n.ctx.currentTime, 0.05);
        if (next && n.ctx.state === 'suspended') void n.ctx.resume();
      }
      return next;
    });
  }, []);

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

  return { enabled, toggle, update };
}
