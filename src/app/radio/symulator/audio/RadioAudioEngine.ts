// ============================================================================
// The radio's sound. Everything is synthesized with the WebAudio API - no audio
// files (the site has a strict CSP and a bundle budget), and nothing here knows
// about React.
//
// WHY THIS EXISTS: the simulator used to be silent, which quietly broke the most
// important lesson in the course. The learner is told "set SQL just above where
// the steady noise disappears" - but there was no noise to hear, so the lesson
// was a button-press with no meaning. Squelch is a threshold you find BY EAR;
// on a silent radio it cannot be taught at all.
//
// The model that makes it work (see radioTraffic.ts for the shared 0..10
// S-scale):
//   - the noise floor BREATHES (a bounded random walk), so the threshold is a
//     region you hunt for, not a number that flips at a fixed click;
//   - a carrier does not just add voice, it QUIETS the hiss (FM capture), so a
//     weak call sounds weak and a strong one arrives clean;
//   - set the squelch too high and the weak call is simply never heard. Nothing
//     on screen says so. Only the ear does. That is the exam point, made
//     audible.
// ============================================================================

import { NOISE_CEILING, signalOn } from '../radioTraffic';

export type Cue =
  | 'key-beep' | 'error-beep' | 'power-on' | 'power-off' | 'dial-tick'
  | 'dsc-tx' | 'alarm-start' | 'alarm-stop' | 'call-alert' | 'tx-key' | 'tx-unkey'
  | 'aqua-start' | 'aqua-stop';

/** what the engine needs to know about the radio, each tick */
export interface AudioRadioView {
  power: boolean;
  volume: number;      // 0..20
  squelch: number;     // 0..10, where 0 is the OPEN position
  channelNum: string;
  noVoice: boolean;    // CH 70: data only, never any audio
  ptt: boolean;
}

const NOISE_STEP = 0.6;
const HYSTERESIS = 0.7;
const FULL_QUIETING = 6;
const NOISE_MAX = 0.5;
const TICK_MS = 50;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** deterministic PRNG - keeps the noise buffer identical run to run */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export class RadioAudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private rxBus!: GainNode;        // muted while transmitting, and when off
  private squelchGate!: GainNode;  // the squelch itself
  private noiseGain!: GainNode;
  private voiceGain!: GainNode;
  private volGain!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private voiceOsc: OscillatorNode | null = null;
  private alarmOsc: OscillatorNode | null = null;
  private alarmGain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  private noiseS = 1.2;           // the breathing noise floor, on the S-scale
  private gateOpen = false;
  private muted = false;
  private view: AudioRadioView | null = null;
  /** the BUSY lamp is the visual twin of the gate: "BUSY: displayed while
   *  receiving, OR THE SQUELCH IS OPEN" (M330GE p.3). Same condition, always. */
  private busy = false;
  private alarmTimer: ReturnType<typeof setInterval> | null = null;
  private alarmPhase = 0;
  /** absolute ctx time of the next two-tone step, so alarm batches continue the
   *  grid from a persistent cursor instead of re-anchoring at currentTime */
  private alarmNextAt = 0;
  private aquaOsc: OscillatorNode | null = null;
  private aquaGain: GainNode | null = null;
  private aquaLfo: OscillatorNode | null = null;
  /** ctx.currentTime until which a real (TTS) voice is on the air */
  private speakingUntil = 0;

  get started(): boolean { return this.ctx !== null; }
  get isBusy(): boolean { return this.busy; }

  /**
   * Create the AudioContext. MUST be called from a user gesture: a context made
   * outside one starts suspended and resume() is refused. In practice this is
   * called on the first pointerdown on the radio, which is also exactly the
   * behaviour we want - a page that hisses at you before you touch it is a bug.
   */
  start(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    type W = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (window as W).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);

    // the little plastic speaker: a 300 Hz - 3 kHz voice band, nothing else
    const speaker = ctx.createBiquadFilter();
    speaker.type = 'bandpass';
    speaker.frequency.value = 1400;
    speaker.Q.value = 0.7;
    speaker.connect(this.master);

    this.rxBus = ctx.createGain();
    this.rxBus.gain.value = 0;
    this.rxBus.connect(speaker);

    this.volGain = ctx.createGain();
    this.volGain.gain.value = 0;
    this.volGain.connect(this.rxBus);

    this.squelchGate = ctx.createGain();
    this.squelchGate.gain.value = 0;
    this.squelchGate.connect(this.volGain);

    // --- the hiss: one looping buffer, started once, never stopped ---
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    const rand = lcg(0x5eed);
    for (let i = 0; i < len; i++) data[i] = rand() * 2 - 1;
    this.noiseBuf = buf;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    // FM discriminator noise is bright, not flat: tilt it up
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 260; hp.Q.value = 0.7;
    const peak = ctx.createBiquadFilter();
    peak.type = 'peaking'; peak.frequency.value = 2200; peak.Q.value = 0.8; peak.gain.value = 7;

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = NOISE_MAX;
    src.connect(hp).connect(peak).connect(this.noiseGain).connect(this.squelchGate);
    src.start();

    // --- the voice of another station: formant babble, no samples ---
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 115;
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.frequency.value = 600; f1.Q.value = 6;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass'; f2.frequency.value = 1500; f2.Q.value = 8;
    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.value = 0;
    osc.connect(f1).connect(this.voiceGain);
    osc.connect(f2).connect(this.voiceGain);
    this.voiceGain.connect(this.squelchGate);
    osc.start();
    this.voiceOsc = osc;

    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  /** called on every radio state change; the tick does the rest */
  update(view: AudioRadioView): void {
    this.view = view;
  }

  // ------------------------------------------------------------------ tick ---

  private tick(): void {
    const ctx = this.ctx;
    const v = this.view;
    if (!ctx || !v) return;
    const t = ctx.currentTime;

    if (!v.power || v.noVoice || v.ptt) {
      // dead radio, a data-only channel, or we are transmitting: receiver silent
      this.rxBus.gain.setTargetAtTime(0, t, 0.02);
      this.gateOpen = false;
      this.busy = false;
      return;
    }
    this.rxBus.gain.setTargetAtTime(1, t, 0.05);

    // 1. the noise floor breathes - this is what makes the threshold a region
    const rand = Math.random();
    this.noiseS = clamp(this.noiseS + (rand * 2 - 1) * NOISE_STEP, 0, NOISE_CEILING);

    // 2. what the front end sees
    const carrier = signalOn(v.channelNum, Date.now());
    const level = Math.max(carrier, this.noiseS);

    // 3. the gate, with hysteresis.
    //
    // SQL 0 is the OPEN position of the real squelch control ("OPEN is completely
    // open" - M323 p.14): a LATCHED setting that hisses forever, not a momentary
    // key. Neither the IC-M330GE nor the IC-M323 has any monitor / squelch-defeat
    // function, so nothing else may force this gate open. An earlier version
    // opened it while the VOL screen was up; that was invented, and it taught the
    // learner that the hiss belongs to a screen rather than to a setting.
    const open = v.squelch === 0
      ? true
      : this.gateOpen ? level >= v.squelch - HYSTERESIS : level >= v.squelch;
    this.busy = open;

    // 4. FM quieting: a carrier kills the hiss under it
    const quieting = clamp(carrier / FULL_QUIETING, 0, 1);
    const noiseTgt = NOISE_MAX * (1 - 0.92 * quieting);
    const speaking = t < this.speakingUntil;
    const voiceTgt = carrier > 0 && !speaking ? 0.18 + 0.5 * clamp(carrier / 8, 0, 1) : 0;

    // 5. volume: perceptual taper, and 0 really means 0
    const vol = v.volume === 0 ? 0 : Math.pow(v.volume / 20, 1.8) * 0.9;

    this.noiseGain.gain.setTargetAtTime(noiseTgt, t, 0.05);
    // fade the synthetic babble in gently, but OUT fast: when the carrier drops
    // the fake voice should die at once, not trail off as a howl
    this.voiceGain.gain.setTargetAtTime(voiceTgt, t, voiceTgt > 0 ? 0.03 : 0.012);
    this.volGain.gain.setTargetAtTime(vol, t, 0.02);

    if (carrier > 0 && !speaking && this.voiceOsc) {
      // wobble the pitch so the babble reads as speech, not a drone
      this.voiceOsc.frequency.setTargetAtTime(100 + Math.random() * 40, t, 0.12);
    }

    if (open && !this.gateOpen) {
      this.squelchGate.gain.cancelScheduledValues(t);
      this.squelchGate.gain.setValueAtTime(this.squelchGate.gain.value, t);
      this.squelchGate.gain.linearRampToValueAtTime(1, t + 0.008);
      this.gateOpen = true;
    } else if (!open && this.gateOpen) {
      // squelch tail: the hiss comes back for a moment, then the gate shuts
      this.squelchGate.gain.cancelScheduledValues(t);
      this.squelchGate.gain.setValueAtTime(1, t);
      this.squelchGate.gain.setTargetAtTime(0, t + 0.12, 0.01);
      this.squelchGate.gain.setValueAtTime(0, t + 0.22);
      this.gateOpen = false;
    }
  }

  // ------------------------------------------------------------------ cues ---

  play(cue: Cue): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (cue) {
      case 'key-beep': return this.beep(2000, 0.032, 0.1, 4000);
      case 'error-beep':
        this.beep(900, 0.055, 0.09);
        window.setTimeout(() => this.beep(620, 0.055, 0.09), 85);
        return;
      case 'power-on':
        this.chirp(2000, 2400, 0.06);
        return;
      case 'power-off':
        this.beep(120, 0.08, 0.05);
        return;
      case 'dial-tick': return this.click(3200, 0.035);
      case 'tx-key':
      case 'tx-unkey': return this.click(1800, 0.07);
      case 'dsc-tx':
        // the DSC data burst: a short warble, then gone
        this.chirp(1300, 2200, 0.09);
        window.setTimeout(() => this.chirp(2200, 1300, 0.09), 100);
        return;
      case 'alarm-start': return this.startAlarm();
      case 'alarm-stop': return this.stopAlarm();
      case 'aqua-start': return this.startAqua();
      case 'aqua-stop': return this.stopAqua();
      case 'call-alert':
        // an incoming routine DSC call also alerts you (that is the point of DSC:
        // it wakes you when nobody is listening to the speaker) - but it is not
        // the distress two-tone, so it gets its own, gentler pattern
        this.beep(1600, 0.14, 0.08);
        window.setTimeout(() => this.beep(1200, 0.14, 0.08), 190);
        return;
    }
    void t;
  }

  /**
   * The DSC distress alarm: 2200 Hz and 1300 Hz, 250 ms each, alternating (the
   * real ITU-R M.493 two-tone alarm).
   *
   * It is scheduled in a ROLLING window, not as a fixed batch. An earlier version
   * pre-scheduled 240 steps and then just held the last value, so after one
   * minute the distress alarm quietly turned into a flat 1300 Hz dial tone - and
   * the manual is explicit that a received distress alarm "sounds UNTIL YOU TURN
   * IT OFF". A ringing alarm that gives up on its own is the one thing this sound
   * must never do.
   */
  private startAlarm(): void {
    const ctx = this.ctx;
    if (!ctx || this.alarmOsc) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    g.gain.value = 0.09;
    osc.frequency.setValueAtTime(2200, ctx.currentTime);
    osc.connect(g).connect(this.master);
    osc.start(ctx.currentTime);
    this.alarmOsc = osc;
    this.alarmGain = g;
    this.alarmPhase = 0;
    this.alarmNextAt = ctx.currentTime;

    // Keep ~2.4s of the two-tone grid scheduled AHEAD of a persistent cursor.
    // The old pump re-anchored its 8 steps at currentTime every 1800ms, so
    // successive 2.0s batches overlapped by ~0.2s and seamed the 2200/1300 Hz
    // alternation. Continuing from alarmNextAt keeps one unbroken grid.
    const pump = () => {
      const c = this.ctx;
      const o = this.alarmOsc;
      if (!c || !o) return;
      const horizon = c.currentTime + 2.4;
      while (this.alarmNextAt < horizon) {
        o.frequency.setValueAtTime(this.alarmPhase % 2 === 0 ? 2200 : 1300, this.alarmNextAt);
        this.alarmPhase++;
        this.alarmNextAt += 0.25;
      }
    };
    pump();
    this.alarmTimer = setInterval(pump, 1800);
  }

  private stopAlarm(): void {
    const ctx = this.ctx;
    if (this.alarmTimer) { clearInterval(this.alarmTimer); this.alarmTimer = null; }
    if (!ctx || !this.alarmOsc || !this.alarmGain) return;
    const t = ctx.currentTime;
    this.alarmGain.gain.cancelScheduledValues(t);
    this.alarmGain.gain.setTargetAtTime(0, t, 0.02);
    this.alarmOsc.stop(t + 0.15);
    this.alarmOsc = null;
    this.alarmGain = null;
  }

  /**
   * AquaQuake: the radio vibrates its own speaker cone to shake water out of the
   * grille - "a low frequency vibration beep sounds to drain the water,
   * REGARDLESS OF THE VOLUME LEVEL SETTING" (M330GE p.14). So it is a harsh low
   * buzz, not a beep, and it deliberately bypasses the volume: it is the one
   * sound on the set the VOL knob cannot touch.
   */
  private startAqua(): void {
    const ctx = this.ctx;
    if (!ctx || this.aquaOsc) return;
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 145;
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.03);

    // a slow amplitude wobble: the cone is being shaken, not driven with a tone
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 7;
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(g.gain);
    lfo.start();

    osc.connect(lp).connect(g).connect(this.master);  // NOT through volGain
    osc.start();
    this.aquaOsc = osc;
    this.aquaGain = g;
    this.aquaLfo = lfo;
  }

  private stopAqua(): void {
    const ctx = this.ctx;
    if (!ctx || !this.aquaOsc || !this.aquaGain) return;
    const t = ctx.currentTime;
    const g = this.aquaGain;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, 0.015);
    this.aquaOsc.stop(t + 0.08);
    // the amplitude LFO is a SECOND oscillator; if it is not stopped it keeps
    // running (modulating a now-silent gain) for every start/stop cycle. Stop it
    // and disconnect the aqua gain from master once the fade is done, so the
    // whole sub-graph can be collected instead of leaking per AquaQuake.
    try { this.aquaLfo?.stop(t + 0.08); } catch { /* already stopped */ }
    window.setTimeout(() => { try { g.disconnect(); } catch { /* context closed */ } }, 200);
    this.aquaOsc = null;
    this.aquaGain = null;
    this.aquaLfo = null;
  }

  /**
   * Play a decoded station voice THROUGH THE RECEIVER: squelch gate, then volume,
   * then the speaker. Previously the TTS reply went straight to the destination,
   * so you could hear the coast station with the volume at zero and the squelch
   * shut - which silently undid the squelch lesson the moment the learner opened
   * a scenario.
   */
  speak(buffer: AudioBuffer): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.squelchGate);
    src.start(ctx.currentTime + 0.05);
    // while a real voice is on the air, the synthetic babble stands down - the
    // carrier is the station, not a second one on top of it
    this.speakingUntil = ctx.currentTime + buffer.duration + 0.25;
  }

  /** decode compressed audio in the engine's own context */
  async decode(raw: ArrayBuffer): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    if (!ctx) return null;
    try { return await ctx.decodeAudioData(raw.slice(0)); } catch { return null; }
  }

  private beep(freq: number, durSec: number, gain: number, harmonic?: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.002);
    g.gain.setValueAtTime(gain, t + durSec);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durSec + 0.012);
    g.connect(this.master);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(g);
    osc.start(t);
    osc.stop(t + durSec + 0.02);

    if (harmonic) {
      // a cheap second harmonic is what makes it read as a small plastic
      // speaker rather than a test tone
      const h = ctx.createOscillator();
      const hg = ctx.createGain();
      hg.gain.value = 0.18;
      h.type = 'sine';
      h.frequency.value = harmonic;
      h.connect(hg).connect(g);
      h.start(t);
      h.stop(t + durSec + 0.02);
    }
  }

  private chirp(from: number, to: number, durSec: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durSec);
    g.connect(this.master);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.linearRampToValueAtTime(to, t + durSec);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + durSec + 0.01);
  }

  private click(freq: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.04);
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stopAlarm();
    this.stopAqua();
    try { this.voiceOsc?.stop(); } catch { /* already stopped */ }
    void this.ctx?.close();
    this.ctx = null;
  }
}
