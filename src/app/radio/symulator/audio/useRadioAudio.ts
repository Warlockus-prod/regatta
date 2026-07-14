'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RadioEvent, RadioState } from '../radioModel';
import { RadioAudioEngine, type Cue } from './RadioAudioEngine';
import { audioView, cuesFor } from './radioSounds';

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
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(MUTE_KEY) === '1') setMuted(true);
    } catch { /* private browsing */ }
    const engine = new RadioAudioEngine();
    engineRef.current = engine;
    return () => { engine.dispose(); engineRef.current = null; };
  }, []);

  // keep the engine's view of the radio current
  useEffect(() => {
    engineRef.current?.update(audioView(state));
  }, [state]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  /** call from a real user gesture (pointerdown on the panel) */
  const unlock = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || muted) return;
    engine.start();
    engine.update(audioView(state));
    setStarted(engine.started);
  }, [muted, state]);

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

  return { muted, toggleMute, unlock, onEvent, play, started };
}
