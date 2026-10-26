import type { NativeRaceSnapshot } from "./race-native";
import { angleDiff, raceTrim, windAt } from "./race-physics";

type ReplaySample = NativeRaceSnapshot["samples"][number];

/** Interpolate by recorded seconds, never by a presumed sampling interval. */
export function replayFrame(samples: readonly ReplaySample[], time: number) {
  let lo = 0, hi = Math.max(0, samples.length - 1);
  while (lo < hi) { const mid = Math.floor((lo + hi + 1) / 2); if (samples[mid].t <= time) lo = mid; else hi = mid - 1; }
  const a = samples[lo];
  if (!a) return null;
  const b = samples[Math.min(lo + 1, samples.length - 1)];
  const fraction = b.t > a.t ? Math.max(0, Math.min(1, (time - a.t) / (b.t - a.t))) : 0;
  const from = a.windDir ?? windAt(time).dir;
  return { pos: { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction },
    heading: (a.heading + angleDiff(a.heading, b.heading) * fraction + 360) % 360,
    speed: a.speed + (b.speed - a.speed) * fraction, lapDone: a.lap,
    windDir: b.windDir !== undefined ? (from + angleDiff(from, b.windDir) * fraction + 360) % 360 : from,
    trim: a.trim ? raceTrim(a.trim) : undefined };
}
