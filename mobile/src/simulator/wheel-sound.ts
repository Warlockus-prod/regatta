// Wheel clicks for the native trainer (owner decision 2026-10-19: no
// vibration; clicks are sound and play only when the learner turned sound on).
// The four short WAVs are the web's procedural clicks rendered to files by
// scripts/build-wheel-clicks.mjs. Players are created on the first click, so
// a learner who never turns sound on never touches the audio session.
// The session mixes with other apps (music keeps playing) and follows the
// ring/silent switch, as UI sounds should.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { TickKind } from './wheel-controls';

const SOURCES: Record<TickKind, number> = {
  tick: require('../../assets/sounds/wheel-tick.wav'),
  stop: require('../../assets/sounds/wheel-stop.wav'),
  center: require('../../assets/sounds/wheel-center.wav'),
  turn: require('../../assets/sounds/wheel-turn.wav'),
};

const players: Partial<Record<TickKind, AudioPlayer>> = {};
let sessionReady = false;
let lastTickAt = 0;

/** Plays one click. Plain ticks are capped at 25 per second so a fast spin stays a ratchet, not a buzz. */
export function playWheelTick(kind: TickKind) {
  const now = Date.now();
  if (kind === 'tick' && now - lastTickAt < 40) return;
  lastTickAt = now;
  try {
    if (!sessionReady) {
      sessionReady = true;
      void setAudioModeAsync({
        playsInSilentMode: false,
        interruptionMode: 'mixWithOthers',
        allowsRecording: false,
        shouldPlayInBackground: false,
      }).catch(() => undefined);
    }
    let p = players[kind];
    if (!p) {
      p = createAudioPlayer(SOURCES[kind]);
      players[kind] = p;
    }
    void p.seekTo(0).catch(() => undefined);
    p.play();
  } catch {
    // No audio (simulator without output, module missing): stay silent.
  }
}
