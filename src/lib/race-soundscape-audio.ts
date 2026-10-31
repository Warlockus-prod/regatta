/**
 * Race soundscape runtime (M3-2, ADR-0019). Plays the targets of
 * race-soundscape.ts on the ONE race AudioContext of sounds.ts, through its
 * master gain, so the race sound switch, the ambient audio session (silent
 * switch) and the gesture rule hold for it too:
 *
 * - It never creates or resumes a context. raceAudioOutput() is null while
 *   race sound is off, before the first gesture and while the context is
 *   suspended, and then this module does nothing (a muted player never gets
 *   a context).
 * - The beds are built once, on the first live update: one looping noise
 *   buffer feeds five filters (wind, water, slap, flog, winch click), one
 *   sine gives the contact thud. Slaps, flogging, winch clicks and the thud
 *   are envelopes on those persistent gains, so an update or an event
 *   creates no audio node and no buffer.
 * - Updates are applied at most about ten times per second, with
 *   setTargetAtTime so levels glide. The throttle runs on the page clock
 *   (performance.now, the clock of the race loop's 100 ms HUD cadence), not
 *   on the audio clock, which moves in hardware-buffer steps and would drop
 *   every other HUD tick.
 * - setLive(false) (pause, finish hold end, results, mute), a hidden page
 *   and a silent target fade every bed out at once; once the fade has had
 *   RELEASE_MS and the soundscape is still silent, the sources are stopped
 *   and disconnected (no idle rendering on the results screen, the menu or
 *   a hidden page); the next live update builds them again, reusing the
 *   noise buffer. dispose() (unmount) stops everything at once.
 */

import { raceAudioOutput } from "@/lib/sounds";
import type { RaceSoundscapeTargets } from "@/lib/race-soundscape";

/** Overall soundscape level under the 0.5 race master, below the signals. */
export const SOUNDSCAPE_LEVEL = 0.7;
/** Minimum time between two applied updates (about 10 per second). */
export const SOUNDSCAPE_UPDATE_S = 0.095;
/** Pulses are scheduled this far ahead of the audio clock. */
const LOOKAHEAD_S = 0.2;
/** Glide of the steady beds. */
const GLIDE_S = 0.25;
/** Fade out on silence. */
const FADE_S = 0.04;
/** After this long silent, the beds are stopped until the next live update. */
export const RELEASE_MS = 500;

type Output = { c: AudioContext; out: AudioNode };
type VisibilityDoc = Pick<Document, "hidden" | "addEventListener" | "removeEventListener">;

export interface RaceSoundscape {
  /** Applies the targets of this moment (throttled; a silent target fades out at once). */
  update(targets: RaceSoundscapeTargets): void;
  /** A sheet moved by `amount` (0..1 of its travel): a short winch ratchet. */
  winch(amount: number): void;
  /** The player's hull touched another boat. */
  thud(): void;
  /** False while the race is paused, held after the finish, over or muted: silence, updates ignored. */
  setLive(live: boolean): void;
  /** Fades out at once; still silent RELEASE_MS later, the beds are stopped until the next live update. */
  silence(): void;
  /** Stops and disconnects everything; a later update builds the beds again. */
  dispose(): void;
}

interface Beds {
  c: AudioContext;
  bus: GainNode;
  noise: AudioBufferSourceNode;
  thudOsc: OscillatorNode;
  wind: GainNode; windFilter: BiquadFilterNode;
  water: GainNode; waterFilter: BiquadFilterNode;
  slap: GainNode; flog: GainNode; click: GainNode; thud: GainNode;
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * 2));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function build({ c, out }: Output, buffer: AudioBuffer): Beds {
  const bus = c.createGain();
  bus.gain.value = SOUNDSCAPE_LEVEL;
  bus.connect(out);
  const noise = c.createBufferSource();
  noise.buffer = buffer; noise.loop = true;
  const bed = (type: BiquadFilterType, freq: number, q: number): [GainNode, BiquadFilterNode] => {
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.value = 0;
    noise.connect(f); f.connect(g); g.connect(bus);
    return [g, f];
  };
  const [wind, windFilter] = bed("bandpass", 380, 0.6);
  const [water, waterFilter] = bed("lowpass", 260, 0.4);
  const [slap] = bed("lowpass", 380, 1.2);
  const [flog] = bed("bandpass", 1300, 1.1);
  const [click] = bed("bandpass", 3200, 6);
  const thudOsc = c.createOscillator();
  thudOsc.type = "sine"; thudOsc.frequency.value = 58;
  const thud = c.createGain();
  thud.gain.value = 0;
  thudOsc.connect(thud); thud.connect(bus);
  noise.start(); thudOsc.start();
  return { c, bus, noise, thudOsc, wind, windFilter, water, waterFilter, slap, flog, click, thud };
}

/** One envelope on a persistent gain: rise to `peak`, then decay to zero. */
function pulse(p: AudioParam, at: number, peak: number, attack: number, decay: number) {
  p.setTargetAtTime(peak, at, attack);
  p.setTargetAtTime(0, at + attack * 4, decay);
}

function cancel(p: AudioParam, now: number) {
  const hold = (p as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam }).cancelAndHoldAtTime;
  if (typeof hold === "function") hold.call(p, now); else p.cancelScheduledValues(now);
  p.setTargetAtTime(0, now, FADE_S);
}

export function createRaceSoundscape(options: { output?: () => Output | null; doc?: VisibilityDoc | null; clock?: () => number } = {}): RaceSoundscape {
  const getOutput = options.output ?? raceAudioOutput;
  const doc = options.doc !== undefined ? options.doc : typeof document === "undefined" ? null : document;
  // Seconds on the page clock for the throttle; the audio clock only when there is no page clock.
  const clock = options.clock ?? (typeof performance !== "undefined" && typeof performance.now === "function" ? () => performance.now() / 1000 : null);
  let beds: Beds | null = null;
  let noise: { c: AudioContext; buffer: AudioBuffer } | null = null;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;
  let live = true;
  let sounding = false;
  let lastUpdate = -Infinity;
  let nextSlap = 0, nextFlog = 0, winchUntil = 0;
  // A small LCG so slap spacing is irregular without Math.random per pulse.
  let seed = 0x2f6b1d;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  const onVisibility = () => { if (doc?.hidden) silence(); };

  function silence() {
    const wasSounding = sounding;
    sounding = false;
    nextSlap = 0; nextFlog = 0; winchUntil = 0;
    lastUpdate = -Infinity;
    // Nothing was scheduled since the last fade: a repeated silence costs nothing.
    if (!beds || !wasSounding) return;
    const now = beds.c.currentTime;
    cancel(beds.wind.gain, now); cancel(beds.water.gain, now); cancel(beds.slap.gain, now);
    cancel(beds.flog.gain, now); cancel(beds.click.gain, now); cancel(beds.thud.gain, now);
    // Still silent once the fade is over: stop the sources until the next live update.
    if (releaseTimer === null && typeof setTimeout === "function") {
      releaseTimer = setTimeout(() => { releaseTimer = null; if (!sounding) dispose(); }, RELEASE_MS);
    }
  }

  function ensure(o: Output): Beds {
    if (releaseTimer !== null) { clearTimeout(releaseTimer); releaseTimer = null; }
    if (beds && beds.c === o.c) return beds;
    if (beds) dispose();
    if (!noise || noise.c !== o.c) noise = { c: o.c, buffer: noiseBuffer(o.c) };
    beds = build(o, noise.buffer);
    doc?.addEventListener("visibilitychange", onVisibility);
    return beds;
  }

  function dispose() {
    silence();
    if (releaseTimer !== null) { clearTimeout(releaseTimer); releaseTimer = null; }
    const b = beds;
    beds = null;
    if (!b) return;
    doc?.removeEventListener("visibilitychange", onVisibility);
    try { b.noise.stop(); } catch { /* already stopped */ }
    try { b.thudOsc.stop(); } catch { /* already stopped */ }
    for (const node of [b.noise, b.thudOsc, b.bus]) try { node.disconnect(); } catch { /* not connected */ }
  }

  function update(t: RaceSoundscapeTargets) {
    if (t.silent || !live || doc?.hidden) { silence(); return; }
    const o = getOutput();
    if (!o) { silence(); return; }
    const now = o.c.currentTime;
    const stamp = clock ? clock() : now;
    if (sounding && stamp - lastUpdate < SOUNDSCAPE_UPDATE_S) return;
    const b = ensure(o);
    lastUpdate = stamp; sounding = true;
    b.wind.gain.setTargetAtTime(t.windGain, now, GLIDE_S);
    b.windFilter.frequency.setTargetAtTime(t.windFilterHz, now, GLIDE_S);
    b.water.gain.setTargetAtTime(t.waterGain, now, GLIDE_S);
    b.waterFilter.frequency.setTargetAtTime(t.waterFilterHz, now, GLIDE_S);
    const horizon = now + LOOKAHEAD_S;
    if (t.slapRateHz > 0 && t.slapGain > 0) {
      if (nextSlap < now) nextSlap = now + 0.02;
      while (nextSlap < horizon) {
        pulse(b.slap.gain, nextSlap, t.slapGain * (0.7 + 0.3 * rand()), 0.006, 0.06);
        nextSlap += (0.6 + 0.8 * rand()) / t.slapRateHz;
      }
    } else nextSlap = 0;
    if (t.flogRateHz > 0 && t.flogGain > 0) {
      if (nextFlog < now) nextFlog = now + 0.01;
      while (nextFlog < horizon) {
        pulse(b.flog.gain, nextFlog, t.flogGain, 0.004, 0.025);
        nextFlog += 1 / t.flogRateHz;
      }
    } else nextFlog = 0;
  }

  function winch(amount: number) {
    if (!beds || !sounding || !live || !Number.isFinite(amount) || amount <= 0) return;
    const o = getOutput();
    if (!o || o.c !== beds.c) return;
    const now = o.c.currentTime;
    // One ratchet at a time: a slider drag gives one run, not a pile.
    if (now < winchUntil) return;
    const clicks = Math.max(2, Math.min(8, Math.round(amount * 40)));
    for (let i = 0; i < clicks; i++) pulse(beds.click.gain, now + 0.01 + i * 0.034, 0.12, 0.002, 0.008);
    winchUntil = now + 0.01 + clicks * 0.034;
  }

  function thud() {
    if (!beds || !sounding || !live) return;
    const o = getOutput();
    if (!o || o.c !== beds.c) return;
    pulse(beds.thud.gain, o.c.currentTime + 0.005, 0.5, 0.004, 0.12);
    pulse(beds.slap.gain, o.c.currentTime + 0.005, 0.16, 0.003, 0.08);
  }

  function setLive(next: boolean) {
    live = next;
    if (!next) silence();
  }

  return { update, winch, thud, setLive, silence, dispose };
}
