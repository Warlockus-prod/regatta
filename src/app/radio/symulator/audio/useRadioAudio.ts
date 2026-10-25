'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RadioEvent, RadioState } from '../radioModel';
import { RadioAudioEngine, type Cue } from './RadioAudioEngine';
import { audioView, cuesFor } from './radioSounds';
import { isLocalSpeech, playLocalSpeech, stopLocalSpeech, type VoiceAudio } from '../../audio/localSpeech';

const MUTE_KEY = 'sternik.radio.muted.v1';

/**
 * React glue for the radio's sound. React never touches an AudioNode: it hands
 * the engine a view of the state and a stream of cues, and the engine owns the
 * graph.
 *
 * The AudioContext is created on the first user gesture (browsers refuse one
 * made any other way), which is also the behaviour we want: the page stays
 * silent until the learner touches the radio.
 */
export function useRadioAudio(state: RadioState) {
  const engineRef = useRef<RadioAudioEngine | null>(null);
  const localSpeechRef = useRef<{ generation: number; started: boolean; timer: ReturnType<typeof setInterval> | null }>({ generation: 0, started: false, timer: null });
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  // BUSY on the LCD must be the same condition as "the speaker is open", so it is
  // read from the engine's gate rather than guessed at in the UI.
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let savedMuted = false;
    try {
      savedMuted = window.localStorage.getItem(MUTE_KEY) === '1';
    } catch { /* private browsing */ }
    const frame = window.requestAnimationFrame(() => setMuted(savedMuted));
    const engine = new RadioAudioEngine();
    const local = localSpeechRef.current;
    engineRef.current = engine;
    return () => {
      if (local.timer) clearInterval(local.timer);
      if (local.started) stopLocalSpeech();
      window.cancelAnimationFrame(frame);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // keep the engine's view of the radio current
  useEffect(() => {
    engineRef.current?.update(audioView(state));
  }, [state]);

  // poll the gate for the BUSY lamp (the engine ticks at 20 Hz; 10 Hz is plenty
  // for a lamp and keeps React out of the audio path)
  useEffect(() => {
    const id = setInterval(() => {
      const e = engineRef.current;
      setBusy(e && e.started ? e.isBusy : false);
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  /** call from a real user gesture (pointerdown on the panel). Kept off `state`
   *  so the hook stays stable across renders (the effect above already keeps the
   *  engine's view current); depending on `state` here churned every consumer. */
  const unlock = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || muted) return;
    engine.start();
    setStarted(engine.started);
  }, [muted]);

  /** call after every dispatch, with the same (event, prev, next) */
  const onEvent = useCallback((e: RadioEvent, prev: RadioState, next: RadioState) => {
    const engine = engineRef.current;
    if (!engine || !engine.started) return;
    for (const cue of cuesFor(e, prev, next)) engine.play(cue);
    engine.update(audioView(next));
  }, []);

  /** fire a cue directly - for sounds that outlive a single event (the alarm) */
  const play = useCallback((cue: Cue) => {
    engineRef.current?.play(cue);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try { window.localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  /** speak a station reply THROUGH the receiver: gated by squelch, scaled by VOL.
   *  Returns the voice length in ms (0 if nothing played) so the caller can put a
   *  carrier of exactly that length on the air - the squelch then closes when the
   *  voice stops, instead of the synthetic babble droning on to a fixed window. */
  const speak = useCallback(async (raw: VoiceAudio, onChannel?: string): Promise<number> => {
    const engine = engineRef.current;
    if (!engine || !engine.started) return 0;
    if (isLocalSpeech(raw)) {
      const local = localSpeechRef.current;
      if (local.timer) clearInterval(local.timer);
      if (local.started) stopLocalSpeech();
      const generation = ++local.generation;
      const channel = onChannel ?? engine.systemVoiceChannel;
      local.started = false;
      engine.suppressSyntheticVoice(raw.durationMs);
      const since = Date.now();
      local.timer = setInterval(() => {
        const gain = engine.systemVoiceChannel === channel ? engine.systemVoiceGain : 0;
        if (local.started && gain <= 0) { stopLocalSpeech(); if (local.timer) clearInterval(local.timer); local.timer = null; local.started = false; }
        if (!local.started && gain > 0 && Date.now() - since < raw.durationMs) {
          local.started = true;
          void playLocalSpeech(raw.text, gain).finally(() => { if (local.generation === generation) { if (local.timer) clearInterval(local.timer); local.timer = null; local.started = false; } });
        }
        if (!local.started && Date.now() - since >= raw.durationMs && local.timer) { clearInterval(local.timer); local.timer = null; }
      }, 75);
      return raw.durationMs;
    }
    const buf = await engine.decode(raw);
    if (!buf) return 0;
    engine.speak(buf, onChannel);
    return buf.duration * 1000;
  }, []);

  // A NEW object literal every render gave the hook an unstable identity, which
  // made every consumer's useCallback/useEffect keyed on `audio` tear down and
  // re-arm on each render. With the 1 Hz scenario stopwatch forcing a render each
  // second, any timer >= ~1s (distress-txdone, coast-ack, dual-watch) never fired
  // and DSC scenarios soft-locked. Memoize on the stable pieces.
  return useMemo(
    () => ({ muted, toggleMute, unlock, onEvent, play, speak, started, busy }),
    [muted, toggleMute, unlock, onEvent, play, speak, started, busy],
  );
}
