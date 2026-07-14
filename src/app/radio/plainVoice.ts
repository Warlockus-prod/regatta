'use client';

// ============================================================================
// Playing a spoken line where there is no radio to route it through.
//
// WebAudio, not <audio src="blob:...">. That is not a style choice: production
// serves `Content-Security-Policy: default-src 'self'` with no media-src, so a
// blob: URL on a media element is refused by the browser and the sound silently
// never arrives. The first version of the position drill did exactly that, and
// the "how it should sound" button was dead on prod while working perfectly on
// localhost, where there is no CSP.
//
// decodeAudioData takes the bytes we already fetched, so nothing is loaded from a
// URL at all and there is nothing for the policy to refuse.
//
// The scenario debrief and the live dialogue do not use this: their audio goes
// through RadioAudioEngine, because it comes out of a RECEIVER and must obey the
// squelch and the volume knob. Here there is no receiver - the model reading is
// the instructor speaking, not a station transmitting - so it plays plainly.
// ============================================================================

let ctx: AudioContext | null = null;
let playing: AudioBufferSourceNode | null = null;

function context(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

/** Stop whatever is currently speaking. Safe to call when nothing is. */
export function stopVoice(): void {
  try { playing?.stop(); } catch { /* already ended */ }
  playing = null;
}

/**
 * Play these bytes, and resolve when the sound has actually FINISHED - not when
 * it started, which is all `HTMLAudioElement.play()` promises and is why the
 * first version's "speaking" indicator went out immediately.
 *
 * Starting a new line cuts off the previous one, so double-clicking cannot leave
 * two voices reading the same position over each other.
 */
export async function playVoice(raw: ArrayBuffer): Promise<void> {
  const ac = context();
  if (ac.state === 'suspended') await ac.resume();

  const buf = await ac.decodeAudioData(raw.slice(0));
  stopVoice();

  const src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(ac.destination);
  playing = src;

  await new Promise<void>((resolve) => {
    src.onended = () => { if (playing === src) playing = null; resolve(); };
    src.start();
  });
}
