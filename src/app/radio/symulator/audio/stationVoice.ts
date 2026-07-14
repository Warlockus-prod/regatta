// ============================================================================
// Fetch the coast station's spoken reply.
//
// The audio is NOT played here. It is handed to RadioAudioEngine, which puts it
// through the receiver - squelch gate, then volume, then the little speaker -
// and the caller puts a matching carrier on the channel in radioTraffic so the
// squelch has something to open for.
//
// That routing is the whole point. The first version connected the TTS straight
// to the audio destination, so the station could be heard with the volume at
// zero and the squelch shut: a learner could ignore everything the squelch
// lesson taught them and still pass every scenario. On a real radio, everything
// you hear is downstream of the squelch and the volume knob. No exceptions.
//
// Fails silent by design: no key, no network - the written reply the simulator
// already shows is still there, so nothing breaks.
// ============================================================================

const cache = new Map<string, ArrayBuffer>();

/** Raw mp3 bytes for a station line, or null if TTS is unavailable. */
export async function fetchStationVoice(text: string): Promise<ArrayBuffer | null> {
  if (!text) return null;
  const hit = cache.get(text);
  if (hit) return hit.slice(0);
  try {
    const res = await fetch('/api/radio-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    // the route answers { fallback: true } as JSON when TTS is unavailable
    if ((res.headers.get('content-type') ?? '').includes('application/json')) return null;
    const buf = await res.arrayBuffer();
    cache.set(text, buf);
    return buf.slice(0);
  } catch {
    return null;
  }
}
