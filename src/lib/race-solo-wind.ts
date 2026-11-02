import { WIND_DIRECTION_BASE as WIND_DIRECTION } from "./race-physics";

/**
 * The solo race wind at race time `raceT` seconds: the direction oscillates
 * ±6° with period ~22s (slow shift) plus a faster ±2° wobble with period ~7s
 * (nervous breeze); the gust multiplier blends two sines (Perlin-ish) and is
 * bounded to 0.75..1.25.
 *
 * Moved here unchanged from src/app/game/race-model.ts (which re-exports it)
 * in M5, so the metric fleet resolver (race-physical-completion.ts) sails the
 * live race's own wind without a library importing app code.
 */
export function soloRaceWind(raceT: number): { dir: number; gust: number } {
  const shift = Math.sin(raceT * (2 * Math.PI / 22)) * 6
              + Math.sin(raceT * (2 * Math.PI / 7)) * 2;
  const dir = (WIND_DIRECTION + shift + 360) % 360;
  const gust = 1.0
             + Math.sin(raceT * (2 * Math.PI / 9)) * 0.12
             + Math.sin(raceT * (2 * Math.PI / 3.3)) * 0.05;
  return { dir, gust: Math.max(0.75, Math.min(1.25, gust)) };
}
